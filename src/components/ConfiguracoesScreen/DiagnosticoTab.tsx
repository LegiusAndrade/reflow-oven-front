"use client";

import { clsx } from "clsx";
import { useState } from "react";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { useLiveReadings } from "@/hooks/useLiveReadings";
import { MOCK_READINGS } from "@/lib/sensors";

type TestState = "idle" | "running" | "ok" | "fail";

const TESTS = [
  { id: "fan-oven", label: "Ventoinha do Forno", icon: "mode_fan" },
  { id: "fan-board", label: "Ventoinha do Dissipador", icon: "mode_fan" },
  { id: "buzzer", label: "Buzzer", icon: "volume_up" },
  { id: "rs422", label: "Comunicação RS422", icon: "cable" },
  { id: "heater", label: "Aquecimento da Grelha", icon: "local_fire_department" },
  { id: "thermocouple", label: "Termopar Tipo-K", icon: "thermostat" },
];

/** Diagnóstico tab: live sensor readings + mock self-tests of the actuators/links. */
export function DiagnosticoTab() {
  const r = useLiveReadings(MOCK_READINGS);
  const [tests, setTests] = useState<Record<string, TestState>>({});

  const runTest = (id: string) => {
    setTests((t) => ({ ...t, [id]: "running" }));
    // TODO(backend): trigger the real self-test over RS422.
    window.setTimeout(() => setTests((t) => ({ ...t, [id]: Math.random() < 0.88 ? "ok" : "fail" })), 700);
  };
  const runAll = () => TESTS.forEach((t) => runTest(t.id));

  const sensors = [
    { icon: "thermostat", label: "Temp. Grelha", value: r.ovenTempC, unit: "°C" },
    { icon: "device_thermostat", label: "Temp. Dissipador", value: r.boardTempC, unit: "°C" },
    { icon: "bolt", label: "Tensão Saída", value: r.voltageV, unit: "V" },
    { icon: "electric_meter", label: "Corrente Saída", value: r.currentA, unit: "A" },
    { icon: "mode_fan", label: "RPM Fan Forno", value: r.ovenFanRpm, unit: "rpm" },
    { icon: "mode_fan", label: "RPM Fan Dissipador", value: r.boardFanRpm, unit: "rpm" },
  ];

  return (
    <div className='flex h-full min-h-0 flex-col gap-5 overflow-y-auto pr-1'>
      <section>
        <h3 className='mb-2 font-semibold'>Leituras ao vivo</h3>
        <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
          {sensors.map((s) => (
            <div key={s.label} className='flex items-center gap-3 rounded-xl border border-white/10 p-3'>
              <IconGeneral icon={s.icon} fill={0} className='shrink-0 text-[var(--brand)] [--icon-size:1.75rem]' />
              <div className='min-w-0'>
                <p className='truncate text-sm opacity-70'>{s.label}</p>
                <p className='text-xl font-semibold tabular-nums'>
                  {s.value} <span className='text-sm font-normal opacity-60'>{s.unit}</span>
                </p>
              </div>
              <span className='ml-auto inline-flex shrink-0 items-center gap-1 text-sm text-emerald-400'>
                <span className='size-2 rounded-full bg-emerald-400' aria-hidden='true' />
                OK
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
            className='btn-press flex cursor-pointer items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold'
          >
            <IconGeneral icon='play_circle' fill={0} className='[--icon-size:1.25rem]' />
            Executar todos
          </button>
        </div>
        <ul className='flex flex-col gap-2'>
          {TESTS.map((t) => (
            <li key={t.id} className='flex items-center gap-3 rounded-xl border border-white/10 px-3 py-2.5'>
              <IconGeneral icon={t.icon} fill={0} className='shrink-0 opacity-80 [--icon-size:1.5rem]' />
              <span className='flex-1'>{t.label}</span>
              <TestStatus state={tests[t.id] ?? "idle"} />
              <button
                type='button'
                onClick={() => runTest(t.id)}
                disabled={tests[t.id] === "running"}
                className='btn-press cursor-pointer rounded-lg border border-white/15 px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50'
              >
                Testar
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function TestStatus({ state }: { state: TestState }) {
  if (state === "idle") return <span className='text-sm opacity-40'>—</span>;
  if (state === "running")
    return <IconGeneral icon='progress_activity' fill={0} className='animate-spin text-[var(--brand)] [--icon-size:1.25rem]' />;
  const ok = state === "ok";
  return (
    <span className={clsx("inline-flex items-center gap-1 text-sm font-medium", ok ? "text-emerald-400" : "text-red-400")}>
      <IconGeneral icon={ok ? "check_circle" : "cancel"} fill={1} className='[--icon-size:1.25rem]' />
      {ok ? "OK" : "Falha"}
    </span>
  );
}
