"use client";

import { useSyncExternalStore } from "react";
import type { Program } from "@/lib/programs";
import { getStoredProgramsServerSnapshot, getStoredProgramsSnapshot, subscribeStoredPrograms } from "@/lib/programStore";

/**
 * The full program list (catalog + user-created, minus soft-deleted), served by the backend and
 * cached client-side. Reactive to mutations; SSR-safe (empty until hydrated/loaded). The `_seed`
 * parameter is kept for call-site compatibility but is ignored — the API is the source of truth.
 */
export function useAllPrograms(_seed?: Program[]): Program[] {
  return useSyncExternalStore(subscribeStoredPrograms, getStoredProgramsSnapshot, getStoredProgramsServerSnapshot);
}
