import { TemperatureProfileChart } from "@/components/TemperatureProfileChart";
import type { Program } from "@/lib/programs";

/**
 * A program in the Initial-screen gallery: name, profile preview, usage info and a start
 * action. Fills its grid cell (height comes from the gallery), so the chart shrinks/grows
 * with the cell instead of forcing a scrollbar.
 */
export function ProgramCard({ program }: { program: Program }) {
  return (
    <article className='card flex h-full min-h-0 flex-col gap-3 rounded-xl p-4'>
      <h3 className='truncate text-lg font-semibold'>{program.name}</h3>

      {/* Profile preview fills the remaining card height */}
      <div className='min-h-0 flex-1'>
        <TemperatureProfileChart points={program.profile} className='h-full w-full' />
      </div>

      <p className='text-right text-sm opacity-80'>{`Execuções: ${program.runCount} | Último uso: ${program.lastUsed}`}</p>

      <button type='button' className='btn-action cursor-pointer px-4 py-3.5 text-base font-semibold'>
        INICIAR
      </button>
    </article>
  );
}
