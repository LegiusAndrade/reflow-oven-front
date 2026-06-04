/**
 * Visibility-aware polling. Runs `fn` now and then every `intervalMs`, but **only while the page is
 * visible**: when the tab/screen is hidden the interval is paused (no requests go out), and when it
 * becomes visible again `fn` fires once immediately (revalidate) before the interval resumes.
 *
 * This keeps the kiosk from hammering the backend while its display is asleep or the app is
 * backgrounded, and makes the data fresh the instant the operator returns. Returns a stop function;
 * call it on unmount.
 */
export function pollWhileVisible(fn: () => void, intervalMs: number): () => void {
  // SSR / non-browser safety: just run once, nothing to schedule.
  if (typeof document === "undefined") {
    fn();
    return () => {};
  }

  let timer: ReturnType<typeof setInterval> | null = null;

  const start = (): void => {
    if (timer == null) timer = setInterval(fn, intervalMs);
  };
  const stop = (): void => {
    if (timer != null) {
      clearInterval(timer);
      timer = null;
    }
  };
  const onVisibility = (): void => {
    if (document.hidden) {
      stop();
    } else {
      fn(); // revalidate immediately on return
      start();
    }
  };

  fn(); // initial fetch (mirrors the previous `void fn()` before setInterval)
  if (!document.hidden) start();
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    document.removeEventListener("visibilitychange", onVisibility);
    stop();
  };
}
