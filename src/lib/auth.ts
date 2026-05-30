import { api, ApiError, getToken, setToken, type Role } from "./api";
import { createJsonStore } from "./localStore";
import { showToast } from "./toast";

export type { Role }; // "Admin" | "Regular"

export type Session = { id: string; name: string; role: Role; loginAt: number; calibration?: boolean };

/** Logged-in session, cached in localStorage. The source of truth is the JWT (see api.ts). */
export const sessionStore = createJsonStore<Session | null>("reflow:session:v1", null);

/** Authenticate against the backend; on success stores the JWT and the session. */
export async function login(name: string, password: string): Promise<{ ok: boolean; error?: string; redirect?: string }> {
  try {
    const result = await api.login(name.trim(), password);
    if (!result.ok || !result.token || !result.session) {
      return { ok: false, error: result.error ?? "Falha no login." };
    }
    setToken(result.token);
    sessionStore.set(result.session);
    return { ok: true, redirect: "/" };
  } catch (e) {
    return { ok: false, error: e instanceof ApiError ? e.message : "Não foi possível conectar ao servidor." };
  }
}

export function logout(): void {
  // Best-effort server notice for the audit/security log; fire before we drop the token so the
  // request still carries it. Never blocks or fails the local logout.
  void api.logout().catch(() => {});
  setToken(null);
  sessionStore.set(null);
}

/** Re-validate the stored token against the API; clears the session if it is missing/expired. */
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
    else if (e instanceof ApiError && e.status === 0) showToast("Não foi possível conectar ao servidor.");
  }
}

/**
 * Route access by role. Admin reaches everything; a Regular user may only reach the home page
 * and Programas (and its sub-routes). `/login` is never gated (handled outside the shell).
 */
export function canAccess(role: Role, pathname: string): boolean {
  if (role === "Admin") return true;
  return pathname === "/" || pathname === "/programas" || pathname === "/notificacoes";
}

/** Only Admin may create/edit/delete programs; Regular is view-only. */
export function canManagePrograms(role: Role): boolean {
  return role === "Admin";
}
