export type ExecutionStatus = "Concluído" | "Falha";

/** A past run shown in the Relatórios → Execuções tab. */
export type ExecutionReport = {
  id: string;
  programName: string;
  /** Already formatted, e.g. "09/05/25 - 14:30:12" */
  startedAt: string;
  /** Already formatted, e.g. "5m 12s" */
  duration: string;
  status: ExecutionStatus;
};

const PROGRAM_NAMES = [
  "Perfil SMD Padrão",
  "Teste Placa Grande",
  "SMD Sem Chumbo 245ºC",
  "BGA Rework 250ºC",
  "Cura de Adesivo 120ºC",
  "Pré-aquecimento 90ºC",
];

/** Deterministic mock executions for the reports table. */
export const MOCK_EXECUTIONS: ExecutionReport[] = Array.from({ length: 18 }, (_, i) => {
  const day = String((i % 28) + 1).padStart(2, "0");
  const hour = String((8 + (i % 12)) % 24).padStart(2, "0");
  const min = String((i * 7) % 60).padStart(2, "0");
  const totalSec = 180 + ((i * 53) % 600);
  return {
    id: `exec-${i + 1}`,
    programName: PROGRAM_NAMES[i % PROGRAM_NAMES.length],
    startedAt: `${day}/05/25 - ${hour}:${min}:0${i % 10}`,
    duration: `${Math.floor(totalSec / 60)}m ${totalSec % 60}s`,
    status: i % 4 === 0 ? "Falha" : "Concluído",
  };
});

// --- Alterações (audit log) --------------------------------------------------------------

export type ChangeAction = "Criado" | "Editado" | "Removido";

/** A program/config change shown in the Relatórios → Alterações tab. */
export type ChangeLogEntry = {
  id: string;
  /** Already formatted, e.g. "09/05/25 - 14:30:12" */
  at: string;
  action: ChangeAction;
  /** What was changed (e.g. a program name). */
  target: string;
  /** Operator who made the change. */
  user: string;
};

const CHANGE_ACTIONS: ChangeAction[] = ["Criado", "Editado", "Removido"];
const USERS = ["Lucas", "Operador 1", "Admin", "Técnico"];

/** Deterministic mock change log. */
export const MOCK_CHANGES: ChangeLogEntry[] = Array.from({ length: 14 }, (_, i) => {
  const day = String((i % 28) + 1).padStart(2, "0");
  const hour = String((7 + (i % 14)) % 24).padStart(2, "0");
  const min = String((i * 11) % 60).padStart(2, "0");
  const sec = String((i * 13) % 60).padStart(2, "0");
  return {
    id: `chg-${i + 1}`,
    at: `${day}/05/25 - ${hour}:${min}:${sec}`,
    action: CHANGE_ACTIONS[i % CHANGE_ACTIONS.length],
    target: PROGRAM_NAMES[i % PROGRAM_NAMES.length],
    user: USERS[i % USERS.length],
  };
});

// --- Erros (fault log) -------------------------------------------------------------------

export type ErrorSeverity = "Crítico" | "Alerta" | "Aviso";

/** A fault/alert from the power board shown in the Relatórios → Erros tab. */
export type ErrorLogEntry = {
  id: string;
  /** Already formatted, e.g. "09/05/25 - 14:30:12" */
  at: string;
  severity: ErrorSeverity;
  /** Short fault code, e.g. "E-101". */
  code: string;
  message: string;
};

const FAULTS: { severity: ErrorSeverity; code: string; message: string }[] = [
  { severity: "Crítico", code: "E-101", message: "Sobretemperatura na grelha (termopar tipo-K)" },
  { severity: "Crítico", code: "E-102", message: "Falha de leitura do termopar tipo-K" },
  { severity: "Crítico", code: "E-110", message: "Sobrecorrente detectada (sensor Hall)" },
  { severity: "Alerta", code: "E-120", message: "Tensão de saída fora da faixa (0–180 VDC)" },
  { severity: "Alerta", code: "E-130", message: "Perda de comunicação RS422 com a placa de potência" },
  { severity: "Alerta", code: "E-140", message: "Dissipador acima do limite (NTC)" },
  { severity: "Aviso", code: "E-150", message: "Ventoinha 1 com rotação abaixo do esperado" },
  { severity: "Aviso", code: "E-160", message: "Subtensão na entrada 127 VAC" },
];

/** Deterministic mock fault log. */
export const MOCK_ERRORS: ErrorLogEntry[] = Array.from({ length: 12 }, (_, i) => {
  const fault = FAULTS[i % FAULTS.length];
  const day = String((i % 28) + 1).padStart(2, "0");
  const hour = String((6 + (i % 16)) % 24).padStart(2, "0");
  const min = String((i * 17) % 60).padStart(2, "0");
  const sec = String((i * 7) % 60).padStart(2, "0");
  return {
    id: `err-${i + 1}`,
    at: `${day}/05/25 - ${hour}:${min}:${sec}`,
    severity: fault.severity,
    code: fault.code,
    message: fault.message,
  };
});
