"use client";

import { TemperatureProfileChart } from "@/components/TemperatureProfileChart";
import type { ExecutionReport } from "@/lib/reports";
import { StatusBadge } from "./badges";
import { DetailShell, EventList, Field, SectionTitle } from "./detailParts";
import { SnapshotChart } from "./SnapshotChart";

/** Full detail of a past run (Figma "Report Detail Exec"): profile chart, key figures,
 *  the programmed-vs-measured comparison, and the run's event timeline. */
export function ExecutionDetail({ exec, onClose }: { exec: ExecutionReport; onClose: () => void }) {
  return (
    <DetailShell title={exec.programName} onClose={onClose}>
      <div className='flex flex-col gap-6'>
        {/* Profile chart: programmed (dashed) vs real (solid), with the fault flagged */}
        <div>
          <div className='h-[clamp(170px,30vh,300px)] rounded-xl border border-[var(--border)] p-2'>
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
              <span className='inline-block h-[3px] w-5 rounded bg-[var(--brand)]' aria-hidden='true' />
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
            <div className='h-[clamp(240px,46vh,400px)] rounded-xl border border-[var(--border)] p-2'>
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
          <div className='overflow-x-auto rounded-xl border border-[var(--border)]'>
            <table className='w-full border-collapse text-left'>
              <thead className='text-sm'>
                <tr className='[&>th]:bg-[var(--bg-2)] [&>th]:px-4 [&>th]:py-2.5 [&>th]:font-semibold'>
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
                  <tr key={i} className='border-t border-[var(--border)] [&>td]:px-4 [&>td]:py-2.5'>
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
