"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/hooks/useStore";
import { getToken } from "@/lib/api";
import { sessionStore } from "@/lib/auth";
import { connectDiagnostics } from "@/lib/realtime";
import type { SensorReadings } from "@/lib/sensors";

/**
 * Live sensor readings from the backend's diagnostics SignalR hub (~1 Hz). Falls back to `base`
 * until the first tick (or when not authenticated / the backend is offline). Replaces the old
 * mock jitter — the single seam between the UI and the real data source.
 */
export function useLiveReadings(base: SensorReadings): SensorReadings {
  const [readings, setReadings] = useState(base);
  // Depend on the session so the effect re-runs when the user logs in after this hook mounted
  // (e.g. AppShell mounts it on the /login screen, before a token exists).
  const session = useStore(sessionStore);

  useEffect(() => {
    if (typeof window === "undefined" || !session || !getToken()) return;
    return connectDiagnostics((r) => setReadings(r));
  }, [session]);

  return readings;
}
