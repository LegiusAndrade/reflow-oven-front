/**
 * Fetches Relatórios data from the backend and maps the API DTOs to the rich frontend record
 * types. Lists return summaries (enough for the tables); full detail is fetched by id when an
 * overlay opens. Timestamps are formatted to the "dd/mm/aa - HH:MM:SS" the UI expects.
 */
import { api, type ChangeReportQuery, type ErrorReportQuery, type ExecutionReportQuery } from "./api";
import type { ProfilePoint } from "./programs";
import type { ChangeAction, ChangeDetail, ChangeLogEntry, ChangePointRow, ErrorLogEntry, ErrorSeverity, ExecutionReport, ExecutionStatus, LogEvent, LogEventKind } from "./reports";

const pad = (n: number) => String(n).padStart(2, "0");

function fmtStamp(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)} - ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function fmtTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function fmtDur(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

const signed = (n: number, unit: string) => `${n >= 0 ? "+" : ""}${n}${unit}`;

// --- API DTO shapes (subset we consume) -------------------------------------------------
interface Paged<T> { items: T[]; total: number }
interface ExecSummaryDto { id: string; programId?: string | null; programName: string; userName?: string | null; startedAt: string; durationSeconds: number; status: ExecutionStatus; peakTemp: number; peakCurrent: number }
interface ProfilePtDto { t: number; temp: number; kind: "programmed" | "measured" }
interface CompRowDto { tempProg: number; tempReal: number; timeProgSeconds: number; timeRealSeconds: number; stageIndex: number }
interface LogEventDto { at: string; kind: LogEventKind; message: string }
interface ExecDetailDto extends ExecSummaryDto { faultAtT?: number | null; faultAtTemp?: number | null; points: ProfilePtDto[]; comparison: CompRowDto[]; events: LogEventDto[]; trace: { durationSec: number; series: SnapSeriesDto[] } }

interface ChangeSummaryDto { id: string; at: string; action: ChangeAction; target: string; userName?: string | null; detailKind: "config" | "program" }
interface ChangePtDto { index: number; temp: number; timeSec: number; ramp: string; role: "added" | "removed" | "changed-before" | "changed-after" }
interface ChangeDetailDto extends ChangeSummaryDto { programId?: string | null; configBullets?: string[] | null; points: ChangePtDto[] }

interface ErrSummaryDto { id: string; at: string; faultTypeCode: string; severity: ErrorSeverity; message: string; userName?: string | null; programName?: string | null }
interface SnapSeriesDto { name: string; unit: string; color: string; values: number[] }
interface ErrDetailDto extends ErrSummaryDto { programId?: string | null; ovenTemp: number; pcbTemp: number; startAt: string; endAt: string; inputVoltage: number; outputVoltage: number; snapshot: { durationSec: number; series: SnapSeriesDto[] }; events: LogEventDto[] }

const mapEvent = (e: LogEventDto): LogEvent => ({ at: fmtTime(e.at), kind: e.kind, message: e.message });

// --- Executions -------------------------------------------------------------------------
export async function fetchExecutions(q: ExecutionReportQuery): Promise<{ items: ExecutionReport[]; total: number }> {
  const res = (await api.executions(q)) as Paged<ExecSummaryDto>;
  return { items: res.items.map((e) => execFromSummary(e)), total: res.total };
}

const execFromSummary = (e: ExecSummaryDto): ExecutionReport => ({
  id: e.id,
  programName: e.programName,
  startedAt: fmtStamp(e.startedAt),
  duration: fmtDur(e.durationSeconds),
  status: e.status,
  user: e.userName ?? "—",
  peakTemp: e.peakTemp,
  peakCurrent: e.peakCurrent,
  profile: [],
  realProfile: [],
  comparison: [],
  events: [],
  trace: undefined,
});

export async function fetchExecutionDetail(id: string): Promise<ExecutionReport> {
  const e = (await api.execution(id)) as ExecDetailDto;
  return {
    ...execFromSummary(e),
    profile: e.points.filter((p) => p.kind === "programmed").map((p) => ({ t: p.t, temp: p.temp })),
    realProfile: e.points.filter((p) => p.kind === "measured").map((p) => ({ t: p.t, temp: p.temp })),
    faultAt: e.faultAtT != null && e.faultAtTemp != null ? { t: e.faultAtT, temp: e.faultAtTemp } : undefined,
    trace: e.trace,
    comparison: e.comparison.map((c) => ({
      tempProg: c.tempProg,
      tempReal: c.tempReal,
      timeProg: fmtDur(c.timeProgSeconds),
      timeReal: fmtDur(c.timeRealSeconds),
      deviation: `${signed(c.tempReal - c.tempProg, "°C")}, ${signed(c.timeRealSeconds - c.timeProgSeconds, "s")}`,
    })),
    events: e.events.map(mapEvent),
  };
}

// --- Changes ----------------------------------------------------------------------------
export async function fetchChanges(q: ChangeReportQuery): Promise<{ items: ChangeLogEntry[]; total: number }> {
  const res = (await api.changes(q)) as Paged<ChangeSummaryDto>;
  return { items: res.items.map(changeFromSummary), total: res.total };
}

const changeFromSummary = (c: ChangeSummaryDto): ChangeLogEntry => ({
  id: c.id,
  at: fmtStamp(c.at),
  action: c.action,
  target: c.target,
  user: c.userName ?? "—",
  detail: c.detailKind === "config" ? { kind: "config", bullets: [] } : { kind: "program" },
});

/** Build a setpoint curve from change points: sorted by index, timeSec used directly as `t`
 *  (it is cumulative — equals the profile point's t), with an origin prepended so the curve has
 *  >= 2 points (matches the genRunProfile origin). Empty input yields an empty curve. */
function pointsToProfile(rows: ChangePtDto[]): ProfilePoint[] {
  if (rows.length === 0) return [];
  const sorted = [...rows].sort((a, b) => a.index - b.index);
  return [{ t: 0, temp: 25 }, ...sorted.map((p) => ({ t: p.timeSec, temp: p.temp }))];
}

export async function fetchChangeDetail(id: string): Promise<ChangeLogEntry> {
  const c = (await api.change(id)) as ChangeDetailDto;
  const mapRow = (p: ChangePtDto): ChangePointRow => ({ index: p.index, temp: p.temp, timeSec: p.timeSec, ramp: p.ramp });
  let detail: ChangeDetail;
  if (c.detailKind === "config") {
    detail = { kind: "config", bullets: c.configBullets ?? [] };
  } else {
    // The backend stamps a single uniform role on all points of a change, so each change carries
    // exactly one curve: Criado → added, Editado → changed-after, Removido → removed.
    const added = c.points.filter((p) => p.role === "added");
    const removed = c.points.filter((p) => p.role === "removed");
    const changedAfter = c.points.filter((p) => p.role === "changed-after");
    const changedBefore = c.points.filter((p) => p.role === "changed-before");
    let afterProfile: ProfilePoint[] | undefined;
    let beforeProfile: ProfilePoint[] | undefined;
    if (added.length > 0) afterProfile = pointsToProfile(added);
    if (removed.length > 0) beforeProfile = pointsToProfile(removed);
    if (changedAfter.length > 0) afterProfile = pointsToProfile(changedAfter);
    if (changedBefore.length > 0) beforeProfile = pointsToProfile(changedBefore);
    detail = {
      kind: "program",
      afterProfile,
      beforeProfile,
      added: c.points.filter((p) => p.role === "added" || p.role === "changed-after").map(mapRow),
      removed: c.points.filter((p) => p.role === "removed" || p.role === "changed-before").map(mapRow),
    };
  }
  return { ...changeFromSummary(c), detail };
}

// --- Errors -----------------------------------------------------------------------------
export async function fetchErrors(q: ErrorReportQuery): Promise<{ items: ErrorLogEntry[]; total: number }> {
  const res = (await api.errors(q)) as Paged<ErrSummaryDto>;
  return { items: res.items.map(errorFromSummary), total: res.total };
}

const errorFromSummary = (e: ErrSummaryDto): ErrorLogEntry => ({
  id: e.id,
  at: fmtStamp(e.at),
  severity: e.severity,
  code: e.faultTypeCode,
  message: e.message,
  user: e.userName ?? "—",
  programName: e.programName ?? "—",
  programId: "",
  ovenTemp: 0,
  pcbTemp: 0,
  startAt: "",
  endAt: "",
  inputVoltage: 0,
  outputVoltage: 0,
  events: [],
  snapshot: { durationSec: 0, series: [] },
});

export async function fetchErrorDetail(id: string): Promise<ErrorLogEntry> {
  const e = (await api.error(id)) as ErrDetailDto;
  return {
    ...errorFromSummary(e),
    programId: e.programId ?? "",
    ovenTemp: e.ovenTemp,
    pcbTemp: e.pcbTemp,
    startAt: fmtStamp(e.startAt),
    endAt: fmtStamp(e.endAt),
    inputVoltage: e.inputVoltage,
    outputVoltage: e.outputVoltage,
    snapshot: e.snapshot,
    events: e.events.map(mapEvent),
  };
}
