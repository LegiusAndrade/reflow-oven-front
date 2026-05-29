/**
 * Database maintenance (mock stage): clearing historical records and a factory reset.
 *
 * Inactive-user removal hits the real `usersStore`. The log/record categories are mock
 * constants (MOCK_EXECUTIONS/CHANGES/ERRORS/LOGS), so "clearing" them flags the category in
 * this store and the screens that show those records (Relatórios, the system-log modal)
 * honor the flag — they then render empty. TODO(backend): actually delete the records on the
 * board/server instead of flagging them client-side.
 */

import { sessionStore } from "./auth";
import { createJsonStore } from "./localStore";
import { MOCK_LOGS } from "./logs";
import type { Program } from "./programs";
import { resetPrograms } from "./programStore";
import { MOCK_CHANGES, MOCK_ERRORS, MOCK_EXECUTIONS } from "./reports";
import { DEFAULT_SETTINGS, settingsStore } from "./settings";
import { type User, usersStore } from "./users";

/** Clearable record categories. "inativos" is a real user removal; the rest are log/record flags. */
export type CleanupId = "execucoes" | "alteracoes" | "falhas" | "logs" | "inativos";

/** Per-category "has been cleared" flags (for the log/record categories). */
export type CleanupState = Partial<Record<CleanupId, boolean>>;

export const cleanupStore = createJsonStore<CleanupState>("reflow:maintenance:cleared:v1", {});

/** The log/record categories whose visibility is driven by the cleared flags. */
export const LOG_CLEANUP_IDS: CleanupId[] = ["execucoes", "alteracoes", "falhas", "logs"];

/** Whether a log/record category is currently flagged as cleared (reactive via `cleanupStore`). */
export function isCleared(state: CleanupState, id: CleanupId): boolean {
  return Boolean(state[id]);
}

// --- Sizes (mock) ----------------------------------------------------------------------

/** Approximate stored size of one record per category, in bytes (mock estimate). */
export const BYTES_PER_RECORD: Record<CleanupId, number> = {
  execucoes: 8_400,
  alteracoes: 3_600,
  falhas: 12_800,
  logs: 240,
  inativos: 1_100,
};

/** Baseline DB size (schema, settings, programs, active users) before clearable records. */
const DB_BASE_BYTES = 384 * 1024;

const ALL_CLEANUP_IDS: CleanupId[] = ["execucoes", "alteracoes", "falhas", "logs", "inativos"];

/** How many records a category currently holds (a cleared log category reports 0). */
export function recordCount(id: CleanupId, state: CleanupState, users: User[]): number {
  switch (id) {
    case "execucoes":
      return state.execucoes ? 0 : MOCK_EXECUTIONS.length;
    case "alteracoes":
      return state.alteracoes ? 0 : MOCK_CHANGES.length;
    case "falhas":
      return state.falhas ? 0 : MOCK_ERRORS.length;
    case "logs":
      return state.logs ? 0 : MOCK_LOGS.length;
    case "inativos":
      return users.filter((u) => u.status === "Inativo").length;
  }
}

/** Estimated stored size of a category, in bytes (mock). */
export function recordSizeBytes(id: CleanupId, count: number): number {
  return count * BYTES_PER_RECORD[id];
}

/** Total database size in bytes: a fixed baseline plus the live record sizes (mock). */
export function databaseSizeBytes(state: CleanupState, users: User[]): number {
  return DB_BASE_BYTES + ALL_CLEANUP_IDS.reduce((sum, id) => sum + recordSizeBytes(id, recordCount(id, state, users)), 0);
}

/** Human-readable byte size, e.g. "1.4 MB" / "240 KB" / "12 B". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/** Run a cleanup over the selected categories: remove inactive users for real, flag the rest. */
export function performCleanup(ids: CleanupId[]): void {
  if (ids.includes("inativos")) {
    usersStore.update((list) => list.filter((u) => u.status !== "Inativo"));
  }
  const logCats = ids.filter((id) => id !== "inativos");
  if (logCats.length) {
    cleanupStore.update((prev) => {
      const next = { ...prev };
      for (const id of logCats) next[id] = true;
      return next;
    });
  }
}

// --- Factory reset ---------------------------------------------------------------------

/** The single Admin account left after a factory reset (logs in with the mock password). */
const FACTORY_ADMIN: User = {
  id: "user-admin",
  name: "Admin",
  email: "admin@reflow.local",
  type: "Admin",
  status: "Ativo",
  createdAt: "01/01/25 - 00:00:00",
  lastLogin: "—",
  events: [],
};

/** The single default program left after a factory reset. */
const FACTORY_PROGRAM: Program = {
  id: "factory-default",
  name: "Perfil Padrão",
  runCount: 0,
  lastUsed: "Nunca",
  profile: [
    { t: 0, temp: 25 },
    { t: 90, temp: 150 },
    { t: 180, temp: 180 },
    { t: 210, temp: 217 },
    { t: 240, temp: 245 },
    { t: 270, temp: 210 },
    { t: 330, temp: 120 },
    { t: 390, temp: 45 },
  ],
};

/**
 * Wipe the device to a clean factory state: one Admin user, one default program, default
 * settings, empty history/logs, and no session (the caller should redirect to /login).
 * TODO(backend): perform the reset on the board/server.
 */
export function factoryReset(): void {
  usersStore.set([FACTORY_ADMIN]);
  resetPrograms([FACTORY_PROGRAM]);
  settingsStore.set(DEFAULT_SETTINGS);
  // A factory unit has no history — flag every log/record category as cleared.
  cleanupStore.set({ execucoes: true, alteracoes: true, falhas: true, logs: true });
  sessionStore.set(null);
}
