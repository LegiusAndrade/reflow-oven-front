"use client";

import { clsx } from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { TemperatureProfileChart } from "@/components/TemperatureProfileChart";
import { TextField } from "@/components/TextField";
import {
  POINT_DURATION_MAX,
  POINT_DURATION_MIN,
  POINT_TEMP_MAX,
  POINT_TEMP_MIN,
  PROFILE_MAX_POINTS,
  PROGRAM_DESCRIPTION_MAX_LENGTH,
  PROGRAM_NAME_MAX_LENGTH,
} from "@/lib/limits";
import type { ProfilePoint, Program } from "@/lib/programs";
import { addStoredProgram } from "@/lib/programStore";

type Ramp = "Linear" | "Fixo" | "Parábola positiva" | "Parábola negativa";
type Segment = { id: string; temp: number; durationSec: number; ramp: Ramp };

const makeSegment = (temp: number, durationSec: number, ramp: Ramp): Segment => ({
  id: crypto.randomUUID(),
  temp,
  durationSec,
  ramp,
});

const DEFAULT_SEGMENTS: Segment[] = [makeSegment(150, 60, "Linear"), makeSegment(180, 30, "Fixo"), makeSegment(260, 30, "Linear")];

const START_TEMP = 25;

/** Keep a numeric input within [min, max]; empty/NaN falls back to min. */
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

/**
 * Build a temperature × time curve from the segment list, for the preview. Each segment
 * goes from the previous temperature to its target over its duration, shaped by `ramp`:
 * - Linear: straight ramp.
 * - Fixo: hold at the current temperature (a flat plateau) for the duration.
 * - Parábola positiva: slow start, fast finish (concave up); negativa: the opposite.
 */
function toProfile(segments: Segment[]): ProfilePoint[] {
  const points: ProfilePoint[] = [{ t: 0, temp: START_TEMP }];
  let t = 0;
  let prevTemp = START_TEMP;
  for (const s of segments) {
    const d = Math.max(0, s.durationSec);
    if (s.ramp === "Fixo") {
      t += d;
      points.push({ t, temp: prevTemp }); // hold at the current temperature
      continue;
    }
    const target = s.temp;
    if (s.ramp === "Linear") {
      t += d;
      points.push({ t, temp: target });
    } else {
      const ease = s.ramp === "Parábola positiva" ? (x: number) => x * x : (x: number) => 2 * x - x * x;
      const t0 = t;
      const steps = 12;
      for (let k = 1; k <= steps; k++) {
        const x = k / steps;
        points.push({ t: t0 + x * d, temp: prevTemp + (target - prevTemp) * ease(x) });
      }
      t = t0 + d;
    }
    prevTemp = target;
  }
  return points;
}

/** The temperature each segment starts from (so Fixo rows can show the held value). */
function incomingTemps(segments: Segment[]): number[] {
  let running = START_TEMP;
  return segments.map((s) => {
    const incoming = running;
    if (s.ramp !== "Fixo") running = s.temp;
    return incoming;
  });
}

/** Create/edit a program: name, description and an editable temperature profile with live preview. */
export function ProgramEditorScreen({ title = "Novo Programa" }: { title?: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [segments, setSegments] = useState<Segment[]>(DEFAULT_SEGMENTS);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const profile = useMemo(() => toProfile(segments), [segments]);
  const incoming = useMemo(() => incomingTemps(segments), [segments]);

  const update = (id: string, patch: Partial<Segment>) => setSegments((segs) => segs.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const remove = (id: string) => setSegments((segs) => segs.filter((s) => s.id !== id));
  const add = () => setSegments((segs) => (segs.length >= PROFILE_MAX_POINTS ? segs : [...segs, makeSegment(200, 30, "Linear")]));
  const clearPoints = () => {
    setSegments([]);
    setConfirmClearOpen(false);
  };

  // Saving creates a new stored program (localStorage) and returns to the list. It needs a
  // name and at least one point; otherwise SALVAR stays disabled.
  const canSave = name.trim().length > 0 && segments.length > 0;
  const handleSave = () => {
    if (!canSave) return;
    const program: Program = {
      id: crypto.randomUUID(),
      name: name.trim(),
      description: description.trim() || undefined,
      runCount: 0,
      lastUsed: "Nunca",
      profile,
    };
    addStoredProgram(program);
    router.push("/programas");
  };

  const numberInputClass = "w-20 rounded-lg border border-white/15 bg-transparent px-2 py-1 tabular-nums outline-none focus:border-[var(--brand)]";

  return (
    <section className='card flex h-full flex-col gap-4 rounded-xl p-[clamp(1rem,2vw,1.5rem)]'>
      <header className='flex items-center justify-between gap-4 border-b border-white/10 pb-3'>
        <h1 className='text-2xl font-semibold'>{title}</h1>
        <Link
          href='/programas'
          aria-label='Fechar'
          className='btn-press grid size-10 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-white/10'
        >
          <IconGeneral icon='close' fill={0} className='[--icon-size:1.75rem]' />
        </Link>
      </header>

      {/* On the 1024×600 device the body scrolls as a whole. On taller screens it doesn't
          scroll (overflow-hidden) — the points list fills the available space and scrolls on
          its own, so there's no second (right-side) scrollbar. pt-3 keeps the floating labels
          of the top fields from being clipped. */}
      <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-3 pt-3 [@media(min-height:44rem)]:overflow-hidden'>
        {/* Name + description */}
        <div className='grid gap-4 sm:grid-cols-2'>
          <TextField id='program-name' label='Nome do Programa' value={name} onChange={setName} maxLength={PROGRAM_NAME_MAX_LENGTH} />
          <TextField id='program-desc' label='Descrição' value={description} onChange={setDescription} maxLength={PROGRAM_DESCRIPTION_MAX_LENGTH} />
        </div>

        <h2 className='text-lg font-semibold'>Perfil de Temperatura</h2>

        {/* On the device: a normal grid in the (scrolling) body. On taller screens the grid
            fills the remaining height (grid-rows-[1fr]) so the points list can grow down to the
            footer and cap there — no second scrollbar. */}
        <div className='grid gap-4 lg:grid-cols-2 [@media(min-height:44rem)]:min-h-0 [@media(min-height:44rem)]:flex-1 [@media(min-height:44rem)]:grid-rows-[1fr]'>
          {/* Editable segment table */}
          <div className='flex flex-col gap-3 [@media(min-height:44rem)]:min-h-0'>
            {/* Inner scroll: only the points list scrolls. On the 1024×600 device it's capped
                at 16rem; on taller screens the cap grows to the space down to the footer, so the
                list extends as points are added (then scrolls). */}
            <div className='max-h-[16rem] overflow-y-auto rounded-xl border border-white/10 [@media(min-height:44rem)]:max-h-none [@media(min-height:44rem)]:min-h-0'>
              <table className='w-full border-collapse text-left'>
                <thead className='sticky top-0 bg-[var(--bg-2)] text-sm'>
                  <tr className='[&>th]:px-3 [&>th]:py-2.5 [&>th]:font-semibold'>
                    <th className='w-10'>#</th>
                    <th>Temp (°C)</th>
                    <th>Tempo (s)</th>
                    <th>Rampa</th>
                    <th className='w-12' />
                  </tr>
                </thead>
                <tbody>
                  {segments.map((s, i) => {
                    const held = s.ramp === "Fixo";
                    return (
                      <tr key={s.id} className='border-t border-white/10 [&>td]:px-3 [&>td]:py-2'>
                        <td className='tabular-nums opacity-70'>{i + 1}</td>
                        <td>
                          <input
                            type='number'
                            aria-label={`Temperatura do ponto ${i + 1}`}
                            value={held ? incoming[i] : s.temp}
                            disabled={held}
                            min={POINT_TEMP_MIN}
                            max={POINT_TEMP_MAX}
                            title={held ? "Fixo mantém a temperatura atual" : undefined}
                            onChange={(e) => update(s.id, { temp: clamp(Number(e.target.value), POINT_TEMP_MIN, POINT_TEMP_MAX) })}
                            className={clsx(numberInputClass, held && "cursor-not-allowed opacity-50")}
                          />
                        </td>
                        <td>
                          <input
                            type='number'
                            aria-label={`Tempo do ponto ${i + 1}`}
                            value={s.durationSec}
                            min={POINT_DURATION_MIN}
                            max={POINT_DURATION_MAX}
                            onChange={(e) => update(s.id, { durationSec: clamp(Number(e.target.value), POINT_DURATION_MIN, POINT_DURATION_MAX) })}
                            className={numberInputClass}
                          />
                        </td>
                        <td>
                          <select
                            aria-label={`Rampa do ponto ${i + 1}`}
                            value={s.ramp}
                            onChange={(e) => update(s.id, { ramp: e.target.value as Ramp })}
                            className='rounded-lg border border-white/15 bg-[var(--bg-2)] px-2 py-1 outline-none focus:border-[var(--brand)]'
                          >
                            <option value='Linear'>Linear</option>
                            <option value='Fixo'>Fixo</option>
                            <option value='Parábola positiva'>Parábola +</option>
                            <option value='Parábola negativa'>Parábola −</option>
                          </select>
                        </td>
                        <td>
                          <button
                            type='button'
                            onClick={() => remove(s.id)}
                            aria-label={`Remover ponto ${i + 1}`}
                            className='btn-press grid size-8 cursor-pointer place-items-center rounded-lg text-red-400 hover:bg-white/10'
                          >
                            <IconGeneral icon='remove' fill={0} className='[--icon-size:1.25rem]' />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {segments.length === 0 && (
                    <tr>
                      <td colSpan={5} className='px-3 py-5 text-center opacity-60'>
                        Nenhum ponto. Adicione o primeiro.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className='flex items-center justify-between gap-3'>
              <button
                type='button'
                onClick={add}
                disabled={segments.length >= PROFILE_MAX_POINTS}
                title={segments.length >= PROFILE_MAX_POINTS ? `Máximo de ${PROFILE_MAX_POINTS} pontos` : undefined}
                className='btn-action flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 font-semibold'
              >
                <IconGeneral icon='add' fill={0} className='[--icon-size:1.25rem]' />
                Adicionar Ponto
              </button>
              <button
                type='button'
                onClick={() => setConfirmClearOpen(true)}
                disabled={segments.length === 0}
                className='btn-press flex cursor-pointer items-center gap-2 rounded-xl border border-red-500/40 px-4 py-2.5 font-semibold text-red-400 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent'
              >
                <IconGeneral icon='delete_sweep' fill={0} className='[--icon-size:1.25rem]' />
                Limpar Pontos
              </button>
            </div>
          </div>

          {/* Live preview — fixed height (the chart doesn't change with the point count) */}
          <div className='sticky top-0 min-h-[18rem] self-start rounded-xl border border-white/10 p-3 lg:h-[clamp(18rem,40vh,30rem)]'>
            <TemperatureProfileChart points={profile} className='h-full w-full' />
          </div>
        </div>
      </div>

      {/* Footer (fixed) */}
      <footer className='flex items-center justify-end gap-3 border-t border-white/10 pt-3'>
        <Link href='/programas' className='btn-press rounded-xl border border-white/15 px-5 py-2.5 font-semibold'>
          Cancelar
        </Link>
        <button
          type='button'
          onClick={handleSave}
          disabled={!canSave}
          title={canSave ? undefined : "Informe um nome e ao menos um ponto"}
          className='btn-action flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 font-semibold'
        >
          <IconGeneral icon='save' fill={0} className='[--icon-size:1.25rem]' />
          SALVAR
        </button>
      </footer>

      <ConfirmDialog
        open={confirmClearOpen}
        tone='danger'
        title='Limpar todos os pontos?'
        description='Isso remove todos os pontos do perfil de temperatura. Esta ação não pode ser desfeita.'
        confirmLabel='Limpar tudo'
        cancelLabel='Cancelar'
        onConfirm={clearPoints}
        onCancel={() => setConfirmClearOpen(false)}
      />
    </section>
  );
}
