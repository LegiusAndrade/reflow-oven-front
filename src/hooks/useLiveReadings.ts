"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/hooks/useStore";
import { getToken } from "@/lib/api";
import { sessionStore } from "@/lib/auth";
import { setLatchedFault } from "@/lib/faults";
import { connectDiagnostics } from "@/lib/realtime";
import type { SensorReadings } from "@/lib/sensors";

/**
 * Live sensor readings from the backend's diagnostics SignalR hub (~1 Hz). Falls back to `base`
 * until the first tick (or when not authenticated / the backend is offline). Replaces the old
 * mock jitter — the single seam between the UI and the real data source.
 *
 * The same tick also carries the board's latched fault, which we push into the shared `faultStore`
 * (consumed by the fault banner and the Iniciar gate) — so the banner appears/disappears on this 1 Hz
 * stream with no extra poller or second hub connection.
 */
export function useLiveReadings(base: SensorReadings): SensorReadings {
  const [readings, setReadings] = useState(base);
  // Depend on the session so the effect re-runs when the user logs in after this hook mounted
  // (e.g. AppShell mounts it on the /login screen, before a token exists).
  const session = useStore(sessionStore);

  useEffect(() => {
    // No session (logged out / on /login): clear any stale latched fault so it can't linger across
    // a logout, and don't open a connection. A transient backend drop while signed in keeps the last
    // value — a fault is still latched even if comms blink, so we only clear on the absence of a session.
    if (typeof window === "undefined") return;
    if (!session || !getToken()) {
      setLatchedFault(null);
      return;
    }
    return connectDiagnostics((r) => {
      setReadings(r);
      setLatchedFault(r.fault ?? null);
    });
  }, [session]);

  return readings;
}
