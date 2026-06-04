"use client";

import { clsx } from "clsx";
import { useEffect, useState } from "react";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { Modal } from "@/components/Modal";
import { TemperatureProfileChart } from "@/components/TemperatureProfileChart";
import { CHANGE_RETENTION_PER_PROGRAM_MAX } from "@/lib/limits";
import type { ProfilePoint } from "@/lib/programs";
import type { ChangedPointDiff, ChangeLogEntry, ChangePointRow } from "@/lib/reports";
import { fetchChangeDetail, fetchChanges } from "@/lib/reportsClient";
import { ActionBadge } from "./badges";

/** Dashed-overlay color for the "antes" (before) curve — amber reads as "previous/reference". */
const BEFORE_COLOR = "#fbbf24";
/** Distinct dashed colors for the other editions overlaid on the chart (cycled). */
const EDITION_COLORS = ["#a78bfa", "#34d399", "#f472b6", "#22d3ee", "#fb923c", "#60a5fa", "#2dd4bf", "#fca5a5"];

/** "1 ponto" / "N pontos" — pluralizes the point count used across the section headings. */
const pts = (n: number) => `${n} ${n === 1 ? "ponto" : "pontos"}`;

/** The resulting setpoint curve of one change: the after-curve of a create/edit, the before (removed) curve of a deletion. */
function curveOf(entry: ChangeLogEntry): ProfilePoint[] | null {
  if (entry.detail.kind !== "program") return null;
  return entry.detail.afterProfile ?? entry.detail.beforeProfile ?? null;
}

/**
 * Detail of an audit-log change (Figma "Example Change Config" / "Example Change Program"),
 * shown as a modal. A meta line states who changed what and when; a config change then lists
 * bullet points, and a program change shows the resulting curve plus the added/changed/removed
 * point tables. `change` is kept while closing so the content stays put during the fade-out.
 */
export function ChangeDetail({ change, open, onClose }: { change: ChangeLogEntry | null; open: boolean; onClose: () => void }) {
  const detail = change?.detail;
  const title = !change ? "" : detail?.kind === "config" ? "Alteração - Configuração" : `Alteração - Programa: ${change.target}`;

  const programDetail = detail?.kind === "program" ? detail : null;
  const added = programDetail?.added ?? [];
  const changed = programDetail?.changed ?? [];
  const removed = programDetail?.removed ?? [];

  return (
    <Modal open={open} title={title} onClose={onClose} panelClassName={clsx("max-h-[85vh] w-[90vw]", detail?.kind === "program" ? "max-w-3xl" : "max-w-xl")}>
      <div className='flex flex-col gap-5'>
        {change && <ChangeMeta change={change} />}

        {detail?.kind === "config" && (
          <ul className='ml-5 flex list-disc flex-col gap-2 marker:text-(--brand)'>
            {detail.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        )}

        {programDetail && change && (
          <div className='flex flex-col gap-5'>
            {/* 7a/7b: ONE chart. THIS edition's resulting curve is the solid brand line; the "antes"
                curve and any ticked other editions are dashed overlays controlled below. */}
            <ProgramChart change={change} detail={programDetail} />

            {added.length > 0 && (
              <section className='flex flex-col gap-2'>
                <SectionHeading icon='add_circle' tone='emerald'>
                  {change.action === "Criado" ? `Programa criado com ${pts(added.length)}` : `${pts(added.length)} adicionado${added.length === 1 ? "" : "s"}`}
                </SectionHeading>
                <PointTable rows={added} />
              </section>
            )}
            {changed.length > 0 && (
              <section className='flex flex-col gap-2'>
                <SectionHeading icon='edit' tone='brand'>{`${pts(changed.length)} alterado${changed.length === 1 ? "" : "s"}`}</SectionHeading>
                <DiffTable changed={changed} />
              </section>
            )}
            {removed.length > 0 && (
              <section className='flex flex-col gap-2'>
                <SectionHeading icon='delete' tone='red'>
                  {change.action === "Removido" ? `Programa removido — ${pts(removed.length)}` : `${pts(removed.length)} removido${removed.length === 1 ? "" : "s"}`}
                </SectionHeading>
                <PointTable rows={removed} />
              </section>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

/** Who changed what and when — the audit context for the change, shown right under the title. */
function ChangeMeta({ change }: { change: ChangeLogEntry }) {
  return (
    <div className='flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm'>
      <ActionBadge action={change.action} />
      <span className='inline-flex items-center gap-1.5 opacity-80'>
        <IconGeneral icon='person' fill={1} className='opacity-70 [--icon-size:1.15rem]' />
        {change.user}
      </span>
      <span className='inline-flex items-center gap-1.5 tabular-nums opacity-80'>
        <IconGeneral icon='schedule' fill={1} className='opacity-70 [--icon-size:1.15rem]' />
        {change.at}
      </span>
    </div>
  );
}

/** A colored section heading (icon + label) that ties each block to its meaning — emerald=added,
 *  brand=changed, red=removed, neutral for the curve. Replaces the old "• ..." bullet lines. */
function SectionHeading({ icon, tone, children }: { icon: string; tone: "brand" | "emerald" | "red" | "neutral"; children: React.ReactNode }) {
  const toneCls = {
    brand: "text-(--brand)",
    emerald: "text-emerald-700 dark:text-emerald-400",
    red: "text-red-700 dark:text-red-400",
    neutral: "opacity-80",
  }[tone];
  return (
    <h3 className='flex items-center gap-2 font-semibold'>
      <IconGeneral icon={icon} fill={1} className={clsx("[--icon-size:1.25rem]", toneCls)} />
      <span>{children}</span>
    </h3>
  );
}

/**
 * The single before×after chart for a program change. The opened edition's resulting curve
 * (`afterProfile`, or the removed `beforeProfile`) is the SOLID brand line; everything else is
 * DASHED: the "antes" curve (amber) and each ticked older-edition curve (its own color). The most
 * recent prior edition IS the "antes" state, so its date labels the "Antes" line and it is dropped
 * from the toggle list (no duplicate curve). The editions (excluding this change and anything after
 * it) and their curves are fetched lazily, so the section costs nothing until expanded or ticked.
 */
function ProgramChart({ change, detail }: { change: ChangeLogEntry; detail: Extract<ChangeLogEntry["detail"], { kind: "program" }> }) {
  // This edition's resulting curve is the solid primary line (7a).
  const primary = detail.afterProfile ?? detail.beforeProfile ?? null;
  // The "antes" curve is only meaningful for an edit (a creation has no before, a removal has no after).
  const beforeCurve = detail.afterProfile && detail.beforeProfile ? detail.beforeProfile : null;
  const programId = detail.programId;

  const [overlayIds, setOverlayIds] = useState<string[]>([]);
  const [editions, setEditions] = useState<ChangeLogEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  // id → its resulting curve (undefined = still loading, null = no curve / fetch failed).
  const [curves, setCurves] = useState<Record<string, ProfilePoint[] | null>>({});

  // Reset the per-change overlay state at render-time (sentinel) when the opened change swaps —
  // never via setState in an effect.
  const [shownId, setShownId] = useState<string | null>(null);
  if (shownId !== change.id) {
    setShownId(change.id);
    setOverlayIds([]);
    setEditions(null);
    setFailed(false);
    setCurves({});
  }

  // Fetch this program's editions once (filtered server-side by programId, and capped to the changes
  // strictly BEFORE this one via `before` so opening an earlier edition never lists a later one — 7d).
  useEffect(() => {
    if (!programId || editions || shownId !== change.id) return;
    let cancelled = false;
    fetchChanges({ page: 1, pageSize: CHANGE_RETENTION_PER_PROGRAM_MAX, programId, before: change.atIso })
      .then((r) => !cancelled && setEditions(r.items))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [programId, editions, change.id, change.atIso, shownId]);

  // `before` already drops anything at/after this change; still exclude the current id defensively (7d).
  // editList is newest-first, so editList[0] is the immediately-prior edition — the very curve drawn as
  // "antes". Label that line with its date and keep only the genuinely-older editions as toggles (7e).
  const editList = (editions ?? []).filter((e) => e.id !== change.id);
  const priorEdition = beforeCurve ? editList[0] : undefined;
  const olderEditions = priorEdition ? editList.slice(1) : editList;
  const colorFor = (id: string) => EDITION_COLORS[Math.max(0, olderEditions.findIndex((e) => e.id === id)) % EDITION_COLORS.length];

  const toggle = (id: string) => {
    setOverlayIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
    if (!(id in curves)) {
      fetchChangeDetail(id)
        .then((full) => setCurves((c) => ({ ...c, [id]: curveOf(full) })))
        .catch(() => setCurves((c) => ({ ...c, [id]: null })));
    }
  };

  if (!primary) return null;

  // Every non-primary curve is dashed: the "antes" curve (amber) then each ticked edition (its color).
  const overlays = [
    ...(beforeCurve ? [{ points: beforeCurve, color: BEFORE_COLOR, dashed: true }] : []),
    ...overlayIds
      .map((id) => ({ points: curves[id], color: colorFor(id), dashed: true }))
      .filter((o): o is { points: ProfilePoint[]; color: string; dashed: true } => Array.isArray(o.points) && o.points.length >= 2),
  ];

  const caption = beforeCurve ? "Perfil antes × depois" : change.action === "Removido" ? "Perfil do programa removido" : "Perfil do programa";

  return (
    <section className='flex flex-col gap-3'>
      <SectionHeading icon='show_chart' tone='neutral'>
        {caption}
      </SectionHeading>
      <div className='h-[clamp(170px,28vh,260px)] rounded-xl border border-(--border) p-2'>
        <TemperatureProfileChart points={primary} overlays={overlays} className='h-full w-full' />
      </div>

      {/* Legend + edition toggles: this edition (solid brand), Antes (dashed amber, dated with the prior
          edition), each older edition (dashed color, toggleable). */}
      <ul className='flex flex-col gap-1.5'>
        <li className='flex items-center gap-2 text-sm'>
          <LegendSwatch color='var(--brand)' dashed={false} />
          <span className='font-medium tabular-nums'>{change.at}</span>
          <span className='opacity-60'>· esta edição</span>
        </li>
        {beforeCurve && (
          <li className='flex items-center gap-2 text-sm'>
            <LegendSwatch color={BEFORE_COLOR} dashed />
            <span className='opacity-80'>Antes</span>
            {priorEdition && <span className='tabular-nums opacity-60'>· {priorEdition.at}</span>}
          </li>
        )}

        {failed && <li className='text-sm opacity-70'>Não foi possível carregar o histórico de edições.</li>}
        {programId &&
          olderEditions.map((e) => {
            const checked = overlayIds.includes(e.id);
            return (
              <li key={e.id}>
                <label className='flex cursor-pointer items-center gap-2 text-sm'>
                  <input type='checkbox' checked={checked} onChange={() => toggle(e.id)} className='size-4 accent-(--brand)' />
                  <LegendSwatch color={checked ? colorFor(e.id) : "var(--border)"} dashed />
                  <span className='tabular-nums'>{e.at}</span>
                  <span className='opacity-60'>· {e.action}</span>
                  {checked && curves[e.id] === undefined && <span className='opacity-50'>carregando…</span>}
                  {checked && curves[e.id] === null && <span className='text-amber-600 dark:text-amber-400'>sem curva</span>}
                </label>
              </li>
            );
          })}
      </ul>
    </section>
  );
}

/** A small line swatch for the chart legend — solid bar for the primary, dashed rule for overlays. */
function LegendSwatch({ color, dashed }: { color: string; dashed: boolean }) {
  return dashed ? (
    <span className='inline-block w-5 shrink-0 border-t-2 border-dashed' style={{ borderColor: color }} aria-hidden='true' />
  ) : (
    <span className='inline-block h-0.75 w-5 shrink-0 rounded' style={{ backgroundColor: color }} aria-hidden='true' />
  );
}

const TH_CLS = "[&>th]:bg-(--bg-2) [&>th]:px-4 [&>th]:py-2.5 [&>th]:font-semibold";

/** Plain point table (added / removed points). */
function PointTable({ rows }: { rows: ChangePointRow[] }) {
  return (
    <div className='overflow-x-auto rounded-xl border border-(--border)'>
      <table className='w-full border-collapse text-left'>
        <thead className='text-sm'>
          <tr className={TH_CLS}>
            <th className='w-14'>#</th>
            <th>Temperatura (°C)</th>
            <th>Tempo (s)</th>
            <th>Rampa</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.index} className='border-t border-(--border) [&>td]:px-4 [&>td]:py-2.5'>
              <td className='tabular-nums opacity-70'>{r.index}</td>
              <td className='tabular-nums'>{r.temp}</td>
              <td className='tabular-nums'>{r.timeSec}</td>
              <td>{r.ramp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Before→after diff, ONE row per changed point: every field shows "antes → depois" when it changed
 *  (old value struck through in red, new value in green) and just the single value when it didn't.
 *  Replaces the old git-style "− index / + index" two-row layout, whose # column read like "minus 2". */
function DiffTable({ changed }: { changed: ChangedPointDiff[] }) {
  return (
    <div className='overflow-x-auto rounded-xl border border-(--border)'>
      <table className='w-full border-collapse text-left'>
        <thead className='text-sm'>
          <tr className={TH_CLS}>
            <th className='w-14'>#</th>
            <th>Temperatura (°C)</th>
            <th>Tempo (s)</th>
            <th>Rampa</th>
          </tr>
        </thead>
        <tbody>
          {changed.map((c, i) => (
            <tr key={i} className='border-t border-(--border) [&>td]:px-4 [&>td]:py-2.5'>
              <td className='font-semibold tabular-nums opacity-70'>{c.after.index}</td>
              <DiffCell before={c.before.temp} after={c.after.temp} changed={c.changedFields.includes("temp")} numeric />
              <DiffCell before={c.before.timeSec} after={c.after.timeSec} changed={c.changedFields.includes("timeSec")} numeric />
              <DiffCell before={c.before.ramp} after={c.after.ramp} changed={c.changedFields.includes("ramp")} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** One diff cell: a plain value when unchanged, or "antes → depois" (red struck → green) when it changed. */
function DiffCell({ before, after, changed, numeric }: { before: string | number; after: string | number; changed: boolean; numeric?: boolean }) {
  if (!changed) return <td className={clsx(numeric && "tabular-nums")}>{after}</td>;
  return (
    <td className={clsx(numeric && "tabular-nums")}>
      <span className='inline-flex items-center gap-1.5'>
        <span className='text-red-700/90 line-through decoration-1 dark:text-red-300/90'>{before}</span>
        <IconGeneral icon='arrow_right_alt' className='shrink-0 opacity-50 [--icon-size:1.15rem]' />
        <span className='font-semibold text-emerald-700 dark:text-emerald-300'>{after}</span>
      </span>
    </td>
  );
}
