"use client";

import { clsx } from "clsx";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { Modal } from "@/components/Modal";
import { api } from "@/lib/api";
import { login } from "@/lib/auth";
import { USER_NAME_MAX_LENGTH } from "@/lib/limits";
import { showToast } from "@/lib/toast";

const FIELD =
  "text-fg w-full rounded-xl border border-[var(--border)] bg-[var(--surface-inset)] py-3 pr-3 pl-11 outline-none transition-colors placeholder:opacity-50 focus:border-[var(--brand)] focus:bg-[var(--surface-2)]";

/** Login / password screen (Figma "Login User"). Real auth against the backend (JWT).
 *  Rendered inside the AppShell (TopBar + BottomBar stay; no sidebar while logged out). */
export function LoginScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [recoverOpen, setRecoverOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [recoverError, setRecoverError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const result = await login(name, password);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? "Falha no login.");
      return;
    }
    router.replace(result.redirect ?? "/");
  };

  const recover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setRecoverError("Informe o e-mail.");
      return;
    }
    try {
      await api.forgotPassword(email.trim());
    } catch {
      // Enumeration-safe: the API always reports success, so ignore transport errors here.
    }
    showToast("Se houver uma conta com esse e-mail, enviaremos instruções de recuperação.");
    setRecoverOpen(false);
    setEmail("");
    setRecoverError("");
  };

  return (
    <>
      <div className='h-full overflow-y-auto'>
        <div className='grid min-h-full place-items-center p-2'>
          <form onSubmit={submit} className='card flex w-full max-w-md flex-col items-center gap-5 rounded-2xl border border-[var(--border)] p-6'>
            <Image src='/Logo.svg' alt='Logo' width={80} height={80} priority className='size-20' />

            <div className='flex w-full flex-col gap-3'>
              <div className='relative'>
                <IconGeneral icon='person' fill={0} className='pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 opacity-70 [--icon-size:1.25rem]' />
                <input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError("");
                  }}
                  placeholder='Usuário'
                  autoComplete='username'
                  maxLength={USER_NAME_MAX_LENGTH}
                  className={FIELD}
                />
              </div>

              <div className='relative'>
                <IconGeneral icon='lock' fill={0} className='pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 opacity-70 [--icon-size:1.25rem]' />
                <input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  placeholder='Senha'
                  autoComplete='current-password'
                  className={clsx(FIELD, "pr-11")}
                />
                <button
                  type='button'
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                  className='btn-press absolute top-1/2 right-2 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-lg hover:bg-[var(--hover)]'
                >
                  <IconGeneral icon={show ? "visibility_off" : "visibility"} fill={0} className='opacity-70 [--icon-size:1.25rem]' />
                </button>
              </div>

              {/* Error sits on the same row as the link, so showing it never resizes the card */}
              <div className='flex items-center justify-between gap-3'>
                <span className='truncate text-sm text-red-700 dark:text-red-400'>{error}</span>
                <button type='button' onClick={() => setRecoverOpen(true)} className='shrink-0 cursor-pointer text-sm text-[var(--brand)] hover:underline'>
                  Esqueceu a senha?
                </button>
              </div>
            </div>

            <button type='submit' disabled={submitting} className='btn-action w-full cursor-pointer rounded-xl px-5 py-3 font-semibold disabled:opacity-60'>
              {submitting ? "ENTRANDO…" : "ENTRAR"}
            </button>

            <p className='text-center text-xs opacity-50'>
              Dev: <span className='font-semibold'>lucas.silva</span> (Admin) · <span className='font-semibold'>vanessa</span> (Regular) · senha{" "}
              <span className='font-semibold'>reflow1234</span>
            </p>
          </form>
        </div>
      </div>

      <Modal open={recoverOpen} title='Recuperar senha' onClose={() => setRecoverOpen(false)} panelClassName='max-h-[85vh] w-[90vw] max-w-md'>
        <form onSubmit={recover} className='flex flex-col gap-4'>
          <p className='text-sm opacity-70'>Informe o e-mail cadastrado para receber as instruções de recuperação.</p>
          <div className='relative'>
            <IconGeneral icon='mail' fill={0} className='pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 opacity-70 [--icon-size:1.25rem]' />
            <input
              type='email'
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setRecoverError("");
              }}
              placeholder='seu@email.com'
              autoComplete='email'
              className={FIELD}
            />
          </div>
          {recoverError && <p className='text-sm text-red-700 dark:text-red-400'>{recoverError}</p>}
          <div className='flex justify-end gap-3'>
            <button type='button' onClick={() => setRecoverOpen(false)} className='btn-press cursor-pointer rounded-xl border border-[var(--border)] px-5 py-2.5 font-semibold'>
              Cancelar
            </button>
            <button type='submit' className='btn-action flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 font-semibold'>
              <IconGeneral icon='send' fill={0} className='[--icon-size:1.25rem]' />
              Enviar
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
