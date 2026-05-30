"use client";

import { useEffect, useState } from "react";
import { getToken } from "@/lib/api";
import { connectDiagnostics } from "@/lib/realtime";
import type { SensorReadings } from "@/lib/sensors";

/**
 * Live sensor readings from the backend's diagnostics SignalR hub (~1 Hz). Falls back to `base`
 * until the first tick (or when not authenticated / the backend is offline). Replaces the old
 * mock jitter — the single seam between the UI and the real data source.
 */
export function useLiveReadings(base: SensorReadings): SensorReadings {
  const [readings, setReadings] = useState(base);

  useEffect(() => {
    if (typeof window === "undefined" || !getToken()) return;
    return connectDiagnostics((r) => setReadings(r));
  }, []);

  return readings;
}
