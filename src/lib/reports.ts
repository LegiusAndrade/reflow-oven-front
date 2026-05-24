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
