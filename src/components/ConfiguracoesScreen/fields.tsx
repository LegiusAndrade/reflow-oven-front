"use client";

import { clsx } from "clsx";
import { useState } from "react";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { useStore } from "@/hooks/useStore";
import { clampToRange, parseClampedPaste } from "@/lib/numericInput";
import { type Settings, settingsStore } from "@/lib/settings";

const INPUT_CLS = "w-full rounded-xl border border-(--border) bg-transparent px-3 py-2.5 outline-none transition-colors focus:border-(--brand)";

/** A titled group of fields (e.g. "PID", "Forno"). */
export function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className='flex flex-col gap-2'>
      <h3 className='font-semibold'>{title}</h3>
      <div className='flex flex-wrap gap-3'>{children}</div>
    </section>
  );
}

interface INumberFieldProps {
  label: string;
  value: number;
  onChange: (_v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  className?: string;
  /** Optional field: a cleared input stays empty (emits NaN) instead of snapping to `min`/0, so a
   *  "no value" state is reachable again. Use where empty is meaningful (e.g. the ping port = ICMP). */
  allowEmpty?: boolean;
}

export function NumberField({ label, value, onChange, min, max, step = 1, unit, className, allowEmpty = false }: INumberFieldProps) {
  const rangeHint = min !== undefined && max !== undefined ? `Mín ${min} · Máx ${max}${unit ? ` ${unit}` : ""}` : undefined;
  return (
    <label className={clsx("flex min-w-[8rem] flex-col gap-1", className)}>
      <span className='text-sm opacity-70'>{label}</span>
      <div className='relative'>
        <input
          type='number'
          inputMode='decimal'
          value={Number.isFinite(value) ? value : ""}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(e.target.value === "" ? (allowEmpty ? NaN : 0) : Number(e.target.value))}
          onPaste={(e) => {
            // Clamp on paste so CTRL+V can't drop an out-of-range value into the field.
            const v = parseClampedPaste(e.clipboardData.getData("text"), min ?? -Infinity, max ?? Infinity);
            e.preventDefault();
            if (v !== null) onChange(v);
          }}
          onBlur={(e) => {
            // An allowEmpty field keeps a cleared input empty (NaN) instead of snapping to min, so an
            // optional field can be reset to "no value".
            if (allowEmpty && e.target.value === "") {
              if (Number.isFinite(value)) onChange(NaN);
              return;
            }
            // Snap the typed value into [min, max] when the field loses focus.
            const clamped = clampToRange(e.target.value === "" ? (min ?? 0) : Number(e.target.value), min ?? -Infinity, max ?? Infinity);
            if (clamped !== value) onChange(clamped);
          }}
          className={clsx(INPUT_CLS, "tabular-nums", unit && "pr-12")}
        />
        {unit && <span className='pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm opacity-50'>{unit}</span>}
      </div>
      {rangeHint && <span className='text-xs opacity-50 tabular-nums'>{rangeHint}</span>}
    </label>
  );
}

interface ITextLineProps {
  label: string;
  value: string;
  onChange: (_v: string) => void;
  maxLength?: number;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onPaste?: React.ClipboardEventHandler<HTMLInputElement>;
}

export function TextLine({ label, value, onChange, maxLength, placeholder, className, disabled, onPaste }: ITextLineProps) {
  return (
    <label className={clsx("flex min-w-[10rem] flex-col gap-1", className, disabled && "opacity-50")}>
      <span className='text-sm opacity-70'>{label}</span>
      <input
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={disabled}
        onPaste={onPaste}
        onChange={(e) => onChange(e.target.value)}
        className={clsx(INPUT_CLS, "tabular-nums placeholder:opacity-40", disabled && "cursor-not-allowed")}
      />
    </label>
  );
}

interface IPasswordLineProps {
  label: string;
  value: string;
  onChange: (_v: string) => void;
  maxLength?: number;
  placeholder?: string;
  className?: string;
  autoComplete?: string;
}

/** Masked password input with a show/hide toggle (matches the login field). */
export function PasswordLine({ label, value, onChange, maxLength, placeholder, className, autoComplete = "new-password" }: IPasswordLineProps) {
  const [show, setShow] = useState(false);
  return (
    <label className={clsx("flex min-w-[10rem] flex-col gap-1", className)}>
      <span className='text-sm opacity-70'>{label}</span>
      <div className='relative'>
        <input
          type={show ? "text" : "password"}
          value={value}
          maxLength={maxLength}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          className={clsx(INPUT_CLS, "pr-11")}
        />
        <button
          type='button'
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Ocultar senha" : "Mostrar senha"}
          className='btn-press absolute top-1/2 right-2 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-lg hover:bg-(--hover)'
        >
          <IconGeneral icon={show ? "visibility_off" : "visibility"} fill={0} className='opacity-70 [--icon-size:1.25rem]' />
        </button>
      </div>
    </label>
  );
}

/** Accessible on/off switch. */
export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (_v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type='button'
      role='switch'
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        "btn-press relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        disabled ? "cursor-not-allowed" : "cursor-pointer",
        checked ? "bg-(--brand)" : "bg-black/15 dark:bg-white/20"
      )}
    >
      <span className={clsx("inline-block size-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-[22px]" : "translate-x-0.5")} />
    </button>
  );
}

interface ISegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: string;
}

/** Inline segmented control (radio group) — no popover, so it never clips inside tables/modals.
 *  Best for the binary/ternary choices in Configurações. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  disabled,
}: {
  options: ISegmentedOption<T>[];
  value: T;
  onChange: (_v: T) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <div role='radiogroup' aria-label={label} className={clsx("inline-flex w-fit rounded-xl border border-(--border) p-0.5", disabled && "opacity-40")}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type='button'
            role='radio'
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={clsx(
              "btn-press flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              disabled ? "cursor-not-allowed" : "cursor-pointer",
              active ? "btn-link-active" : "hover:bg-(--hover)"
            )}
          >
            {o.icon && <IconGeneral icon={o.icon} fill={active ? 1 : 0} className='[--icon-size:1.125rem]' />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Cancelar / SALVAR footer pinned to the bottom of a form tab. */
export function FormFooter({ onCancel, onSave, dirty }: { onCancel: () => void; onSave: () => void; dirty: boolean }) {
  return (
    <footer className='mt-auto flex items-center justify-end gap-3 border-t border-(--border) pt-3'>
      <button
        type='button'
        onClick={onCancel}
        disabled={!dirty}
        className='btn-press cursor-pointer rounded-xl border border-(--border) px-5 py-2.5 font-semibold disabled:cursor-not-allowed disabled:opacity-40'
      >
        Cancelar
      </button>
      <button type='button' onClick={onSave} disabled={!dirty} className='btn-action flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 font-semibold'>
        <IconGeneral icon='save' fill={0} className='[--icon-size:1.25rem]' />
        SALVAR
      </button>
    </footer>
  );
}

/**
 * A working copy of the persisted settings with Cancelar/Salvar. Reseeds from the store when it
 * changes (e.g. after hydration loads localStorage, or after a save) using the React-blessed
 * "adjust state during render" pattern — not an effect, so no set-state-in-effect lint error.
 */
export function useSettingsDraft() {
  const saved = useStore(settingsStore);
  const [base, setBase] = useState(saved);
  const [draft, setDraft] = useState(saved);
  if (saved !== base) {
    setBase(saved);
    setDraft(saved);
  }
  return {
    draft,
    setDraft,
    dirty: draft !== base,
    save: (next: Settings = draft) => settingsStore.set(next),
    cancel: () => setDraft(base),
  };
}
