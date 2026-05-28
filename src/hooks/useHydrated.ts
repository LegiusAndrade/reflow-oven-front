"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** True only after client hydration (server + first client render return false). Lets a
 *  component defer localStorage-dependent decisions until the client value is available. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
