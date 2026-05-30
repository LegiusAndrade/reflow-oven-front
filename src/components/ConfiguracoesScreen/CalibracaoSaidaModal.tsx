"use client";

import { clsx } from "clsx";
import { useState } from "react";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { Modal } from "@/components/Modal";
import { CALIB_CURRENT_OFFSET_MAX, CALIB_CURRENT_OFFSET_MIN, CALIB_GAIN_MAX, CALIB_GAIN_MIN } from "@/lib/limits";
import { showToast } from "@/lib/toast";

/** Output-calibration setpoints, in volts (the order the wizard walks through). */
const STEPS = [10, 50, 100, 150, 0];

/** Mock current the board *reads* at a given output voltage (a slightly off sensor to calibrate). */
const boardCurrentAt = (setV: number) => Number((setV * 0.055 + 0.35).toFixed(2));

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

type Entry = { v: string; a: string };
const isNum = (s: string) => s.trim() !== "" && Number.isFinite(Number(s));

/**
 * Guided output calibration: for each voltage setpoint the board drives its output and shows the
 * current it reads; the technician types the voltage and current measured on a multimeter. From
 * the (board-read vs measured) current pairs it least-squares-fits the sensor gain and offset and
 * hands them back to the Calibração form. TODO(backend): drive the real output over RS422.
 */
export function CalibracaoSaidaModal({ open, onClose, onApply }: { open: boolean; onClose: () => void; onApply: (_cal: { currentOffset: number; currentGain: number }) => void }) {
  const [step, setStep] = useState(0);
  const [entries, setEntries] = useState<Entry[]>(() => STEPS.map(() => ({ v: "", a: "" })));
  // Reset when (re)opened — adjust-during-render, no effect.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setStep(0);
      setEntries(STEPS.map(() => ({ v: "", a: "" })));
    }
  }

  const setV = STEPS[step];
  const boardI = boardCurrentAt(setV);
  const entry = entries[step];
  const stepValid = isNum(entry.v) && isNum(entry.a);
  const isLast = step === STEPS.length - 1;

  const setEntry = (patch: Partial<Entry>) => setEntries((arr) => arr.map((e, i) => (i === step ? { ...e, ...patch } : e)));

  const finish = () => {
    // Least-squares fit: measured current = gain · board-read current + offset.
    const xs = STEPS.map((v) => boardCurrentAt(v));
    const ys = entries.map((e) => Number(e.a));
    const n = xs.length;
    const sx = xs.reduce((s, x) => s + x, 0);
    const sy = ys.reduce((s, y) => s + y, 0);
    const sxx = xs.reduce((s, x) => s + x * x, 0);
    const sxy = xs.reduce((s, x, i) => s + x * ys[i], 0);
    const denom = n * sxx - sx * sx || 1;
    const slope = (n * sxy - sx * sy) / denom;
    const intercept = (sy - slope * sx) / n;
    const currentGain = clamp(Math.round(slope * 100), CALIB_GAIN_MIN, CALIB_GAIN_MAX);
    const currentOffset = clamp(Number(intercept.toFixed(2)), CALIB_CURRENT_OFFSET_MIN, CALIB_CURRENT_OFFSET_MAX);
    onApply({ currentOffset, currentGain });
    // TODO(backend): persist the calibration curve on the board.
    showToast(`Calibração da saída concluída — ganho ${currentGain}%, offset ${currentOffset} A`);
    onClose();
  };

  const inputCls = "w-full rounded-xl border border-[var(--border)] bg-[var(--surface-inset)] px-3 py-2.5 tabular-nums outline-none placeholder:opacity-40 focus:border-[var(--brand)]";

  return (
    <Modal open={open} title='Calibração da saída' onClose={onClose} panelClassName='w-[min(92vw,32rem)]'>
      <div className='flex flex-col gap-4'>
        {/* Steps indicator */}
        <ol className='flex items-center gap-1.5'>
          {STEPS.map((v, i) => (
            <li
              key={v}
              className={clsx(
                "flex h-7 flex-1 items-center justify-center rounded-md text-xs font-semibold tabular-nums",
                i < step ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : i === step ? "bg-[var(--brand)]/20 text-[var(--brand)]" : "bg-[var(--surface-2)] opacity-60"
              )}
            >
              {v} V
            </li>
          ))}
        </ol>

        <div className='flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-inset)] p-3'>
          <IconGeneral icon='bolt' fill={1} className='shrink-0 text-[var(--brand)] [--icon-size:1.75rem]' />
          <div>
            <p className='text-sm opacity-70'>
              Passo {step + 1} de {STEPS.length} — saída ajustada para
            </p>
            <p className='text-2xl font-semibold tabular-nums'>{setV} V</p>
          </div>
          <div className='ml-auto text-right'>
            <p className='text-sm opacity-70'>Corrente lida (placa)</p>
            <p className='text-xl font-semibold tabular-nums'>{boardI} A</p>
          </div>
        </div>

        <p className='text-sm opacity-70'>Meça a saída no multímetro e informe os valores lidos:</p>
        <div className='flex flex-wrap gap-3'>
          <label className='flex min-w-[8rem] flex-1 flex-col gap-1'>
            <span className='text-sm opacity-70'>Tensão medida (V)</span>
            <input inputMode='decimal' value={entry.v} onChange={(e) => setEntry({ v: e.target.value })} placeholder={String(setV)} className={inputCls} />
          </label>
          <label className='flex min-w-[8rem] flex-1 flex-col gap-1'>
            <span className='text-sm opacity-70'>Corrente medida (A)</span>
            <input inputMode='decimal' value={entry.a} onChange={(e) => setEntry({ a: e.target.value })} placeholder={String(boardI)} className={inputCls} />
          </label>
        </div>

        <div className='mt-1 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4'>
          <button
            type='button'
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className='btn-press cursor-pointer rounded-xl border border-[var(--border)] px-4 py-2.5 font-semibold disabled:cursor-not-allowed disabled:opacity-40'
          >
            Voltar
          </button>
          {isLast ? (
            <button
              type='button'
              onClick={finish}
              disabled={!stepValid}
              className='btn-action flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 font-semibold disabled:cursor-not-allowed disabled:opacity-40'
            >
              <IconGeneral icon='check' fill={0} className='[--icon-size:1.25rem]' />
              Concluir
            </button>
          ) : (
            <button
              type='button'
              onClick={() => setStep((s) => s + 1)}
              disabled={!stepValid}
              className='btn-action flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 font-semibold disabled:cursor-not-allowed disabled:opacity-40'
            >
              Próximo
              <IconGeneral icon='arrow_forward' fill={0} className='[--icon-size:1.25rem]' />
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
