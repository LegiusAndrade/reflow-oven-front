"use client";

import { clsx } from "clsx";
import { useState } from "react";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { useLiveReadings } from "@/hooks/useLiveReadings";
import { api, ApiError } from "@/lib/api";
import { formatReading } from "@/lib/sensors";
import { showToast } from "@/lib/toast";
import { SystemLogModal } from "./SystemLogModal";

type TestState = "idle" | "running" | "ok" | "fail";

const TESTS = [
  { id: "fan-oven", label: "Ventoinha do Forno", icon: "mode_fan" },
  { id: "fan-board", label: "Ventoinha do Dissipador", icon: "mode_fan" },
  { id: "buzzer", label: "Buzzer", icon: "volume_up" },
  { id: "rs422", label: "Comunicação RS422", icon: "cable" },
  { id: "heater", label: "Aquecimento da Grelha", icon: "local_fire_department" },
  { id: "thermocouple", label: "Termopar Tipo-K", icon: "thermostat" },
];

/** Diagnóstico → Sensores sub-tab: live sensor readings + mock self-tests of the actuators/links. */
export function DiagnosticoSensores() {
  const { readings, stale } = useLiveReadings();
  // "Live" only when a recent tick exists — drives the per-row health chip and the "—" placeholders.
  const live = readings != null && !stale;
  const val = (v: number | undefined, unit: string): string => (readings == null ? "—" : formatReading(v as number, unit));
  const [tests, setTests] = useState<Record<string, TestState>>({});
  const [logOpen, setLogOpen] = useState(false);

  const runTest = (id: string) => {
    setTests((t) => ({ ...t, [id]: "running" }));
    api
      .selfTest(id)
      .then((res) => setTests((t) => ({ ...t, [id]: (res as { state?: string }).state === "ok" ? "ok" : "fail" })))
      .catch((e) => {
        setTests((t) => ({ ...t, [id]: "fail" }));
        showToast(e instanceof ApiError ? e.message : "Falha ao executar o teste", "error");
      });
  };
  const runAll = () => TESTS.forEach((t) => runTest(t.id));

  const sensors = [
    { icon: "thermostat", label: "Temp. Grelha", value: val(readings?.ovenTempC, "°C"), unit: "°C" },
    { icon: "device_thermostat", label: "Temp. Dissipador", value: val(readings?.boardTempC, "°C"), unit: "°C" },
    { icon: "bolt", label: "Tensão Saída", value: val(readings?.voltageV, "V"), unit: "V" },
    { icon: "electric_meter", label: "Corrente Saída", value: val(readings?.currentA, "A"), unit: "A" },
    { icon: "mode_fan", label: "RPM Fan Forno", value: val(readings?.ovenFanRpm, "rpm"), unit: "rpm" },
    { icon: "mode_fan", label: "RPM Fan Dissipador", value: val(readings?.boardFanRpm, "rpm"), unit: "rpm" },
  ];

  return (
    <div className='flex flex-col gap-5'>
      <section>
        <div className='mb-2 flex items-center justify-between gap-3'>
          <h3 className='font-semibold'>Leituras ao vivo</h3>
          <button
            type='button'
            onClick={() => setLogOpen(true)}
            className='btn-press flex cursor-pointer items-center gap-2 rounded-xl border border-(--border) px-4 py-2 text-sm font-semibold'
          >
            <IconGeneral icon='receipt_long' fill={0} className='[--icon-size:1.25rem]' />
            Log do Sistema
          </button>
        </div>
        <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
          {sensors.map((s) => (
            <div key={s.label} className='flex items-center gap-3 rounded-xl border border-(--border) p-3'>
              <IconGeneral icon={s.icon} fill={0} className='shrink-0 text-(--brand) [--icon-size:1.75rem]' />
              <div className='min-w-0'>
                <p className='truncate text-sm opacity-70'>{s.label}</p>
                <p className='text-xl font-semibold tabular-nums'>
                  {s.value} <span className='text-sm font-normal opacity-60'>{s.unit}</span>
                </p>
              </div>
              {/* Health derived from the tick freshness — not a hardcoded "OK". Stale/absent → "Sem sinal". */}
              <span className={clsx("ml-auto inline-flex shrink-0 items-center gap-1 text-sm", live ? "text-emerald-700 dark:text-emerald-400" : "opacity-60")}>
                <span className={clsx("size-2 rounded-full", live ? "bg-emerald-400" : "bg-current opacity-50")} aria-hidden='true' />
                {live ? "OK" : "Sem sinal"}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className='mb-2 flex items-center justify-between gap-3'>
          <h3 className='font-semibold'>Autotestes</h3>
          <button
            type='button'
            onClick={runAll}
            className='btn-press flex cursor-pointer items-center gap-2 rounded-xl border border-(--border) px-4 py-2 text-sm font-semibold'
          >
            <IconGeneral icon='play_circle' fill={0} className='[--icon-size:1.25rem]' />
            Executar todos
          </button>
        </div>
        <ul className='flex flex-col gap-2'>
          {TESTS.map((t) => (
            <li key={t.id} className='flex items-center gap-3 rounded-xl border border-(--border) px-3 py-2.5'>
              <IconGeneral icon={t.icon} fill={0} className='shrink-0 opacity-80 [--icon-size:1.5rem]' />
              <span className='flex-1'>{t.label}</span>
              <TestStatus state={tests[t.id] ?? "idle"} />
              <button
                type='button'
                onClick={() => runTest(t.id)}
                disabled={tests[t.id] === "running"}
                className='btn-press cursor-pointer rounded-lg border border-(--border) px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50'
              >
                Testar
              </button>
            </li>
          ))}
        </ul>
      </section>

      <SystemLogModal open={logOpen} onClose={() => setLogOpen(false)} />
    </div>
  );
}

function TestStatus({ state }: { state: TestState }) {
  if (state === "idle") return <span className='text-sm opacity-40'>—</span>;
  if (state === "running")
    return <IconGeneral icon='progress_activity' fill={0} className='animate-spin text-(--brand) [--icon-size:1.25rem]' />;
  const ok = state === "ok";
  return (
    <span className={clsx("inline-flex items-center gap-1 text-sm font-medium", ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400")}>
      <IconGeneral icon={ok ? "check_circle" : "cancel"} fill={1} className='[--icon-size:1.25rem]' />
      {ok ? "OK" : "Falha"}
    </span>
  );
}
