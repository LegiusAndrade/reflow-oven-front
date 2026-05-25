"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ProgramEditorScreen } from "@/components/ProgramEditorScreen";
import { useStoredPrograms } from "@/hooks/useStoredPrograms";
import { MOCK_PROGRAMS } from "@/lib/programs";

const subscribeNoop = () => () => {};

/** False during SSR and the first client render, true afterwards — without a hydration mismatch. */
function useHydrated(): boolean {
  return useSyncExternalStore(subscribeNoop, () => true, () => false);
}

/**
 * Resolves a program by id from the stored set (localStorage) or the seed programs and hands
 * it to the editor pre-filled. Stored programs aren't available on the server, so we gate on
 * `useHydrated`: render a neutral placeholder until the client list is in, then editor or
 * not-found. The two stores reconcile together, so there's no "not found" flash.
 */
export function ProgramEditorLoader({ programId }: { programId: string }) {
  const stored = useStoredPrograms();
  const hydrated = useHydrated();
  const program = stored.find((p) => p.id === programId) ?? MOCK_PROGRAMS.find((p) => p.id === programId) ?? null;

  if (!hydrated) {
    return <section className='card grid h-full place-items-center rounded-xl p-6 opacity-70'>Carregando…</section>;
  }

  if (!program) {
    return (
      <section className='card grid h-full place-items-center gap-4 rounded-xl p-6 text-center'>
        <p className='opacity-70'>Programa não encontrado.</p>
        <Link href='/programas' className='btn-action rounded-xl px-5 py-2.5 font-semibold'>
          Voltar para Programas
        </Link>
      </section>
    );
  }

  return <ProgramEditorScreen title='Editar Programa' initialProgram={program} />;
}
