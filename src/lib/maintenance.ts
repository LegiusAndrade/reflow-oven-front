/**
 * Database maintenance (mock stage): clearing historical records and a factory reset.
 *
 * Inactive-user removal hits the real `usersStore`. The log/record categories use mock placeholder
 * counts (MOCK_RECORD_COUNTS), so "clearing" them flags the category in this store and the screens
 * that show those records (Relatórios, the system-log modal) honor the flag — they then render empty.
 * TODO(backend): real per-category counts via GET /api/maintenance/overview + actual server-side
 * deletion (see the backend TODO) — then drop the mock counts and the local flag.
 */

import { api, setToken } from "./api";
import { sessionStore } from "./auth";
import { createJsonStore } from "./localStore";
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

/** Mock placeholder record counts for the log/record categories — the Limpeza is mock-stage; real
 *  per-category counts come from the backend once GET /api/maintenance/overview is implemented (see the
 *  backend TODO). Only the count drives the modal, so the elaborate mock records that produced these
 *  were removed. */
const MOCK_RECORD_COUNTS: Record<Exclude<CleanupId, "inativos">, number> = {
  execucoes: 18,
  alteracoes: 14,
  falhas: 12,
  logs: 40,
};

/** How many records a category currently holds (a cleared log category reports 0). */
export function recordCount(id: CleanupId, state: CleanupState, users: User[]): number {
  if (id === "inativos") return users.filter((u) => u.status === "Inativo").length;
  return state[id] ? 0 : MOCK_RECORD_COUNTS[id];
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

/** Run a real cleanup over the selected categories (deletes server-side), then reflect it locally. */
export async function performCleanup(ids: CleanupId[]): Promise<void> {
  if (ids.length === 0) return;
  await api.cleanup(ids);
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

/**
 * Wipe the device to a clean factory state on the backend (one Admin, one default program,
 * default settings, empty history), then clear the local session. The caller redirects to /login.
 */
export async function factoryReset(): Promise<void> {
  await api.factoryReset("RESETAR");
  // Clear auth first: the server is already wiped, so a failure in the local cleanup below must
  // not leave a live token behind (mirrors logout(), which clears the token before other state).
  setToken(null);
  sessionStore.set(null);
  cleanupStore.set({ execucoes: true, alteracoes: true, falhas: true, logs: true });
}
