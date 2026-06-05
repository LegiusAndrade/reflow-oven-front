import { api, ApiError, fetchWsToken, getToken, setToken, type LoginResult, type Role, type Theme, type RunSeriesDto } from "./api";
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
/** POST the credentials to the BFF login route (it authenticates against the backend and sets the
 *  httpOnly cookie); returns the parsed LoginResult. A transport failure to our own route → connection. */
async function bffLogin(username: string, password: string): Promise<LoginResult & { kind?: "connection" }> {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    return (await res.json()) as LoginResult & { kind?: "connection" };
  } catch {
    return { ok: false, error: "Não foi possível conectar ao servidor. Verifique a rede e se o servidor está ligado.", kind: "connection" };
  }
}

export async function login(
  name: string,
  password: string
): Promise<{ ok: boolean; error?: string; redirect?: string; kind?: "connection" }> {
  const result = await bffLogin(name.trim(), password);
  if (!result.ok || !result.token || !result.session) {
    // A connection failure carries a long, multi-sentence guidance message → the login screen shows a
    // dedicated help block (full message + fixes). Credential errors (401) stay inline.
    if (result.kind === "connection") {
      logger.error("auth", "Falha de conexão no login", result.error);
      return { ok: false, error: result.error ?? "Falha no login.", kind: "connection" };
    }
    return { ok: false, error: result.error ?? "Falha no login." };
  }
  setToken(result.token); // in-memory (transient); the httpOnly cookie is the persistent store
  sessionStore.set(result.session);
  return { ok: true, redirect: "/" };
}

export async function logout(): Promise<void> {
  // Clear the httpOnly cookie FIRST (await it, via the BFF route that also sends the backend its audit
  // notice) so the post-logout redirect to /login isn't bounced back by the middleware — which would
  // still see the cookie. Then drop the local session/token. Never throws.
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  setToken(null);
  sessionStore.set(null);
}

/** Re-validate the stored token against the API; clears the session if it is missing/expired.
 *  AppShell reacts to the resulting sessionStore change to apply the per-user theme/prefs. */
export async function refreshSession(): Promise<void> {
  // Hydrate the in-memory token from the httpOnly cookie (lost on a hard reload; survives SPA nav).
  // ws-token is a local Next route, so it succeeds even when the backend is down — only a missing
  // cookie (logged out) returns null.
  if (!getToken()) {
    const token = await fetchWsToken();
    if (token) setToken(token);
  }
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
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) void logout();
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
 * Route access by role. Admin/Master reach everything; a Regular user (and the technician) may reach
 * the home page, Programas and Notificações. A `calibration` session additionally reaches Configurações
 * — for the Calibração tab only (gated by the session, not the role; everything else there is admin-only
 * and 403s on the server). `/login` is never gated (handled outside the shell).
 */
export function canAccess(role: Role, pathname: string, calibration = false): boolean {
  if (canAdminister(role)) return true;
  if (calibration && pathname === "/configuracoes") return true;
  return pathname === "/" || pathname === "/programas" || pathname === "/notificacoes";
}

/** Only Admin/Master may create/edit/delete programs; Regular is view-only. */
export function canManagePrograms(role: Role): boolean {
  return canAdminister(role);
}
