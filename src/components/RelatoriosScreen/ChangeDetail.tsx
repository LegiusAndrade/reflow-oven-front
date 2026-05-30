"use client";

import { clsx } from "clsx";
import { Fragment } from "react";
import { Modal } from "@/components/Modal";
import { TemperatureProfileChart } from "@/components/TemperatureProfileChart";
import type { ChangeLogEntry, ChangePointRow } from "@/lib/reports";

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
