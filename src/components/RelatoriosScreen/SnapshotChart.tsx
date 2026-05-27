"use client";

import { clsx } from "clsx";
import { useEffect, useRef, useState } from "react";
import type { FailureSnapshot } from "@/lib/reports";

const PAD = { top: 12, right: 14, bottom: 26, left: 14 };
// Faint horizontal guides (fractions of the plot height).
const GRID = [0, 0.25, 0.5, 0.75, 1];
const TOOLTIP_W = 212;

/**
 * Multi-signal "snapshot" of the moment of a fault. Each series carries a different unit
 * (V, A, °C, rpm), so each is normalized to its own min/max and plotted as a colored line —
 * the chart shows the *shape* of every signal over the fault window, not a shared scale.
 *
 * Interactive: the legend toggles series on/off, and hovering/dragging shows a vertical
 * crosshair with a tooltip reading every visible signal at that instant (pointer events, so
 * it works with both mouse and touch).
 */
export function SnapshotChart({ snapshot, className }: { snapshot: FailureSnapshot; className?: string }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [{ w, h }, setSize] = useState({ w: 0, h: 0 });
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize({ w: rect.width, h: rect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = snapshot.series[0]?.values.length ?? 0;
  const ready = w > 0 && h > 0 && n > 0;
  const plotW = w - PAD.left - PAD.right;
  const plotH = h - PAD.top - PAD.bottom;
  const sx = (k: number) => PAD.left + (n <= 1 ? 0 : (k / (n - 1)) * plotW);

  const toggle = (name: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  // Visible series, each with its own normalized y-scaler and line path.
  const scaled = snapshot.series
    .filter((s) => !hidden.has(s.name))
    .map((s) => {
      const min = Math.min(...s.values);
      const max = Math.max(...s.values);
      const span = max - min || 1;
      const sy = (v: number) => PAD.top + plotH - ((v - min) / span) * plotH;
      const d = s.values.map((v, k) => `${k === 0 ? "M" : "L"}${sx(k).toFixed(1)},${sy(v).toFixed(1)}`).join(" ");
      return { series: s, sy, d };
    });

  const updateHover = (clientX: number) => {
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect || n === 0 || plotW <= 0) return;
    const frac = (clientX - rect.left - PAD.left) / plotW;
    setHover(Math.round(Math.min(1, Math.max(0, frac)) * (n - 1)));
  };

  const hoverTime = hover != null && n > 1 ? Math.round((hover / (n - 1)) * snapshot.durationSec) : 0;
  const tooltipLeft = hover != null ? Math.min(Math.max(sx(hover) + 12, 4), Math.max(4, w - TOOLTIP_W - 4)) : 0;

  return (
    <div className={clsx("flex flex-col gap-2", className)}>
      <div
        ref={chartRef}
        className='relative min-h-0 flex-1 touch-none'
        onPointerMove={(e) => updateHover(e.clientX)}
        onPointerDown={(e) => updateHover(e.clientX)}
        onPointerLeave={() => setHover(null)}
        onPointerUp={() => setHover(null)}
      >
        {ready && (
          <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className='absolute inset-0' role='img' aria-label='Snapshot dos sinais durante a falha'>
            {GRID.map((f) => (
              <line
                key={f}
                x1={PAD.left}
                y1={PAD.top + plotH * f}
                x2={w - PAD.right}
                y2={PAD.top + plotH * f}
                className='[stroke:var(--fg)] opacity-10'
                strokeWidth={1}
              />
            ))}

            <text x={PAD.left} y={h - 8} textAnchor='start' className='[fill:var(--fg)] text-sm opacity-60'>
              0s
            </text>
            <text x={w - PAD.right} y={h - 8} textAnchor='end' className='[fill:var(--fg)] text-sm opacity-60'>
              {snapshot.durationSec}s
            </text>

            {/* Crosshair at the hovered sample */}
            {hover != null && (
              <line x1={sx(hover)} y1={PAD.top} x2={sx(hover)} y2={PAD.top + plotH} className='[stroke:var(--fg)] opacity-40' strokeWidth={1} strokeDasharray='4 4' />
            )}

            {scaled.map(({ series, d }) => (
              <path key={series.name} d={d} fill='none' stroke={series.color} strokeWidth={2} strokeLinejoin='round' strokeLinecap='round' />
            ))}

            {/* Markers on each visible series at the hovered sample */}
            {hover != null &&
              scaled.map(({ series, sy }) => (
                <circle key={series.name} cx={sx(hover)} cy={sy(series.values[hover])} r={3.5} fill={series.color} stroke='var(--card-bg)' strokeWidth={1.5} />
              ))}
          </svg>
        )}

        {/* Readout for the hovered instant */}
        {ready && hover != null && (
          <div
            className='pointer-events-none absolute top-1 z-10 rounded-lg border border-white/15 bg-[var(--bg-2)] px-2.5 py-1.5 text-sm shadow-lg'
            style={{ left: tooltipLeft, width: TOOLTIP_W }}
          >
            <div className='mb-1 font-semibold tabular-nums opacity-70'>t = {hoverTime}s</div>
            {scaled.length === 0 ? (
              <p className='opacity-60'>Nenhum sinal ativo</p>
            ) : (
              <ul className='flex flex-col gap-0.5'>
                {scaled.map(({ series }) => (
                  <li key={series.name} className='flex items-center gap-1.5'>
                    <span className='size-2 shrink-0 rounded-full' style={{ backgroundColor: series.color }} aria-hidden='true' />
                    <span className='flex-1 truncate opacity-80'>{series.name}</span>
                    <span className='shrink-0 font-medium tabular-nums'>
                      {series.values[hover]} {series.unit}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Legend — click a signal to hide/show it */}
      <ul className='flex flex-wrap gap-x-3 gap-y-1 text-sm'>
        {snapshot.series.map((s) => {
          const off = hidden.has(s.name);
          return (
            <li key={s.name}>
              <button
                type='button'
                onClick={() => toggle(s.name)}
                aria-pressed={!off}
                className={clsx("btn-press flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-0.5 hover:bg-white/10", off && "opacity-40")}
              >
                <span className='size-2.5 shrink-0 rounded-full' style={{ backgroundColor: s.color }} aria-hidden='true' />
                <span className={clsx(off && "line-through")}>{s.name}</span>
                <span className='opacity-50'>({s.unit})</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
