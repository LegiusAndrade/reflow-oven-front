/**
 * Typed client for the .NET backend (reflow-oven-backend). Centralizes the base URL, the JWT
 * (stored in localStorage) and error handling. The wire types below mirror the backend DTOs.
 * TODO(backend): this replaces the localStorage mock stores screen by screen.
 */

import type { ZodType } from "zod";
import { autotuneHistorySchema, autotuneStatusSchema, pagedProgramsSchema, runStatusSchema, sessionSchema, settingsSchema } from "./apiSchemas";
import { API_TIMEOUT_MS } from "./limits";
import { logger } from "./logger";
// Type-only import (erased at runtime, so it forms no import cycle): the report row DTOs carry
// the same accented display unions the Relatórios screen renders.
import type { ChangeAction, ErrorSeverity, ExecutionStatus } from "./reports";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5248";

// The JWT lives in an httpOnly cookie (set by the BFF /api/auth/login route). The client can't read
// that cookie, so it keeps the token in this MODULE-LOCAL (client-only) variable, hydrated on load
// from /api/auth/ws-token (see fetchWsToken + auth.refreshSession) and never persisted in JS-readable
// storage. On the SERVER getToken() returns null: server code (RSC / Route Handlers) reads the cookie
// per-request via lib/serverAuth, because a module variable would be SHARED across all users there.
let memToken: string | null = null;

/** In-flight GET de-dup map (see `request` below); cleared on any token change. */
const inflightGets = new Map<string, Promise<unknown>>();

export const getToken = (): string | null => (typeof window === "undefined" ? null : memToken);

export const setToken = (token: string | null): void => {
  if (typeof window === "undefined") return;
  inflightGets.clear(); // a token change invalidates any shared in-flight read
  memToken = token;
};

/** Fetch the JWT from the httpOnly cookie via the Next ws-token route (client-only): hydrates the
 *  in-memory token on load and backs the SignalR accessTokenFactory. null = not signed in. */
export async function fetchWsToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch("/api/auth/ws-token");
    if (!res.ok) return null;
    return ((await res.json()) as { token: string | null }).token ?? null;
  } catch {
    return null;
  }
}

/** An error carrying the HTTP status (the API returns pt-BR messages via ProblemDetails). */
export class ApiError extends Error {
  readonly status: number;
  /** For a rate-limit rejection (429 / login lockout): seconds to wait before retrying, when the
   *  backend supplies it (body `retryAfterSeconds` or the standard `Retry-After` header). */
  readonly retryAfterSeconds?: number;
  constructor(status: number, message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
  /** Set false to skip the Authorization header (login / forgot-password). */
  auth?: boolean;
  /** Optional zod schema to validate the response against — logs a warning on mismatch (see apiSchemas). */
  schema?: ZodType;
}

async function doRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (token && opts.auth !== false) headers["Authorization"] = `Bearer ${token}`;

  // Bound every request: abort if the server doesn't answer in time, and turn a refused/dropped
  // connection or a timeout into a clear ApiError (status 0) instead of a raw "Failed to fetch".
  const controller = new AbortController();
  const onExternalAbort = () => controller.abort();
  if (opts.signal) {
    if (opts.signal.aborted) controller.abort();
    else opts.signal.addEventListener("abort", onExternalAbort, { once: true });
  }
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
  } catch {
    if (opts.signal?.aborted) throw new ApiError(0, "Requisição cancelada.");
    if (controller.signal.aborted) throw new ApiError(0, "O servidor demorou a responder. Tente novamente.");
    throw new ApiError(0, "Não foi possível conectar ao servidor. Verifique a rede e se o servidor está ligado.");
  } finally {
    clearTimeout(timeout);
    if (opts.signal) opts.signal.removeEventListener("abort", onExternalAbort);
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    // Keep the contract that every failure is an ApiError (a misconfigured server can answer
    // 200 with a non-JSON body, e.g. an HTML error page); never let a raw SyntaxError escape.
    throw new ApiError(res.status, res.ok ? "Resposta inválida do servidor." : `Erro ${res.status}`);
  }

  if (!res.ok) {
    const problem = data as { detail?: string; title?: string; retryAfterSeconds?: number } | undefined;
    // A 429 (rate limit) may carry the wait time in the body or the standard Retry-After header (seconds).
    const header = res.headers.get("Retry-After");
    const retryAfter = problem?.retryAfterSeconds ?? (header && /^\d+$/.test(header) ? Number(header) : undefined);
    throw new ApiError(res.status, problem?.detail ?? problem?.title ?? `Erro ${res.status}`, retryAfter);
  }
  // Validate against the optional schema: a mismatch is logged (backend contract drift) but the data
  // still flows, so an imperfect schema never breaks a valid response. null/undefined (a 204, or "no
  // active run") is skipped.
  if (opts.schema && data != null) {
    const parsed = opts.schema.safeParse(data);
    if (!parsed.success) logger.warn("api", `Resposta de ${path} fora do contrato esperado`, parsed.error);
  }
  return data as T;
}

/**
 * Public request entry point. For GETs it de-duplicates concurrent identical reads: while a GET for a
 * path is already on the wire, an identical GET shares that same promise instead of firing a second
 * request. Nothing is kept past resolution (no TTL), so it never serves stale data — it only collapses
 * burst/parallel reads. A caller-supplied AbortSignal opts out (it wants its own cancellation), and on
 * the server each RSC render uses Next's own fetch memoization.
 */
function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const isGet = (opts.method ?? "GET").toUpperCase() === "GET";
  if (!isGet || opts.signal || typeof window === "undefined") return doRequest<T>(path, opts);
  const existing = inflightGets.get(path);
  if (existing) return existing as Promise<T>;
  const p = doRequest<T>(path, opts).finally(() => inflightGets.delete(path));
  inflightGets.set(path, p);
  return p as Promise<T>;
}

// Accept `object` (not just Record<string, unknown>) so the typed report query interfaces below
// can be passed without a cast — Object.entries() reads them the same way regardless.
const qs = (params: object): string => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
};

// --- Wire types (mirror the backend DTOs) -----------------------------------------------

/** "Master" is the single dev/superuser account (full Admin powers + the Diagnóstico → Log tab);
 *  "Tecnico" is the calibration login — NOT an admin (the Calibração tab is gated by
 *  `session.calibration`, not the role). Neither is a creatable user type (managed users are Admin/Regular). */
export type Role = "Admin" | "Regular" | "Master" | "Tecnico";
export type RampShape = "Linear" | "Fixo" | "Parábola positiva" | "Parábola negativa";
export type RunStatusKind = "running" | "done" | "aborted";
export type RunPhase = "Aquecimento" | "Patamar" | "Pico" | "Resfriamento";
export type RunSignalId = "alvo" | "oven" | "board" | "current" | "voltage" | "ovenFan" | "boardFan";

/** Wire literals are lowercase; "system" is resolved at runtime via prefers-color-scheme (see lib/theme.ts). */
export type Theme = "light" | "dark" | "system";

/** Per-user visible execution-chart series. The flag names mirror the RunSignalId union exactly. */
export type RunSeriesDto = Record<RunSignalId, boolean>;

/** Per-user preferences (theme + execution-chart series), persisted via /api/me/preferences. */
export interface UserPreferencesDto {
  theme: Theme;
  chartSeries: RunSeriesDto;
}

export interface SessionDto {
  id: string;
  name: string;
  role: Role;
  /** epoch ms */
  loginAt: number;
  calibration?: boolean;
  // True (omitted otherwise) while the user is still on the system-issued provisional password, so
  // the UI can force a change. Carried on both the login session and GET /api/auth/me.
  mustChangePassword?: boolean;
  // Per-user preferences hydrated from the DB. `theme` is always present (defaults "system");
  // `chartSeries` is omitted for the technician/calibration session.
  theme: Theme;
  chartSeries?: RunSeriesDto;
}

export interface LoginResult {
  ok: boolean;
  error?: string;
  token?: string;
  expiresAt?: string;
  session?: SessionDto;
  /** Rate-limit lockout: seconds the caller must wait before retrying (the login screen counts it down). */
  retryAfterSeconds?: number;
}

export interface ProfilePointDto {
  t: number;
  temp: number;
}

export interface ProfileSegmentDto {
  temp: number;
  durationSec: number;
  ramp: RampShape;
}

export interface ProgramDto {
  id: string;
  name: string;
  description?: string;
  runCount: number;
  /** ISO 8601 or null (= "Nunca"). */
  lastUsed?: string | null;
  profile: ProfilePointDto[];
  segments?: ProfileSegmentDto[] | null;
  favorite: boolean;
  /** Whether the current session may delete this program (Admin: any; Master: only its own creations). */
  canDelete: boolean;
}

export interface SaveProgramRequest {
  name: string;
  description?: string | null;
  segments?: ProfileSegmentDto[] | null;
  profile?: ProfilePointDto[] | null;
}

/** Response of POST /api/programs/{id}/favorite — the resulting favorite state (backend FavoriteResult). */
export interface FavoriteResultDto {
  favorite: boolean;
}

export interface ProgramListQuery {
  search?: string;
  filter?: "all" | "favorites" | "unused" | "used";
  sort?: "default" | "recent" | "most-used" | "name" | "temp" | "duration";
  page?: number;
  pageSize?: number;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UserDto {
  id: string;
  name: string;
  email: string;
  // A managed user is only Admin/Regular — "Master" is the single seeded dev account (a session
  // role), never listed or created through the Usuários CRUD.
  type: "Admin" | "Regular";
  status: "Ativo" | "Inativo";
  /** ISO 8601 */
  createdAt: string;
  /** ISO 8601 or null (= never logged in). */
  lastLogin?: string | null;
  events: { label: string; count: number }[];
  /** Whether the current session may delete this user (Admin: any; Master: only its own creations). */
  canDelete: boolean;
}

/** A latched board fault carried on the 1 Hz diagnostics tick (null = healthy). `code` is the operator-
 *  facing fault code (e.g. "E-101"); `severity` is the pt-BR severity literal (e.g. "Crítico"); `message`
 *  is the pt-BR human-readable reason. Drives the persistent fault banner (see components/FaultBanner). */
export interface FaultInfo {
  code: string;
  severity: string;
  message: string;
}

export interface SensorReadingsDto {
  boardTempC: number;
  boardFanRpm: number;
  ovenTempC: number;
  ovenFanRpm: number;
  voltageV: number;
  currentA: number;
  // Latched critical fault reported by the board this tick, or null when healthy. Optional so an older
  // backend tick (field absent) degrades to "no fault" instead of dropping the whole reading.
  fault?: FaultInfo | null;
}

export interface TraceSampleDto {
  t: number;
  alvo: number;
  oven: number;
  board: number;
  current: number;
  voltage: number;
  ovenFan: number;
  boardFan: number;
}

export interface RunStatusDto {
  runId: string;
  programId: string;
  programName: string;
  status: RunStatusKind;
  phase: RunPhase;
  startedAt: string;
  elapsedSeconds: number;
  totalSeconds: number;
  progress: number;
  last?: TraceSampleDto | null;
}

export interface UpdateStatusDto {
  currentVersion: string;
  availableVersion?: string | null;
  updateAvailable: boolean;
}

export interface NotificationDto {
  id: string;
  kind: "info" | "error" | "warning" | "update";
  /** ISO 8601 */
  at: string;
  title: string;
  message: string;
  read: boolean;
}

export interface UnreadCountDto {
  count: number;
}

/** A soft-deleted record (#8 Master trash): the entity plus who/when it was deleted. */
export type Deleted<T> = T & { deletedAt: string; deletedBy: string };

export type NetworkLink = "Nenhum" | "Cabo" | "WiFi";

export type InterfaceKind = "Ethernet" | "WiFi";

export interface NetworkInterfaceDto {
  name: string;
  kind: InterfaceKind;
  up: boolean;
  /** "" when the interface is down. */
  ip: string;
}

export interface PingResultDto {
  ok: boolean;
  ms: number;
  host: string;
}

/** One clearable category in the maintenance overview — real per-category record counts from the backend. */
export interface MaintenanceCategoryDto {
  /** Matches a front `CleanupId` (execucoes | falhas | logs | inativos). */
  id: string;
  label: string;
  count: number;
  bytes: number;
}

/** Device maintenance overview: real DB size + per-category record counts, plus host CPU/disk/OS. */
export interface MaintenanceOverviewDto {
  database: { totalBytes: number; categories: MaintenanceCategoryDto[] };
  cpuLoadPercent: number;
  diskFreeGB: number;
  diskTotalGB: number;
  os: string;
  osKernel: string;
}

export interface NetworkStatusDto {
  link: NetworkLink;
  interface: string;
  ip: string;
  ssid?: string;
  signalPercent?: number;
  staticIp: boolean;
}

/** Full wired-config payload the PUT /api/system/network endpoint requires (Admin only). */
export interface ApplyNetworkRequest {
  staticIp: boolean;
  ip: string;
  mask: string;
  gateway: string;
  dnsPrimary: string;
  dnsSecondary: string;
  preferredLink: NetworkLink;
}

export interface SystemStatusDto {
  network: NetworkStatusDto;
  centralServerOnline: boolean;
}

/** Live OS metrics (Informação → Sistema). cpuLoadPercent is the OrangePi cores' load average. */
export interface SystemMetricsDto {
  hostname: string;
  os: string;
  kernel: string;
  uptimeSeconds: number;
  cpuLoadPercent: number;
  /** °C, or null when the platform exposes no CPU thermal sensor. */
  cpuTempC?: number | null;
  memoryUsedMB: number;
  memoryTotalMB: number;
  diskFreeGB: number;
  diskTotalGB: number;
}

// --- Reports (filter + paging) ----------------------------------------------------------
// Filter values are the backend enum MEMBER NAMES (accent-free), which is what ASP.NET's
// query-string enum binding parses — distinct from the accented JSON response values
// (e.g. response "Concluído"/"Crítico" vs. filter "Concluido"/"Critico").
// "Abortado" (manual stop) is accent-free, so it is identical as a response value AND as a ?status= filter.
export type ExecutionStatusWire = "Concluido" | "Falha" | "Abortado";
export type ChangeActionWire = "Criado" | "Editado" | "Removido";
export type ErrorSeverityWire = "Critico" | "Alerta" | "Aviso";
/** system-log level is a raw string (no backend enum). */
export type SystemLogLevelWire = "INFO" | "Aviso" | "Erro";

/** Common paged + filtered report query. The backend clamps `pageSize` to 1..200; `from`/`to`
 *  are raw timestamps (not end-of-day inclusive — callers widen a date-only `to` themselves). */
export interface ReportQuery {
  page: number;
  pageSize: number;
  search?: string;
  from?: string;
  to?: string;
}

export interface ExecutionReportQuery extends ReportQuery {
  status?: ExecutionStatusWire;
}

export interface ChangeReportQuery extends ReportQuery {
  action?: ChangeActionWire;
  /** Restrict to one program's change log (the edit-history overlay) — bound to ReportQuery.ProgramId. */
  programId?: string;
  /** ISO 8601 strictly-earlier cursor (exclusive): list only changes with `at < before`, for the
   *  editions comparison. Distinct from `to` (inclusive end-of-day) — bound to ReportQuery.Before. */
  before?: string;
}

export interface ErrorReportQuery extends ReportQuery {
  severity?: ErrorSeverityWire;
}

export interface SystemLogQuery extends ReportQuery {
  level?: SystemLogLevelWire;
}

// Row DTOs (the list-summary shape each report endpoint returns). Field names mirror what
// reportsClient already consumes — do not rename.
export interface ExecutionSummaryRow {
  id: string;
  programId?: string | null;
  programName: string;
  userName?: string | null;
  startedAt: string;
  durationSeconds: number;
  status: ExecutionStatus;
  peakTemp: number;
  peakCurrent: number;
}

// --- Execution detail (GET /api/executions/{id}) ----------------------------------------
// Mirrors the backend ExecutionDetailDto (Application/Dtos/ReportDtos.cs). Nested rows match
// LogEventDto / ExecProfilePointDto / ProfileComparisonRowDto / FailureSnapshotDto.

/** A timeline line on the execution detail (informational / warning / fault). */
export interface ExecLogEventDto {
  /** ISO 8601 */
  at: string;
  kind: "info" | "alerta" | "falha";
  message: string;
}

/** One execution-curve point; `kind` flags the programmed setpoint vs. the measured value. */
export interface ExecProfilePointDto {
  t: number;
  temp: number;
  kind: "programmed" | "measured";
}

/** One row of the per-stage programmed-vs-measured comparison table. */
export interface ProfileComparisonRowDto {
  tempProg: number;
  tempReal: number;
  timeProgSeconds: number;
  timeRealSeconds: number;
  stageIndex: number;
}

export interface SnapshotSeriesDto {
  name: string;
  unit: string;
  color: string;
  values: number[];
}

export interface FailureSnapshotDto {
  durationSec: number;
  series: SnapshotSeriesDto[];
}

export interface ExecutionDetailDto {
  id: string;
  programId?: string | null;
  programName: string;
  userId?: string | null;
  userName?: string | null;
  startedAt: string;
  durationSeconds: number;
  status: ExecutionStatus;
  peakTemp: number;
  peakCurrent: number;
  faultAtT?: number | null;
  faultAtTemp?: number | null;
  points: ExecProfilePointDto[];
  comparison: ProfileComparisonRowDto[];
  events: ExecLogEventDto[];
  trace: FailureSnapshotDto;
  // Failure context (Bloco A #6): populated only on a failed/aborted run, null otherwise.
  failureReason?: string | null;
  errorCode?: string | null;
  /** GUID of the linked entry in the Erros report, when the failure was logged there. */
  linkedErrorId?: string | null;
}

export interface ChangeSummaryRow {
  id: string;
  at: string;
  action: ChangeAction;
  target: string;
  userName?: string | null;
  detailKind: "config" | "program";
}

// --- Change detail (GET /api/changes/{id}) ----------------------------------------------
// Mirrors the backend ChangeDetailDto + ChangeDiffDto (Application/Dtos/ReportDtos.cs:82-131).
// A program edit now ships a structured per-point diff plus the full before/after setpoint
// curves so the detail screen can render the change visually.

/** One row of the flat program point list (ChangePointRowDto, ReportDtos.cs:82). `role` carries
 *  the legacy per-point role wire literal; the consolidated diff lives in `ChangeDiffPointDto`. */
export interface ChangePointRowDto {
  index: number;
  temp: number;
  timeSec: number;
  ramp: RampShape;
  role: "added" | "removed" | "changed-before" | "changed-after" | "unchanged";
}

/** One side (before or after the edit) of a per-point diff. Null when the point exists on only
 *  one side (added → before null, removed → after null). Backend ChangePointValueDto (ReportDtos.cs:85). */
export interface ChangePointValueDto {
  temp: number;
  timeSec: number;
  ramp: RampShape;
}

/** Which point fields the backend flagged as changed (only populated for `status: "changed"`). */
export type ChangeDiffFieldWire = "temp" | "timeSec" | "ramp";

/** Status wire literals emitted by ReportService (ReportService.cs:143-145): `changed` when the
 *  before/after values differ, `added`/`removed` when the point exists on only one side, and
 *  `unchanged` for an identical point (emitted so the curve stays complete). */
export type ChangeDiffStatusWire = "unchanged" | "changed" | "added" | "removed";

/** Consolidated per-point diff row — exactly one row per index. Backend ChangePointDiffDto
 *  (ReportDtos.cs:92-97). `before`/`after` are null on the side a point is missing from. */
export interface ChangeDiffPointDto {
  index: number;
  status: ChangeDiffStatusWire;
  before?: ChangePointValueDto | null;
  after?: ChangePointValueDto | null;
  /** Subset of "temp" | "timeSec" | "ramp"; non-empty only when `status === "changed"`. */
  changedFields: ChangeDiffFieldWire[];
}

/** Roll-up counts for the diff. `changedFields` maps each field wire literal to how many points
 *  changed it. Backend ChangeDiffSummaryDto (ReportDtos.cs:99-105). */
export interface ChangeDiffSummaryDto {
  totalChanges: number;
  added: number;
  removed: number;
  changed: number;
  unchanged: number;
  changedFields: Partial<Record<ChangeDiffFieldWire, number>>;
}

/** Structured program-edit diff: summary counts + one consolidated row per point.
 *  Backend ChangeDiffDto (ReportDtos.cs:107-109). */
export interface ChangeDiffDto {
  summary: ChangeDiffSummaryDto;
  points: ChangeDiffPointDto[];
}

/** GET /api/changes/{id}. Backend ChangeDetailDto (ReportDtos.cs:119-131). `diff`, `beforeCurve`
 *  and `afterCurve` are populated only for a program edit (null for config changes / create+remove);
 *  `beforeCurve`/`afterCurve` are the full setpoint curves charted before and after this change. */
export interface ChangeDetailDto {
  id: string;
  at: string;
  action: ChangeAction;
  target: string;
  userName?: string | null;
  programId?: string | null;
  detailKind: "config" | "program";
  configBullets?: string[] | null;
  points: ChangePointRowDto[];
  diff?: ChangeDiffDto | null;
  beforeCurve?: ProfilePointDto[] | null;
  afterCurve?: ProfilePointDto[] | null;
}

export interface ErrorSummaryRow {
  id: string;
  at: string;
  faultTypeCode: string;
  severity: ErrorSeverity;
  message: string;
  userName?: string | null;
  programName?: string | null;
}

// --- Error detail (GET /api/errors/{id}) ------------------------------------------------
// Mirrors the backend ErrorDetailDto. It carries TWO distinct fault traces: `snapshot` (the
// presentational fixed-width chart series, always present) and the optional `boardSnapshot` —
// the board's raw GET_FAULT_SNAPSHOT "black box" buffer (high-resolution, engineering units).

/** One decoded sample of the board fault-snapshot buffer (GET_FAULT_SNAPSHOT) in engineering
 *  units (°C / V / A / RPM / % / W). Mirrors the backend BoardFaultSampleDto (camelCase wire);
 *  `faultFlags` is a discrete bitfield (not plotted). */
export interface FaultSnapshotSampleDto {
  ovenTempC: number;
  boardTempC: number;
  vbusV: number;
  vregV: number;
  pdV: number;
  currentA: number;
  fanIntakeRpm: number;
  fanExhaustRpm: number;
  fanBoardRpm: number;
  dutyIntakePct: number;
  dutyExhaustPct: number;
  dutyBoardPct: number;
  mcuTempC: number;
  vddaV: number;
  faultFlags: number;
  setpointC: number;
  buckDutyPct: number;
  powerW: number;
}

/** Board fault "black box": telemetry sampled every `sampleIntervalMs` (10 → 100 Hz) around a
 *  fault. `samples[triggerIndex]` is the fault sample; sample i sits at
 *  `(i - triggerIndex) * sampleIntervalMs / 1000` seconds relative to the fault instant.
 *  Mirrors the backend BoardFaultSnapshotDto (`faultCode` is the firmware u16 code, a number). */
export interface FaultSnapshotDto {
  sampleIntervalMs: number;
  triggerIndex: number;
  faultCode: number;
  samples: FaultSnapshotSampleDto[];
}

/** GET /api/errors/{id}. Mirrors the backend ErrorDetailDto. `snapshot` is the presentational
 *  fixed-width trace (always sent); `boardSnapshot` is the raw board black box, present only when
 *  the board offered one and the download succeeded (omitted/null otherwise). */
export interface ErrorDetailDto extends ErrorSummaryRow {
  programId?: string | null;
  ovenTemp: number;
  pcbTemp: number;
  startAt: string;
  endAt: string;
  inputVoltage: number;
  outputVoltage: number;
  snapshot: FailureSnapshotDto;
  events: ExecLogEventDto[];
  boardSnapshot?: FaultSnapshotDto | null;
}

export interface SystemLogRow {
  at: string;
  level: SystemLogLevelWire;
  message: string;
}

// --- Log de Operação (auditoria — Master-only) ------------------------------------------
// Accent-free PascalCase string enums (backend has a JsonStringEnumConverter). `category` is the
// coarse sub-tab/filter dimension; `type`/`object` are the finer TIPO/OBJETO columns.
export type OperationCategory = "Execucao" | "Alteracao" | "Usuario" | "Erro" | "Comunicacao" | "Falha" | "Calibracao" | "Manutencao";
export type OperationType =
  | "Criacao"
  | "Alteracao"
  | "Remocao"
  | "Execucao"
  | "Erro"
  | "Comunicacao"
  | "Login"
  | "Logout"
  | "Calibracao"
  | "Limpeza"
  | "ResetFabrica";
export type OperationObject = "Programa" | "Execucao" | "Falha" | "Usuario" | "Configuracao" | "Controlador" | "Sessao" | "Sistema";

/** One field of an entry's DADOS payload. `before` is absent for stateless events (execution/login/comm). */
export interface OperationFieldDto {
  field: string;
  before?: string | null;
  after?: string | null;
}

/** One Log de Operação row: DATA · OPERADOR · TIPO · OBJETO · OBJETO ID · DADOS. `operatorName` is
 *  "Sistema" for automatic events; `at` is ISO 8601 (the client formats it). */
export interface OperationLogEntryDto {
  id: string;
  at: string;
  operatorName: string;
  operatorId?: string | null;
  category: OperationCategory;
  type: OperationType;
  object: OperationObject;
  objectId?: string | null;
  data: OperationFieldDto[];
}

export interface OperationLogQuery {
  search?: string;
  from?: string;
  to?: string;
  before?: string;
  page?: number;
  pageSize?: number;
  category?: OperationCategory;
  operator?: string;
  type?: OperationType;
  object?: OperationObject;
  objectId?: string;
}

// --- Endpoints ---------------------------------------------------------------------------

export const api = {
  // auth
  login: (username: string, password: string) => request<LoginResult>("/api/auth/login", { method: "POST", body: { username, password }, auth: false }),
  logout: () => request<void>("/api/auth/logout", { method: "POST" }),
  me: () => request<SessionDto>("/api/auth/me", { schema: sessionSchema }),
  forgotPassword: (email: string) => request<{ ok: boolean }>("/api/auth/forgot-password", { method: "POST", body: { email }, auth: false }),
  // Authenticated self-service password change (also used to clear a forced provisional-password change).
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ ok: boolean }>("/api/auth/change-password", { method: "POST", body: { currentPassword, newPassword } }),

  // per-user preferences (theme + execution-chart series). PUT is full-replace — always send the
  // complete object. The technician/calibration session returns 403 (preferences in-session only).
  getPreferences: () => request<UserPreferencesDto>("/api/me/preferences"),
  updatePreferences: (body: UserPreferencesDto) => request<UserPreferencesDto>("/api/me/preferences", { method: "PUT", body }),

  // programs
  listPrograms: (q: ProgramListQuery = {}) => request<PagedResult<ProgramDto>>(`/api/programs${qs({ ...q })}`, { schema: pagedProgramsSchema }),
  getProgram: (id: string) => request<ProgramDto>(`/api/programs/${encodeURIComponent(id)}`),
  createProgram: (body: SaveProgramRequest) => request<ProgramDto>("/api/programs", { method: "POST", body }),
  updateProgram: (id: string, body: SaveProgramRequest) => request<ProgramDto>(`/api/programs/${encodeURIComponent(id)}`, { method: "PUT", body }),
  deleteProgram: (id: string) => request<void>(`/api/programs/${encodeURIComponent(id)}`, { method: "DELETE" }),
  // #8 Master trash (MasterOnly endpoints — pending backend, see backend TODO). deleteProgram becomes a soft-delete.
  listDeletedPrograms: () => request<Deleted<ProgramDto>[]>("/api/programs/deleted"),
  restoreProgram: (id: string) => request<void>(`/api/programs/${encodeURIComponent(id)}/restore`, { method: "POST" }),
  purgeProgram: (id: string) => request<void>(`/api/programs/${encodeURIComponent(id)}/purge`, { method: "DELETE" }),
  // POST /api/programs/{id}/favorite. Pass `favorite` for an idempotent set (favorite: boolean);
  // omit it to toggle (the backend treats an absent/null body as a toggle). Returns the resulting
  // state as { favorite } (backend FavoriteResult).
  toggleFavorite: (id: string, favorite?: boolean) =>
    request<FavoriteResultDto>(`/api/programs/${encodeURIComponent(id)}/favorite`, {
      method: "POST",
      body: favorite === undefined ? undefined : { favorite },
    }),

  // users
  listUsers: () => request<UserDto[]>("/api/users"),
  getUser: (id: string) => request<UserDto>(`/api/users/${encodeURIComponent(id)}`),
  // MODEL B: the server generates the initial password and emails it — no password is sent on create.
  createUser: (body: { name: string; email: string; type: Role; status: "Ativo" | "Inativo" }) =>
    request<UserDto>("/api/users", { method: "POST", body }),
  updateUser: (id: string, body: { email: string; type: Role; status: "Ativo" | "Inativo"; password?: string }) =>
    request<UserDto>(`/api/users/${encodeURIComponent(id)}`, { method: "PUT", body }),
  deleteUser: (id: string) => request<void>(`/api/users/${encodeURIComponent(id)}`, { method: "DELETE" }),
  // #8 Master trash (MasterOnly — pending backend). deleteUser becomes a soft-delete; username stays unique vs deleted.
  listDeletedUsers: () => request<Deleted<UserDto>[]>("/api/users/deleted"),
  restoreUser: (id: string) => request<void>(`/api/users/${encodeURIComponent(id)}/restore`, { method: "POST" }),
  purgeUser: (id: string) => request<void>(`/api/users/${encodeURIComponent(id)}/purge`, { method: "DELETE" }),

  // settings
  getSettings: () => request<unknown>("/api/settings", { schema: settingsSchema }),
  updateSettings: (body: unknown) => request<unknown>("/api/settings", { method: "PUT", body }),

  // runs
  runStatus: () => request<RunStatusDto | null>("/api/runs/status", { schema: runStatusSchema }),
  startRun: (programId: string) => request<RunStatusDto>("/api/runs/start", { method: "POST", body: { programId } }),
  stopRun: () => request<RunStatusDto | null>("/api/runs/stop", { method: "POST" }),

  // reports (read-only — paged + filtered server-side). The backend serves these at the bare
  // /api/{executions,changes,errors,system-log} routes (no "reports" prefix) — see ReportControllers.cs.
  executions: (q: ExecutionReportQuery) => request<PagedResult<ExecutionSummaryRow>>(`/api/executions${qs(q)}`),
  execution: (id: string) => request<ExecutionDetailDto>(`/api/executions/${encodeURIComponent(id)}`),
  errors: (q: ErrorReportQuery) => request<PagedResult<ErrorSummaryRow>>(`/api/errors${qs(q)}`),
  error: (id: string) => request<ErrorDetailDto>(`/api/errors/${encodeURIComponent(id)}`),
  changes: (q: ChangeReportQuery) => request<PagedResult<ChangeSummaryRow>>(`/api/changes${qs(q)}`),
  change: (id: string) => request<ChangeDetailDto>(`/api/changes/${encodeURIComponent(id)}`),
  systemLog: (q: SystemLogQuery) => request<PagedResult<SystemLogRow>>(`/api/system-log${qs(q)}`),
  // Log de Operação (universal audit trail — Master-only; 403 for Admin/Regular).
  operationLog: (q: OperationLogQuery = {}) => request<PagedResult<OperationLogEntryDto>>(`/api/operation-log${qs({ ...q })}`),
  faultTypes: () => request<unknown[]>("/api/fault-types"),

  // diagnostics
  diagnosticsOverview: (rank?: number) => request<unknown>(`/api/diagnostics/overview${qs({ rank })}`),
  readings: () => request<SensorReadingsDto>("/api/diagnostics/readings"),
  selfTest: (id: string) => request<unknown>("/api/diagnostics/self-test", { method: "POST", body: { id } }),
  // Acknowledge (clear) a latched board fault — any signed-in operator may call it. The board releases
  // on a later 1 Hz tick (fault -> null), which is what actually hides the fault banner; we never hide
  // it optimistically. Mirrors stopRun/selfTest (POST, no meaningful body).
  acknowledgeFault: () => request<void>("/api/diagnostics/ack-fault", { method: "POST" }),
  // Omit `port` => ICMP ping; a number 1..65535 => TCP connect test. `undefined` is dropped by JSON.stringify.
  ping: (host: string, port?: number) => request<PingResultDto>("/api/network/ping", { method: "POST", body: { host, port } }),

  // calibration (technician only)
  getCalibration: () => request<unknown>("/api/calibration"),
  updateCalibration: (body: unknown) => request<unknown>("/api/calibration", { method: "PUT", body }),
  calibrationWizard: (steps: { setVoltage: number; measuredVoltage: number }[]) =>
    request<{ gain: number; offset: number }>("/api/calibration/wizard", { method: "POST", body: { steps } }),

  // maintenance
  maintenanceOverview: () => request<MaintenanceOverviewDto>("/api/maintenance/overview"),
  cleanup: (categories: string[]) => request<{ deleted: number }>("/api/maintenance/cleanup", { method: "POST", body: { categories } }),
  factoryReset: (confirm: string) => request<void>("/api/maintenance/factory-reset", { method: "POST", body: { confirm } }),

  // device
  device: () => request<DeviceInfoDto>("/api/device"),

  // notifications
  listNotifications: (limit?: number) => request<NotificationDto[]>(`/api/notifications${qs({ limit })}`),
  unreadNotificationCount: () => request<UnreadCountDto>("/api/notifications/unread-count"),
  markNotificationRead: (id: string) => request<void>(`/api/notifications/${encodeURIComponent(id)}/read`, { method: "POST" }),
  markAllNotificationsRead: () => request<void>("/api/notifications/read-all", { method: "POST" }),
  /** Delete every notification for the current user (the "Limpar tudo" action). Backend: DELETE /api/notifications → 204. */
  clearNotifications: () => request<void>("/api/notifications", { method: "DELETE" }),
  // #8 Master trash (MasterOnly — pending backend). Cleared/deleted notifications become recoverable.
  listDeletedNotifications: () => request<Deleted<NotificationDto>[]>("/api/notifications/deleted"),
  restoreNotification: (id: string) => request<void>(`/api/notifications/${encodeURIComponent(id)}/restore`, { method: "POST" }),
  purgeNotification: (id: string) => request<void>(`/api/notifications/${encodeURIComponent(id)}/purge`, { method: "DELETE" }),

  // system / OTA
  systemStatus: () => request<SystemStatusDto>("/api/system/status"),
  systemMetrics: () => request<SystemMetricsDto>("/api/system/metrics"),
  getUpdateStatus: () => request<UpdateStatusDto>("/api/system/update"),
  applyUpdate: () => request<void>("/api/system/update", { method: "POST" }),

  // system / network
  systemInterfaces: () => request<NetworkInterfaceDto[]>("/api/system/interfaces"),
  setPriorityInterface: (interfaceName: string) => request<void>("/api/system/interfaces/priority", { method: "POST", body: { interfaceName } }),
  getNetwork: () => request<NetworkStatusDto>("/api/system/network"),
  updateNetwork: (body: ApplyNetworkRequest) => request<void>("/api/system/network", { method: "PUT", body }),

  // autotune (relay PID tuning). Reading status/history is open; start/cancel/apply/dismiss are CalibrationOnly.
  autotuneStatus: () => request<AutotuneStatusDto>("/api/autotune/status", { schema: autotuneStatusSchema }),
  autotuneHistory: (page = 1, pageSize = 50) =>
    request<PagedResult<AutotuneRunDto>>(`/api/autotune/history${qs({ page, pageSize })}`, { schema: autotuneHistorySchema }),
  startAutotune: (targetTemp: number) =>
    request<AutotuneStatusDto>("/api/autotune/start", { method: "POST", body: { targetTemp }, schema: autotuneStatusSchema }),
  cancelAutotune: () => request<AutotuneStatusDto>("/api/autotune/cancel", { method: "POST", schema: autotuneStatusSchema }),
  applyAutotune: (id: string) => request<AutotuneRunDto>(`/api/autotune/${encodeURIComponent(id)}/apply`, { method: "POST" }),
  dismissAutotune: (id: string) => request<AutotuneRunDto>(`/api/autotune/${encodeURIComponent(id)}/dismiss`, { method: "POST" }),
};

/** Auto-tune outcome — pt-BR wire literals (the accent on "Concluído" is the contract). */
export type AutotuneStatus = "Executando" | "Concluído" | "Falha" | "Cancelado";

/** One auto-tune run / history row (mirrors backend AutotuneRunDto). Gains (ku/tuMs/kp/ki/kd) are null
 *  until a run finishes; prev* are the gains in effect before this tune; triggeredBy is null for the
 *  calibration technician. */
export interface AutotuneRunDto {
  id: string;
  startedAt: string;
  finishedAt?: string | null;
  durationSeconds: number;
  status: AutotuneStatus;
  targetTemp: number;
  cycles: number;
  ku?: number | null;
  tuMs?: number | null;
  kp?: number | null;
  ki?: number | null;
  kd?: number | null;
  prevKp: number;
  prevKi: number;
  prevKd: number;
  applied: boolean;
  dismissed: boolean;
  errorReason?: string | null;
  faultCode?: string | null;
  triggeredBy?: string | null;
}

/** GET /api/autotune/status — the live tune, or the last finished one when idle (`running` false). */
export interface AutotuneStatusDto {
  running: boolean;
  current?: AutotuneRunDto | null;
}

export interface BoardDto {
  role: "power" | "control";
  version: string;
  serial: string;
  hours: number;
}

export interface DeviceInfoDto {
  storageFreeGB: number;
  storageTotalGB: number;
  firmwareVersion: string;
  htmlVersion: string;
  backendVersion: string;
  boardIp: string;
  os: { name: string; kernel: string };
  boards: BoardDto[];
}
