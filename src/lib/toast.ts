import { TOAST_DEDUPE_MS } from "./limits";

export type ToastType = "success" | "error" | "info" | "warning";
/** `icon` overrides the type's default Material Symbols icon (e.g. a "warning" abort toast that wants
 *  `stop_circle` to match the Abortado status badge). Color/accent still comes from `type`. */
export type Toast = { id: string; message: string; type: ToastType; icon?: string };

const EMPTY: Toast[] = [];
let toasts: Toast[] = EMPTY;
const listeners = new Set<() => void>();

// When the server is down several pollers (sessão, notificações, stores) surface the SAME offline
// error each tick; without a guard they stack. Suppress an identical toast (same type+message) fired
// again within TOAST_DEDUPE_MS. Keyed by `${type}:${message}` so distinct messages still show.
const lastShownAt = new Map<string, number>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribeToasts(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/** Stable snapshot for `useSyncExternalStore` (the array ref only changes on add/dismiss). */
export function getToastsSnapshot(): Toast[] {
  return toasts;
}

export function getToastsServerSnapshot(): Toast[] {
  return EMPTY;
}

/**
 * Show a transient toast and auto-dismiss it after `durationMs` (0 = keep until dismissed).
 *
 * TODO(backend): toasts currently fire right after the local (localStorage) mutation; once the
 * API exists, fire them on the server response instead — success here, and
 * `showToast(message, "error")` in the failure path.
 */
export function showToast(message: string, type: ToastType = "success", durationMs = 3000, icon?: string): string {
  const key = `${type}:${message}`;
  const now = Date.now();
  const prev = lastShownAt.get(key);
  if (prev !== undefined && now - prev < TOAST_DEDUPE_MS) return ""; // identical toast still on screen
  lastShownAt.set(key, now);
  const id = crypto.randomUUID();
  toasts = [...toasts, { id, message, type, icon }];
  emit();
  if (typeof window !== "undefined" && durationMs > 0) {
    window.setTimeout(() => dismissToast(id), durationMs);
  }
  return id;
}

export function dismissToast(id: string): void {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}
