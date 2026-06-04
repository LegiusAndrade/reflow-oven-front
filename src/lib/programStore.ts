/**
 * Query-driven cache of the *current page* of programs, backed by the backend API. Pagination,
 * search, filtering and sorting all happen server-side (`GET /api/programs?...`); this module just
 * caches the page the screen is currently showing plus the total match count. Exposes a
 * subscribe/snapshot surface for `useSyncExternalStore` plus async mutations that call the API and
 * refresh the same page. Snapshots keep a stable reference until the data actually changes.
 */
import { api, type ProgramDto, type ProgramListQuery, type SaveProgramRequest } from "./api";
import { PROGRAM_LIST_PAGE_SIZE, PROGRAM_VALUE_MAX_DECIMALS } from "./limits";
import { logger } from "./logger";
import { roundToDecimals } from "./numericInput";
import type { Program } from "./programs";

const EMPTY_PROGRAMS: Program[] = [];
const EMPTY_IDS: string[] = [];

/** The query used when a passive consumer (no screen driving paging) triggers the first load. */
const DEFAULT_QUERY: ProgramListQuery = { filter: "all", sort: "default", page: 1, pageSize: PROGRAM_LIST_PAGE_SIZE };

let programs: Program[] = EMPTY_PROGRAMS;
let favoriteIds: string[] = EMPTY_IDS;
let total = 0;
let loaded = false;
let loading = false;
let currentQuery: ProgramListQuery = DEFAULT_QUERY;

/** Monotonic request id: the latest fetch wins so a slow earlier response can't clobber it. */
let requestSeq = 0;
/** The shape of the last query (everything except `page`); a change clears the stale page/total. */
let lastKey = "";

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

/** Fetch one page (with the given search/filter/sort/page/pageSize) and refresh the cache. */
export async function loadPrograms(query: ProgramListQuery): Promise<void> {
  // A change to anything but `page` (search/filter/sort/pageSize — including switching between the
  // two screens, which use different pageSizes) means the cached page/total are stale and belong to
  // a different result set: clear them so the UI doesn't briefly show the wrong list. A plain page
  // change keeps the prior page visible for smooth paging.
  const key = `${query.search ?? ""}|${query.filter ?? ""}|${query.sort ?? ""}|${query.pageSize ?? ""}`;
  if (key !== lastKey) {
    programs = EMPTY_PROGRAMS;
    favoriteIds = EMPTY_IDS;
    total = 0;
    loaded = false;
    lastKey = key;
  }
  currentQuery = query;
  loading = true;
  notify();
  const seq = ++requestSeq;
  try {
    const res = await api.listPrograms(query);
    // A newer request started while we awaited — discard this stale response entirely.
    if (seq !== requestSeq) return;
    programs = res.items.map(toProgram);
    favoriteIds = res.items.filter((p) => p.favorite).map((p) => p.id);
    total = res.total;
    loaded = true;
  } catch (e) {
    // Keep the previously-loaded page on error so the UI doesn't blank out; the screen surfaces
    // the failure via its own toast paths. `loaded` stays as-is so a retry is still possible.
    if (seq === requestSeq) logger.error("programStore", "Falha ao carregar programas", e);
  } finally {
    // Only the latest request flips loading off / notifies; a superseded one stays quiet so it can't
    // hide the spinner (or paint) while the newest fetch is still in flight.
    if (seq === requestSeq) {
      loading = false;
      notify();
    }
  }
}

const ensureLoaded = (): void => {
  if (typeof window === "undefined" || loaded || loading) return;
  void loadPrograms(DEFAULT_QUERY);
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
export const getProgramsTotalSnapshot = (): number => total;
export const getProgramsTotalServerSnapshot = (): number => 0;
export const getProgramsLoadingSnapshot = (): boolean => loading;
export const getProgramsLoadingServerSnapshot = (): boolean => false;
export const getProgramsLoadedSnapshot = (): boolean => loaded;
export const getProgramsLoadedServerSnapshot = (): boolean => false;

/**
 * Flip the favorite flag on the cached entry and notify immediately (no refetch → no flicker), then
 * persist the new state via the API as an idempotent set (`{ favorite }`). On error, restore the
 * previous favorite snapshot and re-throw so the caller surfaces its toast. We don't drop the row
 * even under the "favorites" filter so the optimistic flip can't yank the card out mid-tap; the next
 * `loadPrograms` (paging/refresh) reconciles the list with the server.
 */
export async function toggleFavorite(id: string): Promise<void> {
  const wasFavorite = favoriteIds.includes(id);
  const nextFavorite = !wasFavorite;
  const prevFavoriteIds = favoriteIds;
  // New array reference (add/remove the id) so the favorites snapshot's identity changes.
  favoriteIds = nextFavorite ? [...favoriteIds, id] : favoriteIds.filter((fid) => fid !== id);
  notify();
  try {
    await api.toggleFavorite(id, nextFavorite);
  } catch (e) {
    // Revert to the exact pre-mutation reference and re-notify so subscribers re-render the old state.
    favoriteIds = prevFavoriteIds;
    notify();
    throw e;
  }
}

/**
 * Remove the program from the cached page (and its favorite id) and notify immediately (no refetch →
 * no flicker), decrementing the match total, then call the API. On error, restore the previous cache
 * and re-throw so the caller surfaces its toast. The next `loadPrograms` reconciles paging.
 */
export async function deleteProgram(id: string): Promise<void> {
  const prevPrograms = programs;
  const prevFavoriteIds = favoriteIds;
  const prevTotal = total;
  const existed = programs.some((p) => p.id === id);
  // New array references so the programs/favorites snapshots' identity changes.
  programs = programs.filter((p) => p.id !== id);
  favoriteIds = favoriteIds.filter((fid) => fid !== id);
  // Only adjust the match total if the row was actually present in this page's cache.
  if (existed) total = Math.max(0, total - 1);
  notify();
  try {
    await api.deleteProgram(id);
    // Refill the page from the server so the grid reflows into the freed slot — the optimistic removal
    // above only drops the card, and the item that should shift up to fill the gap lives on a later page
    // (not in this page's cache), so a refetch is the only way to pull it in.
    await loadPrograms(currentQuery);
  } catch (e) {
    // Restore the exact pre-mutation references/total and re-notify so the row comes back.
    programs = prevPrograms;
    favoriteIds = prevFavoriteIds;
    total = prevTotal;
    notify();
    throw e;
  }
}

/** Cap every numeric program value at PROGRAM_VALUE_MAX_DECIMALS before it reaches the backend. This
 *  is the single DB write path for a program's numbers (create + update) — favoriting, deleting and
 *  starting a run carry no numeric program data — so capping here guarantees the limit regardless of
 *  the caller. PID/calibration/settings persist through other stores and keep their full precision. */
function capProgramPrecision(req: SaveProgramRequest): SaveProgramRequest {
  const round = (n: number) => roundToDecimals(n, PROGRAM_VALUE_MAX_DECIMALS);
  return {
    ...req,
    segments: req.segments?.map((s) => ({ ...s, temp: round(s.temp), durationSec: round(s.durationSec) })) ?? req.segments,
    profile: req.profile?.map((p) => ({ t: round(p.t), temp: round(p.temp) })) ?? req.profile,
  };
}

/** Create (no id) or update (existing id) a program from the editor, then refresh the current page. */
export async function saveProgram(req: SaveProgramRequest, id?: string): Promise<void> {
  // Trust the id (an existing program) rather than the cache: opening the editor directly by URL
  // never populates the cache, so a cache check would wrongly create a duplicate instead of updating.
  const capped = capProgramPrecision(req);
  if (id) await api.updateProgram(id, capped);
  else await api.createProgram(capped);
  await loadPrograms(currentQuery);
}
