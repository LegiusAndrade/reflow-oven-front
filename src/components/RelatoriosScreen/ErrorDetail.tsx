import type { ErrorLogEntry } from "@/lib/reports";
import { SeverityBadge } from "./badges";
import { DetailShell, EventList, Field, SectionTitle } from "./detailParts";
import { FaultSnapshotChart } from "./FaultSnapshotChart";
import { SnapshotChart } from "./SnapshotChart";

/** Full detail of a fault (Figma "Report Detail Error"): the presentational multi-signal snapshot
 *  of the failure moment, the raw board "black box" around the fault instant (when captured), key
 *  figures, and the fault's event timeline. */
export function ErrorDetail({ err, onClose }: { err: ErrorLogEntry; onClose: () => void }) {
  const boardSnapshot = err.boardSnapshot;
  return (
    <DetailShell title={`${err.code} — ${err.message}`} onClose={onClose}>
      <div className='flex flex-col gap-6'>
        {/* Failure snapshot (presentational trace) */}
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

        {/* Fault black box: raw board telemetry in high resolution around the fault instant (only when captured) */}
        {boardSnapshot && boardSnapshot.samples.length > 0 && (
          <section>
            <SectionTitle>Caixa-preta / instante da falha</SectionTitle>
            <p className='mb-2 text-sm opacity-60'>
              Telemetria da placa em alta resolução ({boardSnapshot.sampleIntervalMs} ms entre amostras) capturada em torno da falha; a linha
              vertical marca o instante do disparo (t = 0).
            </p>
            <div className='h-[clamp(240px,46vh,400px)] rounded-xl border border-(--border) p-2'>
              <FaultSnapshotChart snapshot={boardSnapshot} className='h-full w-full' />
            </div>
          </section>
        )}

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
            <Field label='Tensão Entrada'>{err.inputVoltage != null ? `${err.inputVoltage} VAC` : "—"}</Field>
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
