"use client";

import { clsx } from "clsx";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { useStore } from "@/hooks/useStore";
import { api, ApiError } from "@/lib/api";
import { faultStore } from "@/lib/faults";
import { refreshNotifications } from "@/lib/notifications";
import { showToast } from "@/lib/toast";

/**
 * Persistent red alert strip shown on EVERY route while the power board has a latched critical fault.
 * The fault rides the 1 Hz diagnostics tick (useLiveReadings → faultStore), so the strip appears and
 * disappears on its own with no extra poller. Acknowledging is a deliberate two-step action (a
 * ConfirmDialog of safety weight) that any signed-in operator may take — it calls POST
 * /api/diagnostics/ack-fault. We never optimistically hide the strip: it stays until a later tick
 * reports fault == null (the same confirm-first discipline as RunModal's PARAR), so the operator can't
 * mistake "asked to clear" for "actually cleared/safe".
 */
export function FaultBanner() {
  const fault = useStore(faultStore);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [acking, setAcking] = useState(false);

  if (!fault) return null;

  const acknowledge = () => {
    setConfirmOpen(false);
    setAcking(true);
    api
      .acknowledgeFault()
      .then(() => {
        showToast("Falha reconhecida. Aguardando a placa liberar.", "success");
        // Light mirror into the (server-owned) feed: refresh now so a backend "falha reconhecida"
        // notification reaches the TopBar badge immediately. Silent — we already toasted above.
        void refreshNotifications(true);
      })
      .catch((e) => showToast(e instanceof ApiError ? e.message : "Não foi possível reconhecer a falha.", "error"))
      .finally(() => setAcking(false));
  };

  return (
    <>
      {/* Saturated red (same tone as RunModal's PARAR), white text — reads identically in light/dark.
          Single row that wraps on the 1024×600 baseline; height grows fluidly via clamp() padding. */}
      <div
        role='alert'
        aria-live='assertive'
        className='flex flex-wrap items-center gap-x-4 gap-y-1.5 bg-red-600 px-[clamp(0.75rem,2.5vw,1.5rem)] py-[clamp(0.4rem,1.4vh,0.7rem)] text-white'
      >
        <IconGeneral icon='dangerous' fill={1} className='shrink-0 [--icon-size:1.75rem]' />
        <div className='min-w-0 flex-1'>
          <p className='text-sm font-bold leading-tight'>Falha crítica na placa de potência</p>
          <p className='text-sm leading-tight text-white/90'>
            <span className='font-semibold'>código {fault.code}</span> · {fault.message}
          </p>
        </div>
        <button
          type='button'
          onClick={() => setConfirmOpen(true)}
          disabled={acking}
          className='btn-press flex shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60'
        >
          <IconGeneral icon={acking ? "progress_activity" : "check"} fill={0} className={clsx("[--icon-size:1.25rem]", acking && "animate-spin")} />
          Reconhecer falha
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        tone='danger'
        icon='dangerous'
        title='Reconhecer falha?'
        description='Confirme que a causa da falha foi verificada e que é seguro liberar a máquina.'
        confirmLabel='Reconhecer e liberar'
        cancelLabel='Cancelar'
        onConfirm={acknowledge}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
