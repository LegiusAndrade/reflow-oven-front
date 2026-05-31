/**
 * Typed client for the .NET backend (reflow-oven-backend). Centralizes the base URL, the JWT
 * (stored in localStorage) and error handling. The wire types below mirror the backend DTOs.
 * TODO(backend): this replaces the localStorage mock stores screen by screen.
 */

import { API_TIMEOUT_MS } from "./limits";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5248";

const TOKEN_KEY = "reflow:token:v1";

export const getToken = (): string | null => (typeof window === "undefined" ? null : window.localStorage.getItem(TOKEN_KEY));

export const setToken = (token: string | null): void => {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
};

/** An error carrying the HTTP status (the API returns pt-BR messages via ProblemDetails). */
export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
  /** Set false to skip the Authorization header (login / forgot-password). */
  auth?: boolean;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
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
    const problem = data as { detail?: string; title?: string } | undefined;
    throw new ApiError(res.status, problem?.detail ?? problem?.title ?? `Erro ${res.status}`);
  }
  return data as T;
}

const qs = (params: Record<string, unknown>): string => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
};

// --- Wire types (mirror the backend DTOs) -----------------------------------------------

export type Role = "Admin" | "Regular";
export type RampShape = "Linear" | "Fixo" | "Parábola positiva" | "Parábola negativa";
export type RunStatusKind = "running" | "done" | "aborted";
export type RunPhase = "Aquecimento" | "Patamar" | "Pico" | "Resfriamento";
export type RunSignalId = "alvo" | "oven" | "board" | "current" | "voltage" | "ovenFan" | "boardFan";

export interface SessionDto {
  id: string;
  name: string;
  role: Role;
  /** epoch ms */
  loginAt: number;
  calibration?: boolean;
}

export interface LoginResult {
  ok: boolean;
  error?: string;
  token?: string;
  expiresAt?: string;
  session?: SessionDto;
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
}

export interface SaveProgramRequest {
  name: string;
  description?: string | null;
  segments?: ProfileSegmentDto[] | null;
  profile?: ProfilePointDto[] | null;
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
  type: Role;
  status: "Ativo" | "Inativo";
  /** ISO 8601 */
  createdAt: string;
  /** ISO 8601 or null (= never logged in). */
  lastLogin?: string | null;
  events: { label: string; count: number }[];
}

export interface SensorReadingsDto {
  boardTempC: number;
  boardFanRpm: number;
  ovenTempC: number;
  ovenFanRpm: number;
  voltageV: number;
  currentA: number;
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

// --- Endpoints ---------------------------------------------------------------------------

export const api = {
  // auth
  login: (username: string, password: string) => request<LoginResult>("/api/auth/login", { method: "POST", body: { username, password }, auth: false }),
  logout: () => request<void>("/api/auth/logout", { method: "POST" }),
  me: () => request<SessionDto>("/api/auth/me"),
  forgotPassword: (email: string) => request<{ ok: boolean }>("/api/auth/forgot-password", { method: "POST", body: { email }, auth: false }),

  // programs
  listPrograms: (q: ProgramListQuery = {}) => request<PagedResult<ProgramDto>>(`/api/programs${qs({ ...q })}`),
  getProgram: (id: string) => request<ProgramDto>(`/api/programs/${encodeURIComponent(id)}`),
  createProgram: (body: SaveProgramRequest) => request<ProgramDto>("/api/programs", { method: "POST", body }),
  updateProgram: (id: string, body: SaveProgramRequest) => request<ProgramDto>(`/api/programs/${encodeURIComponent(id)}`, { method: "PUT", body }),
  deleteProgram: (id: string) => request<void>(`/api/programs/${encodeURIComponent(id)}`, { method: "DELETE" }),
  toggleFavorite: (id: string) => request<{ favorite: boolean }>(`/api/programs/${encodeURIComponent(id)}/favorite`, { method: "POST" }),

  // users
  listUsers: () => request<UserDto[]>("/api/users"),
  getUser: (id: string) => request<UserDto>(`/api/users/${encodeURIComponent(id)}`),
  createUser: (body: { name: string; email: string; password: string; type: Role; status: "Ativo" | "Inativo" }) =>
    request<UserDto>("/api/users", { method: "POST", body }),
  updateUser: (id: string, body: { email: string; type: Role; status: "Ativo" | "Inativo"; password?: string }) =>
    request<UserDto>(`/api/users/${encodeURIComponent(id)}`, { method: "PUT", body }),
  deleteUser: (id: string) => request<void>(`/api/users/${encodeURIComponent(id)}`, { method: "DELETE" }),

  // settings
  getSettings: () => request<unknown>("/api/settings"),
  updateSettings: (body: unknown) => request<unknown>("/api/settings", { method: "PUT", body }),

  // runs
  runStatus: () => request<RunStatusDto | null>("/api/runs/status"),
  startRun: (programId: string) => request<RunStatusDto>("/api/runs/start", { method: "POST", body: { programId } }),
  stopRun: () => request<RunStatusDto | null>("/api/runs/stop", { method: "POST" }),

  // reports (read-only)
  executions: (q: Record<string, unknown> = {}) => request<PagedResult<unknown>>(`/api/executions${qs(q)}`),
  execution: (id: string) => request<unknown>(`/api/executions/${encodeURIComponent(id)}`),
  errors: (q: Record<string, unknown> = {}) => request<PagedResult<unknown>>(`/api/errors${qs(q)}`),
  error: (id: string) => request<unknown>(`/api/errors/${encodeURIComponent(id)}`),
  changes: (q: Record<string, unknown> = {}) => request<PagedResult<unknown>>(`/api/changes${qs(q)}`),
  change: (id: string) => request<unknown>(`/api/changes/${encodeURIComponent(id)}`),
  systemLog: (q: Record<string, unknown> = {}) => request<PagedResult<unknown>>(`/api/system-log${qs(q)}`),
  faultTypes: () => request<unknown[]>("/api/fault-types"),

  // diagnostics
  diagnosticsOverview: (rank?: number) => request<unknown>(`/api/diagnostics/overview${qs({ rank })}`),
  readings: () => request<SensorReadingsDto>("/api/diagnostics/readings"),
  selfTest: (id: string) => request<unknown>("/api/diagnostics/self-test", { method: "POST", body: { id } }),
  ping: (host: string) => request<{ ok: boolean; ms: number; host: string }>("/api/network/ping", { method: "POST", body: { host } }),

  // calibration (technician only)
  getCalibration: () => request<unknown>("/api/calibration"),
  updateCalibration: (body: unknown) => request<unknown>("/api/calibration", { method: "PUT", body }),
  calibrationWizard: (steps: { setVoltage: number; measuredVoltage: number }[]) =>
    request<{ gain: number; offset: number }>("/api/calibration/wizard", { method: "POST", body: { steps } }),

  // maintenance
  maintenanceOverview: () => request<unknown>("/api/maintenance/overview"),
  cleanup: (categories: string[]) => request<{ deleted: number }>("/api/maintenance/cleanup", { method: "POST", body: { categories } }),
  factoryReset: (confirm: string) => request<void>("/api/maintenance/factory-reset", { method: "POST", body: { confirm } }),

  // device
  device: () => request<DeviceInfoDto>("/api/device"),

  // system / OTA
  getUpdateStatus: () => request<UpdateStatusDto>("/api/system/update"),
  applyUpdate: () => request<void>("/api/system/update", { method: "POST" }),
};

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
