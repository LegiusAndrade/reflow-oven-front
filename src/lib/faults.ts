"use client";

/**
 * Shared latched-fault state. The board reports a critical fault on the 1 Hz diagnostics tick
 * (see hooks/useLiveReadings → setLatchedFault); this tiny subscribe/snapshot store fans that single
 * value out to the persistent fault banner (components/FaultBanner) AND the "Iniciar" gate
 * (ProgramGallery/ProgramCard) without opening a second SignalR connection or adding a poller.
 *
 * Shaped like a JsonStore so `useStore` can consume it. The snapshot reference is stable while the
 * fault is unchanged — the tick re-reports the same fault every second, so `setLatchedFault` compares
 * by content and only emits on a real change (required by useSyncExternalStore to avoid render loops).
 */
import type { FaultInfo } from "./api";
import type { JsonStore } from "./localStore";

let current: FaultInfo | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((l) => l());
}

function sameFault(a: FaultInfo | null, b: FaultInfo | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.code === b.code && a.severity === b.severity && a.message === b.message;
}

/** Feed the latest tick's fault (or null when healthy / signed out). No-op when unchanged. */
export function setLatchedFault(next: FaultInfo | null): void {
  if (sameFault(current, next)) return;
  current = next;
  emit();
}

export const faultStore: JsonStore<FaultInfo | null> = {
  get: () => current,
  set: setLatchedFault,
  update: (fn) => setLatchedFault(fn(current)),
  getServerSnapshot: () => null,
  subscribe: (cb) => {
    listeners.add(cb);
    return () => void listeners.delete(cb);
  },
};
