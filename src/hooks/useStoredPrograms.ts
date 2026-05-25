"use client";

import { useSyncExternalStore } from "react";
import type { Program } from "@/lib/programs";
import { getStoredProgramsServerSnapshot, getStoredProgramsSnapshot, subscribeStoredPrograms } from "@/lib/programStore";

/**
 * User-created programs from localStorage, reactive to changes in this tab
 * (PROGRAMS_CHANGED_EVENT) and other tabs (the native `storage` event). SSR-safe: returns an
 * empty list on the server and the first client render, then the real list after hydration.
 */
export function useStoredPrograms(): Program[] {
  return useSyncExternalStore(subscribeStoredPrograms, getStoredProgramsSnapshot, getStoredProgramsServerSnapshot);
}
