export type ToastType = "success" | "error" | "info";
export type Toast = { id: string; message: string; type: ToastType };

const EMPTY: Toast[] = [];
let toasts: Toast[] = EMPTY;
const listeners = new Set<() => void>();

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
export function showToast(message: string, type: ToastType = "success", durationMs = 3000): string {
  const id = crypto.randomUUID();
  toasts = [...toasts, { id, message, type }];
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
