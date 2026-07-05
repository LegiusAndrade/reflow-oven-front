"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/hooks/useStore";
import { sessionStore } from "@/lib/auth";
import { setLatchedFault } from "@/lib/faults";
import { DIAGNOSTICS_STALE_MS } from "@/lib/limits";
import { connectDiagnostics } from "@/lib/realtime";
import type { SensorReadings } from "@/lib/sensors";

export interface LiveReadings {
  /** Last reading from the board, or `null` until the first tick arrives (or while logged out) —
   *  the UI renders "—", never a fabricated placeholder. */
  readings: SensorReadings | null;
  /** True when no tick has arrived within DIAGNOSTICS_STALE_MS (connection lost, or never up): the
   *  consumers dim the values and show a "sem sinal" state instead of a stale value that looks live. */
  stale: boolean;
}

/**
 * Live sensor readings from the backend's diagnostics SignalR hub (~1 Hz). Returns `null` (not a mock)
 * until the first real tick, and flags the readings `stale` once a tick is overdue — the single seam
 * between the UI and the real data source, with no fabricated fallback.
 *
 * The same tick also carries the board's latched fault, which we push into the shared `faultStore`
 * (consumed by the fault banner and the Iniciar gate) — so the banner appears/disappears on this 1 Hz
 * stream with no extra poller or second hub connection.
 */
export function useLiveReadings(): LiveReadings {
  const [readings, setReadings] = useState<SensorReadings | null>(null);
  const [stale, setStale] = useState(true);
  // Depend on the session so the effect re-runs when the user logs in after this hook mounted
  // (e.g. AppShell mounts it on the /login screen, before a token exists).
  const session = useStore(sessionStore);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // No session (logged out / on /login): clear the latched fault (store update, not React state) and
    // don't connect. The readings are reset in the previous connection's cleanup below, so we avoid a
    // synchronous setState in the effect body here.
    if (!session) {
      setLatchedFault(null);
      return;
    }
    // Connect whenever there's a session — the accessTokenFactory fetches the ws-token when the
    // in-memory JWT isn't hydrated yet (cold Pi: the page can mount before the token is ready), and
    // the connection retries the start until the backend is up, so a slow boot still connects.
    let staleTimer: ReturnType<typeof setTimeout> | null = null;
    const stop = connectDiagnostics((r) => {
      setReadings(r);
      setStale(false);
      setLatchedFault(r.fault ?? null);
      // Re-arm the freshness watchdog: if the next tick doesn't arrive in time, mark the reading stale.
      if (staleTimer) clearTimeout(staleTimer);
      staleTimer = setTimeout(() => setStale(true), DIAGNOSTICS_STALE_MS);
    });
    return () => {
      if (staleTimer) clearTimeout(staleTimer);
      stop();
      // Drop this session's readings + latched fault on disconnect (logout / unmount / session change)
      // so a value can't linger into the next session. Done in cleanup (not the body) to avoid a
      // synchronous setState in the effect.
      setLatchedFault(null);
      setReadings(null);
      setStale(true);
    };
  }, [session]);

  return { readings, stale };
}
