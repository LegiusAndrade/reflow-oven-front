"use client";

import { useEffect, useState } from "react";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { api, ApiError } from "@/lib/api";
import {
  CALIB_CURRENT_OFFSET_MAX,
  CALIB_CURRENT_OFFSET_MIN,
  CALIB_GAIN_MAX,
  CALIB_GAIN_MIN,
  CALIB_PWM_MAX,
  CALIB_PWM_MIN,
  CALIB_THERMO_OFFSET_MAX,
  CALIB_THERMO_OFFSET_MIN,
} from "@/lib/limits";
import { showToast } from "@/lib/toast";
import { CalibracaoSaidaModal } from "./CalibracaoSaidaModal";
import { FieldGroup, FormFooter, NumberField } from "./fields";

type Calibration = { thermoOffset: number; currentOffset: number; currentGain: number; fanPwmMin: number; fanPwmMax: number };
const DEFAULTS: Calibration = { thermoOffset: 0, currentOffset: 0, currentGain: 100, fanPwmMin: 20, fanPwmMax: 100 };

/** Calibração tab — only mounted for the technician (calibration) session. Mock controls. */
export function CalibracaoTab() {
  const [cal, setCal] = useState<Calibration>(DEFAULTS);
  const [base, setBase] = useState<Calibration>(DEFAULTS);
  const [wizardOpen, setWizardOpen] = useState(false);
  const dirty = (Object.keys(cal) as (keyof Calibration)[]).some((k) => cal[k] !== base[k]);
  const set = (patch: Partial<Calibration>) => setCal((c) => ({ ...c, ...patch }));

  useEffect(() => {
    api
      .getCalibration()
      .then((c) => {
        const loaded = c as Calibration;
        setCal(loaded);
        setBase(loaded);
      })
      .catch(() => {});
  }, []);

  return (
    <div className='flex h-full min-h-0 flex-col gap-5'>
      <div className='flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pr-3 [scrollbar-gutter:stable]'>
        <div className='flex flex-wrap items-center gap-2'>
          <span className='rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300'>Modo técnico</span>
          <p className='text-sm opacity-70'>Calibração dos sensores e atuadores — ajuste com cuidado.</p>
        </div>

        <FieldGroup title='Termopar (Tipo-K)'>
          <NumberField
            label='Offset de temperatura'
            value={cal.thermoOffset}
            onChange={(thermoOffset) => set({ thermoOffset })}
            min={CALIB_THERMO_OFFSET_MIN}
            max={CALIB_THERMO_OFFSET_MAX}
            step={0.1}
            unit='°C'
            className='flex-1'
          />
        </FieldGroup>

        <FieldGroup title='Sensor de Corrente (Hall)'>
          <NumberField
            label='Offset de zero'
            value={cal.currentOffset}
            onChange={(currentOffset) => set({ currentOffset })}
            min={CALIB_CURRENT_OFFSET_MIN}
            max={CALIB_CURRENT_OFFSET_MAX}
            step={0.1}
            unit='A'
            className='flex-1'
          />
          <NumberField
            label='Ganho'
            value={cal.currentGain}
            onChange={(currentGain) => set({ currentGain })}
            min={CALIB_GAIN_MIN}
            max={CALIB_GAIN_MAX}
            unit='%'
            className='flex-1'
          />
        </FieldGroup>

        <FieldGroup title='Ventiladores'>
          <NumberField label='PWM mínimo' value={cal.fanPwmMin} onChange={(fanPwmMin) => set({ fanPwmMin })} min={CALIB_PWM_MIN} max={CALIB_PWM_MAX} unit='%' className='flex-1' />
          <NumberField label='PWM máximo' value={cal.fanPwmMax} onChange={(fanPwmMax) => set({ fanPwmMax })} min={CALIB_PWM_MIN} max={CALIB_PWM_MAX} unit='%' className='flex-1' />
        </FieldGroup>

        <FieldGroup title='Calibração da saída'>
          <p className='w-full text-sm opacity-70'>
            Assistente passo-a-passo: percorre 10 V → 50 V → 100 V → 150 V → 0 V lendo a corrente da placa; você informa a tensão e a corrente do multímetro e o
            offset/ganho de corrente acima são preenchidos automaticamente.
          </p>
          <button
            type='button'
            onClick={() => setWizardOpen(true)}
            className='btn-action flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 font-semibold'
          >
            <IconGeneral icon='instant_mix' fill={0} className='[--icon-size:1.25rem]' />
            Iniciar calibração da saída
          </button>
        </FieldGroup>
      </div>

      <FormFooter
        dirty={dirty}
        onCancel={() => setCal(base)}
        onSave={async () => {
          try {
            await api.updateCalibration(cal);
            setBase(cal);
            showToast("Calibração salva");
          } catch (e) {
            showToast(e instanceof ApiError ? e.message : "Falha ao salvar a calibração");
          }
        }}
      />

      <CalibracaoSaidaModal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onApply={(result) => set({ currentOffset: result.currentOffset, currentGain: result.currentGain })}
      />
    </div>
  );
}
