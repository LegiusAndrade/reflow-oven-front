"use client";

import { useEffect } from "react";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { logger } from "@/lib/logger";

/**
 * Route-level error boundary: catches a render/runtime crash in a screen and shows a recovery card
 * INSIDE the app chrome (TopBar/BottomBar/sidebar stay, session intact). On a kiosk a crashed screen
 * would otherwise leave a blank page until the device is rebooted — here the operator just retries or
 * reloads. `reset` re-renders the segment; the reload is the hard fallback.
 */
export default function ScreenError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logger.error("ui", "Erro de render na tela", error);
  }, [error]);

  return (
    <div className='grid h-full place-items-center p-6'>
      <div className='card flex w-[min(92vw,28rem)] flex-col items-center gap-4 rounded-2xl border border-(--border) p-6 text-center'>
        <IconGeneral icon='error' fill={1} className='shrink-0 text-red-700 dark:text-red-400 [--icon-size:2.5rem]' />
        <h1 className='text-xl font-semibold'>Algo deu errado nesta tela</h1>
        <p className='opacity-70'>Tente novamente. Se o problema continuar, recarregue a aplicação.</p>
        <div className='flex flex-wrap items-center justify-center gap-3'>
          <button type='button' onClick={reset} className='btn-action flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 font-semibold'>
            <IconGeneral icon='refresh' fill={0} className='[--icon-size:1.25rem]' />
            Tentar novamente
          </button>
          <button
            type='button'
            onClick={() => window.location.reload()}
            className='btn-press flex cursor-pointer items-center gap-2 rounded-xl border border-(--border) px-5 py-2.5 font-semibold hover:bg-(--hover)'
          >
            Recarregar
          </button>
        </div>
      </div>
    </div>
  );
}
