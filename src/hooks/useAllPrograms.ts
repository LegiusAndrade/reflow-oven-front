"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { Program } from "@/lib/programs";
import {
  getHiddenIdsServerSnapshot,
  getHiddenIdsSnapshot,
  getStoredProgramsServerSnapshot,
  getStoredProgramsSnapshot,
  subscribeStoredPrograms,
} from "@/lib/programStore";

/**
 * The programs to show: user-created (stored, newest first) + the given seed list, deduped
 * by id (a stored program overrides a seed with the same id) and minus deleted ids. Reactive
 * to localStorage changes; SSR-safe (seed only until hydrated).
 */
export function useAllPrograms(seed: Program[]): Program[] {
  const stored = useSyncExternalStore(subscribeStoredPrograms, getStoredProgramsSnapshot, getStoredProgramsServerSnapshot);
  const hidden = useSyncExternalStore(subscribeStoredPrograms, getHiddenIdsSnapshot, getHiddenIdsServerSnapshot);

  return useMemo(() => {
    const storedIds = new Set(stored.map((p) => p.id));
    const hiddenIds = new Set(hidden);
    const merged = [...stored, ...seed.filter((p) => !storedIds.has(p.id))];
    return merged.filter((p) => !hiddenIds.has(p.id));
  }, [stored, hidden, seed]);
}
