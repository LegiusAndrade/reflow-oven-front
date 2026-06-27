import { SignalChart, type ChartSignal } from "@/components/SignalChart";
import type { FaultSnapshot, FaultSnapshotSample } from "@/lib/reports";

/**
 * The fault "black box" — a thin wrapper over the shared {@link SignalChart}. It overlays every
 * engineering-unit signal of the snapshot on a *fault-relative* time axis: sample `i` sits at
 * `(i - triggerIndex) * sampleIntervalMs / 1000` seconds, so the captured window runs e.g. −1 s
 * … +2 s, and a vertical marker flags t = 0 (the instant the fault latched). Each signal is
 * normalized to its own scale (the chart shows shape, not a shared axis); the legend toggles them.
 *
 * Colours follow the project's Relatórios snapshot palette (see lib/run.ts RUN_SIGNALS).
 */
const SIGNALS: { key: keyof FaultSnapshotSample; name: string; unit: string; color: string }[] = [
  { key: "setpointC", name: "Alvo (setpoint)", unit: "°C", color: "#93c5fd" },
  { key: "ovenTempC", name: "Temp. Forno", unit: "°C", color: "#fbbf24" },
  { key: "boardTempC", name: "Temp. Placa", unit: "°C", color: "#a78bfa" },
  { key: "mcuTempC", name: "Temp. MCU", unit: "°C", color: "#c084fc" },
  { key: "currentA", name: "Corrente", unit: "A", color: "#f87171" },
  { key: "powerW", name: "Potência", unit: "W", color: "#fb923c" },
  { key: "buckDutyPct", name: "Duty Buck", unit: "%", color: "#facc15" },
  { key: "vbusV", name: "VBUS", unit: "V", color: "#22d3ee" },
  { key: "vregV", name: "VREG", unit: "V", color: "#2dd4bf" },
  { key: "pdV", name: "PD", unit: "V", color: "#38bdf8" },
  { key: "vddaV", name: "VDDA", unit: "V", color: "#818cf8" },
  { key: "dutyIntakePct", name: "Duty Entrada", unit: "%", color: "#f472b6" },
  { key: "dutyExhaustPct", name: "Duty Exaustão", unit: "%", color: "#fb7185" },
  { key: "dutyBoardPct", name: "Duty Placa", unit: "%", color: "#e879f9" },
  { key: "fanIntakeRpm", name: "Fan Entrada", unit: "rpm", color: "#34d399" },
  { key: "fanExhaustRpm", name: "Fan Exaustão", unit: "rpm", color: "#4ade80" },
  { key: "fanBoardRpm", name: "Fan Placa", unit: "rpm", color: "#a3e635" },
];

export function FaultSnapshotChart({ snapshot, className }: { snapshot: FaultSnapshot; className?: string }) {
  const { samples, triggerIndex, sampleIntervalMs } = snapshot;
  const n = samples.length;
  // X axis = time relative to the fault instant (sample triggerIndex → t = 0), in seconds.
  const times = samples.map((_, i) => ((i - triggerIndex) * sampleIntervalMs) / 1000);
  const signals: ChartSignal[] = SIGNALS.map((s) => ({
    name: s.name,
    unit: s.unit,
    color: s.color,
    values: samples.map((sample) => sample[s.key]),
  }));
  const xMinSec = n > 0 ? times[0] : 0;
  const xMaxSec = n > 0 ? times[n - 1] : 0;

  return (
    <SignalChart
      signals={signals}
      times={times}
      xMinSec={xMinSec}
      xMaxSec={xMaxSec}
      markers={[{ t: 0, label: "Falha" }]}
      timePrecision={2}
      className={className}
    />
  );
}
