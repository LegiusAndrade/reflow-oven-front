"use client";

import { clsx } from "clsx";
import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { TemperatureProfileChart } from "@/components/TemperatureProfileChart";
import type { ProfilePoint, Program } from "@/lib/programs";
import { mmss, phaseAt, type RunPhase, tempAt, totalTime } from "@/lib/run";
import { showToast } from "@/lib/toast";

/** Simulation cadence and speed. RUN_SPEED 1 = real time (setpoint seconds = wall seconds). */
const TICK_MS = 1000;
const RUN_SPEED = 1;

type RunStatus = "running" | "done" | "aborted";

/** Plausible actuator readings derived from the current phase (mock). TODO(backend). */
function readingsFor(status: RunStatus, phase: RunPhase, elapsed: number) {
  if (status !== "running") {
    return { currentA: 0, voltageV: 0, ovenFan: status === "done" ? 3400 : 0, boardFan: status === "done" ? 3800 : 0 };
  }
  const wob = Math.sin(elapsed / 3);
  switch (phase) {
    case "Aquecimento":
      return { currentA: 11 + wob, voltageV: 150 + wob * 4, ovenFan: 2400, boardFan: 3000 };
    case "Pico":
      return { currentA: 13 + wob, voltageV: 168 + wob * 4, ovenFan: 2500, boardFan: 3100 };
    case "Patamar":
      return { currentA: 5.5 + wob * 0.5, voltageV: 120 + wob * 3, ovenFan: 2300, boardFan: 3000 };
    case "Resfriamento":
      return { currentA: 1.2, voltageV: 20, ovenFan: 2600, boardFan: 3700 };
  }
}

const STATUS_META: Record<RunStatus, { label: string; icon: string; cls: string }> = {
  running: { label: "Executando", icon: "play_circle", cls: "text-[var(--brand)]" },
  done: { label: "Concluído", icon: "check_circle", cls: "text-emerald-400" },
  aborted: { label: "Interrompido", icon: "cancel", cls: "text-red-400" },
};

/** Full-screen execution view: animates the measured curve against the setpoint with live readings. */
export function RunModal({ program, onClose }: { program: Program; onClose: () => void }) {
  const profile = program.profile;
  const total = totalTime(profile);

  const [status, setStatus] = useState<RunStatus>("running");
  const [elapsed, setElapsed] = useState(0);
  const [measured, setMeasured] = useState<ProfilePoint[]>([{ t: 0, temp: profile[0]?.temp ?? 25 }]);
  const [confirmAbort, setConfirmAbort] = useState(false);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (status !== "running") return;
    if (startRef.current === null) startRef.current = Date.now();
    const start = startRef.current;
    const id = window.setInterval(() => {
      const e = Math.min(total, ((Date.now() - start) / 1000) * RUN_SPEED);
      const done = e >= total;
      const target = tempAt(profile, e);
      // Measured tracks the setpoint with a little thermal wobble; lands exactly on it at the end.
      const meas = done ? target : target + (Math.sin(e / 6) + Math.sin(e / 1.7) * 0.4) * 2.2;
      setElapsed(e);
      setMeasured((m) => [...m, { t: e, temp: Math.max(0, meas) }]);
      if (done) {
        setStatus("done");
        // TODO(backend): the board reports completion; persist the run report then.
        showToast(`Execução de "${program.name}" concluída`);
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [status, total, profile, program.name]);

  const target = tempAt(profile, elapsed);
  const current = measured[measured.length - 1]?.temp ?? profile[0]?.temp ?? 25;
  const phase = phaseAt(profile, elapsed);
  const r = readingsFor(status, phase, elapsed);
  const progress = total ? Math.min(100, (elapsed / total) * 100) : 0;
  const meta = STATUS_META[status];

  const requestClose = () => {
    if (status === "running") setConfirmAbort(true);
    else onClose();
  };

  const readings = [
    { icon: "thermostat", label: "Temp. Grelha", value: Math.round(current), unit: "°C" },
    { icon: "my_location", label: "Alvo", value: Math.round(target), unit: "°C" },
    { icon: "electric_meter", label: "Corrente", value: r.currentA.toFixed(1), unit: "A" },
    { icon: "bolt", label: "Tensão", value: Math.round(r.voltageV), unit: "V" },
    { icon: "mode_fan", label: "Fan Forno", value: Math.round(r.ovenFan), unit: "rpm" },
    { icon: "mode_fan", label: "Fan Diss.", value: Math.round(r.boardFan), unit: "rpm" },
  ];

  return (
    <div className='fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4 backdrop-blur-sm'>
      <div className='card flex h-[min(94vh,42rem)] w-[min(96vw,62rem)] flex-col gap-3 rounded-2xl border border-white/10 p-4'>
        {/* Header */}
        <header className='flex shrink-0 items-center justify-between gap-4 border-b border-white/10 pb-3'>
          <div className='flex min-w-0 items-center gap-3'>
            <IconGeneral icon={meta.icon} fill={1} className={clsx("shrink-0 [--icon-size:1.75rem]", meta.cls)} />
            <div className='min-w-0'>
              <p className={clsx("text-sm font-semibold", meta.cls)}>
                {meta.label}
                {status === "running" && <span className='ml-2 opacity-70'>· {phase}</span>}
              </p>
              <h1 className='truncate text-xl font-semibold'>{program.name}</h1>
            </div>
          </div>
          <div className='flex shrink-0 items-center gap-4'>
            <span className='text-lg font-semibold tabular-nums'>
              {mmss(elapsed)} <span className='opacity-50'>/ {mmss(total)}</span>
            </span>
            <button
              type='button'
              onClick={requestClose}
              aria-label='Fechar'
              className='btn-press grid size-10 cursor-pointer place-items-center rounded-full hover:bg-white/10'
            >
              <IconGeneral icon='close' fill={0} className='[--icon-size:1.75rem]' />
            </button>
          </div>
        </header>

        {/* Live chart: setpoint (solid) + measured so far (dashed) + current marker */}
        <div className='min-h-0 flex-1'>
          <TemperatureProfileChart
            points={profile}
            comparePoints={measured.length >= 2 ? measured : undefined}
            marker={{ t: elapsed, temp: current, label: mmss(elapsed) }}
            className='h-full w-full'
          />
        </div>

        {/* Live readings */}
        <div className='grid shrink-0 grid-cols-3 gap-2 sm:grid-cols-6'>
          {readings.map((s) => (
            <div key={s.label} className='flex items-center gap-2 rounded-xl border border-white/10 p-2'>
              <IconGeneral icon={s.icon} fill={0} className='shrink-0 text-[var(--brand)] [--icon-size:1.375rem]' />
              <div className='min-w-0'>
                <p className='truncate text-xs opacity-60'>{s.label}</p>
                <p className='text-base font-semibold tabular-nums'>
                  {s.value}
                  <span className='ml-0.5 text-xs font-normal opacity-60'>{s.unit}</span>
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Progress + actions */}
        <div className='flex shrink-0 items-center gap-4'>
          <div className='h-2.5 flex-1 overflow-hidden rounded-full bg-white/10'>
            <div
              className={clsx("h-full rounded-full transition-[width] duration-500", status === "aborted" ? "bg-red-400" : "bg-[var(--brand)]")}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className='w-12 shrink-0 text-right text-sm font-semibold tabular-nums'>{Math.round(progress)}%</span>
          {status === "running" ? (
            <button
              type='button'
              onClick={() => setConfirmAbort(true)}
              className='btn-press flex shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-red-500 px-5 py-2.5 font-semibold text-white hover:bg-red-600'
            >
              <IconGeneral icon='stop_circle' fill={1} className='[--icon-size:1.25rem]' />
              PARAR
            </button>
          ) : (
            <button type='button' onClick={onClose} className='btn-action flex shrink-0 cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 font-semibold'>
              <IconGeneral icon='check' fill={0} className='[--icon-size:1.25rem]' />
              Fechar
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmAbort}
        tone='danger'
        icon='stop_circle'
        title='Parar a execução?'
        description='O processo será interrompido imediatamente. A grelha entrará em resfriamento.'
        confirmLabel='Parar'
        cancelLabel='Continuar'
        onConfirm={() => {
          setConfirmAbort(false);
          setStatus("aborted");
          showToast("Execução interrompida");
        }}
        onCancel={() => setConfirmAbort(false)}
      />
    </div>
  );
}
