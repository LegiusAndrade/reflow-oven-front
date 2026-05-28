export type LogLevel = "INFO" | "Aviso" | "Erro";

export type LogEntry = {
  /** "dd/mm/aa HH:MM:SS" */
  at: string;
  level: LogLevel;
  message: string;
};

const MESSAGES: { level: LogLevel; message: string }[] = [
  { level: "INFO", message: "Sistema iniciado" },
  { level: "INFO", message: "Comunicação RS422 estabelecida (115200 bps)" },
  { level: "INFO", message: "Leitura do termopar tipo-K: ok" },
  { level: "INFO", message: "Programa 'Perfil SMD Padrão' carregado" },
  { level: "INFO", message: "Processo iniciado pelo usuário" },
  { level: "Aviso", message: "Temperatura do dissipador atingiu 80°C" },
  { level: "Aviso", message: "Ventoinha 1 abaixo da rotação esperada" },
  { level: "Aviso", message: "Subtensão na entrada 127 VAC" },
  { level: "Erro", message: "Sobrecorrente detectada (sensor Hall)" },
  { level: "Erro", message: "Perda de comunicação RS422 com a placa de potência" },
  { level: "INFO", message: "Calibração do sensor de corrente aplicada" },
  { level: "INFO", message: "Configurações salvas" },
];

/** Deterministic mock system log (newest first). TODO(backend): stream the real log. */
export const MOCK_LOGS: LogEntry[] = Array.from({ length: 40 }, (_, i) => {
  const m = MESSAGES[i % MESSAGES.length];
  const day = String(((39 - i) % 28) + 1).padStart(2, "0");
  const hh = String((6 + (i % 16)) % 24).padStart(2, "0");
  const mm = String((i * 13) % 60).padStart(2, "0");
  const ss = String((i * 7) % 60).padStart(2, "0");
  return { at: `${day}/05/25 ${hh}:${mm}:${ss}`, level: m.level, message: m.message };
});
