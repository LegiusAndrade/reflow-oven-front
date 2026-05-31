/**
 * Lightweight client-side logger. Prints structured, timestamped, colour-coded lines to the
 * browser console and keeps a small in-memory ring buffer (so a future log viewer can read it).
 * Captures what matters for debugging the UI: route changes, auth events and API/SignalR errors.
 */
import { LOG_RING_MAX } from "./limits";

export type LogLevel = "info" | "warn" | "error";

export interface LogEntry {
  at: number;
  level: LogLevel;
  scope: string;
  message: string;
  data?: unknown;
}

const ring: LogEntry[] = [];
const listeners = new Set<() => void>();

const COLOR: Record<LogLevel, string> = {
  info: "color:#38bdf8",
  warn: "color:#f59e0b",
  error: "color:#ef4444",
};

const pad = (n: number, w = 2) => String(n).padStart(w, "0");
const stamp = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;

function emit(level: LogLevel, scope: string, message: string, data?: unknown): void {
  const at = Date.now();
  ring.push({ at, level, scope, message, data });
  if (ring.length > LOG_RING_MAX) ring.shift();
  listeners.forEach((l) => l());
  if (typeof console !== "undefined") {
    const args: unknown[] = [`%c${stamp(new Date(at))}%c [${scope}] ${message}`, "color:#888", COLOR[level]];
    if (data !== undefined) args.push(data);
    (console[level] ?? console.log)(...args);
  }
}

export const logger = {
  info: (scope: string, message: string, data?: unknown) => emit("info", scope, message, data),
  warn: (scope: string, message: string, data?: unknown) => emit("warn", scope, message, data),
  error: (scope: string, message: string, data?: unknown) => emit("error", scope, message, data),
  /** Recent entries, oldest first (capped at LOG_RING_MAX). */
  history: (): readonly LogEntry[] => ring,
  /** Subscribe to new entries (for a live log viewer). */
  subscribe: (cb: () => void): (() => void) => {
    listeners.add(cb);
    return () => void listeners.delete(cb);
  },
  /** Drop every buffered entry (the live log viewer's "Limpar"). */
  clear: (): void => {
    ring.length = 0;
    listeners.forEach((l) => l());
  },
};
