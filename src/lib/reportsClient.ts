/**
 * Fetches Relatórios data from the backend and maps the API DTOs to the rich frontend record
 * types. Lists return summaries (enough for the tables); full detail is fetched by id when an
 * overlay opens. Timestamps are formatted to the "dd/mm/aa - HH:MM:SS" the UI expects.
 */
import {
  api,
  type ChangeDiffPointDto,
  type ChangePointValueDto,
  type ChangeReportQuery,
  type ChangeSummaryRow,
  type ErrorReportQuery,
  type ErrorSummaryRow,
  type ExecLogEventDto,
  type ExecutionReportQuery,
  type ExecutionSummaryRow,
  type ProfilePointDto,
} from "./api";
import type { ProfilePoint } from "./programs";
import type { ChangeDetail, ChangedPointDiff, ChangeLogEntry, ChangePointRow, ErrorLogEntry, ExecutionReport, LogEvent } from "./reports";

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

// The report DTOs are typed by the api client (api.ts), so we consume them directly — no local
// re-declaration and no casts. The summary/detail rows are the api.ts ExecutionSummaryRow /
// ExecutionDetailDto / ChangeSummaryRow / ChangeDetailDto / ErrorSummaryRow / ErrorDetailDto.

const mapEvent = (e: ExecLogEventDto): LogEvent => ({ at: fmtTime(e.at), kind: e.kind, message: e.message });

// --- Executions -------------------------------------------------------------------------
export async function fetchExecutions(q: ExecutionReportQuery): Promise<{ items: ExecutionReport[]; total: number }> {
  const res = await api.executions(q);
  return { items: res.items.map((e) => execFromSummary(e)), total: res.total };
}

/** Map a summary DTO to the display row the Execuções table renders (exported for unit tests). */
export const execFromSummary = (e: ExecutionSummaryRow): ExecutionReport => ({
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
  const e = await api.execution(id);
  return {
    ...execFromSummary(e),
    profile: e.points.filter((p) => p.kind === "programmed").map((p) => ({ t: p.t, temp: p.temp })),
    realProfile: e.points.filter((p) => p.kind === "measured").map((p) => ({ t: p.t, temp: p.temp })),
    faultAt: e.faultAtT != null && e.faultAtTemp != null ? { t: e.faultAtT, temp: e.faultAtTemp } : undefined,
    trace: e.trace,
    failureReason: e.failureReason ?? undefined,
    errorCode: e.errorCode ?? undefined,
    linkedErrorId: e.linkedErrorId ?? undefined,
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
/** Fetch a page of change-log summaries. `q` may carry `before` (an ISO, strictly-earlier cursor)
 *  for the editions-comparison overlay — it is forwarded verbatim to the list call as `?before=`. */
export async function fetchChanges(q: ChangeReportQuery): Promise<{ items: ChangeLogEntry[]; total: number }> {
  const res = await api.changes(q);
  return { items: res.items.map(changeFromSummary), total: res.total };
}

const changeFromSummary = (c: ChangeSummaryRow): ChangeLogEntry => ({
  id: c.id,
  at: fmtStamp(c.at),
  atIso: c.at,
  action: c.action,
  target: c.target,
  user: c.userName ?? "—",
  detail: c.detailKind === "config" ? { kind: "config", bullets: [] } : { kind: "program" },
});

/** Convert a backend setpoint curve ({ t, temp }) into the frontend ProfilePoint[] charted in the
 *  detail view. The backend already ships the full curve (origin included), so this is a 1:1 copy;
 *  a missing/empty curve yields undefined so the chart section can be skipped. */
function curveToProfile(curve?: ProfilePointDto[] | null): ProfilePoint[] | undefined {
  if (!curve || curve.length === 0) return undefined;
  return curve.map((p) => ({ t: p.t, temp: p.temp }));
}

/** Map one side of a per-point diff (before/after) into a ChangePointRow. The diff value carries no
 *  index of its own (the parent ChangeDiffPointDto does), so the index is threaded in. */
const rowFromValue = (index: number, v: ChangePointValueDto): ChangePointRow => ({ index, temp: v.temp, timeSec: v.timeSec, ramp: v.ramp });

/** Map a point from the flat point list (used as a fallback when the structured diff is absent). */
const rowFromPoint = (p: { index: number; temp: number; timeSec: number; ramp: string }): ChangePointRow => ({
  index: p.index,
  temp: p.temp,
  timeSec: p.timeSec,
  ramp: p.ramp,
});

/** Reconstruct a setpoint curve from change-point rows — the fallback for an older backend that
 *  omits the full beforeCurve/afterCurve: a {t:0} origin at the baseline start temp (0 °C, as in the
 *  editor) then each row at its timeSec. Empty rows → undefined (no curve to draw). */
function profileFromRows(rows: ChangePointRow[]): ProfilePoint[] | undefined {
  if (rows.length === 0) return undefined;
  const sorted = [...rows].sort((a, b) => a.index - b.index);
  return [{ t: 0, temp: 0 }, ...sorted.map((r) => ({ t: r.timeSec, temp: r.temp }))];
}

/** Split the structured diff's consolidated rows (one per index) by status into the UI tables.
 *  `unchanged` rows are dropped — they only exist to keep the curve complete, not for the tables. */
function splitDiffPoints(points: ChangeDiffPointDto[]): { added: ChangePointRow[]; changed: ChangedPointDiff[]; removed: ChangePointRow[] } {
  const added: ChangePointRow[] = [];
  const changed: ChangedPointDiff[] = [];
  const removed: ChangePointRow[] = [];
  for (const p of points) {
    if (p.status === "added" && p.after) {
      added.push(rowFromValue(p.index, p.after));
    } else if (p.status === "removed" && p.before) {
      removed.push(rowFromValue(p.index, p.before));
    } else if (p.status === "changed" && p.before && p.after) {
      changed.push({
        before: rowFromValue(p.index, p.before),
        after: rowFromValue(p.index, p.after),
        changedFields: p.changedFields ?? [],
      });
    }
  }
  return { added, changed, removed };
}

export async function fetchChangeDetail(id: string): Promise<ChangeLogEntry> {
  const c = await api.change(id);
  let detail: ChangeDetail;
  if (c.detailKind === "config") {
    detail = { kind: "config", bullets: c.configBullets ?? [] };
  } else {
    // Prefer the structured diff (the canonical source). Fall back to the flat point list only if
    // the backend omitted `diff` (a create/remove, or a backend build that predates the diff).
    let split: { added: ChangePointRow[]; changed: ChangedPointDiff[]; removed: ChangePointRow[] };
    if (c.diff) {
      split = splitDiffPoints(c.diff.points);
    } else if (c.action === "Removido") {
      split = { added: [], changed: [], removed: (c.points ?? []).map(rowFromPoint) };
    } else {
      // Criado (or an edit with no diff): treat every point as a plain added row.
      split = { added: (c.points ?? []).map(rowFromPoint), changed: [], removed: [] };
    }
    // Chart curves come from the backend's full beforeCurve/afterCurve when present; otherwise (older
    // backend without the curves) reconstruct them from the resulting rows so the chart still renders.
    const afterProfile = curveToProfile(c.afterCurve) ?? profileFromRows([...split.added, ...split.changed.map((d) => d.after)]);
    const beforeProfile = curveToProfile(c.beforeCurve) ?? profileFromRows([...split.removed, ...split.changed.map((d) => d.before)]);
    detail = {
      kind: "program",
      programId: c.programId ?? undefined,
      afterProfile,
      beforeProfile,
      added: split.added,
      changed: split.changed,
      removed: split.removed,
    };
  }
  return { ...changeFromSummary(c), detail };
}

// --- Errors -----------------------------------------------------------------------------
export async function fetchErrors(q: ErrorReportQuery): Promise<{ items: ErrorLogEntry[]; total: number }> {
  const res = await api.errors(q);
  return { items: res.items.map(errorFromSummary), total: res.total };
}

const errorFromSummary = (e: ErrorSummaryRow): ErrorLogEntry => ({
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
  // A summary row has no voltage measurement — null renders as "—" (never a fake 0 VAC).
  inputVoltage: null,
  outputVoltage: 0,
  events: [],
  snapshot: { durationSec: 0, series: [] },
  // The board black box is detail-only (and optional even there) — a summary row has none.
  boardSnapshot: undefined,
});

export async function fetchErrorDetail(id: string): Promise<ErrorLogEntry> {
  const e = await api.error(id);
  return {
    ...errorFromSummary(e),
    programId: e.programId ?? "",
    ovenTemp: e.ovenTemp,
    pcbTemp: e.pcbTemp,
    startAt: fmtStamp(e.startAt),
    endAt: fmtStamp(e.endAt),
    // Nullable on the wire (int?, omitted when null) — normalize undefined to null for the UI.
    inputVoltage: e.inputVoltage ?? null,
    outputVoltage: e.outputVoltage,
    snapshot: e.snapshot,
    // Wire shape mirrors the frontend FaultSnapshot 1:1 (engineering units); null → omit.
    boardSnapshot: e.boardSnapshot ?? undefined,
    events: e.events.map(mapEvent),
  };
}
