/**
 * Database maintenance. Real per-category record counts + DB size come from GET /api/maintenance/overview
 * (see ManutencaoTab, which fetches it directly); clearing those categories and the factory reset both
 * delete server-side. This module keeps the cleanup-id type, the byte formatter, and the two mutations.
 */

import { api, setToken } from "./api";
import { sessionStore } from "./auth";
import { usersStore } from "./users";

/** Clearable categories. "execucoes"/"falhas"/"logs" are record tables; "programas" drops saved
 *  programs; "inativos" removes inactive users; "usuarios" removes active users EXCEPT the signed-in
 *  one (enforced server-side). "alteracoes" (the audit log) is intentionally absent — protected (#8).
 *  Counts for every id come from GET /api/maintenance/overview (programas/usuarios are pending backend). */
export type CleanupId = "execucoes" | "falhas" | "logs" | "programas" | "inativos" | "usuarios";

/** Human-readable byte size, e.g. "1.4 MB" / "240 KB" / "12 B". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/** Run a real cleanup over the selected categories (deletes server-side); returns how many records the
 *  backend removed. User removals are also mirrored in the local cache so the Usuários list updates at
 *  once — the backend stays the source of truth (it enforces the "spare the signed-in user" rule for
 *  active users from the JWT; this just reflects it). Programs are paged elsewhere, so the gallery
 *  reconciles on its next load rather than here. */
export async function performCleanup(ids: CleanupId[]): Promise<number> {
  if (ids.length === 0) return 0;
  const res = await api.cleanup(ids);
  const dropInactive = ids.includes("inativos");
  const dropActive = ids.includes("usuarios");
  if (dropInactive || dropActive) {
    const selfId = sessionStore.get()?.id;
    usersStore.update((list) =>
      list.filter((u) => {
        if (u.status === "Inativo") return !dropInactive;
        // active user — cleared by "usuarios", but never the one currently signed in
        return !dropActive || u.id === selfId;
      })
    );
  }
  return res?.deleted ?? 0;
}

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
}
