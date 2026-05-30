/**
 * Client-side cache of programs, backed by the backend API (replaces the old localStorage mock).
 * Exposes a subscribe/snapshot surface for `useSyncExternalStore` plus async mutations that call
 * the API and refresh the cache. Snapshots keep a stable reference until the data actually changes.
 */
import { api, type ProgramDto, type SaveProgramRequest } from "./api";
import { PROGRAM_LIST_PAGE_SIZE } from "./limits";
import type { Program } from "./programs";

const EMPTY_PROGRAMS: Program[] = [];
const EMPTY_IDS: string[] = [];

let programs: Program[] = EMPTY_PROGRAMS;
let favoriteIds: string[] = EMPTY_IDS;
let loaded = false;
let loading = false;

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** ISO date → "dd/MM/yyyy", or "Nunca" when never run. */
const formatLastUsed = (iso?: string | null): string => {
  if (!iso) return "Nunca";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Nunca";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};

/** Map the API DTO to the frontend's display-oriented Program type. */
export const toProgram = (dto: ProgramDto): Program => ({
  id: dto.id,
  name: dto.name,
  description: dto.description,
  runCount: dto.runCount,
  lastUsed: formatLastUsed(dto.lastUsed),
  profile: dto.profile,
  segments: dto.segments ?? undefined,
});

/** Fetch the full program list (catalog + user programs) and refresh the cache. */
export async function reloadPrograms(): Promise<void> {
  loading = true;
  try {
    const res = await api.listPrograms({ filter: "all", sort: "default", page: 1, pageSize: PROGRAM_LIST_PAGE_SIZE });
    programs = res.items.map(toProgram);
    favoriteIds = res.items.filter((p) => p.favorite).map((p) => p.id);
    loaded = true;
    notify();
  } finally {
    loading = false;
  }
}

const ensureLoaded = (): void => {
  if (typeof window === "undefined" || loaded || loading) return;
  void reloadPrograms().catch(() => {
    // Leave `loaded` false so a later subscribe retries; `loading` guards against a refetch loop.
  });
};

export const subscribeStoredPrograms = (cb: () => void): (() => void) => {
  listeners.add(cb);
  ensureLoaded();
  return () => void listeners.delete(cb);
};

export const getStoredProgramsSnapshot = (): Program[] => programs;
export const getStoredProgramsServerSnapshot = (): Program[] => EMPTY_PROGRAMS;
export const getFavoriteIdsSnapshot = (): string[] => favoriteIds;
export const getFavoriteIdsServerSnapshot = (): string[] => EMPTY_IDS;

export async function toggleFavorite(id: string): Promise<void> {
  await api.toggleFavorite(id);
  await reloadPrograms();
}

export async function deleteProgram(id: string): Promise<void> {
  await api.deleteProgram(id);
  await reloadPrograms();
}

/** Create (no id) or update (existing id) a program from the editor, then refresh the cache. */
export async function saveProgram(req: SaveProgramRequest, id?: string): Promise<void> {
  // Trust the id (an existing program) rather than the cache: opening the editor directly by URL
  // never populates the cache, so a cache check would wrongly create a duplicate instead of updating.
  if (id) await api.updateProgram(id, req);
  else await api.createProgram(req);
  await reloadPrograms();
}

/** Kept for the (still-mock) maintenance factory-reset flow; the real reset is the API's job (TODO). */
export function resetPrograms(_programs?: Program[]): void {
  void reloadPrograms();
}
