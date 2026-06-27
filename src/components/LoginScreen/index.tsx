"use client";

import { clsx } from "clsx";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { Modal } from "@/components/Modal";
import { api } from "@/lib/api";
import { login } from "@/lib/auth";
import { EMAIL_MAX_LENGTH, LOGIN_RETRY_AFTER_MAX_SECONDS, PASSWORD_MAX_LENGTH, USER_NAME_MAX_LENGTH } from "@/lib/limits";
import { showToast } from "@/lib/toast";
import { isValidEmail, sanitizeUsername } from "@/lib/users";

const FIELD =
  "text-fg w-full rounded-xl border border-(--border) bg-(--surface-inset) py-3 pr-3 pl-11 outline-none transition-colors placeholder:opacity-50 focus:border-(--brand) focus:bg-(--surface-2)";

/** Seconds → "M:SS" for the login lockout countdown (e.g. 300 → "5:00", 65 → "1:05", 5 → "0:05"). */
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Login / password screen (Figma "Login User"). Real auth against the backend (JWT).
 *  Rendered inside the AppShell (TopBar + BottomBar stay; no sidebar while logged out). */
export function LoginScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [errorKind, setErrorKind] = useState<"connection" | "lockout" | undefined>(undefined);
  // Rate-limit lockout countdown: seconds left before a retry is allowed (backend `retryAfterSeconds`).
  // 0 = not locked. Ticked down below; drives the disabled ENTRAR button's live "Aguarde M:SS" label.
  const [lockSeconds, setLockSeconds] = useState(0);
  const clearError = () => {
    setError("");
    setErrorKind(undefined);
  };
  const [recoverOpen, setRecoverOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [recoverError, setRecoverError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const locked = lockSeconds > 0;
  // A lockout message is only meaningful while the countdown runs (once it elapses the button re-enables);
  // a credential error always shows. Deriving this keeps the stale message out without a clear-in-effect.
  const showInlineError = !!error && errorKind !== "connection" && (errorKind !== "lockout" || locked);
  // Tick the lockout countdown down once a second while it is active (one stable interval; the
  // functional updater avoids a stale closure). The interval is torn down when it reaches zero.
  useEffect(() => {
    if (!locked) return;
    const id = setInterval(() => setLockSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [locked]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (locked) return; // still inside the lockout window — ignore Enter/submit
    setSubmitting(true);
    const result = await login(name, password);
    setSubmitting(false);
    if (!result.ok) {
      const msg = result.error ?? "Falha no login.";
      setError(msg);
      // A lockout carries `retryAfterSeconds`: start the (clamped) countdown and mark the kind so the
      // button shows the live timer and the message auto-clears when it elapses. Otherwise keep the
      // credential/connection kind (inline row vs. the connection help block).
      const secs = result.retryAfterSeconds;
      if (typeof secs === "number" && secs > 0) {
        setErrorKind("lockout");
        setLockSeconds(Math.min(Math.floor(secs), LOGIN_RETRY_AFTER_MAX_SECONDS));
      } else {
        setErrorKind(result.kind);
      }
      // Also surface it as a toast (the operator may be looking away from the field). The connection
      // failure keeps its dedicated help block instead; the toast dedupe stops repeated attempts spamming.
      if (result.kind !== "connection") showToast(msg, "error");
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
    if (!isValidEmail(email.trim())) {
      setRecoverError("E-mail inválido.");
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
          <form onSubmit={submit} className='card flex w-full max-w-md flex-col items-center gap-5 rounded-2xl border border-(--border) p-6'>
            <Image src='/Logo.svg' alt='Logo' width={80} height={80} priority className='size-20' />

            <div className='flex w-full flex-col gap-3'>
              <div className='relative'>
                <IconGeneral icon='person' fill={0} className='pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 opacity-70 [--icon-size:1.25rem]' />
                <input
                  value={name}
                  onChange={(e) => {
                    setName(sanitizeUsername(e.target.value));
                    clearError();
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
                    clearError();
                  }}
                  placeholder='Senha'
                  autoComplete='current-password'
                  maxLength={PASSWORD_MAX_LENGTH}
                  className={clsx(FIELD, "pr-11")}
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

              {/* Forgot-password link on its own row; the error gets a full-width row below it. */}
              <div className='flex justify-end'>
                <button type='button' onClick={() => setRecoverOpen(true)} className='shrink-0 cursor-pointer text-sm text-(--brand) hover:underline'>
                  Esqueceu a senha?
                </button>
              </div>
              {/* Credential / lockout error — full width so a longer message (e.g. the rate-limit notice)
                  wraps instead of being clipped. The connection failure uses the richer help block below. */}
              {showInlineError && <p className='text-sm text-red-700 dark:text-red-400'>{error}</p>}

              {/* Connection failure: a help block with possible fixes (room to wrap, unlike the inline row) */}
              {errorKind === "connection" && (
                <div className='flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm'>
                  <IconGeneral icon='cloud_off' fill={1} className='mt-0.5 shrink-0 text-red-700 dark:text-red-400 [--icon-size:1.25rem]' />
                  <div className='flex min-w-0 flex-col gap-1'>
                    <p className='font-semibold text-red-700 dark:text-red-300'>Não foi possível conectar ao servidor</p>
                    <p className='opacity-80'>Verifique:</p>
                    <ul className='list-disc pl-4 opacity-80'>
                      <li>se o servidor está ligado;</li>
                      <li>a conexão de rede (cabo ou Wi-Fi);</li>
                      <li>o endereço do servidor nas configurações.</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <button
              type='submit'
              disabled={submitting || locked}
              className='btn-action w-full cursor-pointer rounded-xl px-5 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-60'
            >
              {locked ? `Aguarde ${mmss(lockSeconds)}` : submitting ? "ENTRANDO…" : "ENTRAR"}
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
              maxLength={EMAIL_MAX_LENGTH}
              className={FIELD}
            />
          </div>
          {recoverError && <p className='text-sm text-red-700 dark:text-red-400'>{recoverError}</p>}
          <div className='flex justify-end gap-3'>
            <button type='button' onClick={() => setRecoverOpen(false)} className='btn-press cursor-pointer rounded-xl border border-(--border) px-5 py-2.5 font-semibold'>
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
