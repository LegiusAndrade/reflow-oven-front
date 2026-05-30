/**
 * A store with the same surface as the localStorage `JsonStore`, but backed by the backend API:
 * it hydrates from `load()` on first subscribe and (optionally) persists writes via `save()`.
 * Lets screens keep using `useStore(store)` / `store.set(...)` while the data lives on the server.
 */
import type { JsonStore } from "./localStore";
import { showToast } from "./toast";

export interface ApiStoreOptions<T> {
  fallback: T;
  load: () => Promise<T>;
  /** Optional writer (e.g. PUT). Called optimistically after set/update. */
  save?: (_value: T) => Promise<unknown>;
}

export function createApiStore<T>(opts: ApiStoreOptions<T>): JsonStore<T> {
  let value = opts.fallback;
  let loaded = false;
  let loading = false;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());

  const ensureLoaded = () => {
    if (typeof window === "undefined" || loaded || loading) return;
    loading = true;
    opts
      .load()
      .then((v) => {
        value = v;
        loaded = true;
        notify();
      })
      .catch(() => {
        // Leave `loaded` false so a later subscribe retries once the backend is reachable;
        // the `loading` guard already prevents a refetch loop while a request is in flight.
      })
      .finally(() => {
        loading = false;
      });
  };

  const write = (next: T) => {
    const prev = value;
    value = next;
    notify();
    if (opts.save)
      void opts.save(next).catch(() => {
        // The optimistic update didn't persist — roll it back and tell the user, instead of
        // leaving the UI showing settings the server never accepted (data-loss on reload).
        value = prev;
        notify();
        showToast("Falha ao salvar. As alterações foram revertidas.");
      });
  };

  return {
    get: () => value,
    getServerSnapshot: () => opts.fallback,
    set: (v) => write(v),
    update: (fn) => write(fn(value)),
    subscribe: (cb) => {
      listeners.add(cb);
      ensureLoaded();
      return () => void listeners.delete(cb);
    },
  };
}

/** Force a reload of an api-store on next access (after a mutation done elsewhere). */
export type Reloadable = { reload: () => void };
