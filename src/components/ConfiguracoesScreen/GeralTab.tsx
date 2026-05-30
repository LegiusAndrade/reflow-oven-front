"use client";

import {
  CONFIG_EXTRA_TIME_MAX,
  CONFIG_EXTRA_TIME_MIN,
  CONFIG_FAN_RPM_MAX,
  CONFIG_FAN_RPM_MIN,
  CONFIG_TEMP_MAX,
  CONFIG_TEMP_MIN,
  CONFIG_VOLTAGE_MAX,
  CONFIG_VOLTAGE_MIN,
  PID_MAX,
  PID_MIN,
} from "@/lib/limits";
import { DEFAULT_RUN_SERIES, RUN_SIGNALS } from "@/lib/run";
import { showToast } from "@/lib/toast";
import { FieldGroup, FormFooter, NumberField, Toggle, useSettingsDraft } from "./fields";

/** Geral tab: PID gains, oven limits, process timeout and supply-voltage thresholds. */
export function GeralTab() {
  const { draft, setDraft, dirty, save, cancel } = useSettingsDraft();
  const series = draft.run?.series ?? DEFAULT_RUN_SERIES;

  return (
    <div className='flex h-full min-h-0 flex-col gap-5'>
      <div className='flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pr-3 [scrollbar-gutter:stable]'>
        <FieldGroup title='PID'>
          <NumberField label='P' value={draft.pid.p} onChange={(p) => setDraft({ ...draft, pid: { ...draft.pid, p } })} min={PID_MIN} max={PID_MAX} step={0.1} className='min-w-[6rem] flex-1' />
          <NumberField label='I' value={draft.pid.i} onChange={(i) => setDraft({ ...draft, pid: { ...draft.pid, i } })} min={PID_MIN} max={PID_MAX} step={0.1} className='min-w-[6rem] flex-1' />
          <NumberField label='D' value={draft.pid.d} onChange={(d) => setDraft({ ...draft, pid: { ...draft.pid, d } })} min={PID_MIN} max={PID_MAX} step={0.1} className='min-w-[6rem] flex-1' />
        </FieldGroup>

        <FieldGroup title='Forno'>
          <NumberField
            label='Temperatura máxima'
            value={draft.oven.maxTemp}
            onChange={(maxTemp) => setDraft({ ...draft, oven: { ...draft.oven, maxTemp } })}
            min={CONFIG_TEMP_MIN}
            max={CONFIG_TEMP_MAX}
            unit='°C'
            className='flex-1'
          />
          <NumberField
            label='Máxima Velocidade do ventilador'
            value={draft.oven.maxFanRpm}
            onChange={(maxFanRpm) => setDraft({ ...draft, oven: { ...draft.oven, maxFanRpm } })}
            min={CONFIG_FAN_RPM_MIN}
            max={CONFIG_FAN_RPM_MAX}
            step={50}
            unit='rpm'
            className='flex-1'
          />
        </FieldGroup>

        <FieldGroup title='Processo'>
          <NumberField
            label='Tempo máximo além do programa'
            value={draft.process.maxExtraTimeSec}
            onChange={(maxExtraTimeSec) => setDraft({ ...draft, process: { maxExtraTimeSec } })}
            min={CONFIG_EXTRA_TIME_MIN}
            max={CONFIG_EXTRA_TIME_MAX}
            unit='s'
            className='flex-1'
          />
        </FieldGroup>

        <FieldGroup title='Tensão de Alimentação'>
          <NumberField
            label='Mínima tensão de alimentação'
            value={draft.voltage.min}
            onChange={(min) => setDraft({ ...draft, voltage: { ...draft.voltage, min } })}
            min={CONFIG_VOLTAGE_MIN}
            max={CONFIG_VOLTAGE_MAX}
            unit='V'
            className='flex-1'
          />
          <NumberField
            label='Máxima tensão de alimentação'
            value={draft.voltage.max}
            onChange={(max) => setDraft({ ...draft, voltage: { ...draft.voltage, max } })}
            min={CONFIG_VOLTAGE_MIN}
            max={CONFIG_VOLTAGE_MAX}
            unit='V'
            className='flex-1'
          />
        </FieldGroup>

        <FieldGroup title='Gráfico da execução'>
          <p className='w-full text-sm opacity-60'>Quais sinais aparecem no gráfico ao iniciar um programa (a legenda ainda liga/desliga ao vivo).</p>
          {RUN_SIGNALS.map((sig) => (
            <label key={sig.id} className='flex items-center gap-2.5 rounded-xl border border-[var(--border)] px-3 py-2'>
              <span className='size-2.5 shrink-0 rounded-full' style={{ backgroundColor: sig.color }} aria-hidden='true' />
              <span className='text-sm'>
                {sig.name} <span className='opacity-50'>({sig.unit})</span>
              </span>
              <Toggle
                checked={series[sig.id]}
                onChange={(v) => setDraft({ ...draft, run: { series: { ...series, [sig.id]: v } } })}
                label={`Mostrar ${sig.name} no gráfico da execução`}
              />
            </label>
          ))}
        </FieldGroup>
      </div>

      <FormFooter
        dirty={dirty}
        onCancel={cancel}
        onSave={() => {
          save();
          // TODO(backend): show this on the API success response (and an error toast on failure).
          showToast("Configurações salvas");
        }}
      />
    </div>
  );
}
