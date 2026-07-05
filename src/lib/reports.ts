import type { ProfilePoint } from "./programs";

/** A line on a timeline: informational, warning, or fault. */
export type LogEventKind = "info" | "alerta" | "falha";
export type LogEvent = {
  /** "HH:MM:SS" */
  at: string;
  kind: LogEventKind;
  message: string;
};

// --- Execuções (run history) -------------------------------------------------------------

// "Abortado" = manual stop (distinct from "Falha"); accent-free, so the response wire and the
// ?status= filter literal coincide — see backend Domain/Enums/Enums.cs ExecutionStatus.
export type ExecutionStatus = "Concluído" | "Falha" | "Abortado";

/** One row of the per-stage comparison table (programmed vs. measured). */
export type ProfileComparisonRow = {
  tempProg: number;
  tempReal: number;
  /** Stage duration, already formatted. */
  timeProg: string;
  timeReal: string;
  /** e.g. "+12°C, -5s". */
  deviation: string;
};

/** A past run shown in the Relatórios → Execuções tab (list + detail). */
export type ExecutionReport = {
  id: string;
  programName: string;
  /** Already formatted, e.g. "09/05/25 - 14:30:12" */
  startedAt: string;
  /** Already formatted, e.g. "5m 12s" */
  duration: string;
  status: ExecutionStatus;
  // --- detail (Report Detail Exec) ---
  /** Operator who started the run. */
  user: string;
  /** Peak grill temperature reached, °C. */
  peakTemp: number;
  /** Peak output current, A. */
  peakCurrent: number;
  /** Programmed setpoint curve. */
  profile: ProfilePoint[];
  /** Measured curve from the run, charted against the setpoint. */
  realProfile: ProfilePoint[];
  /** Where the run faulted (failed runs only) — marked on the chart. */
  faultAt?: { t: number; temp: number };
  /** Programmed vs. measured, per stage. */
  comparison: ProfileComparisonRow[];
  /** Timeline of alerts/faults during the run (empty = "Nenhum alerta registrado."). */
  events: LogEvent[];
  /** Multi-signal trace captured during the run (voltages/current/temps/RPMs), charted in the
   *  detail view. Present only on a fetched detail; a run with no signals has an empty series. */
  trace?: FailureSnapshot;
  // --- Failure context (Bloco A #6): populated only on a failed/aborted run ---
  /** Human-readable reason the run failed/aborted (pt-BR), shown in the detail view. */
  failureReason?: string;
  /** Short fault code associated with the failure, e.g. "E-110" (muted, optional). */
  errorCode?: string;
  /** Id of the linked entry in the Erros report — opens that fault's detail when present. */
  linkedErrorId?: string;
};

// --- Alterações (audit log) --------------------------------------------------------------

export type ChangeAction = "Criado" | "Editado" | "Removido";

/** A program point row shown in a program-change detail. */
export type ChangePointRow = {
  index: number;
  temp: number;
  timeSec: number;
  ramp: string;
};

/** Which point fields a `changed` diff row flagged as differing (subset of temp/timeSec/ramp).
 *  Mirrors the backend ChangeDiffFieldWire — lets the diff table highlight the exact cells. */
export type ChangeDiffField = "temp" | "timeSec" | "ramp";

/** One `changed` diff row: the point before and after the edit, plus which fields differ. */
export type ChangedPointDiff = {
  before: ChangePointRow;
  after: ChangePointRow;
  /** Fields that actually changed (non-empty); empty array if the backend omitted it. */
  changedFields: ChangeDiffField[];
};

/** Detail payload for a change: either a settings change (bullets) or a program change. The
 *  program fields are derived from the backend's structured diff (`diff.points` split by status)
 *  plus the full before/after setpoint curves (`beforeCurve`/`afterCurve`). A creation surfaces
 *  the new curve and its points as `added`; a removal the old curve as `removed`; an edit both
 *  curves with the per-point `added`/`changed`/`removed` split. */
export type ChangeDetail =
  | { kind: "config"; bullets: string[] }
  | {
      kind: "program";
      /** Id of the program this change targets — lets the detail load the program's edit history. */
      programId?: string;
      /** Full setpoint curve after a creation/edit (from `afterCurve`; absent for a removal). */
      afterProfile?: ProfilePoint[];
      /** Full setpoint curve before an edit/removal (from `beforeCurve`; absent for a creation). */
      beforeProfile?: ProfilePoint[];
      /** Points added — every point of a creation, or the `status: "added"` rows of an edit. */
      added?: ChangePointRow[];
      /** Points changed by an edit (`status: "changed"`), with before → after and the changed fields. */
      changed?: ChangedPointDiff[];
      /** Points removed — every point of a removal, or the `status: "removed"` rows of an edit. */
      removed?: ChangePointRow[];
    };

/** A program/config change shown in the Relatórios → Alterações tab (list + detail). */
export type ChangeLogEntry = {
  id: string;
  /** Already formatted, e.g. "09/05/25 - 14:30:12" */
  at: string;
  /** Raw ISO 8601 timestamp (unformatted) — used as the `before` cursor when listing editions. */
  atIso?: string;
  action: ChangeAction;
  /** What was changed (e.g. a program name or a setting group). */
  target: string;
  /** Operator who made the change. */
  user: string;
  detail: ChangeDetail;
};

// --- Erros (fault log) -------------------------------------------------------------------

export type ErrorSeverity = "Crítico" | "Alerta" | "Aviso";

/** One measured signal captured around a fault, for the snapshot chart. */
export type SnapshotSeries = {
  name: string;
  unit: string;
  /** Stroke color (explicit — the series need to be told apart on the dark card). */
  color: string;
  /** Evenly-spaced samples across the fault window. */
  values: number[];
};

export type FailureSnapshot = {
  /** Window length, seconds (x-axis span). */
  durationSec: number;
  series: SnapshotSeries[];
};

/** One decoded sample of the board fault-snapshot buffer (GET_FAULT_SNAPSHOT) in engineering
 *  units (°C / V / A / RPM / % / W). Mirrors the backend BoardFaultSampleDto; `faultFlags` is a
 *  discrete bitfield (not plotted). */
export type FaultSnapshotSample = {
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
};

/** Board fault "black box": a burst of high-resolution telemetry the board captured around the
 *  instant a fault latched. `samples[triggerIndex]` is the fault sample (t = 0); sample i sits at
 *  `(i - triggerIndex) * sampleIntervalMs / 1000` seconds relative to it. */
export type FaultSnapshot = {
  /** Spacing between samples, ms (10 → 100 Hz). */
  sampleIntervalMs: number;
  /** Index of the sample captured at the fault instant (t = 0 on the chart). */
  triggerIndex: number;
  /** Firmware fault code (u16) the board latched. */
  faultCode: number;
  samples: FaultSnapshotSample[];
};

/** A fault/alert from the power board shown in the Relatórios → Erros tab (list + detail). */
export type ErrorLogEntry = {
  id: string;
  /** Already formatted, e.g. "09/05/25 - 14:30:12" */
  at: string;
  severity: ErrorSeverity;
  /** Short fault code, e.g. "E-101". */
  code: string;
  message: string;
  // --- detail (Report Detail Error) ---
  user: string;
  /** Program running when the fault happened. */
  programName: string;
  programId: string;
  ovenTemp: number;
  pcbTemp: number;
  /** "dd/mm/aa - HH:MM:SS" */
  startAt: string;
  endAt: string;
  /** VAC, or null when the backend has no measurement (nullable on the wire) — rendered as "—". */
  inputVoltage: number | null;
  outputVoltage: number;
  events: LogEvent[];
  /** Presentational fixed-width fault trace (the "Snapshot da Falha" chart). Always present. */
  snapshot: FailureSnapshot;
  /** Raw board "black box" around the failure instant — present only when the board captured one
   *  (the "Caixa-preta" section in the detail is shown only then). */
  boardSnapshot?: FaultSnapshot;
};

/** The fault types the power board can raise (severity + code + message). Shared by the Erros
 *  report and the Diagnóstico statistics (fault counts per type). */
export type FaultType = { severity: ErrorSeverity; code: string; message: string };

export const FAULT_CATALOG: FaultType[] = [
  { severity: "Crítico", code: "E-101", message: "Sobretemperatura na grelha (termopar tipo-K)" },
  { severity: "Crítico", code: "E-102", message: "Falha de leitura do termopar tipo-K" },
  { severity: "Crítico", code: "E-110", message: "Sobrecorrente detectada (sensor Hall)" },
  { severity: "Alerta", code: "E-120", message: "Tensão de saída fora da faixa (0–180 VDC)" },
  { severity: "Alerta", code: "E-130", message: "Perda de comunicação RS422 com a placa de potência" },
  { severity: "Alerta", code: "E-140", message: "Dissipador acima do limite (NTC)" },
  { severity: "Aviso", code: "E-150", message: "Ventoinha 1 com rotação abaixo do esperado" },
  { severity: "Aviso", code: "E-160", message: "Subtensão na entrada 127 VAC" },
];
