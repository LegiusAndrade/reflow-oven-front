"use client";

import { useSyncExternalStore } from "react";
import { getFavoriteIdsServerSnapshot, getFavoriteIdsSnapshot, subscribeStoredPrograms } from "@/lib/programStore";

/** Favorited program ids from localStorage, reactive to changes (via PROGRAMS_CHANGED_EVENT). */
export function useFavoriteIds(): string[] {
  return useSyncExternalStore(subscribeStoredPrograms, getFavoriteIdsSnapshot, getFavoriteIdsServerSnapshot);
}
