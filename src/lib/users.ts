import { createJsonStore } from "./localStore";

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
  /** "dd/mm/aa - HH:MM" */
  lastLogin: string;
  events: UserEvent[];
};

const NAMES = ["Lucas Silva", "Vanessa", "Letícia", "Operador 1", "Técnico", "Carlos", "Ana", "Pedro", "Mariana", "João", "Bruna", "Rafael"];

const genEvents = (seed: number): UserEvent[] => [
  { label: "configurações alteradas", count: (seed * 7) % 40 },
  { label: "usuários criados", count: (seed * 3) % 15 },
  { label: "usuários alterados", count: (seed * 5) % 15 },
  { label: "usuários deletados", count: (seed * 2) % 15 },
  { label: "programas criados", count: (seed * 11) % 40 },
  { label: "programas alterados", count: (seed * 13) % 40 },
  { label: "programas deletados", count: (seed * 4) % 40 },
];

/** Slug a display name into an email local-part (strip accents, spaces → dots). */
function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, ".")
      .replace(/(^\.|\.$)/g, "") || "user"
  );
}

/** Deterministic mock users (seeded into the store on first load). */
export const MOCK_USERS: User[] = NAMES.map((name, i) => {
  const day = String((i % 28) + 1).padStart(2, "0");
  const hour = String(8 + (i % 12)).padStart(2, "0");
  return {
    id: `user-${i + 1}`,
    name,
    email: `${slug(name)}@reflow.local`,
    type: i % 3 === 0 ? "Admin" : "Regular",
    status: i % 4 === 3 ? "Inativo" : "Ativo",
    createdAt: `09/05/25 - 15:0${i % 10}:00`,
    lastLogin: `${day}/07/25 - ${hour}:30`,
    events: genEvents(i + 1),
  };
});

/** Username rule: letters/digits plus . _ - only (no spaces or other special characters). */
export function isValidUsername(name: string): boolean {
  return /^[\p{L}\p{N}._-]+$/u.test(name.trim());
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Whether a username already exists (case-insensitive) — to block duplicates on create. */
export function usernameExists(name: string): boolean {
  const key = name.trim().toLowerCase();
  return usersStore.get().some((u) => u.name.toLowerCase() === key);
}

/** Persisted in localStorage (mock stage). TODO(backend): replace with the API. */
export const usersStore = createJsonStore<User[]>("reflow:users:v1", MOCK_USERS);

export function upsertUser(user: User) {
  usersStore.update((list) => {
    const i = list.findIndex((u) => u.id === user.id);
    if (i < 0) return [...list, user];
    const next = [...list];
    next[i] = user;
    return next;
  });
}

export function removeUser(id: string) {
  usersStore.update((list) => list.filter((u) => u.id !== id));
}
