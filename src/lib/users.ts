import { api, type UserDto } from "./api";
import type { JsonStore } from "./localStore";

export type UserType = "Admin" | "Regular";
export type UserStatus = "Ativo" | "Inativo";

/** A counted activity shown in the user-detail "Eventos" list. */
export type UserEvent = { label: string; count: number };

export type User = {
  id: string;
  name: string;
  email: string;
  type: UserType;
  status: UserStatus;
  /** "dd/mm/aa - HH:MM:SS" */
  createdAt: string;
  /** "dd/mm/aa - HH:MM" or "—" */
  lastLogin: string;
  events: UserEvent[];
};

/** Password assigned to users created from the (still password-less) form. TODO(backend): collect it. */
const DEFAULT_NEW_PASSWORD = "reflow1234";

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO → "dd/mm/aa - HH:MM(:SS)", or "—" when absent. */
function formatStamp(iso: string | null | undefined, withSeconds: boolean): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const base = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)} - ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return withSeconds ? `${base}:${pad(d.getSeconds())}` : base;
}

const toUser = (dto: UserDto): User => ({
  id: dto.id,
  name: dto.name,
  email: dto.email,
  type: dto.type,
  status: dto.status,
  createdAt: formatStamp(dto.createdAt, true),
  lastLogin: formatStamp(dto.lastLogin, false),
  events: dto.events,
});

// --- API-backed cache (JsonStore-shaped for useStore) ----------------------------------
const EMPTY: User[] = [];
let users: User[] = EMPTY;
let loaded = false;
let loading = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

async function reloadUsers(): Promise<void> {
  loading = true;
  try {
    users = (await api.listUsers()).map(toUser);
    loaded = true;
    notify();
  } finally {
    loading = false;
  }
}

const ensureLoaded = () => {
  if (typeof window === "undefined" || loaded || loading) return;
  void reloadUsers().catch(() => {
    loaded = true;
  });
};

export const usersStore: JsonStore<User[]> = {
  get: () => users,
  getServerSnapshot: () => EMPTY,
  set: (v) => {
    users = v;
    notify();
  },
  update: (fn) => {
    users = fn(users);
    notify();
  },
  subscribe: (cb) => {
    listeners.add(cb);
    ensureLoaded();
    return () => void listeners.delete(cb);
  },
};

export function isValidUsername(name: string): boolean {
  return /^[\p{L}\p{N}._-]+$/u.test(name.trim());
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Whether a username already exists (case-insensitive) — to block duplicates on create. */
export function usernameExists(name: string): boolean {
  const key = name.trim().toLowerCase();
  return users.some((u) => u.name.toLowerCase() === key);
}

/** Create (unknown id) or update (existing id) a user via the API, then refresh the cache. */
export async function upsertUser(user: User & { password?: string }): Promise<void> {
  if (users.some((u) => u.id === user.id)) {
    await api.updateUser(user.id, {
      email: user.email,
      type: user.type,
      status: user.status,
      ...(user.password ? { password: user.password } : {}),
    });
  } else {
    await api.createUser({
      name: user.name,
      email: user.email,
      password: user.password ?? DEFAULT_NEW_PASSWORD,
      type: user.type,
      status: user.status,
    });
  }
  await reloadUsers();
}

export async function removeUser(id: string): Promise<void> {
  await api.deleteUser(id);
  await reloadUsers();
}
