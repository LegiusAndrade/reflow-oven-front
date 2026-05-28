"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FieldGroup, FormFooter, NumberField } from "@/components/ConfiguracoesScreen/fields";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { logout } from "@/lib/auth";
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

type Calibration = { thermoOffset: number; currentOffset: number; currentGain: number; fanPwmMin: number; fanPwmMax: number };
const DEFAULTS: Calibration = { thermoOffset: 0, currentOffset: 0, currentGain: 100, fanPwmMin: 20, fanPwmMax: 100 };

/** Secret calibration menu — only reachable via the hidden "calibracao" login. Mock controls. */
export function CalibracaoScreen() {
  const router = useRouter();
  const [cal, setCal] = useState<Calibration>(DEFAULTS);
  const [base, setBase] = useState<Calibration>(DEFAULTS);
  const dirty = (Object.keys(cal) as (keyof Calibration)[]).some((k) => cal[k] !== base[k]);
  const set = (patch: Partial<Calibration>) => setCal((c) => ({ ...c, ...patch }));
  const exit = () => {
    logout();
    router.replace("/login");
  };

  return (
    <section className='card flex h-full flex-col gap-5 rounded-xl p-[clamp(1rem,2vw,1.5rem)]'>
      <header className='flex items-center justify-between gap-4 border-b border-white/10 pb-3'>
        <div className='flex items-center gap-3'>
          <h1 className='text-2xl font-semibold'>Calibração</h1>
          <span className='rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-300'>Modo técnico</span>
        </div>
        <button type='button' onClick={exit} aria-label='Sair' className='btn-press grid size-10 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-white/10'>
          <IconGeneral icon='logout' fill={0} className='[--icon-size:1.5rem]' />
        </button>
      </header>

      <div className='flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pr-1'>
        <p className='text-sm opacity-70'>Menu reservado de calibração dos sensores e atuadores. Ajuste com cuidado.</p>

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
          <NumberField label='Ganho' value={cal.currentGain} onChange={(currentGain) => set({ currentGain })} min={CALIB_GAIN_MIN} max={CALIB_GAIN_MAX} unit='%' className='flex-1' />
        </FieldGroup>

        <FieldGroup title='Ventiladores'>
          <NumberField label='PWM mínimo' value={cal.fanPwmMin} onChange={(fanPwmMin) => set({ fanPwmMin })} min={CALIB_PWM_MIN} max={CALIB_PWM_MAX} unit='%' className='flex-1' />
          <NumberField label='PWM máximo' value={cal.fanPwmMax} onChange={(fanPwmMax) => set({ fanPwmMax })} min={CALIB_PWM_MIN} max={CALIB_PWM_MAX} unit='%' className='flex-1' />
        </FieldGroup>
      </div>

      <FormFooter
        dirty={dirty}
        onCancel={() => setCal(base)}
        onSave={() => {
          setBase(cal);
          // TODO(backend): apply calibration over RS422.
          showToast("Calibração salva");
        }}
      />
    </section>
  );
}
