import type { Program } from "./programs";

/** localStorage key for user-created programs (bump the suffix if the shape changes). */
const STORAGE_KEY = "reflow:programs:v1";
/** Tombstoned program ids — so deleting a seed program keeps it from reappearing. */
const HIDDEN_KEY = "reflow:programs:hidden:v1";
/** Favorited program ids (works for seed programs too, which we don't mutate). */
const FAVORITES_KEY = "reflow:programs:favorites:v1";

/** Fired on `window` after the stored set changes, so views in this tab can refresh. */
export const PROGRAMS_CHANGED_EVENT = "reflow:programs-changed";

/** User-created programs from localStorage (newest first). Returns [] on the server. */
export function loadStoredPrograms(): Program[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Program[]) : [];
  } catch {
    return [];
  }
}

// --- useSyncExternalStore plumbing -------------------------------------------------------
// getSnapshot must return a *stable* reference unless the data actually changed, so we cache
// the parsed list keyed by the raw JSON string and only re-parse when that string differs.
const EMPTY: Program[] = [];
let cachedRaw: string | null = null;
let cachedPrograms: Program[] = EMPTY;

/** Subscribe to stored-program changes (this tab via our event, other tabs via `storage`). */
export function subscribeStoredPrograms(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(PROGRAMS_CHANGED_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(PROGRAMS_CHANGED_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Cached client snapshot for `useSyncExternalStore`. */
export function getStoredProgramsSnapshot(): Program[] {
  if (typeof window === "undefined") return EMPTY;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedPrograms;
  cachedRaw = raw;
  cachedPrograms = loadStoredPrograms();
  return cachedPrograms;
}

/** Server snapshot — no localStorage there, so always the same empty array. */
export function getStoredProgramsServerSnapshot(): Program[] {
  return EMPTY;
}

// --- deleted/hidden ids (tombstones) -----------------------------------------------------
const EMPTY_IDS: string[] = [];
let cachedHiddenRaw: string | null = null;
let cachedHiddenIds: string[] = EMPTY_IDS;

/** Ids the user has deleted (read fresh). */
export function loadHiddenIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HIDDEN_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

/** Cached client snapshot of deleted ids for `useSyncExternalStore`. */
export function getHiddenIdsSnapshot(): string[] {
  if (typeof window === "undefined") return EMPTY_IDS;
  const raw = window.localStorage.getItem(HIDDEN_KEY);
  if (raw === cachedHiddenRaw) return cachedHiddenIds;
  cachedHiddenRaw = raw;
  cachedHiddenIds = loadHiddenIds();
  return cachedHiddenIds;
}

export function getHiddenIdsServerSnapshot(): string[] {
  return EMPTY_IDS;
}

// --- favorites ---------------------------------------------------------------------------
let cachedFavoritesRaw: string | null = null;
let cachedFavoriteIds: string[] = EMPTY_IDS;

/** Favorited program ids (read fresh). */
export function loadFavoriteIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

/** Cached client snapshot of favorite ids for `useSyncExternalStore`. */
export function getFavoriteIdsSnapshot(): string[] {
  if (typeof window === "undefined") return EMPTY_IDS;
  const raw = window.localStorage.getItem(FAVORITES_KEY);
  if (raw === cachedFavoritesRaw) return cachedFavoriteIds;
  cachedFavoritesRaw = raw;
  cachedFavoriteIds = loadFavoriteIds();
  return cachedFavoriteIds;
}

export function getFavoriteIdsServerSnapshot(): string[] {
  return EMPTY_IDS;
}

/** Toggle a program's favorite flag (works for stored and seed programs). */
export function toggleFavorite(id: string): void {
  if (typeof window === "undefined") return;
  const favorites = loadFavoriteIds();
  const next = favorites.includes(id) ? favorites.filter((f) => f !== id) : [...favorites, id];
  try {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(PROGRAMS_CHANGED_EVENT));
  } catch {
    // Best-effort — ignore quota/serialization failures.
  }
}

function persist(programs: Program[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(programs));
    // The native `storage` event only fires in *other* tabs, so emit our own for this one.
    window.dispatchEvent(new Event(PROGRAMS_CHANGED_EVENT));
  } catch {
    // Persistence is best-effort — ignore quota/serialization failures.
  }
}

/** Insert a new program at the front, or replace the existing one with the same id. */
export function upsertStoredProgram(program: Program): void {
  const others = loadStoredPrograms().filter((p) => p.id !== program.id);
  persist([program, ...others]);
}

/** Delete a program: drop any stored copy and tombstone the id so seed programs stay gone. */
export function deleteProgram(id: string): void {
  if (typeof window === "undefined") return;
  const remainingStored = loadStoredPrograms().filter((p) => p.id !== id);
  const hidden = loadHiddenIds();
  const nextHidden = hidden.includes(id) ? hidden : [...hidden, id];
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(remainingStored));
    window.localStorage.setItem(HIDDEN_KEY, JSON.stringify(nextHidden));
    window.dispatchEvent(new Event(PROGRAMS_CHANGED_EVENT));
  } catch {
    // Best-effort — ignore quota/serialization failures.
  }
}
