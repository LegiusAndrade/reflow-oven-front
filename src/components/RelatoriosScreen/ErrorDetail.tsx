import type { ErrorLogEntry } from "@/lib/reports";
import { SeverityBadge } from "./badges";
import { DetailShell, EventList, Field, SectionTitle } from "./detailParts";
import { SnapshotChart } from "./SnapshotChart";

/** Full detail of a fault (Figma "Report Detail Error"): the multi-signal snapshot of the
 *  failure moment, key figures, and the fault's event timeline. */
export function ErrorDetail({ err, onClose }: { err: ErrorLogEntry; onClose: () => void }) {
  return (
    <DetailShell title={`${err.code} — ${err.message}`} onClose={onClose}>
      <div className='flex flex-col gap-6'>
        {/* Failure snapshot */}
        <section>
          <SectionTitle>Snapshot da Falha</SectionTitle>
          <p className='mb-2 flex flex-wrap gap-x-4 gap-y-1 text-sm'>
            <span>
              <span className='opacity-60'>Programa:</span> <span className='font-medium'>{err.programName}</span>
            </span>
            <span>
              <span className='opacity-60'>ID:</span> <span className='font-medium tabular-nums'>{err.programId}</span>
            </span>
            <span>
              <span className='opacity-60'>Usuário:</span> <span className='font-medium'>{err.user}</span>
            </span>
          </p>
          <div className='h-[clamp(240px,46vh,400px)] rounded-xl border border-(--border) p-2'>
            <SnapshotChart snapshot={err.snapshot} className='h-full w-full' />
          </div>
        </section>

        {/* Key figures */}
        <section>
          <SectionTitle>Detalhes da Falha</SectionTitle>
          <dl className='grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3'>
            <Field label='Severidade'>
              <SeverityBadge severity={err.severity} />
            </Field>
            <Field label='Código'>{err.code}</Field>
            <Field label='Início da Falha'>{err.startAt}</Field>
            <Field label='Fim da Falha'>{err.endAt}</Field>
            <Field label='Tensão Entrada'>{err.inputVoltage} VAC</Field>
            <Field label='Tensão Saída'>{err.outputVoltage} VDC</Field>
            <Field label='Temp. Forno'>{err.ovenTemp} °C</Field>
            <Field label='Temp. PCB'>{err.pcbTemp} °C</Field>
          </dl>
        </section>

        {/* Events */}
        <section>
          <SectionTitle>Eventos</SectionTitle>
          <EventList events={err.events} />
        </section>
      </div>
    </DetailShell>
  );
}
