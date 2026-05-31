"use client";

import { useEffect, useRef, useState } from "react";
import type { ProfilePoint } from "@/lib/programs";

const PAD_FULL = { top: 30, right: 24, bottom: 46, left: 56 };
const PAD_COMPACT = { top: 18, right: 10, bottom: 10, left: 10 };
// Below this rendered width there isn't room for axes, so we draw a clean preview.
const COMPACT_BELOW = 420;
// Distance from the plot's bottom edge to the x-axis number baseline.
const X_LABEL_DY = 20;
// Labels use the same responsive scale as the rest of the UI (matches the "Execuções" line).
const LABEL_CLS = "[fill:var(--fg)] text-sm opacity-70 sm:text-base";

/** "Nice" step (1/2/5 × 10ⁿ) so axis ticks land on round numbers. */
function niceStep(range: number, targetTicks: number): number {
  const raw = range / Math.max(targetTicks, 1);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
  return step * mag;
}

function ticks(max: number, step: number): number[] {
  const out: number[] = [];
  for (let v = 0; v <= max + 1e-9; v += step) out.push(Math.round(v));
  return out;
}

/** An extra curve overlaid on the primary one, in its own color (e.g. another edition of a program). */
export interface IProfileOverlay {
  points: ProfilePoint[];
  color: string;
  dashed?: boolean;
}

export interface ITemperatureProfileChartProps {
  points: ProfilePoint[];
  /** Optional second curve drawn dashed (e.g. a "before"/"programmed" profile to compare against). */
  comparePoints?: ProfilePoint[];
  /** Extra curves overlaid on the primary, each in its own color (e.g. a program's other editions). */
  overlays?: IProfileOverlay[];
  /** Optional point to flag on the chart (e.g. where a run faulted). */
  marker?: { t: number; temp: number; label: string };
  className?: string;
}

/** Dashed-overlay color for `comparePoints` (amber reads as "previous/reference", distinct from the brand curve). */
const COMPARE_COLOR = "#fbbf24";
/** Fault-marker color (red). */
const MARKER_COLOR = "#f87171";

/**
 * Reflow profile (temperature × time) as a lightweight SVG line chart. It measures its
 * container and draws in real pixels; text uses Tailwind's fluid type scale. When the
 * rendered width is small it auto-switches to a compact preview (curve + peak, no axes).
 */
export function TemperatureProfileChart({ points, comparePoints, overlays, marker, className }: ITemperatureProfileChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [{ w, h }, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize({ w: rect.width, h: rect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const ready = w > 0 && h > 0 && points.length >= 2;

  // The SVG is positioned absolutely so it never inflates this container — otherwise the
  // container can grow but not shrink back (a ResizeObserver feedback loop).
  return (
    <div ref={ref} className={`relative overflow-hidden ${className ?? ""}`}>
      {ready ? <Plot points={points} comparePoints={comparePoints} overlays={overlays} marker={marker} w={w} h={h} /> : null}
    </div>
  );
}

function Plot({
  points,
  comparePoints,
  overlays,
  marker,
  w,
  h,
}: {
  points: ProfilePoint[];
  comparePoints?: ProfilePoint[];
  overlays?: IProfileOverlay[];
  marker?: { t: number; temp: number; label: string };
  w: number;
  h: number;
}) {
  const compact = w < COMPACT_BELOW;
  const pad = compact ? PAD_COMPACT : PAD_FULL;
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  // Scale the axes to fit every drawn curve (primary + optional before-compare + overlay editions).
  const validOverlays = overlays?.filter((o) => o.points.length >= 2) ?? [];
  const allPoints = [
    ...points,
    ...(comparePoints && comparePoints.length >= 2 ? comparePoints : []),
    ...validOverlays.flatMap((o) => o.points),
  ];
  const maxTime = Math.max(...allPoints.map((p) => p.t));
  const maxTemp = Math.max(...allPoints.map((p) => p.temp));

  const yStep = niceStep(maxTemp, 5);
  const yMax = Math.ceil(maxTemp / yStep) * yStep;
  const xStep = niceStep(maxTime, 5);
  const xMax = Math.ceil(maxTime / xStep) * xStep;

  const sx = (t: number) => pad.left + (t / xMax) * plotW;
  const sy = (temp: number) => pad.top + plotH - (temp / yMax) * plotH;

  const pathOf = (pts: ProfilePoint[]) => pts.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.t).toFixed(1)},${sy(p.temp).toFixed(1)}`).join(" ");
  const linePath = pathOf(points);
  const areaPath = `${linePath} L${sx(maxTime).toFixed(1)},${sy(0).toFixed(1)} L${sx(0).toFixed(1)},${sy(0).toFixed(1)} Z`;
  const comparePath = comparePoints && comparePoints.length >= 2 ? pathOf(comparePoints) : null;
  const peak = points.reduce((a, b) => (b.temp > a.temp ? b : a));

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className='absolute inset-0' role='img' aria-label={`Perfil de temperatura, pico de ${Math.round(peak.temp)} graus Celsius`}>
      <defs>
        <linearGradient id='profile-area' x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0%' style={{ stopColor: "var(--brand)" }} stopOpacity={0.35} />
          <stop offset='100%' style={{ stopColor: "var(--brand)" }} stopOpacity={0} />
        </linearGradient>
      </defs>

      {!compact &&
        ticks(yMax, yStep).map((value) => (
          <g key={`y-${value}`}>
            <line x1={pad.left} y1={sy(value)} x2={w - pad.right} y2={sy(value)} className='[stroke:var(--fg)] opacity-10' strokeWidth={1} />
            <text x={pad.left - 8} y={sy(value)} textAnchor='end' dominantBaseline='middle' className={LABEL_CLS}>
              {value}
            </text>
          </g>
        ))}

      {!compact &&
        ticks(xMax, xStep).map((value) => (
          <g key={`x-${value}`}>
            <line x1={sx(value)} y1={pad.top} x2={sx(value)} y2={pad.top + plotH} className='[stroke:var(--fg)] opacity-10' strokeWidth={1} />
            <text x={sx(value)} y={pad.top + plotH + X_LABEL_DY} textAnchor='middle' className={LABEL_CLS}>
              {value}
            </text>
          </g>
        ))}

      {!compact && (
        <>
          <text x={pad.left} y={pad.top - 12} textAnchor='start' className={LABEL_CLS}>
            °C
          </text>
          <text x={pad.left + plotW / 2} y={h - 6} textAnchor='middle' className={LABEL_CLS}>
            tempo (s)
          </text>
        </>
      )}

      {/* Area under the curve */}
      <path d={areaPath} fill='url(#profile-area)' />

      {/* Optional compare ("before") curve, dashed */}
      {comparePath && (
        <path d={comparePath} fill='none' stroke={COMPARE_COLOR} strokeWidth={compact ? 2 : 2.5} strokeDasharray='6 5' strokeLinejoin='round' strokeLinecap='round' />
      )}

      {/* Overlay curves (e.g. other editions of the program), each in its own color, under the primary line */}
      {validOverlays.map((o, i) => (
        <path
          key={i}
          d={pathOf(o.points)}
          fill='none'
          stroke={o.color}
          strokeWidth={compact ? 2 : 2.5}
          strokeDasharray={o.dashed ? "6 5" : undefined}
          strokeLinejoin='round'
          strokeLinecap='round'
        />
      ))}

      {/* Setpoint curve */}
      <path d={linePath} fill='none' className='[stroke:var(--brand)]' strokeWidth={compact ? 2 : 3} strokeLinejoin='round' strokeLinecap='round' />

      {/* Peak marker */}
      <circle cx={sx(peak.t)} cy={sy(peak.temp)} r={compact ? 3 : 4} className='[fill:var(--brand)]' />
      <text x={sx(peak.t)} y={sy(peak.temp) - 8} textAnchor='middle' className={peakLabelClass(compact)}>
        {`${Math.round(peak.temp)}°C`}
      </text>

      {/* Fault marker (e.g. where a run failed) */}
      {marker && (
        <g>
          <line x1={sx(marker.t)} y1={pad.top} x2={sx(marker.t)} y2={pad.top + plotH} stroke={MARKER_COLOR} strokeWidth={1.5} strokeDasharray='5 4' opacity={0.85} />
          <circle cx={sx(marker.t)} cy={sy(marker.temp)} r={compact ? 4 : 5} fill={MARKER_COLOR} />
          {/* Label at the foot of the line so it never collides with the peak label up top */}
          <text x={sx(marker.t)} y={pad.top + plotH - 6} textAnchor='middle' fill={MARKER_COLOR} className={compact ? "text-sm font-semibold" : "text-base font-semibold"}>
            {marker.label}
          </text>
        </g>
      )}
    </svg>
  );
}

function peakLabelClass(compact: boolean): string {
  return compact ? "[fill:var(--fg)] text-sm font-semibold" : "[fill:var(--fg)] text-base font-semibold sm:text-lg";
}
