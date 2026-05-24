"use client";

import { clsx } from "clsx";
import Link from "next/link";
import { useMemo, useState } from "react";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import type { ExecutionReport } from "@/lib/reports";

type Tab = "execucoes" | "alteracoes" | "erros";

const TABS: { id: Tab; label: string }[] = [
  { id: "execucoes", label: "Execuções" },
  { id: "alteracoes", label: "Alterações" },
  { id: "erros", label: "Erros" },
];

export function RelatoriosScreen({ executions }: { executions: ExecutionReport[] }) {
  const [tab, setTab] = useState<Tab>("execucoes");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? executions.filter((e) => e.programName.toLowerCase().includes(q)) : executions;
  }, [executions, query]);

  return (
    <section className='card flex h-full flex-col gap-5 rounded-xl p-[clamp(1rem,2vw,1.5rem)]'>
      <header className='flex items-center justify-between gap-4 border-b border-white/10 pb-3'>
        <h1 className='text-2xl font-semibold'>Relatórios</h1>
        <Link
          href='/'
          aria-label='Fechar'
          className='btn-press grid size-10 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-white/10'
        >
          <IconGeneral icon='close' fill={0} className='[--icon-size:1.75rem]' />
        </Link>
      </header>

      {/* Tabs */}
      <nav className='flex gap-2'>
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type='button'
            onClick={() => setTab(id)}
            aria-current={tab === id ? "page" : undefined}
            className={clsx(
              "cursor-pointer rounded-lg px-4 py-2 font-semibold transition-colors",
              tab === id ? "btn-link-active" : "hover:bg-white/10"
            )}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* Filters */}
      <div className='flex flex-wrap items-center gap-3'>
        <input type='date' aria-label='Data inicial' className='rounded-xl border border-white/15 bg-transparent px-3 py-2.5 [color-scheme:dark]' />
        <span className='opacity-60'>—</span>
        <input type='date' aria-label='Data final' className='rounded-xl border border-white/15 bg-transparent px-3 py-2.5 [color-scheme:dark]' />
        <label className='flex flex-1 items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5'>
          <IconGeneral icon='search' fill={0} className='shrink-0 opacity-70 [--icon-size:1.25rem]' />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Pesquisar...'
            className='w-full bg-transparent outline-none placeholder:opacity-60'
          />
        </label>
        <button type='button' className='btn-press flex min-w-[12rem] items-center justify-between gap-2 rounded-xl border border-white/15 px-4 py-2.5'>
          <span className='opacity-80'>Filtrar por...</span>
          <IconGeneral icon='expand_more' fill={0} className='[--icon-size:1.25rem]' />
        </button>
      </div>

      {/* Content */}
      {tab === "execucoes" ? (
        <ExecutionsTable executions={filtered} />
      ) : (
        <div className='grid flex-1 place-items-center'>
          <div className='flex flex-col items-center gap-2 opacity-60'>
            <IconGeneral icon='construction' fill={0} className='[--icon-size:2.5rem]' />
            <p>Em construção</p>
          </div>
        </div>
      )}
    </section>
  );
}

function ExecutionsTable({ executions }: { executions: ExecutionReport[] }) {
  return (
    <div className='min-h-0 flex-1 overflow-y-auto rounded-xl border border-white/10'>
      <table className='w-full border-collapse text-left'>
        <thead className='sticky top-0 bg-[var(--bg-2)] text-sm'>
          <tr className='[&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold'>
            <th className='w-12'>#</th>
            <th>Nome do Programa</th>
            <th>Início da Execução</th>
            <th>Duração</th>
            <th>Status</th>
            <th className='w-12' />
          </tr>
        </thead>
        <tbody>
          {executions.map((exec, i) => (
            <tr key={exec.id} className='border-t border-white/10 [&>td]:px-4 [&>td]:py-3'>
              <td className='tabular-nums opacity-70'>{i + 1}</td>
              <td className='font-medium'>{exec.programName}</td>
              <td className='tabular-nums opacity-80'>{exec.startedAt}</td>
              <td className='tabular-nums opacity-80'>{exec.duration}</td>
              <td>
                <StatusBadge status={exec.status} />
              </td>
              <td>
                <button
                  type='button'
                  aria-label='Ver gráfico da execução'
                  className='btn-press grid size-9 cursor-pointer place-items-center rounded-lg text-[var(--brand)] hover:bg-white/10'
                >
                  <IconGeneral icon='monitoring' fill={0} className='[--icon-size:1.25rem]' />
                </button>
              </td>
            </tr>
          ))}
          {executions.length === 0 && (
            <tr>
              <td colSpan={6} className='px-4 py-6 text-center opacity-60'>
                Nenhuma execução encontrada.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: ExecutionReport["status"] }) {
  const ok = status === "Concluído";
  return (
    <span className={clsx("inline-flex items-center gap-1.5 font-medium", ok ? "text-emerald-400" : "text-red-400")}>
      <IconGeneral icon={ok ? "check_circle" : "cancel"} fill={1} className='[--icon-size:1.25rem]' />
      {status}
    </span>
  );
}
