export type LogLevel = "INFO" | "Aviso" | "Erro";

export type LogEntry = {
  /** "dd/mm/aa HH:MM:SS" */
  at: string;
  level: LogLevel;
  message: string;
};
