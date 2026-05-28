/**
 * Tiny localStorage-backed store exposing a subscribe/snapshot API for `useSyncExternalStore`.
 * Snapshots are cached and keyed by the raw JSON string, so the same reference is returned while
 * storage is unchanged (required by useSyncExternalStore to avoid render loops). SSR and the
 * first client render return `fallback`; the real value is picked up after hydration.
 */
export interface JsonStore<T> {
  get: () => T;
  set: (_value: T) => void;
  update: (_fn: (_prev: T) => T) => void;
  subscribe: (_cb: () => void) => () => void;
  getServerSnapshot: () => T;
}

export function createJsonStore<T>(key: string, fallback: T): JsonStore<T> {
  let cache: { raw: string | null; value: T } | null = null;
  const listeners = new Set<() => void>();

  const read = (): T => {
    if (typeof window === "undefined") return fallback;
    const raw = window.localStorage.getItem(key);
    if (cache && cache.raw === raw) return cache.value;
    let value = fallback;
    if (raw) {
      try {
        value = JSON.parse(raw) as T;
      } catch {
        value = fallback;
      }
    }
    cache = { raw, value };
    return value;
  };

  const set = (value: T) => {
    const raw = JSON.stringify(value);
    window.localStorage.setItem(key, raw);
    cache = { raw, value };
    listeners.forEach((l) => l());
  };

  return {
    get: read,
    set,
    update: (fn) => set(fn(read())),
    getServerSnapshot: () => fallback,
    subscribe: (cb) => {
      listeners.add(cb);
      const onStorage = (e: StorageEvent) => {
        if (e.key === key) cb();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(cb);
        window.removeEventListener("storage", onStorage);
      };
    },
  };
}
