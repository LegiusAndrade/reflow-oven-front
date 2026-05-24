import type { SensorReadings } from "@/lib/sensors";
import { useEffect, useState } from "react";

const wander = (value: number, spread: number) => value + (Math.random() * 2 - 1) * spread;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const toStep = (v: number, step: number) => Math.round(v / step) * step;

/**
 * Simulates a live RS422 feed by jittering the readings around their base values on an
 * interval. Placeholder until the real serial bridge (separate repo) is connected — at
 * that point this hook is the single seam to swap for the real data source.
 */
export function useLiveReadings(base: SensorReadings, intervalMs = 1000): SensorReadings {
  const [readings, setReadings] = useState(base);

  useEffect(() => {
    const id = setInterval(() => {
      setReadings({
        boardTempC: Math.round(clamp(wander(base.boardTempC, 1.5), 0, 200)),
        boardFanRpm: toStep(clamp(wander(base.boardFanRpm, 60), 0, 6000), 10),
        ovenTempC: Math.round(clamp(wander(base.ovenTempC, 1.5), 0, 300)),
        ovenFanRpm: toStep(clamp(wander(base.ovenFanRpm, 60), 0, 6000), 10),
        voltageV: Math.round(clamp(wander(base.voltageV, 2), 0, 250)),
        currentA: Math.round(clamp(wander(base.currentA, 1), 0, 60)),
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [base, intervalMs]);

  return readings;
}
