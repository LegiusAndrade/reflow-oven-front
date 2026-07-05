"use client";

import { useState } from "react";
import { PasswordLine } from "@/components/ConfiguracoesScreen/fields";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { Modal } from "@/components/Modal";
import { changePassword } from "@/lib/auth";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/limits";
import { showToast } from "@/lib/toast";

export interface IChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
  /** Forced mode (provisional-password change on login): hides the cancel/close affordances and
   *  shows an explanation, so the user must set a new password before continuing. */
  forced?: boolean;
}

/**
 * Self-service "Trocar senha" dialog available to every role from the sidebar drawer. Collects the
 * current password plus a new password (typed twice), validates locally against the shared
 * PASSWORD_MIN/MAX limits, then calls changePassword (lib/auth) — the BFF flow that swaps the revoked
 * JWT for the freshly minted one, keeping the operator signed in. Backend errors (e.g. "Senha atual
 * incorreta.") are shown inline; success fires a toast and closes. Sized for the 1024×600 touchscreen.
 */
export function ChangePasswordModal({ open, onClose, forced = false }: IChangePasswordModalProps) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);

  // Reset the form whenever the modal (re)opens so a previous attempt never leaks in. Render-time
  // adjustment (the codebase pattern, cf. UserCreateModal) — avoids the set-state-in-effect lint rule.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setCurrent("");
      setNext("");
      setConfirm("");
      setError(null);
      setSubmitting(false);
    }
  }

  const tooShort = next.length > 0 && next.length < PASSWORD_MIN_LENGTH;
  const mismatch = confirm.length > 0 && next !== confirm;
  const canSubmit =
    !submitting &&
    current.length > 0 &&
    next.length >= PASSWORD_MIN_LENGTH &&
    next.length <= PASSWORD_MAX_LENGTH &&
    next === confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (next.length < PASSWORD_MIN_LENGTH || next.length > PASSWORD_MAX_LENGTH) {
      setError(`A nova senha deve ter entre ${PASSWORD_MIN_LENGTH} e ${PASSWORD_MAX_LENGTH} caracteres.`);
      return;
    }
    if (next !== confirm) {
      setError("A confirmação não corresponde à nova senha.");
      return;
    }

    setSubmitting(true);
    // The change revokes every token minted under the old password; changePassword (lib/auth) adopts
    // the FRESH token + session from the response — cookie, memory and sessionStore — so the operator
    // stays signed in (and the forced-change flag clears) without replaying /me on the revoked token.
    const result = await changePassword(current, next);
    if (!result.ok) {
      setError(result.error ?? "Não foi possível alterar a senha. Tente novamente.");
      setSubmitting(false);
      return;
    }
    showToast("Senha alterada com sucesso.", "success");
    onClose();
  };

  // In forced mode the Modal renders no header/close button and the backdrop is non-dismissable
  // (onClose is a no-op), so the user can't skip the provisional-password change.
  return (
    <Modal
      open={open}
      title={forced ? undefined : "Trocar senha"}
      onClose={forced ? () => {} : onClose}
      panelClassName='max-h-[92vh] w-[min(92vw,30rem)]'
    >
      <form onSubmit={handleSubmit} className='flex max-h-[inherit] flex-col gap-4'>
        {forced && (
          <div className='flex items-start gap-3 rounded-xl border border-(--border) bg-(--hover) p-3'>
            <IconGeneral icon='info' fill={1} className='shrink-0 text-(--brand) [--icon-size:1.5rem]' />
            <div className='flex flex-col gap-1'>
              <h2 className='font-semibold'>Defina uma nova senha</h2>
              <p className='text-sm opacity-70'>Você está usando uma senha provisória. Crie uma nova senha para continuar.</p>
            </div>
          </div>
        )}

        <div className='flex min-h-0 flex-col gap-4 overflow-y-auto pr-3 scrollbar-gutter-stable'>
          <PasswordLine
            label='Senha atual'
            value={current}
            onChange={setCurrent}
            maxLength={PASSWORD_MAX_LENGTH}
            autoComplete='current-password'
            className='w-full'
          />
          <div className='flex flex-col gap-1'>
            <PasswordLine
              label='Nova senha'
              value={next}
              onChange={setNext}
              maxLength={PASSWORD_MAX_LENGTH}
              autoComplete='new-password'
              className='w-full'
            />
            <span className='text-xs opacity-50'>Mín {PASSWORD_MIN_LENGTH} caracteres.</span>
            {tooShort && <span className='text-xs text-red-700 dark:text-red-400'>A nova senha deve ter pelo menos {PASSWORD_MIN_LENGTH} caracteres.</span>}
          </div>
          <div className='flex flex-col gap-1'>
            <PasswordLine
              label='Confirmar nova senha'
              value={confirm}
              onChange={setConfirm}
              maxLength={PASSWORD_MAX_LENGTH}
              autoComplete='new-password'
              className='w-full'
            />
            {mismatch && <span className='text-xs text-red-700 dark:text-red-400'>A confirmação não corresponde à nova senha.</span>}
          </div>
        </div>

        {error && (
          <p role='alert' className='flex items-center gap-2 text-sm text-red-700 dark:text-red-400'>
            <IconGeneral icon='error' fill={1} className='shrink-0 [--icon-size:1.25rem]' />
            {error}
          </p>
        )}

        <footer className='mt-auto flex items-center justify-end gap-3 border-t border-(--border) pt-3'>
          {!forced && (
            <button
              type='button'
              onClick={onClose}
              disabled={submitting}
              className='btn-press cursor-pointer rounded-xl border border-(--border) px-5 py-2.5 font-semibold disabled:cursor-not-allowed disabled:opacity-40'
            >
              Cancelar
            </button>
          )}
          <button type='submit' disabled={!canSubmit} className='btn-action flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 font-semibold'>
            <IconGeneral icon={submitting ? "progress_activity" : "key"} fill={0} className={submitting ? "animate-spin [--icon-size:1.25rem]" : "[--icon-size:1.25rem]"} />
            {submitting ? "Salvando…" : "Salvar"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
