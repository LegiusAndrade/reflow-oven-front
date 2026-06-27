"use client";

import { clsx } from "clsx";
import { useEffect, useRef, useState } from "react";

export type ChartSignal = { name: string; unit: string; color: string; values: number[] };
/** A labelled vertical reference line at a fixed time (e.g. t = 0, the fault instant). */
export type ChartMarker = { t: number; label?: string; color?: string };

const PAD = { top: 12, right: 14, bottom: 26, left: 14 };
const GRID = [0, 0.25, 0.5, 0.75, 1];
const TOOLTIP_W = 212;
const MARKER_COLOR = "#f87171"; // fault red (matches the run/Relatórios fault marker)

/**
 * Interactive multi-signal line chart over a time axis. Each signal carries its own unit
 * (°C, A, V, rpm) and is normalized to its own min/max — the chart shows the *shape* of every
 * signal, not a shared scale. The x position of sample `k` maps `times[k]` across the
 * [`xMinSec`, `xMaxSec`] domain (`xMinSec` defaults to 0, so a live trace grows left-to-right on
 * a fixed axis; pass a negative `xMinSec` for a fault-relative axis, e.g. −1 s … +2 s).
 *
 * `markers` draws labelled vertical reference lines at fixed times (e.g. t = 0, the fault
 * instant in the black box). `timePrecision` is the decimals shown on the axis ends and the
 * hover tooltip (0 = whole seconds, the default; 2 for the millisecond-scale black box).
 *
 * Interactive: the legend toggles series on/off; hovering/dragging shows a crosshair + tooltip
 * reading every visible signal at the nearest sample (pointer events → mouse and touch).
 *
 * Backs the Relatórios fault snapshots (SnapshotChart, FaultSnapshotChart). The live execution
 * (INICIAR) view uses the separate MultiAxisChart (real left/right axes + synced crosshair).
 */
export function SignalChart({
  signals,
  times,
  xMaxSec,
  xMinSec = 0,
  markers,
  timePrecision = 0,
  className,
}: {
  signals: ChartSignal[];
  times: number[];
  xMaxSec: number;
  xMinSec?: number;
  markers?: ChartMarker[];
  timePrecision?: number;
  className?: string;
}) {
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

  const n = times.length;
  const ready = w > 0 && h > 0 && n > 0;
  const plotW = w - PAD.left - PAD.right;
  const plotH = h - PAD.top - PAD.bottom;
  const span = xMaxSec - xMinSec > 0 ? xMaxSec - xMinSec : 1;
  const fmtT = (t: number) => t.toFixed(timePrecision);
  const sxT = (t: number) => PAD.left + Math.min(1, Math.max(0, (t - xMinSec) / span)) * plotW;
  const sx = (k: number) => sxT(times[k] ?? 0);

  const toggle = (name: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const scaled = signals
    .filter((s) => !hidden.has(s.name))
    .map((s) => {
      const min = Math.min(...s.values);
      const max = Math.max(...s.values);
      const range = max - min || 1;
      const sy = (v: number) => PAD.top + plotH - ((v - min) / range) * plotH;
      const d = s.values.map((v, k) => `${k === 0 ? "M" : "L"}${sx(k).toFixed(1)},${sy(v).toFixed(1)}`).join(" ");
      return { signal: s, sy, d };
    });

  // Map a pointer x to the nearest sample (times are increasing).
  const updateHover = (clientX: number) => {
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect || n === 0 || plotW <= 0) return;
    const targetT = xMinSec + Math.min(1, Math.max(0, (clientX - rect.left - PAD.left) / plotW)) * span;
    let best = 0;
    let bestD = Infinity;
    for (let k = 0; k < n; k++) {
      const d = Math.abs((times[k] ?? 0) - targetT);
      if (d < bestD) {
        bestD = d;
        best = k;
      }
    }
    setHover(best);
  };

  const hoverTime = hover != null ? fmtT(times[hover] ?? 0) : "0";
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
          <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className='absolute inset-0' role='img' aria-label='Sinais ao longo do tempo'>
            {GRID.map((f) => (
              <line key={f} x1={PAD.left} y1={PAD.top + plotH * f} x2={w - PAD.right} y2={PAD.top + plotH * f} className='stroke-(--fg) opacity-10' strokeWidth={1} />
            ))}

            <text x={PAD.left} y={h - 8} textAnchor='start' className='fill-(--fg) text-sm opacity-60'>
              {fmtT(xMinSec)}s
            </text>
            <text x={w - PAD.right} y={h - 8} textAnchor='end' className='fill-(--fg) text-sm opacity-60'>
              {fmtT(xMaxSec)}s
            </text>

            {hover != null && (
              <line x1={sx(hover)} y1={PAD.top} x2={sx(hover)} y2={PAD.top + plotH} className='stroke-(--fg) opacity-40' strokeWidth={1} strokeDasharray='4 4' />
            )}

            {scaled.map(({ signal, d }) => (
              <path key={signal.name} d={d} fill='none' stroke={signal.color} strokeWidth={2} strokeLinejoin='round' strokeLinecap='round' />
            ))}

            {/* Fixed reference markers (e.g. t = 0, the fault instant) — drawn over the data */}
            {markers?.map((m, i) => {
              const mx = sxT(m.t);
              const color = m.color ?? MARKER_COLOR;
              return (
                <g key={`marker-${i}`}>
                  <line x1={mx} y1={PAD.top} x2={mx} y2={PAD.top + plotH} stroke={color} strokeWidth={1.5} strokeDasharray='5 3' />
                  {m.label && (
                    <text
                      x={mx}
                      y={PAD.top + 11}
                      textAnchor='middle'
                      className='text-sm font-semibold'
                      style={{ fill: color, paintOrder: "stroke", stroke: "var(--card-bg)", strokeWidth: 3 }}
                    >
                      {m.label}
                    </text>
                  )}
                </g>
              );
            })}

            {hover != null &&
              scaled.map(({ signal, sy }) => (
                <circle key={signal.name} cx={sx(hover)} cy={sy(signal.values[hover])} r={3.5} fill={signal.color} stroke='var(--card-bg)' strokeWidth={1.5} />
              ))}
          </svg>
        )}

        {ready && hover != null && (
          <div
            className='pointer-events-none absolute top-1 z-10 rounded-lg border border-(--border) bg-(--bg-2) px-2.5 py-1.5 text-sm shadow-lg'
            style={{ left: tooltipLeft, width: TOOLTIP_W }}
          >
            <div className='mb-1 font-semibold tabular-nums opacity-70'>t = {hoverTime}s</div>
            {scaled.length === 0 ? (
              <p className='opacity-60'>Nenhum sinal ativo</p>
            ) : (
              <ul className='flex flex-col gap-0.5'>
                {scaled.map(({ signal }) => (
                  <li key={signal.name} className='flex items-center gap-1.5'>
                    <span className='size-2 shrink-0 rounded-full' style={{ backgroundColor: signal.color }} aria-hidden='true' />
                    <span className='flex-1 truncate opacity-80'>{signal.name}</span>
                    <span className='shrink-0 font-medium tabular-nums'>
                      {signal.values[hover]} {signal.unit}
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
        {signals.map((s) => {
          const off = hidden.has(s.name);
          return (
            <li key={s.name}>
              <button
                type='button'
                onClick={() => toggle(s.name)}
                aria-pressed={!off}
                className={clsx("btn-press flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-0.5 hover:bg-(--hover)", off && "opacity-40")}
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
