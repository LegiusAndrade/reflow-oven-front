"use client";

import { useEffect, useState } from "react";
import { useHydrated } from "@/hooks/useHydrated";

const pad = (n: number) => String(n).padStart(2, "0");

/** Browser-local time as pt-BR "HH:mm dd/MM/yy". */
function format(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`;
}

/**
 * Live wall clock for the TopBar. Mounted-only (via useHydrated): the server and the first client paint
 * render nothing, so the static HTML never disagrees with the client — a value that is time-dependent
 * by nature would otherwise trip a hydration mismatch, and a fixed placeholder would be a fake time.
 * A 1-minute timer forces a re-render (setState in the timer callback, not in the effect body); the
 * time itself is read at render. Uses the browser's local time — the Pi has no RTC, so the shown time
 * is only as good as the host clock/NTP (see backend BE-8).
 */
export function Clock() {
  const hydrated = useHydrated();
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => (n + 1) % 60), 60_000);
    return () => clearInterval(id);
  }, []);
  if (!hydrated) return <span className='tabular-nums sm:text-2xl' aria-hidden='true' />;
  return (
    <span className='tabular-nums sm:text-2xl' suppressHydrationWarning>
      {format(new Date())}
    </span>
  );
}
