"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProgramEditorScreen } from "@/components/ProgramEditorScreen";
import { api } from "@/lib/api";
import type { Program } from "@/lib/programs";
import { toProgram } from "@/lib/programStore";

type LoaderState = { status: "loading" } | { status: "ready"; program: Program } | { status: "notfound" };

/** Fetches a program by id from the API and hands it to the editor pre-filled. */
export function ProgramEditorLoader({ programId }: { programId: string }) {
  const [state, setState] = useState<LoaderState>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    api
      .getProgram(programId)
      .then((dto) => alive && setState({ status: "ready", program: toProgram(dto) }))
      .catch(() => alive && setState({ status: "notfound" }));
    return () => {
      alive = false;
    };
  }, [programId]);

  if (state.status === "loading") {
    return <section className='card grid h-full place-items-center rounded-xl p-6 opacity-70'>Carregando…</section>;
  }

  if (state.status === "notfound") {
    return (
      <section className='card grid h-full place-items-center gap-4 rounded-xl p-6 text-center'>
        <p className='opacity-70'>Programa não encontrado.</p>
        <Link href='/programas' className='btn-action rounded-xl px-5 py-2.5 font-semibold'>
          Voltar para Programas
        </Link>
      </section>
    );
  }

  return <ProgramEditorScreen title='Editar Programa' initialProgram={state.program} />;
}
