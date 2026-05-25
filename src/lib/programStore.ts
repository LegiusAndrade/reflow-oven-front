import type { Program } from "./programs";

/** localStorage key for user-created programs (bump the suffix if the shape changes). */
const STORAGE_KEY = "reflow:programs:v1";

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

/** Remove a stored program by id (no-op if it isn't user-created). */
export function removeStoredProgram(id: string): void {
  persist(loadStoredPrograms().filter((p) => p.id !== id));
}
