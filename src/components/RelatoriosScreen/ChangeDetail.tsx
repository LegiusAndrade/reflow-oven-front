"use client";

import { clsx } from "clsx";
import { Fragment, useEffect, useState } from "react";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { Modal } from "@/components/Modal";
import { TemperatureProfileChart } from "@/components/TemperatureProfileChart";
import { CHANGE_RETENTION_PER_PROGRAM_MAX } from "@/lib/limits";
import type { ProfilePoint } from "@/lib/programs";
import type { ChangeLogEntry, ChangePointRow } from "@/lib/reports";
import { fetchChangeDetail, fetchChanges } from "@/lib/reportsClient";

/**
 * Detail of an audit-log change (Figma "Example Change Config" / "Example Change Program"),
 * shown as a modal. A config change lists bullet points; a program change shows the added
 * points and a before/after diff of the changed ones. `change` is kept while closing so the
 * content stays put during the fade-out.
 */
export function ChangeDetail({ change, open, onClose }: { change: ChangeLogEntry | null; open: boolean; onClose: () => void }) {
  const detail = change?.detail;
  const title = !change ? "" : detail?.kind === "config" ? "Alteração - Configuração" : `Alteração - Programa: ${change.target}`;

  // A before/after comparison only makes sense for an edit. A creation shows just the new curve;
  // a removal just the old one.
  const programDetail = detail?.kind === "program" ? detail : null;
  const hasCompare = !!(programDetail?.afterProfile && programDetail?.beforeProfile);
  const chartCaption = hasCompare ? "Perfil antes × depois:" : change?.action === "Removido" ? "Perfil do programa removido:" : "Perfil do programa:";

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

        {detail?.kind === "program" && (
          <div className='flex flex-col gap-5'>
            {(detail.afterProfile || detail.beforeProfile) && (
              <section>
                <p className='mb-2 font-medium'>{`• ${chartCaption}`}</p>
                <div className='h-[clamp(170px,28vh,260px)] rounded-xl border border-[var(--border)] p-2'>
                  <TemperatureProfileChart
                    points={(detail.afterProfile ?? detail.beforeProfile)!}
                    comparePoints={hasCompare ? detail.beforeProfile : undefined}
                    className='h-full w-full'
                  />
                </div>
                {hasCompare && (
                  <ul className='mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm'>
                    <li className='flex items-center gap-1.5'>
                      <span className='inline-block w-5 border-t-2 border-dashed' style={{ borderColor: "#fbbf24" }} aria-hidden='true' />
                      <span className='opacity-80'>Antes</span>
                    </li>
                    <li className='flex items-center gap-1.5'>
                      <span className='inline-block h-[3px] w-5 rounded bg-[var(--brand)]' aria-hidden='true' />
                      <span className='opacity-80'>Depois</span>
                    </li>
                  </ul>
                )}
              </section>
            )}
            {detail.added && detail.added.length > 0 && (
              <section>
                <p className='mb-2 font-medium'>
                  {change?.action === "Criado"
                    ? `• Programa criado com ${detail.added.length} ${detail.added.length === 1 ? "ponto" : "pontos"}:`
                    : `• Adicionado ${detail.added.length} ${detail.added.length === 1 ? "ponto" : "pontos"} com os seguintes parâmetros:`}
                </p>
                <PointTable rows={detail.added} />
              </section>
            )}
            {detail.changed && detail.changed.length > 0 && (
              <section>
                <p className='mb-2 font-medium'>{`• Alterado ${detail.changed.length} ${detail.changed.length === 1 ? "ponto" : "pontos"} com os seguintes parâmetros:`}</p>
                <DiffTable changed={detail.changed} />
              </section>
            )}
            {detail.removed && detail.removed.length > 0 && (
              <section>
                <p className='mb-2 font-medium'>{`• Programa removido (${detail.removed.length} ${detail.removed.length === 1 ? "ponto" : "pontos"}):`}</p>
                <PointTable rows={detail.removed} />
              </section>
            )}
            {detail.programId && change && <EditionCompare programId={detail.programId} current={change} />}
          </div>
        )}
      </div>
    </Modal>
  );
}

const TH_CLS = "[&>th]:bg-[var(--bg-2)] [&>th]:px-4 [&>th]:py-2.5 [&>th]:font-semibold";

/** Plain point table (added points). */
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

/** Before/after diff: a red "− index" row (old) followed by a green "+ index" row (new). */
function DiffTable({ changed }: { changed: { before: ChangePointRow; after: ChangePointRow }[] }) {
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
              <DiffRow sign='-' row={c.before} />
              <DiffRow sign='+' row={c.after} />
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DiffRow({ sign, row }: { sign: "+" | "-"; row: ChangePointRow }) {
  const removed = sign === "-";
  return (
    <tr className={clsx("border-t border-[var(--border)] [&>td]:px-4 [&>td]:py-2.5", removed ? "bg-red-500/15 text-red-700 dark:text-red-300" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300")}>
      <td className='font-semibold tabular-nums'>{`${sign} ${row.index}`}</td>
      <td className='tabular-nums'>{row.temp}</td>
      <td className='tabular-nums'>{row.timeSec}</td>
      <td>{row.ramp}</td>
    </tr>
  );
}

/** Distinct overlay colors (the opened change is the brand-colored primary; these color the others). */
const EDITION_COLORS = ["#a78bfa", "#34d399", "#f472b6", "#22d3ee", "#fb923c", "#60a5fa", "#facc15", "#2dd4bf", "#fca5a5"];

/** The resulting setpoint curve of one change: the after-curve of a create/edit, the removed curve of a deletion. */
function curveOf(entry: ChangeLogEntry): ProfilePoint[] | null {
  if (entry.detail.kind !== "program") return null;
  return entry.detail.afterProfile ?? entry.detail.beforeProfile ?? null;
}

/**
 * Edit history of a program: lists its recent editions (up to the backend retention cap) and lets the
 * user tick which to overlay on the chart — the opened change is the solid brand primary curve, each
 * ticked edition adds a colored curve. The editions list and each edition's curve are fetched lazily
 * when the section is expanded / a row is ticked, so a closed section costs nothing.
 */
function EditionCompare({ programId, current }: { programId: string; current: ChangeLogEntry }) {
  const [open, setOpen] = useState(false);
  const [editions, setEditions] = useState<ChangeLogEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [overlayIds, setOverlayIds] = useState<string[]>([]);
  // id → its resulting curve (undefined = still loading, null = no curve / fetch failed).
  const [curves, setCurves] = useState<Record<string, ProfilePoint[] | null>>({});

  // Fetch this program's editions the first time the section is expanded (filtered server-side by programId).
  useEffect(() => {
    if (!open || editions) return;
    let cancelled = false;
    fetchChanges({ page: 1, pageSize: CHANGE_RETENTION_PER_PROGRAM_MAX, programId })
      .then((r) => !cancelled && setEditions(r.items))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [open, editions, programId]);

  // The opened change is always the primary curve, so the toggleable list excludes it.
  const others = (editions ?? []).filter((e) => e.id !== current.id);
  const colorFor = (id: string) => EDITION_COLORS[Math.max(0, others.findIndex((e) => e.id === id)) % EDITION_COLORS.length];

  const toggle = (id: string) => {
    setOverlayIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
    if (!(id in curves)) {
      fetchChangeDetail(id)
        .then((full) => setCurves((c) => ({ ...c, [id]: curveOf(full) })))
        .catch(() => setCurves((c) => ({ ...c, [id]: null })));
    }
  };

  const primary = curveOf(current);
  const overlays = overlayIds
    .map((id) => ({ points: curves[id], color: colorFor(id) }))
    .filter((o): o is { points: ProfilePoint[]; color: string } => Array.isArray(o.points) && o.points.length >= 2);

  // A lone creation (no other editions) has nothing to compare — hide the section once we know.
  if (editions && others.length === 0) return null;

  return (
    <section className='flex flex-col gap-3 border-t border-[var(--border)] pt-4'>
      <button
        type='button'
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className='btn-press flex items-center gap-2 self-start rounded-lg px-2 py-1 font-medium hover:bg-[var(--hover)]'
      >
        <IconGeneral icon={open ? "expand_less" : "expand_more"} fill={0} className='[--icon-size:1.25rem]' />
        Comparar com outras edições
      </button>

      {open && (
        <>
          {failed && <p className='text-sm opacity-70'>Não foi possível carregar o histórico de edições.</p>}
          {!failed && !editions && <p className='text-sm opacity-60'>Carregando edições…</p>}
          {editions && primary && (
            <>
              <div className='h-[clamp(170px,28vh,260px)] rounded-xl border border-[var(--border)] p-2'>
                <TemperatureProfileChart points={primary} overlays={overlays} className='h-full w-full' />
              </div>
              <ul className='flex flex-col gap-1.5'>
                <li className='flex items-center gap-2 text-sm'>
                  <span className='inline-block h-[3px] w-5 shrink-0 rounded bg-[var(--brand)]' aria-hidden='true' />
                  <span className='font-medium tabular-nums'>{current.at}</span>
                  <span className='opacity-60'>· esta edição</span>
                </li>
                {others.map((e) => {
                  const checked = overlayIds.includes(e.id);
                  return (
                    <li key={e.id}>
                      <label className='flex cursor-pointer items-center gap-2 text-sm'>
                        <input type='checkbox' checked={checked} onChange={() => toggle(e.id)} className='size-4 accent-[var(--brand)]' />
                        <span
                          className='inline-block h-[3px] w-5 shrink-0 rounded'
                          style={{ backgroundColor: checked ? colorFor(e.id) : "var(--border)" }}
                          aria-hidden='true'
                        />
                        <span className='tabular-nums'>{e.at}</span>
                        <span className='opacity-60'>· {e.action}</span>
                        {checked && curves[e.id] === undefined && <span className='opacity-50'>carregando…</span>}
                        {checked && curves[e.id] === null && <span className='text-amber-600 dark:text-amber-400'>sem curva</span>}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  );
}
