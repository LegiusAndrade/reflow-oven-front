"use client";

import { clsx } from "clsx";
import { useEffect, useRef, useState } from "react";

export type Series = { name: string; color: string; values: number[]; unit?: string };
/** One Y axis: a unit label and the series that share its (real-valued) scale. */
export type Axis = { unit: string; series: Series[] };

const GRID = [0, 0.5, 1];

/** "Nice" step (1/2/5 × 10ⁿ) so axis ticks land on round numbers. */
function niceStep(range: number, target: number): number {
  const raw = range / Math.max(target, 1);
  const mag = 10 ** Math.floor(Math.log10(raw || 1));
  const norm = raw / mag;
  const step = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
  return step * mag;
}

/** Min/max over a set of series (padded a touch so lines don't hug the edges). */
function rangeOf(series: Series[], extra: number[] = []): [number, number] {
  const vals = [...series.flatMap((s) => s.values), ...extra];
  if (!vals.length) return [0, 1];
  const lo = Math.min(...vals);
  let hi = Math.max(...vals);
  if (hi === lo) hi = lo + 1;
  const pad = (hi - lo) * 0.08;
  return [lo - pad, hi + pad];
}

const fmt = (v: number) => (Math.abs(v) >= 100 || Number.isInteger(v) ? Math.round(v).toString() : v.toFixed(1));

/**
 * Time-series chart with one or two real Y axes (left + optional right), an optional faded
 * "expected" reference curve, time gridlines, a live value label at the end of each line, and a
 * crosshair controlled from the outside so several charts can share it (hover one → all move).
 */
export function MultiAxisChart({
  times,
  xMaxSec,
  left,
  right,
  background,
  hoverTime,
  onHoverTime,
  className,
}: {
  times: number[];
  xMaxSec: number;
  left: Axis;
  right?: Axis;
  background?: { color: string; points: { t: number; v: number }[] };
  hoverTime: number | null;
  onHoverTime: (_t: number | null) => void;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [{ w, h }, setSize] = useState({ w: 0, h: 0 });
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());

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

  const pad = { top: 28, bottom: 30, left: 48, right: right ? 48 : 16 };
  const n = times.length;
  const ready = w > 0 && h > 0 && n > 0;
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;
  const span = xMaxSec > 0 ? xMaxSec : 1;

  const leftVisible = left.series.filter((s) => !hidden.has(s.name));
  const rightVisible = right?.series.filter((s) => !hidden.has(s.name)) ?? [];
  const [lLo, lHi] = rangeOf(leftVisible.length ? leftVisible : left.series, background ? background.points.map((p) => p.v) : []);
  const [rLo, rHi] = rangeOf(rightVisible.length ? rightVisible : (right?.series ?? []));

  const sx = (t: number) => pad.left + Math.min(1, Math.max(0, t / span)) * plotW;
  const syL = (v: number) => pad.top + plotH - ((v - lLo) / (lHi - lLo || 1)) * plotH;
  const syR = (v: number) => pad.top + plotH - ((v - rLo) / (rHi - rLo || 1)) * plotH;

  const linePath = (vals: number[], sy: (_v: number) => number) =>
    vals.map((v, k) => `${k === 0 ? "M" : "L"}${sx(times[k] ?? 0).toFixed(1)},${sy(v).toFixed(1)}`).join(" ");

  const bgPath = background?.points.length
    ? background.points.map((p, k) => `${k === 0 ? "M" : "L"}${sx(p.t).toFixed(1)},${syL(p.v).toFixed(1)}`).join(" ")
    : null;

  // Time gridlines/labels.
  const xStep = niceStep(xMaxSec, 5);
  const xTicks: number[] = [];
  for (let v = 0; v <= xMaxSec + 1e-6; v += xStep) xTicks.push(Math.round(v));

  // Nearest sample to the shared hover time.
  let hi = -1;
  if (hoverTime != null && n > 0) {
    let bestD = Infinity;
    for (let k = 0; k < n; k++) {
      const d = Math.abs((times[k] ?? 0) - hoverTime);
      if (d < bestD) {
        bestD = d;
        hi = k;
      }
    }
  }

  const updateHover = (clientX: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || plotW <= 0) return;
    onHoverTime(Math.min(1, Math.max(0, (clientX - rect.left - pad.left) / plotW)) * span);
  };

  const toggle = (name: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  // Live value labels at the end of each line: just the value, in the series colour (no name — the
  // legend identifies the colours). They share the last sample's x, so stack them apart vertically
  // so two close lines never print on top of each other ("um label em cima do outro").
  const lastK = n - 1;
  const lastX = sx(times[lastK] ?? 0);
  const labelToRight = lastX < w - 72;
  const endLabels = [
    ...leftVisible.map((s) => ({ color: s.color, value: s.values[lastK] ?? NaN, unit: s.unit ?? "", y: syL(s.values[lastK] ?? NaN) })),
    ...rightVisible.map((s) => ({ color: s.color, value: s.values[lastK] ?? NaN, unit: s.unit ?? "", y: syR(s.values[lastK] ?? NaN) })),
  ].filter((l) => Number.isFinite(l.value));
  endLabels.sort((a, b) => a.y - b.y);
  const LABEL_GAP = 17;
  for (let i = 1; i < endLabels.length; i++) {
    if (endLabels[i].y - endLabels[i - 1].y < LABEL_GAP) endLabels[i].y = endLabels[i - 1].y + LABEL_GAP;
  }
  const spill = endLabels.length ? endLabels[endLabels.length - 1].y - (pad.top + plotH) : 0;
  if (spill > 0) endLabels.forEach((l) => (l.y -= spill));

  const allSeries = [...left.series, ...(right?.series ?? [])];

  return (
    <div className={clsx("flex min-h-0 flex-col gap-1.5", className)}>
      <div
        ref={ref}
        className='relative min-h-0 flex-1 touch-none'
        onPointerMove={(e) => updateHover(e.clientX)}
        onPointerDown={(e) => updateHover(e.clientX)}
        onPointerLeave={() => onHoverTime(null)}
        onPointerUp={() => onHoverTime(null)}
      >
        {ready && (
          <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className='absolute inset-0' role='img' aria-label={`Gráfico de ${left.unit}`}>
            {/* Horizontal gridlines + Y axis values (left, and right if present) */}
            {GRID.map((f) => {
              const y = pad.top + plotH * f;
              return (
                <g key={`h-${f}`}>
                  <line x1={pad.left} y1={y} x2={w - pad.right} y2={y} className='[stroke:var(--fg)] opacity-10' strokeWidth={1} />
                  <text x={pad.left - 6} y={y} textAnchor='end' dominantBaseline='middle' className='[fill:var(--fg)] text-sm opacity-55 tabular-nums'>
                    {fmt(lHi - (lHi - lLo) * f)}
                  </text>
                  {right && (
                    <text x={w - pad.right + 6} y={y} textAnchor='start' dominantBaseline='middle' className='[fill:var(--fg)] text-sm opacity-55 tabular-nums'>
                      {fmt(rHi - (rHi - rLo) * f)}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Vertical time gridlines + labels */}
            {xTicks.map((t) => (
              <g key={`v-${t}`}>
                <line x1={sx(t)} y1={pad.top} x2={sx(t)} y2={pad.top + plotH} className='[stroke:var(--fg)] opacity-[0.07]' strokeWidth={1} />
                <text x={sx(t)} y={h - 8} textAnchor='middle' className='[fill:var(--fg)] text-sm opacity-55 tabular-nums'>
                  {t}s
                </text>
              </g>
            ))}

            {/* Axis unit labels — sit above the top tick so they never collide with it */}
            <text x={pad.left - 6} y={pad.top - 14} textAnchor='end' className='[fill:var(--fg)] text-sm font-semibold opacity-70'>
              {left.unit}
            </text>
            {right && (
              <text x={w - pad.right + 6} y={pad.top - 14} textAnchor='start' className='[fill:var(--fg)] text-sm font-semibold opacity-70'>
                {right.unit}
              </text>
            )}

            {/* Expected (programmed) reference, faded */}
            {bgPath && <path d={bgPath} fill='none' stroke={background!.color} strokeWidth={1.5} strokeDasharray='5 4' opacity={0.4} strokeLinejoin='round' />}

            {hi >= 0 && <line x1={sx(times[hi] ?? 0)} y1={pad.top} x2={sx(times[hi] ?? 0)} y2={pad.top + plotH} className='[stroke:var(--fg)] opacity-40' strokeWidth={1} strokeDasharray='4 4' />}

            {leftVisible.map((s) => (
              <path key={s.name} d={linePath(s.values, syL)} fill='none' stroke={s.color} strokeWidth={2} strokeLinejoin='round' strokeLinecap='round' />
            ))}
            {rightVisible.map((s) => (
              <path key={s.name} d={linePath(s.values, syR)} fill='none' stroke={s.color} strokeWidth={2} strokeLinejoin='round' strokeLinecap='round' />
            ))}

            {/* Live value labels at the end of each line — value only, in the series colour */}
            {endLabels.map((l, i) => (
              <text
                key={`end-${i}`}
                x={labelToRight ? lastX + 7 : lastX - 7}
                y={l.y}
                dominantBaseline='middle'
                textAnchor={labelToRight ? "start" : "end"}
                className='text-base font-bold'
                style={{ fill: l.color, paintOrder: "stroke", stroke: "var(--card-bg)", strokeWidth: 4 }}
              >
                {`${fmt(l.value)}${l.unit ? ` ${l.unit}` : ""}`}
              </text>
            ))}

            {hi >= 0 && leftVisible.map((s) => <circle key={`ml-${s.name}`} cx={sx(times[hi] ?? 0)} cy={syL(s.values[hi])} r={3} fill={s.color} stroke='var(--card-bg)' strokeWidth={1.5} />)}
            {hi >= 0 && rightVisible.map((s) => <circle key={`mr-${s.name}`} cx={sx(times[hi] ?? 0)} cy={syR(s.values[hi])} r={3} fill={s.color} stroke='var(--card-bg)' strokeWidth={1.5} />)}
          </svg>
        )}
      </div>

      {/* Legend — toggles series for this chart */}
      <ul className='flex flex-wrap gap-x-4 gap-y-1 text-base'>
        {allSeries.map((s) => {
          const off = hidden.has(s.name);
          return (
            <li key={s.name}>
              <button
                type='button'
                onClick={() => toggle(s.name)}
                aria-pressed={!off}
                className={clsx("btn-press flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-0.5 hover:bg-[var(--hover)]", off && "opacity-40")}
              >
                <span className='size-2.5 shrink-0 rounded-full' style={{ backgroundColor: s.color }} aria-hidden='true' />
                <span className={clsx(off && "line-through")}>{s.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
