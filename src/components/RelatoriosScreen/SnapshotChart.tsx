"use client";

import { SignalChart } from "@/components/SignalChart";
import type { FailureSnapshot } from "@/lib/reports";

/**
 * Multi-signal "snapshot" of the moment of a fault — a thin wrapper over the shared
 * {@link SignalChart}. The snapshot's samples are evenly spaced across `durationSec`, so we
 * derive the time axis from the index and hand it off (legend toggle + crosshair live there).
 */
export function SnapshotChart({ snapshot, className }: { snapshot: FailureSnapshot; className?: string }) {
  const n = snapshot.series[0]?.values.length ?? 0;
  const times = Array.from({ length: n }, (_, k) => (n <= 1 ? 0 : (k / (n - 1)) * snapshot.durationSec));
  return <SignalChart signals={snapshot.series} times={times} xMaxSec={snapshot.durationSec} className={className} />;
}
