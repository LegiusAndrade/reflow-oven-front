"use client";

import { clsx } from "clsx";
import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { type Axis, MultiAxisChart, type Series } from "@/components/MultiAxisChart";
import { useStore } from "@/hooks/useStore";
import { RUN_MEASURED_MAX_POINTS } from "@/lib/limits";
import { api, ApiError } from "@/lib/api";
import type { Program } from "@/lib/programs";
import { connectRunTelemetry } from "@/lib/realtime";
import { DEFAULT_RUN_SERIES, mmss, phaseAt, RUN_SIGNALS, type RunSignalId, totalTime } from "@/lib/run";
import { settingsStore } from "@/lib/settings";
import { showToast } from "@/lib/toast";

const SIG = Object.fromEntries(RUN_SIGNALS.map((s) => [s.id, s])) as Record<RunSignalId, (typeof RUN_SIGNALS)[number]>;

/** Dedupe concurrent start requests: React StrictMode (dev) double-invokes the effect and a
 *  remount would otherwise fire a second api.startRun for the same run. Cleared once the start
 *  settles, so a later, deliberate re-open starts fresh. */
const inflightStart = new Map<string, ReturnType<typeof api.startRun>>();

type RunStatus = "running" | "done" | "aborted";
type Sample = { t: number; alvo: number; oven: number; board: number; current: number; voltage: number; ovenFan: number; boardFan: number };

const STATUS_META: Record<RunStatus, { label: string; icon: string; cls: string }> = {
  running: { label: "Executando", icon: "play_circle", cls: "text-[var(--brand)]" },
  done: { label: "Concluído", icon: "check_circle", cls: "text-emerald-700 dark:text-emerald-400" },
  aborted: { label: "Interrompido", icon: "cancel", cls: "text-red-700 dark:text-red-400" },
};

/** Full-screen execution view: stacked time-synced charts (temp / V+I / rpm) + a live readings strip. */
export function RunModal({ program, onClose }: { program: Program; onClose: () => void }) {
  const profile = program.profile;
  const total = totalTime(profile);
  const invalid = total <= 0 || profile.length < 2;

  const settings = useStore(settingsStore);
  const [status, setStatus] = useState<RunStatus>("running");
  const [elapsed, setElapsed] = useState(0);
  const [samples, setSamples] = useState<Sample[]>(() => [
    { t: 0, alvo: profile[0]?.temp ?? 25, oven: profile[0]?.temp ?? 25, board: 30, current: 0, voltage: 0, ovenFan: 0, boardFan: 0 },
  ]);
  const [confirmAbort, setConfirmAbort] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const stopTelemetry = useRef<(() => void) | null>(null);
  const terminated = useRef(false);

  // Start the run on the backend and stream its live trace over SignalR.
  useEffect(() => {
    if (invalid) return;
    let cancelled = false;
    // Dedupe the start so a StrictMode/dev double-invoke (or a remount) can't start two runs.
    let start = inflightStart.get(program.id);
    if (!start) {
      start = api.startRun(program.id);
      inflightStart.set(program.id, start);
      void start.catch(() => {}).finally(() => inflightStart.delete(program.id));
    }
    start
      .then((run) => {
        if (cancelled || stopTelemetry.current) return;
        terminated.current = false;
        const finish = () => {
          terminated.current = true;
          stopTelemetry.current?.();
          stopTelemetry.current = null;
        };
        stopTelemetry.current = connectRunTelemetry(run.runId, {
          onTrace: (s) => {
            if (terminated.current) return; // ignore late samples after a terminal state
            setElapsed(s.t);
            const sample: Sample = {
              t: s.t,
              alvo: s.alvo,
              oven: s.oven,
              board: s.board,
              current: s.current,
              voltage: s.voltage,
              ovenFan: s.ovenFan,
              boardFan: s.boardFan,
            };
            setSamples((arr) => {
              const next = [...arr, sample];
              return next.length > RUN_MEASURED_MAX_POINTS ? next.filter((_, i) => i % 2 === 0 || i === next.length - 1) : next;
            });
          },
          onStatus: (st) => {
            setStatus(st);
            if (st === "done" || st === "aborted") finish(); // stop streaming once the run ends
          },
          onCompleted: () => {
            showToast(`Execução de "${program.name}" concluída`);
            finish();
          },
        });
      })
      .catch((e) => {
        if (cancelled) return;
        showToast(e instanceof ApiError ? e.message : "Falha ao iniciar a execução");
        onClose();
      });
    return () => {
      cancelled = true;
      stopTelemetry.current?.();
      stopTelemetry.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program.id, invalid]);

  if (invalid) {
    return (
      <div className='fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4 backdrop-blur-sm'>
        <div className='card flex w-[min(92vw,28rem)] flex-col gap-4 rounded-2xl border border-[var(--border)] p-6'>
          <div className='flex items-center gap-3'>
            <IconGeneral icon='warning' fill={1} className='shrink-0 text-amber-700 dark:text-amber-400 [--icon-size:1.75rem]' />
            <h1 className='text-xl font-semibold'>Programa sem duração</h1>
          </div>
          <p className='opacity-80'>
            O programa <span className='font-semibold'>{program.name}</span> não tem uma duração válida para executar. Edite o perfil e defina ao menos um estágio
            com tempo maior que zero.
          </p>
          <button type='button' onClick={onClose} className='btn-action flex cursor-pointer items-center gap-2 self-end rounded-xl px-5 py-2.5 font-semibold'>
            <IconGeneral icon='check' fill={0} className='[--icon-size:1.25rem]' />
            Fechar
          </button>
        </div>
      </div>
    );
  }

  const enabled = settings.run?.series ?? DEFAULT_RUN_SERIES;
  const times = samples.map((s) => s.t);
  const mkSeries = (id: RunSignalId, accessor: (_s: Sample) => number): Series => ({ name: SIG[id].name, color: SIG[id].color, unit: SIG[id].unit, values: samples.map(accessor) });

  // Chart 1 — temperatures (shared °C axis) with the full expected profile faded behind.
  const tempSeries: Series[] = [];
  if (enabled.oven) tempSeries.push(mkSeries("oven", (s) => Math.round(s.oven)));
  if (enabled.board) tempSeries.push(mkSeries("board", (s) => Math.round(s.board)));
  const tempBg = enabled.alvo ? { color: SIG.alvo.color, points: profile.map((p) => ({ t: p.t, v: p.temp })) } : undefined;
  const hasTemp = tempSeries.length > 0 || Boolean(tempBg);

  // Chart 2 — tensão (eixo esquerdo, V) + corrente (eixo direito, A) no mesmo gráfico.
  const vSeries = enabled.voltage ? mkSeries("voltage", (s) => Math.round(s.voltage)) : null;
  const iSeries = enabled.current ? mkSeries("current", (s) => Number(s.current.toFixed(1))) : null;
  let viLeft: Axis | null = null;
  let viRight: Axis | undefined;
  if (vSeries && iSeries) {
    viLeft = { unit: "V (V)", series: [vSeries] };
    viRight = { unit: "I (A)", series: [iSeries] };
  } else if (vSeries) {
    viLeft = { unit: "V (V)", series: [vSeries] };
  } else if (iSeries) {
    viLeft = { unit: "I (A)", series: [iSeries] };
  }

  // Chart 3 — fan speeds (shared rpm axis).
  const rpmSeries: Series[] = [];
  if (enabled.ovenFan) rpmSeries.push(mkSeries("ovenFan", (s) => Math.round(s.ovenFan)));
  if (enabled.boardFan) rpmSeries.push(mkSeries("boardFan", (s) => Math.round(s.boardFan)));

  const anyChart = hasTemp || Boolean(viLeft) || rpmSeries.length > 0;

  // Readings strip reflects the hovered instant (synced with the crosshair) or the latest sample.
  let readIdx = samples.length - 1;
  if (hoverTime != null && samples.length) {
    let bestD = Infinity;
    samples.forEach((s, k) => {
      const d = Math.abs(s.t - hoverTime);
      if (d < bestD) {
        bestD = d;
        readIdx = k;
      }
    });
  }
  const rs = samples[readIdx] ?? samples[samples.length - 1];
  const progress = total ? Math.min(100, (elapsed / total) * 100) : 0;
  const phase = phaseAt(profile, elapsed);
  const meta = STATUS_META[status];

  const readings = [
    { icon: "thermostat", label: "Grelha", value: Math.round(rs.oven), unit: "°C" },
    { icon: "my_location", label: "Alvo", value: Math.round(rs.alvo), unit: "°C" },
    { icon: "device_thermostat", label: "Dissipador", value: Math.round(rs.board), unit: "°C" },
    { icon: "bolt", label: "Tensão", value: Math.round(rs.voltage), unit: "V" },
    { icon: "electric_meter", label: "Corrente", value: rs.current.toFixed(1), unit: "A" },
    { icon: "mode_fan", label: "Fan Forno", value: Math.round(rs.ovenFan), unit: "rpm" },
    { icon: "mode_fan", label: "Fan Diss.", value: Math.round(rs.boardFan), unit: "rpm" },
  ];

  const requestClose = () => {
    if (status === "running") setConfirmAbort(true);
    else onClose();
  };

  // Fixed, comfortable height per chart — the strip scrolls to reach the others (no squishing).
  const chartWrap = "flex h-[280px] shrink-0 flex-col";

  return (
    <div className='fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4 backdrop-blur-sm'>
      <div className='card flex h-[min(96vh,44rem)] w-[min(96vw,64rem)] flex-col gap-3 rounded-2xl border border-[var(--border)] p-4'>
        {/* Header */}
        <header className='flex shrink-0 items-center justify-between gap-4 border-b border-[var(--border)] pb-3'>
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
            <button type='button' onClick={requestClose} aria-label='Fechar' className='btn-press grid size-10 cursor-pointer place-items-center rounded-full hover:bg-[var(--hover)]'>
              <IconGeneral icon='close' fill={0} className='[--icon-size:1.75rem]' />
            </button>
          </div>
        </header>

        {/* Three time-synced charts (scrolls on the 1024×600 baseline) */}
        <div className='flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pr-3 [scrollbar-gutter:stable]'>
          {hasTemp && (
            <section className={chartWrap}>
              <p className='mb-1 text-base font-semibold opacity-70'>Temperatura</p>
              <MultiAxisChart
                times={times}
                xMaxSec={total}
                left={{ unit: "°C", series: tempSeries }}
                background={tempBg}
                hoverTime={hoverTime}
                onHoverTime={setHoverTime}
                className='min-h-0 flex-1'
              />
            </section>
          )}
          {viLeft && (
            <section className={chartWrap}>
              <p className='mb-1 text-base font-semibold opacity-70'>Tensão &amp; Corrente</p>
              <MultiAxisChart times={times} xMaxSec={total} left={viLeft} right={viRight} hoverTime={hoverTime} onHoverTime={setHoverTime} className='min-h-0 flex-1' />
            </section>
          )}
          {rpmSeries.length > 0 && (
            <section className={chartWrap}>
              <p className='mb-1 text-base font-semibold opacity-70'>Ventoinhas</p>
              <MultiAxisChart times={times} xMaxSec={total} left={{ unit: "rpm", series: rpmSeries }} hoverTime={hoverTime} onHoverTime={setHoverTime} className='min-h-0 flex-1' />
            </section>
          )}
          {!anyChart && (
            <div className='grid h-full place-items-center text-center text-sm opacity-60'>Nenhuma série habilitada. Ative em Configurações → Geral → Gráfico da execução.</div>
          )}
        </div>

        {/* Live readings strip — always visible, follows the crosshair or the latest sample */}
        <div className='grid shrink-0 grid-cols-4 gap-2 sm:grid-cols-7'>
          {readings.map((s) => (
            <div key={s.label} className='flex items-center gap-2 rounded-xl border border-[var(--border)] px-2 py-1.5'>
              <IconGeneral icon={s.icon} fill={0} className='shrink-0 text-[var(--brand)] [--icon-size:1.25rem]' />
              <div className='min-w-0'>
                <p className='truncate text-[11px] opacity-60'>{s.label}</p>
                <p className='text-sm font-semibold tabular-nums'>
                  {s.value}
                  <span className='ml-0.5 text-[10px] font-normal opacity-60'>{s.unit}</span>
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Progress + actions */}
        <div className='flex shrink-0 items-center gap-4'>
          <div className='h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]'>
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
          // Don't optimistically claim the run stopped: confirm the backend halted it first, since
          // a swallowed failure here would show "interrompido" while the oven keeps heating.
          api
            .stopRun()
            .then(() => {
              terminated.current = true;
              stopTelemetry.current?.();
              stopTelemetry.current = null;
              setStatus("aborted");
              showToast("Execução interrompida");
            })
            .catch((e) => {
              showToast(e instanceof ApiError ? e.message : "Falha ao interromper a execução");
            });
        }}
        onCancel={() => setConfirmAbort(false)}
      />
    </div>
  );
}
