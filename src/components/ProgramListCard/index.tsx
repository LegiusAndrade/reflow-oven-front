import { IconGeneral } from "@/components/Icon/IconGeneral";
import type { Program } from "@/lib/programs";

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/** Management card for the Programas screen: title, favorite, key specs and actions. */
export function ProgramListCard({ program }: { program: Program }) {
  const peak = Math.max(...program.profile.map((p) => p.temp));
  const total = program.profile.at(-1)?.t ?? 0;

  return (
    <article className='card flex h-full flex-col gap-3 rounded-xl p-4'>
      <header className='flex items-start justify-between gap-2 border-b border-white/10 pb-2'>
        <h3 className='truncate text-lg font-semibold'>{program.name}</h3>
        <button type='button' aria-label='Favoritar programa' className='btn-press shrink-0 cursor-pointer text-[var(--brand)]'>
          <IconGeneral icon='star' fill={1} className='[--icon-size:1.5rem]' />
        </button>
      </header>

      <dl className='flex flex-wrap gap-x-6 gap-y-1 text-sm'>
        <div className='flex gap-1'>
          <dt className='opacity-70'>Temp. Máx:</dt>
          <dd>{peak} °C</dd>
        </div>
        <div className='flex gap-1'>
          <dt className='opacity-70'>Tempo Total:</dt>
          <dd>{formatDuration(total)}</dd>
        </div>
      </dl>
      <p className='text-sm opacity-70'>{`Último Uso: ${program.lastUsed}`}</p>

      <div className='mt-auto flex items-center gap-1 text-[var(--brand)]'>
        <CardAction icon='monitoring' label='Ver Gráfico' />
        <span className='h-5 w-px shrink-0 bg-current opacity-30' aria-hidden='true' />
        <CardAction icon='edit' label='Editar' />
        <span className='h-5 w-px shrink-0 bg-current opacity-30' aria-hidden='true' />
        <CardAction icon='delete' label='Deletar' />
      </div>
    </article>
  );
}

function CardAction({ icon, label }: { icon: string; label: string }) {
  return (
    <button
      type='button'
      className='btn-press flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm hover:bg-white/5'
    >
      <IconGeneral icon={icon} fill={0} className='[--icon-size:1.25rem]' />
      <span className='whitespace-nowrap'>{label}</span>
    </button>
  );
}
