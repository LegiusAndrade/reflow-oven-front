"use client";

import { useState } from "react";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { Modal } from "@/components/Modal";
import { showToast } from "@/lib/toast";
import { isValidEmail, type User, type UserStatus, type UserType, upsertUser } from "@/lib/users";
import { Segmented, TextLine } from "./fields";

const STATUS_OPTIONS: { value: UserStatus; label: string; icon: string }[] = [
  { value: "Ativo", label: "Ativo", icon: "check_circle" },
  { value: "Inativo", label: "Inativo", icon: "do_not_disturb_on" },
];

const TYPE_OPTIONS: { value: UserType; label: string; icon: string }[] = [
  { value: "Admin", label: "Admin", icon: "shield_person" },
  { value: "Regular", label: "Regular", icon: "person" },
];

/** Edit a user's e-mail / status / type (Figma "Page User - Edit"). The username is fixed.
 *  Draft reseeds when a different user is opened (adjust-state-during-render, not an effect). */
export function UserEditModal({ user, open, onClose }: { user: User | null; open: boolean; onClose: () => void }) {
  const [base, setBase] = useState(user);
  const [email, setEmail] = useState(user?.email ?? "");
  const [status, setStatus] = useState<UserStatus>(user?.status ?? "Ativo");
  const [type, setType] = useState<UserType>(user?.type ?? "Regular");
  const [error, setError] = useState("");

  if (user !== base) {
    setBase(user);
    setEmail(user?.email ?? "");
    setStatus(user?.status ?? "Ativo");
    setType(user?.type ?? "Regular");
    setError("");
  }

  const handleSave = () => {
    if (!user) return;
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return setError("Informe o e-mail.");
    if (!isValidEmail(trimmedEmail)) return setError("E-mail inválido.");
    upsertUser({ ...user, email: trimmedEmail, status, type });
    // TODO(backend): show this on the API success response.
    showToast("Usuário atualizado");
    onClose();
  };

  return (
    <Modal open={open} title={user ? `Editar — ${user.name}` : ""} onClose={onClose} panelClassName='max-h-[85vh] w-[90vw] max-w-xl'>
      {user && (
        <div className='flex flex-col gap-5'>
          <section>
            <h3 className='mb-2 text-sm font-semibold tracking-wide text-[var(--brand)] uppercase'>Detalhes do Usuário</h3>
            <div className='flex flex-col gap-4'>
              <div className='flex flex-wrap items-center gap-x-2'>
                <span className='opacity-60'>Usuário:</span>
                <span className='font-medium'>{user.name}</span>
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
              {error && <p className='text-sm text-red-700 dark:text-red-400'>{error}</p>}
            </div>
          </section>

          <footer className='flex items-center justify-end gap-3 border-t border-[var(--border)] pt-3'>
            <button type='button' onClick={onClose} className='btn-press cursor-pointer rounded-xl border border-[var(--border)] px-5 py-2.5 font-semibold'>
              Cancelar
            </button>
            <button type='button' onClick={handleSave} className='btn-action flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 font-semibold'>
              <IconGeneral icon='save' fill={0} className='[--icon-size:1.25rem]' />
              SALVAR
            </button>
          </footer>
        </div>
      )}
    </Modal>
  );
}
