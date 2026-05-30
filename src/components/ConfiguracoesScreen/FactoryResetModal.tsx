"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { Modal } from "@/components/Modal";
import { ApiError } from "@/lib/api";
import { factoryReset } from "@/lib/maintenance";
import { showToast } from "@/lib/toast";

/** Word the operator must type to enable the reset (guards against accidental clicks). */
const CONFIRM_WORD = "RESETAR";

const CONSEQUENCES = [
  { icon: "group", text: "Todos os usuários, exceto um Admin padrão" },
  { icon: "article", text: "Todos os programas, exceto um perfil padrão" },
  { icon: "settings", text: "Configurações restauradas ao padrão" },
  { icon: "delete_history", text: "Histórico, registros e logs apagados" },
];

/** Diagnóstico → destructive factory reset, gated by a type-to-confirm field. */
export function FactoryResetModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [text, setText] = useState("");
  // Clear the field each time the modal opens (adjust-during-render, no effect).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setText("");
  }

  const ready = text.trim().toUpperCase() === CONFIRM_WORD;
  const confirm = async () => {
    if (!ready) return;
    try {
      await factoryReset();
      showToast("Reset de fábrica concluído. Faça login novamente.");
      onClose();
      router.replace("/login");
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Falha no reset de fábrica");
    }
  };

  return (
    <Modal open={open} title='Reset de fábrica' onClose={onClose} panelClassName='w-[min(92vw,32rem)]'>
      <div className='flex flex-col gap-4'>
        <div className='flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3'>
          <IconGeneral icon='warning' fill={1} className='shrink-0 text-red-700 dark:text-red-400 [--icon-size:1.5rem]' />
          <div className='text-sm'>
            <p className='font-semibold text-red-700 dark:text-red-300'>Esta ação é irreversível.</p>
            <p className='opacity-80'>O sistema voltará ao estado de fábrica:</p>
          </div>
        </div>

        <ul className='flex flex-col gap-2 text-sm'>
          {CONSEQUENCES.map((c) => (
            <li key={c.text} className='flex items-center gap-2.5'>
              <IconGeneral icon={c.icon} fill={0} className='shrink-0 text-[var(--brand)] [--icon-size:1.25rem]' />
              <span className='opacity-80'>{c.text}</span>
            </li>
          ))}
        </ul>

        <label className='flex flex-col gap-1.5 text-sm'>
          <span className='opacity-70'>
            Digite <span className='font-semibold text-[var(--brand)]'>{CONFIRM_WORD}</span> para confirmar:
          </span>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={CONFIRM_WORD}
            autoComplete='off'
            spellCheck={false}
            className='rounded-xl border border-[var(--border)] bg-[var(--surface-inset)] px-4 py-2.5 tracking-wide outline-none placeholder:opacity-40 focus:border-[var(--brand)]'
          />
        </label>

        <div className='flex items-center justify-end gap-3 border-t border-[var(--border)] pt-4'>
          <button type='button' onClick={onClose} className='btn-press cursor-pointer rounded-xl border border-[var(--border)] px-5 py-2.5 font-semibold'>
            Cancelar
          </button>
          <button
            type='button'
            onClick={confirm}
            disabled={!ready}
            className='btn-press flex cursor-pointer items-center gap-2 rounded-xl bg-red-500 px-5 py-2.5 font-semibold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40'
          >
            <IconGeneral icon='restart_alt' fill={0} className='[--icon-size:1.25rem]' />
            Resetar de fábrica
          </button>
        </div>
      </div>
    </Modal>
  );
}
