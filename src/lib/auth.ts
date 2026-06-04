import { api, ApiError, getToken, setToken, type Role, type Theme, type RunSeriesDto } from "./api";
import { createJsonStore } from "./localStore";
import { logger } from "./logger";
import { showToast } from "./toast";

export type { Role, Theme, RunSeriesDto }; // "Admin" | "Regular" | "Master"

// `theme` is always present on a real session (defaults "system"); `chartSeries` is omitted for the
// technician/calibration session. `mustChangePassword` is true while the user is still on the
// system-issued provisional password (so the UI can force a change). login()/refreshSession() store
// the SessionDto verbatim, so both hydrate the per-user prefs and this flag for free.
export type Session = {
  id: string;
  name: string;
  role: Role;
  loginAt: number;
  calibration?: boolean;
  mustChangePassword?: boolean;
  theme?: Theme;
  chartSeries?: RunSeriesDto;
};

/** Logged-in session, cached in localStorage. The source of truth is the JWT (see api.ts). */
export const sessionStore = createJsonStore<Session | null>("reflow:session:v1", null);

/** Authenticate against the backend; on success stores the JWT and the session.
 *  `kind: "connection"` flags a transport failure (status 0) so the login screen can show the
 *  troubleshooting help block instead of the short inline row that clips long messages. */
export async function login(
  name: string,
  password: string
): Promise<{ ok: boolean; error?: string; redirect?: string; kind?: "connection" }> {
  try {
    const result = await api.login(name.trim(), password);
    if (!result.ok || !result.token || !result.session) {
      return { ok: false, error: result.error ?? "Falha no login." };
    }
    setToken(result.token);
    sessionStore.set(result.session);
    return { ok: true, redirect: "/" };
  } catch (e) {
    // A connection failure (status 0) carries a long, multi-sentence guidance message that the
    // short inline row clips. Flag it as kind "connection" so the form shows a dedicated help block
    // (full message + possible fixes) rather than the toast. Credential errors (401) are short and
    // stay inline next to the password field.
    if (e instanceof ApiError && e.status === 0) {
      logger.error("auth", "Falha de conexão no login", e);
      return { ok: false, error: e.message, kind: "connection" };
    }
    return { ok: false, error: e instanceof ApiError ? e.message : "Falha no login." };
  }
}

export function logout(): void {
  // Best-effort server notice for the audit/security log; fire before we drop the token so the
  // request still carries it. Never blocks or fails the local logout.
  void api.logout().catch(() => {});
  setToken(null);
  sessionStore.set(null);
}

/** Re-validate the stored token against the API; clears the session if it is missing/expired.
 *  AppShell reacts to the resulting sessionStore change to apply the per-user theme/prefs. */
export async function refreshSession(): Promise<void> {
  if (!getToken()) {
    sessionStore.set(null);
    return;
  }
  try {
    sessionStore.set(await api.me());
  } catch (e) {
    // Only a real auth rejection should drop the session. A transient network/5xx error
    // (e.g. the device booted before the backend) must keep the cached session, otherwise we
    // bounce the user to /login on every hiccup.
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) logout();
    // Use the ApiError's own message so every status-0 source shares one dedupe key (see showToast).
    else if (e instanceof ApiError && e.status === 0) {
      logger.error("auth", "Falha de conexão ao revalidar a sessão", e);
      showToast(e.message, "error");
    }
  }
}

/** Admin-level privileges. Master is the dev superuser — a superset of Admin — so it passes
 *  every Admin gate. Use this instead of `role === "Admin"` so Master is never locked out. */
export function canAdminister(role: Role): boolean {
  return role === "Admin" || role === "Master";
}

/** The Master (single dev/superuser account) — unlocks the Diagnóstico → Log tab. */
export function isMaster(role: Role): boolean {
  return role === "Master";
}

/**
 * Route access by role. Admin/Master reach everything; a Regular user may only reach the home page
 * and Programas (and its sub-routes). `/login` is never gated (handled outside the shell).
 */
export function canAccess(role: Role, pathname: string): boolean {
  if (canAdminister(role)) return true;
  return pathname === "/" || pathname === "/programas" || pathname === "/notificacoes";
}

/** Only Admin/Master may create/edit/delete programs; Regular is view-only. */
export function canManagePrograms(role: Role): boolean {
  return canAdminister(role);
}
