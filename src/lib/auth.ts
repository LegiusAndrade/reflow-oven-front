import { createJsonStore } from "./localStore";
import { usersStore, type UserType } from "./users";

export type Role = UserType; // "Admin" | "Regular"

export type Session = { id: string; name: string; role: Role; loginAt: number; calibration?: boolean };

/** Logged-in user, persisted in localStorage (mock stage). TODO(backend): real auth/session. */
export const sessionStore = createJsonStore<Session | null>("reflow:session:v1", null);

/** Mock password for every user. TODO(backend): validate against the API. */
const MOCK_PASSWORD = "1234";

// Hidden technician login → opens the secret calibration menu (never shown in the UI hint).
const SECRET_USER = "calibracao";
const SECRET_PASSWORD = "calibra";

export function login(name: string, password: string): { ok: boolean; error?: string; redirect?: string } {
  const key = name.trim().toLowerCase();
  if (!key) return { ok: false, error: "Informe o usuário." };

  // Secret calibration access — bypasses the normal user store.
  if (key === SECRET_USER) {
    if (password !== SECRET_PASSWORD) return { ok: false, error: "Senha incorreta." };
    sessionStore.set({ id: "calibration", name: "Calibração", role: "Admin", loginAt: Date.now(), calibration: true });
    return { ok: true, redirect: "/calibracao" };
  }

  const user = usersStore.get().find((u) => u.name.toLowerCase() === key);
  if (!user) return { ok: false, error: "Usuário não encontrado." };
  if (user.status === "Inativo") return { ok: false, error: "Usuário inativo." };
  if (password !== MOCK_PASSWORD) return { ok: false, error: "Senha incorreta." };
  sessionStore.set({ id: user.id, name: user.name, role: user.type, loginAt: Date.now() });
  return { ok: true, redirect: "/" };
}

export function logout() {
  sessionStore.set(null);
}

/**
 * Route access by role. Admin reaches everything; a Regular user may only reach the home page
 * and Programas (and its sub-routes). `/login` is never gated (handled outside the shell).
 */
export function canAccess(role: Role, pathname: string): boolean {
  if (role === "Admin") return true;
  // Regular is view-only: home and the Programas list, but not create/edit (novo/editar).
  return pathname === "/" || pathname === "/programas";
}

/** Only Admin may create/edit/delete programs; Regular is view-only. */
export function canManagePrograms(role: Role): boolean {
  return role === "Admin";
}
