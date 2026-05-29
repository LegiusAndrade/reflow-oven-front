/**
 * Database maintenance (mock stage): clearing historical records and a factory reset.
 *
 * Inactive-user removal hits the real `usersStore`. The log/record categories are mock
 * constants (MOCK_EXECUTIONS/CHANGES/ERRORS/LOGS), so "clearing" them flags the category in
 * this store and the screens that show those records (Relatórios, the system-log modal)
 * honor the flag — they then render empty. TODO(backend): actually delete the records on the
 * board/server instead of flagging them client-side.
 */

import { createJsonStore } from "./localStore";
import { usersStore } from "./users";

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
