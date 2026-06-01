"use client";

import { useState } from "react";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { Modal } from "@/components/Modal";
import { ApiError } from "@/lib/api";
import { USER_NAME_MAX_LENGTH, USER_NAME_MIN_LENGTH } from "@/lib/limits";
import { showToast } from "@/lib/toast";
import { isValidEmail, isValidUsername, sanitizeUsername, type UserStatus, type UserType, upsertUser, usernameExists } from "@/lib/users";
import { Segmented, TextLine } from "./fields";

const STATUS_OPTIONS: { value: UserStatus; label: string; icon: string }[] = [
  { value: "Ativo", label: "Ativo", icon: "check_circle" },
  { value: "Inativo", label: "Inativo", icon: "do_not_disturb_on" },
];

const TYPE_OPTIONS: { value: UserType; label: string; icon: string }[] = [
  { value: "Admin", label: "Admin", icon: "shield_person" },
  { value: "Regular", label: "Regular", icon: "person" },
];

const pad = (n: number) => String(n).padStart(2, "0");
function nowStamp(): string {
  const d = new Date();
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)} - ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Create a new user. The username strips special characters as you type and blocks paste; the
 *  Criar button stays disabled until the username (≥ min length, unique) and e-mail are valid. */
export function UserCreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<UserStatus>("Ativo");
  const [type, setType] = useState<UserType>("Regular");
  const [wasOpen, setWasOpen] = useState(open);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName("");
      setEmail("");
      setStatus("Ativo");
      setType("Regular");
    }
  }

  const trimmedName = name.trim();
  const nameTaken = trimmedName.length > 0 && usernameExists(trimmedName);
  const canSubmit = isValidUsername(trimmedName) && trimmedName.length >= USER_NAME_MIN_LENGTH && !nameTaken && isValidEmail(email.trim());

  const handleCreate = async () => {
    if (!canSubmit) return;
    try {
      await upsertUser({ id: `user-${Date.now()}`, name: trimmedName, email: email.trim(), status, type, createdAt: nowStamp(), lastLogin: "—", events: [] });
      showToast("Usuário criado");
      onClose();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Falha ao criar usuário", "error");
    }
  };

  return (
    <Modal open={open} title='Novo Usuário' onClose={onClose} panelClassName='max-h-[85vh] w-[90vw] max-w-xl'>
      <div className='flex flex-col gap-5'>
        <section>
          <h3 className='mb-2 text-sm font-semibold tracking-wide text-[var(--brand)] uppercase'>Detalhes do Usuário</h3>
          <div className='flex flex-col gap-4'>
            <div className='flex flex-col gap-1'>
              <TextLine
                label='Usuário'
                value={name}
                onChange={(v) => setName(sanitizeUsername(v))}
                onPaste={(e) => e.preventDefault()}
                maxLength={USER_NAME_MAX_LENGTH}
                placeholder='ex.: joao.silva'
                className='max-w-sm'
              />
              <span className='text-xs opacity-50'>Mínimo {USER_NAME_MIN_LENGTH} caracteres — apenas letras, números e ponto (.), sem espaços (colar desativado).</span>
              {nameTaken && <span className='text-xs text-red-700 dark:text-red-400'>Esse usuário já existe.</span>}
            </div>

            <div className='flex flex-col gap-1'>
              <TextLine label='E-mail' value={email} onChange={setEmail} placeholder='usuario@dominio.com' className='max-w-sm' />
              <span className='flex items-center gap-1.5 text-xs opacity-50'>
                <IconGeneral icon='mail' fill={0} className='[--icon-size:1rem]' />A senha de acesso será enviada por e-mail.
              </span>
            </div>

            <div className='flex flex-wrap items-center gap-x-3 gap-y-2'>
              <span className='opacity-60'>Status:</span>
              <Segmented options={STATUS_OPTIONS} value={status} onChange={setStatus} label='Status' />
            </div>
            <div className='flex flex-wrap items-center gap-x-3 gap-y-2'>
              <span className='opacity-60'>Tipo:</span>
              <Segmented options={TYPE_OPTIONS} value={type} onChange={setType} label='Tipo' />
            </div>
          </div>
        </section>

        <footer className='flex items-center justify-end gap-3 border-t border-[var(--border)] pt-3'>
          <button type='button' onClick={onClose} className='btn-press cursor-pointer rounded-xl border border-[var(--border)] px-5 py-2.5 font-semibold'>
            Cancelar
          </button>
          <button
            type='button'
            onClick={handleCreate}
            disabled={!canSubmit}
            className='btn-action flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 font-semibold'
          >
            <IconGeneral icon='person_add' fill={0} className='[--icon-size:1.25rem]' />
            Criar
          </button>
        </footer>
      </div>
    </Modal>
  );
}
