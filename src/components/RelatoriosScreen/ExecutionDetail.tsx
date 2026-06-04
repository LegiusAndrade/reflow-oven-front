"use client";

import { IconGeneral } from "@/components/Icon/IconGeneral";
import { TemperatureProfileChart } from "@/components/TemperatureProfileChart";
import type { ExecutionReport } from "@/lib/reports";
import { StatusBadge } from "./badges";
import { DetailShell, EventList, Field, SectionTitle } from "./detailParts";
import { SnapshotChart } from "./SnapshotChart";

/** Full detail of a past run (Figma "Report Detail Exec"): profile chart, key figures,
 *  the programmed-vs-measured comparison, and the run's event timeline. `onOpenError` (when
 *  given) jumps from a failed run to its linked entry in the Erros report. */
export function ExecutionDetail({
  exec,
  onClose,
  onOpenError,
}: {
  exec: ExecutionReport;
  onClose: () => void;
  onOpenError?: (_errorId: string) => void;
}) {
  return (
    <DetailShell title={exec.programName} onClose={onClose}>
      <div className='flex flex-col gap-6'>
        {/* Failure context (failed/aborted runs): reason, optional code, and the link to the Erros report */}
        {exec.failureReason && (
          <section className='rounded-xl border border-red-500/40 bg-red-500/10 p-[clamp(0.75rem,2vw,1rem)]'>
            <div className='flex items-start gap-2'>
              <IconGeneral icon='error' fill={1} className='mt-0.5 shrink-0 text-red-700 [--icon-size:1.5rem] dark:text-red-400' />
              <div className='flex min-w-0 flex-col gap-1'>
                <p className='text-sm font-semibold tracking-wide text-red-700 uppercase dark:text-red-400'>Motivo da falha</p>
                <p className='font-medium'>{exec.failureReason}</p>
                {exec.errorCode && <p className='text-sm opacity-60'>Código: {exec.errorCode}</p>}
              </div>
            </div>
            {exec.linkedErrorId && onOpenError && (
              <button
                type='button'
                onClick={() => onOpenError(exec.linkedErrorId!)}
                className='btn-action mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 font-semibold'
              >
                <IconGeneral icon='error' fill={0} className='[--icon-size:1.25rem]' />
                Ver no Relatório de Erros
              </button>
            )}
          </section>
        )}
        {/* Profile chart: programmed (dashed) vs real (solid), with the fault flagged */}
        <div>
          <div className='h-[clamp(170px,30vh,300px)] rounded-xl border border-(--border) p-2'>
            <TemperatureProfileChart
              points={exec.realProfile}
              comparePoints={exec.profile}
              marker={exec.faultAt ? { ...exec.faultAt, label: "Falha" } : undefined}
              className='h-full w-full'
            />
          </div>
          <ul className='mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm'>
            <li className='flex items-center gap-1.5'>
              <span className='inline-block w-5 border-t-2 border-dashed' style={{ borderColor: "#fbbf24" }} aria-hidden='true' />
              <span className='opacity-80'>Programado</span>
            </li>
            <li className='flex items-center gap-1.5'>
              <span className='inline-block h-0.75 w-5 rounded bg-(--brand)' aria-hidden='true' />
              <span className='opacity-80'>Real</span>
            </li>
            {exec.faultAt && (
              <li className='flex items-center gap-1.5'>
                <span className='size-2.5 shrink-0 rounded-full' style={{ backgroundColor: "#f87171" }} aria-hidden='true' />
                <span className='opacity-80'>Falha</span>
              </li>
            )}
          </ul>
        </div>

        {/* Multi-signal trace captured during the run (only when the run recorded signals) */}
        {exec.trace && exec.trace.series.length > 0 && (
          <section>
            <SectionTitle>Sinais da Execução</SectionTitle>
            <div className='h-[clamp(240px,46vh,400px)] rounded-xl border border-(--border) p-2'>
              <SnapshotChart snapshot={exec.trace} className='h-full w-full' />
            </div>
          </section>
        )}

        {/* Key figures */}
        <section>
          <SectionTitle>Detalhes de Execução</SectionTitle>
          <dl className='grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3'>
            <Field label='Status'>
              <StatusBadge status={exec.status} />
            </Field>
            <Field label='Duração'>{exec.duration}</Field>
            <Field label='Temp. Máx'>{exec.peakTemp} °C</Field>
            <Field label='Usuário'>{exec.user}</Field>
            <Field label='Início da Execução'>{exec.startedAt}</Field>
            <Field label='Corrente Pico'>{exec.peakCurrent} A</Field>
          </dl>
        </section>

        {/* Programmed vs measured */}
        <section>
          <SectionTitle>Comparativo do Perfil</SectionTitle>
          {exec.comparison.length === 0 ? (
            <div className='flex items-center gap-2 rounded-xl border border-(--border) px-4 py-3 text-sm opacity-70'>
              {exec.status === "Concluído" ? (
                <>
                  <IconGeneral icon='check_circle' fill={1} className='shrink-0 text-emerald-700 dark:text-emerald-400 [--icon-size:1.25rem]' />
                  Não houve desvio.
                </>
              ) : (
                <>
                  <IconGeneral icon='do_not_disturb_on' fill={0} className='shrink-0 opacity-60 [--icon-size:1.25rem]' />
                  Sem dados de comparação.
                </>
              )}
            </div>
          ) : (
            <div className='overflow-x-auto rounded-xl border border-(--border)'>
              <table className='w-full border-collapse text-left'>
                <thead className='text-sm'>
                  <tr className='[&>th]:bg-(--bg-2) [&>th]:px-4 [&>th]:py-2.5 [&>th]:font-semibold'>
                    <th className='w-12'>#</th>
                    <th>Temp. Progr.</th>
                    <th>Temp. Real</th>
                    <th>Tempo Prog.</th>
                    <th>Tempo Real</th>
                    <th>Desvio</th>
                  </tr>
                </thead>
                <tbody>
                  {exec.comparison.map((row, i) => (
                    <tr key={i} className='border-t border-(--border) [&>td]:px-4 [&>td]:py-2.5'>
                      <td className='tabular-nums opacity-70'>{i + 1}</td>
                      <td className='tabular-nums'>{row.tempProg}°C</td>
                      <td className='tabular-nums'>{row.tempReal}°C</td>
                      <td className='tabular-nums opacity-80'>{row.timeProg}</td>
                      <td className='tabular-nums opacity-80'>{row.timeReal}</td>
                      <td className='tabular-nums opacity-80'>{row.deviation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Events */}
        <section>
          <SectionTitle>Alertas e Eventos</SectionTitle>
          <EventList events={exec.events} />
        </section>
      </div>
    </DetailShell>
  );
}
