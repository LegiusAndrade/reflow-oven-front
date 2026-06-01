import type { ProfilePoint } from "./programs";

// --- Shared helpers ----------------------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, "0");

/** Seconds -> "45s" / "1min" / "2m 10s". */
function fmtDur(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  return s === 0 ? `${m}min` : `${m}m ${s}s`;
}

/** Signed value with unit, e.g. "+12°C", "-5s", "0s". */
function signed(n: number, unit: string): string {
  return `${n > 0 ? "+" : ""}${n}${unit}`;
}

/** A reflow-shaped run curve (ramp → soak → peak → cooldown) derived from a peak/duration. */
function genRunProfile(peak: number, totalSec: number): ProfilePoint[] {
  const at = (frac: number, temp: number) => ({ t: Math.round(totalSec * frac), temp: Math.round(temp) });
  return [
    { t: 0, temp: 25 },
    at(0.2, peak * 0.55),
    at(0.42, peak * 0.7),
    at(0.55, peak * 0.85),
    at(0.62, peak),
    at(0.72, peak * 0.8),
    at(0.86, peak * 0.45),
    at(1, 40),
  ];
}

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

const PROGRAM_NAMES = [
  "Perfil SMD Padrão",
  "Teste Placa Grande",
  "SMD Sem Chumbo 245ºC",
  "BGA Rework 250ºC",
  "Cura de Adesivo 120ºC",
  "Pré-aquecimento 90ºC",
];

const USERS = ["Lucas Silva", "Operador 1", "Admin", "Técnico"];

/** Build the per-stage comparison from a programmed profile, with small deterministic drift. */
function genComparison(profile: ProfilePoint[], seed: number): ProfileComparisonRow[] {
  const rows: ProfileComparisonRow[] = [];
  for (let i = 1; i < profile.length && rows.length < 4; i++) {
    const prev = profile[i - 1];
    const cur = profile[i];
    const segSec = cur.t - prev.t;
    const dTemp = (((seed + i) * 7) % 9) - 4; // -4..+4 °C
    const dTime = (((seed + i) * 5) % 7) - 3; // -3..+3 s
    const tempReal = cur.temp + dTemp;
    const segRealSec = Math.max(1, segSec + dTime);
    rows.push({
      tempProg: cur.temp,
      tempReal,
      timeProg: fmtDur(segSec),
      timeReal: fmtDur(segRealSec),
      deviation: `${signed(dTemp, "°C")}, ${signed(segRealSec - segSec, "s")}`,
    });
  }
  return rows;
}

/** Measured curve for a run: the setpoint with small drift; a failed run is cut at the fault
 *  (~62% through) and ends on a spike, whose point is returned to mark on the chart. */
function genRealRun(programmed: ProfilePoint[], failed: boolean, seed: number): { real: ProfilePoint[]; faultAt?: { t: number; temp: number } } {
  const drift = (i: number) => (((seed + i) * 7) % 9) - 4; // -4..+4 °C
  const full = programmed.map((p, i) => ({ t: p.t, temp: Math.max(20, p.temp + drift(i)) }));
  if (!failed) return { real: full };
  const cutIdx = Math.max(2, Math.round(programmed.length * 0.62));
  const real = full.slice(0, cutIdx);
  const last = real[real.length - 1];
  const faultAt = { t: last.t + 8, temp: last.temp + 18 + (seed % 8) };
  real.push(faultAt);
  return { real, faultAt };
}

/** Deterministic mock executions (list + detail) for the reports tab. */
export const MOCK_EXECUTIONS: ExecutionReport[] = Array.from({ length: 18 }, (_, i) => {
  const day = String((i % 28) + 1).padStart(2, "0");
  const hour = String((8 + (i % 12)) % 24).padStart(2, "0");
  const min = String((i * 7) % 60).padStart(2, "0");
  const totalSec = 180 + ((i * 53) % 600);
  const peakTemp = 180 + ((i * 23) % 100); // 180–279 °C
  const failed = i % 4 === 0;
  const profile = genRunProfile(peakTemp, totalSec);
  const run = genRealRun(profile, failed, i + 1);
  const startTime = `${hour}:${min}:0${i % 10}`;
  const events: LogEvent[] = failed
    ? [
        { at: startTime, kind: "alerta", message: "Temperatura do dissipador atingiu 80°C." },
        { at: `${hour}:${pad((Number(min) + 2) % 60)}:0${i % 10}`, kind: "falha", message: "Corrente de saída excedeu o limite. Processo interrompido." },
      ]
    : i % 3 === 0
      ? [{ at: startTime, kind: "info", message: "Pico de temperatura atingido dentro da tolerância." }]
      : [];
  return {
    id: `exec-${i + 1}`,
    programName: PROGRAM_NAMES[i % PROGRAM_NAMES.length],
    startedAt: `${day}/05/25 - ${startTime}`,
    duration: `${Math.floor(totalSec / 60)}m ${totalSec % 60}s`,
    status: failed ? "Falha" : "Concluído",
    user: USERS[i % USERS.length],
    peakTemp,
    peakCurrent: Number((6 + ((i * 13) % 50) / 10).toFixed(1)), // 6.0–10.9 A
    profile,
    realProfile: run.real,
    faultAt: run.faultAt,
    comparison: genComparison(profile, i + 1),
    events,
  };
});

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

const CHANGE_ACTIONS: ChangeAction[] = ["Criado", "Editado", "Removido"];
const RAMPS = ["Linear", "Fixo", "Parábola positiva", "Parábola negativa"];

const CONFIG_BULLETS = [
  ["Alterado tensão máxima de 110V para 200V"],
  ["Alterado corrente máxima de 8A para 12A", "Ativado o desligamento por sobretemperatura"],
  ["Alterado limite do dissipador de 75°C para 85°C"],
  ["Habilitada a comunicação RS422 a 115200 bps", "Alterado tempo de amostragem de 500ms para 250ms"],
];

/** Derive a point list (index, temp, stage duration, ramp) from a setpoint profile. */
function profileToPointRows(profile: ProfilePoint[]): ChangePointRow[] {
  return profile.slice(1).map((p, i) => ({
    index: i + 1,
    temp: p.temp,
    timeSec: p.t - profile[i].t,
    ramp: RAMPS[i % RAMPS.length],
  }));
}

/** Build a deterministic program-change detail, tailored to the action: a creation carries only
 *  the new curve/points, a removal only the old ones, an edit the before/after comparison. */
function genProgramDetail(action: ChangeAction, seed: number): Extract<ChangeDetail, { kind: "program" }> {
  const mk = (index: number, temp: number, timeSec: number, ramp: string): ChangePointRow => ({ index, temp, timeSec, ramp });
  const peakAfter = 230 + (seed % 5) * 8;
  const peakBefore = peakAfter - 30 - (seed % 3) * 10;
  const totalAfter = 360 + (seed % 4) * 30;
  const totalBefore = Math.max(220, totalAfter - 50);
  const afterProfile = genRunProfile(peakAfter, totalAfter);
  const beforeProfile = genRunProfile(peakBefore, totalBefore);

  if (action === "Criado") {
    return { kind: "program", afterProfile, added: profileToPointRows(afterProfile) };
  }
  if (action === "Removido") {
    return { kind: "program", beforeProfile, removed: profileToPointRows(beforeProfile) };
  }
  // Editado — before/after comparison with a few added + changed points.
  return {
    kind: "program",
    beforeProfile,
    afterProfile,
    added: [mk(8, 150, 60, "Linear"), mk(9, 220, 10, "Fixo")],
    changed: [
      { before: mk(2, 200, 20, RAMPS[seed % RAMPS.length]), after: mk(2, 100, 100, "Fixo"), changedFields: ["temp", "timeSec", "ramp"] },
      { before: mk(3, 260, 30, "Linear"), after: mk(4, 200, 50, "Linear"), changedFields: ["temp", "timeSec"] },
    ],
  };
}

/** Deterministic mock change log (list + detail). */
export const MOCK_CHANGES: ChangeLogEntry[] = Array.from({ length: 14 }, (_, i) => {
  const day = String((i % 28) + 1).padStart(2, "0");
  const hour = String((7 + (i % 14)) % 24).padStart(2, "0");
  const min = String((i * 11) % 60).padStart(2, "0");
  const sec = String((i * 13) % 60).padStart(2, "0");
  const action = CHANGE_ACTIONS[i % CHANGE_ACTIONS.length];
  // Every 4th entry is a settings change; the rest are program edits.
  const isConfig = i % 4 === 1;
  const detail: ChangeDetail = isConfig ? { kind: "config", bullets: CONFIG_BULLETS[i % CONFIG_BULLETS.length] } : genProgramDetail(action, i + 1);
  return {
    id: `chg-${i + 1}`,
    at: `${day}/05/25 - ${hour}:${min}:${sec}`,
    atIso: `2025-05-${day}T${hour}:${min}:${sec}`,
    action,
    target: isConfig ? "Configuração do sistema" : PROGRAM_NAMES[i % PROGRAM_NAMES.length],
    user: USERS[i % USERS.length],
    detail,
  };
});

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
  inputVoltage: number;
  outputVoltage: number;
  events: LogEvent[];
  snapshot: FailureSnapshot;
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

const SNAPSHOT_SAMPLES = 40;

/**
 * Synthesize the measured signals around a fault: output voltage/current ramp up, the current
 * spikes at the fault (~70% in) and voltage sags, while temperatures climb. Deterministic so
 * server and client render the same data.
 */
function genSnapshot(seed: number, durationSec = 60): FailureSnapshot {
  const n = SNAPSHOT_SAMPLES;
  const faultFrac = 0.7;
  // small deterministic wobble per series
  const wobble = (k: number, amp: number, phase: number) => amp * Math.sin((k / n) * Math.PI * 6 + seed + phase);

  const vIn: number[] = [];
  const vOut: number[] = [];
  const iOut: number[] = [];
  const tGrill: number[] = [];
  const tHeatsink: number[] = [];
  const rpmHeatsink: number[] = [];
  const rpmOven: number[] = [];

  for (let k = 0; k < n; k++) {
    const frac = k / (n - 1);
    const postFault = Math.max(0, frac - faultFrac) / (1 - faultFrac);
    // bell centered on the fault instant
    const bell = Math.exp(-(((frac - faultFrac) * 8) ** 2));

    vIn.push(Math.round(127 + wobble(k, 2.5, 0)));
    vOut.push(Math.round(Math.min(180, (180 * frac) / faultFrac) * (1 - 0.6 * postFault) + wobble(k, 2, 1)));
    iOut.push(Number((4 + 6 * frac + 9 * bell + wobble(k, 0.3, 2)).toFixed(1)));
    tGrill.push(Math.round(25 + 205 * frac + wobble(k, 3, 3)));
    tHeatsink.push(Math.round(30 + 60 * frac + wobble(k, 1.5, 4)));
    rpmHeatsink.push(Math.round(3000 - 300 * bell + wobble(k, 40, 5)));
    rpmOven.push(Math.round(2500 - 200 * bell + wobble(k, 35, 6)));
  }

  return {
    durationSec,
    series: [
      { name: "Tensão Entrada", unit: "VAC", color: "#60a5fa", values: vIn },
      { name: "Tensão Saída", unit: "VDC", color: "#22d3ee", values: vOut },
      { name: "Corrente Saída", unit: "A", color: "#f87171", values: iOut },
      { name: "Temp. Grelha", unit: "°C", color: "#fbbf24", values: tGrill },
      { name: "Temp. Dissipador", unit: "°C", color: "#a78bfa", values: tHeatsink },
      { name: "RPM Fan Dissipador", unit: "rpm", color: "#34d399", values: rpmHeatsink },
      { name: "RPM Fan Forno", unit: "rpm", color: "#f472b6", values: rpmOven },
    ],
  };
}

/** Deterministic mock fault log (list + detail). */
export const MOCK_ERRORS: ErrorLogEntry[] = Array.from({ length: 12 }, (_, i) => {
  const fault = FAULT_CATALOG[i % FAULT_CATALOG.length];
  const day = String((i % 28) + 1).padStart(2, "0");
  const hour = String((6 + (i % 16)) % 24).padStart(2, "0");
  const min = (i * 17) % 60;
  const sec = (i * 7) % 60;
  const startTime = `${hour}:${pad(min)}:${pad(sec)}`;
  const endMin = (min + 4) % 60;
  const endTime = `${hour}:${pad(endMin)}:${pad((sec + 20) % 60)}`;
  return {
    id: `err-${i + 1}`,
    at: `${day}/05/25 - ${startTime}`,
    severity: fault.severity,
    code: fault.code,
    message: fault.message,
    user: USERS[i % USERS.length],
    programName: PROGRAM_NAMES[i % PROGRAM_NAMES.length],
    programId: `PRG-${String((i % 6) + 1).padStart(3, "0")}`,
    ovenTemp: 200 + ((i * 11) % 60),
    pcbTemp: 80 + ((i * 7) % 40),
    startAt: `${day}/05/25 - ${startTime}`,
    endAt: `${day}/05/25 - ${endTime}`,
    inputVoltage: 110 + ((i * 3) % 20),
    outputVoltage: 150 + ((i * 9) % 40),
    events: [
      { at: startTime, kind: "falha", message: `${fault.message}. Processo interrompido.` },
      { at: `${hour}:${pad((min + 1) % 60)}:${pad(sec)}`, kind: "info", message: "Corrente de saída estabilizada ao normal." },
      { at: endTime, kind: "alerta", message: "Temperatura do dissipador atingiu 80°C." },
    ],
    snapshot: genSnapshot(i + 1),
  };
});
