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

/** Add a newly created program to the front of the stored list. */
export function addStoredProgram(program: Program): void {
  persist([program, ...loadStoredPrograms()]);
}

/** Remove a stored program by id (no-op if it isn't user-created). */
export function removeStoredProgram(id: string): void {
  persist(loadStoredPrograms().filter((p) => p.id !== id));
}
