"use client";

import { useState } from "react";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { Modal } from "@/components/Modal";
import { USER_NAME_MAX_LENGTH } from "@/lib/limits";
import { showToast } from "@/lib/toast";
import { isValidEmail, isValidUsername, type UserStatus, type UserType, upsertUser, usernameExists } from "@/lib/users";
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

/** Create a new user (username + e-mail validated). Fields reset each time the modal opens. */
export function UserCreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<UserStatus>("Ativo");
  const [type, setType] = useState<UserType>("Regular");
  const [error, setError] = useState("");
  const [wasOpen, setWasOpen] = useState(open);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName("");
      setEmail("");
      setStatus("Ativo");
      setType("Regular");
      setError("");
    }
  }

  const handleCreate = () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName) return setError("Informe o usuário.");
    if (!isValidUsername(trimmedName)) return setError("Usuário não pode conter espaços ou caracteres especiais.");
    if (usernameExists(trimmedName)) return setError("Esse usuário já existe.");
    if (!trimmedEmail) return setError("Informe o e-mail.");
    if (!isValidEmail(trimmedEmail)) return setError("E-mail inválido.");

    upsertUser({ id: `user-${Date.now()}`, name: trimmedName, email: trimmedEmail, status, type, createdAt: nowStamp(), lastLogin: "—", events: [] });
    // TODO(backend): create via the API and show the result.
    showToast("Usuário criado");
    onClose();
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
                onChange={(v) => {
                  setName(v);
                  setError("");
                }}
                maxLength={USER_NAME_MAX_LENGTH}
                placeholder='ex.: joao.silva'
                className='max-w-sm'
              />
              <span className='text-xs opacity-50'>Sem espaços ou caracteres especiais (letras, números, . _ -).</span>
            </div>

            <TextLine
              label='E-mail'
              value={email}
              onChange={(v) => {
                setEmail(v);
                setError("");
              }}
              placeholder='usuario@dominio.com'
              className='max-w-sm'
            />

            <div className='flex flex-wrap items-center gap-x-3 gap-y-2'>
              <span className='opacity-60'>Status:</span>
              <Segmented options={STATUS_OPTIONS} value={status} onChange={setStatus} label='Status' />
            </div>
            <div className='flex flex-wrap items-center gap-x-3 gap-y-2'>
              <span className='opacity-60'>Tipo:</span>
              <Segmented options={TYPE_OPTIONS} value={type} onChange={setType} label='Tipo' />
            </div>

            {error && <p className='text-sm text-red-400'>{error}</p>}
          </div>
        </section>

        <footer className='flex items-center justify-end gap-3 border-t border-white/10 pt-3'>
          <button type='button' onClick={onClose} className='btn-press cursor-pointer rounded-xl border border-white/15 px-5 py-2.5 font-semibold'>
            Cancelar
          </button>
          <button type='button' onClick={handleCreate} className='btn-action flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 font-semibold'>
            <IconGeneral icon='person_add' fill={0} className='[--icon-size:1.25rem]' />
            Criar
          </button>
        </footer>
      </div>
    </Modal>
  );
}
