"use client";

import { useSyncExternalStore } from "react";
import type { JsonStore } from "@/lib/localStore";

/** Subscribe a component to a localStorage-backed JsonStore (SSR-safe). */
export function useStore<T>(store: JsonStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.getServerSnapshot);
}
