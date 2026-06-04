"use client";

import { useEffect } from "react";
import "./globals.css";

/**
 * Root error boundary: the last-resort catch for when even the root layout/shell crashes. It REPLACES
 * the layout, so it renders its own <html>/<body> and can't rely on the shell or the icon font (hence
 * a plain inline SVG). A kiosk must never sit on a blank screen — this always offers a hard reload.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang='pt-BR' data-theme='dark'>
      <body className='bg-app text-fg antialiased'>
        <div className='grid h-screen place-items-center p-6'>
          <div className='card flex w-[min(92vw,28rem)] flex-col items-center gap-4 rounded-2xl border border-(--border) p-6 text-center'>
            <svg width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='text-red-500'>
              <path d='M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h16.9a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z' />
              <path d='M12 9v4M12 17h.01' />
            </svg>
            <h1 className='text-xl font-semibold'>Algo deu errado</h1>
            <p className='opacity-70'>A aplicação encontrou um erro inesperado. Recarregue para continuar.</p>
            <button
              type='button'
              onClick={() => window.location.reload()}
              className='btn-action flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 font-semibold'
            >
              Recarregar
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
