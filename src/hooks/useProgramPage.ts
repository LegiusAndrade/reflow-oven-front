"use client";

import { useSyncExternalStore } from "react";
import type { Program } from "@/lib/programs";
import {
  getProgramsLoadedServerSnapshot,
  getProgramsLoadedSnapshot,
  getProgramsLoadingServerSnapshot,
  getProgramsLoadingSnapshot,
  getProgramsTotalServerSnapshot,
  getProgramsTotalSnapshot,
  getStoredProgramsServerSnapshot,
  getStoredProgramsSnapshot,
  subscribeStoredPrograms,
} from "@/lib/programStore";

/** Total number of programs matching the current server query (before paging). */
export function useProgramsTotal(): number {
  return useSyncExternalStore(subscribeStoredPrograms, getProgramsTotalSnapshot, getProgramsTotalServerSnapshot);
}

/** Whether the store is currently fetching a page from the backend. */
export function useProgramsLoading(): boolean {
  return useSyncExternalStore(subscribeStoredPrograms, getProgramsLoadingSnapshot, getProgramsLoadingServerSnapshot);
}

/** Whether a page has been successfully loaded at least once for the current query shape. */
export function useProgramsLoaded(): boolean {
  return useSyncExternalStore(subscribeStoredPrograms, getProgramsLoadedSnapshot, getProgramsLoadedServerSnapshot);
}

/**
 * The current page of programs plus its total match count and loading/loaded flags — the surface a
 * server-paginated screen needs. `items` is the current page only; `total` is the full filtered
 * count (drives the pager); `loading` reflects an in-flight fetch; `loaded` distinguishes a genuine
 * "no results" from a not-yet-fetched first paint.
 */
export function useProgramPage(): { items: Program[]; total: number; loading: boolean; loaded: boolean } {
  const items = useSyncExternalStore(subscribeStoredPrograms, getStoredProgramsSnapshot, getStoredProgramsServerSnapshot);
  const total = useProgramsTotal();
  const loading = useProgramsLoading();
  const loaded = useProgramsLoaded();
  return { items, total, loading, loaded };
}
