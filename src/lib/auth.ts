import { api, ApiError, getToken, setToken, type Role } from "./api";
import { createJsonStore } from "./localStore";

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
  } catch {
    logout();
  }
}

/**
 * Route access by role. Admin reaches everything; a Regular user may only reach the home page
 * and Programas (and its sub-routes). `/login` is never gated (handled outside the shell).
 */
export function canAccess(role: Role, pathname: string): boolean {
  if (role === "Admin") return true;
  return pathname === "/" || pathname === "/programas";
}

/** Only Admin may create/edit/delete programs; Regular is view-only. */
export function canManagePrograms(role: Role): boolean {
  return role === "Admin";
}
