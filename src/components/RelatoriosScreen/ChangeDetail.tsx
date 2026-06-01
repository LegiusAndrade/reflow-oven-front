"use client";

import { clsx } from "clsx";
import { Fragment, useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { TemperatureProfileChart } from "@/components/TemperatureProfileChart";
import { CHANGE_RETENTION_PER_PROGRAM_MAX } from "@/lib/limits";
import type { ProfilePoint } from "@/lib/programs";
import type { ChangedPointDiff, ChangeDiffField, ChangeLogEntry, ChangePointRow } from "@/lib/reports";
import { fetchChangeDetail, fetchChanges } from "@/lib/reportsClient";

/** Dashed-overlay color for the "antes" (before) curve — amber reads as "previous/reference". */
const BEFORE_COLOR = "#fbbf24";
/** Distinct dashed colors for the other editions overlaid on the chart (cycled). */
const EDITION_COLORS = ["#a78bfa", "#34d399", "#f472b6", "#22d3ee", "#fb923c", "#60a5fa", "#2dd4bf", "#fca5a5"];

/** The resulting setpoint curve of one change: the after-curve of a create/edit, the before (removed) curve of a deletion. */
function curveOf(entry: ChangeLogEntry): ProfilePoint[] | null {
  if (entry.detail.kind !== "program") return null;
  return entry.detail.afterProfile ?? entry.detail.beforeProfile ?? null;
}

/**
 * Detail of an audit-log change (Figma "Example Change Config" / "Example Change Program"),
 * shown as a modal. A config change lists bullet points; a program change shows the resulting
 * curve plus the added/changed/removed point tables. `change` is kept while closing so the
 * content stays put during the fade-out.
 */
export function ChangeDetail({ change, open, onClose }: { change: ChangeLogEntry | null; open: boolean; onClose: () => void }) {
  const detail = change?.detail;
  const title = !change ? "" : detail?.kind === "config" ? "Alteração - Configuração" : `Alteração - Programa: ${change.target}`;

  const programDetail = detail?.kind === "program" ? detail : null;

  return (
    <Modal open={open} title={title} onClose={onClose} panelClassName={clsx("max-h-[85vh] w-[90vw]", detail?.kind === "program" ? "max-w-3xl" : "max-w-xl")}>
      <div className='flex flex-col gap-5'>
        {detail?.kind === "config" && (
          <ul className='ml-5 flex list-disc flex-col gap-2 marker:text-[var(--brand)]'>
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

            {programDetail.added && programDetail.added.length > 0 && (
              <section>
                <p className='mb-2 font-medium'>
                  {change.action === "Criado"
                    ? `• Programa criado com ${programDetail.added.length} ${programDetail.added.length === 1 ? "ponto" : "pontos"}:`
                    : `• Adicionado ${programDetail.added.length} ${programDetail.added.length === 1 ? "ponto" : "pontos"} com os seguintes parâmetros:`}
                </p>
                <PointTable rows={programDetail.added} />
              </section>
            )}
            {programDetail.changed && programDetail.changed.length > 0 && (
              <section>
                <p className='mb-2 font-medium'>{`• Alterado ${programDetail.changed.length} ${programDetail.changed.length === 1 ? "ponto" : "pontos"} com os seguintes parâmetros:`}</p>
                <DiffTable changed={programDetail.changed} />
              </section>
            )}
            {programDetail.removed && programDetail.removed.length > 0 && (
              <section>
                <p className='mb-2 font-medium'>{`• Programa removido (${programDetail.removed.length} ${programDetail.removed.length === 1 ? "ponto" : "pontos"}):`}</p>
                <PointTable rows={programDetail.removed} />
              </section>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

/**
 * The single before×after chart for a program change. The opened edition's resulting curve
 * (`afterProfile`, or the removed `beforeProfile`) is the SOLID brand line; everything else is
 * DASHED: the "antes" curve (amber) and each ticked other-edition curve (its own color). The
 * editions list (excluding this change AND any change after it) and each edition's curve are
 * fetched lazily, so the section costs nothing until something is ticked or it is expanded.
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
  const others = (editions ?? []).filter((e) => e.id !== change.id);
  const colorFor = (id: string) => EDITION_COLORS[Math.max(0, others.findIndex((e) => e.id === id)) % EDITION_COLORS.length];

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

  const caption = beforeCurve ? "Perfil antes × depois:" : change.action === "Removido" ? "Perfil do programa removido:" : "Perfil do programa:";

  return (
    <section className='flex flex-col gap-3'>
      <p className='font-medium'>{`• ${caption}`}</p>
      <div className='h-[clamp(170px,28vh,260px)] rounded-xl border border-[var(--border)] p-2'>
        <TemperatureProfileChart points={primary} overlays={overlays} className='h-full w-full' />
      </div>

      {/* Legend + edition toggles: this edition (solid brand), Antes (dashed amber), each other edition (dashed color). */}
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
          </li>
        )}

        {failed && <li className='text-sm opacity-70'>Não foi possível carregar o histórico de edições.</li>}
        {programId &&
          others.map((e) => {
            const checked = overlayIds.includes(e.id);
            return (
              <li key={e.id}>
                <label className='flex cursor-pointer items-center gap-2 text-sm'>
                  <input type='checkbox' checked={checked} onChange={() => toggle(e.id)} className='size-4 accent-[var(--brand)]' />
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
    <span className='inline-block h-[3px] w-5 shrink-0 rounded' style={{ backgroundColor: color }} aria-hidden='true' />
  );
}

const TH_CLS = "[&>th]:bg-[var(--bg-2)] [&>th]:px-4 [&>th]:py-2.5 [&>th]:font-semibold";

/** Plain point table (added / removed points). */
function PointTable({ rows }: { rows: ChangePointRow[] }) {
  return (
    <div className='overflow-x-auto rounded-xl border border-[var(--border)]'>
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
            <tr key={r.index} className='border-t border-[var(--border)] [&>td]:px-4 [&>td]:py-2.5'>
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

/** Before/after diff: a red "− index" row (old) followed by a green "+ index" row (new); the cells
 *  whose value actually changed (per `changedFields`) are emphasized so the edit is easy to spot. */
function DiffTable({ changed }: { changed: ChangedPointDiff[] }) {
  return (
    <div className='overflow-x-auto rounded-xl border border-[var(--border)]'>
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
            <Fragment key={i}>
              <DiffRow sign='-' row={c.before} changedFields={c.changedFields} />
              <DiffRow sign='+' row={c.after} changedFields={c.changedFields} />
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DiffRow({ sign, row, changedFields }: { sign: "+" | "-"; row: ChangePointRow; changedFields: ChangeDiffField[] }) {
  const removed = sign === "-";
  // Match the Figma "Example Change Program": only the cells that actually changed are tinted/coloured;
  // unchanged ones (e.g. a Rampa that stayed the same) keep the normal text. The #/sign marker is always
  // coloured so the − (antes) / + (depois) rows read at a glance.
  const tint = removed ? "bg-red-500/15 text-red-700 dark:text-red-300" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  const cell = (f: ChangeDiffField) => clsx("px-4 py-2.5", changedFields.includes(f) && tint);
  return (
    <tr className='border-t border-[var(--border)]'>
      <td className={clsx("px-4 py-2.5 font-semibold tabular-nums", tint)}>{`${sign} ${row.index}`}</td>
      <td className={clsx(cell("temp"), "tabular-nums")}>{row.temp}</td>
      <td className={clsx(cell("timeSec"), "tabular-nums")}>{row.timeSec}</td>
      <td className={cell("ramp")}>{row.ramp}</td>
    </tr>
  );
}
