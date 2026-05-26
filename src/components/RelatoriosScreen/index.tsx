"use client";

import { clsx } from "clsx";
import Link from "next/link";
import { useState } from "react";
import { DatePicker } from "@/components/DatePicker";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { SelectMenu, type ISelectOption } from "@/components/SelectMenu";
import type { ChangeAction, ChangeLogEntry, ErrorLogEntry, ErrorSeverity, ExecutionReport } from "@/lib/reports";

type Tab = "execucoes" | "alteracoes" | "erros";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "execucoes", label: "Execuções", icon: "history" },
  { id: "alteracoes", label: "Alterações", icon: "edit_note" },
  { id: "erros", label: "Erros", icon: "error" },
];

/** "Filtrar por..." options per tab (the second filter, on top of search + date range). */
const FILTERS: Record<Tab, ISelectOption<string>[]> = {
  execucoes: [
    { value: "all", label: "Todos os status", icon: "list" },
    { value: "Concluído", label: "Concluído", icon: "check_circle" },
    { value: "Falha", label: "Falha", icon: "cancel" },
  ],
  alteracoes: [
    { value: "all", label: "Todas as ações", icon: "list" },
    { value: "Criado", label: "Criado", icon: "add_circle" },
    { value: "Editado", label: "Editado", icon: "edit" },
    { value: "Removido", label: "Removido", icon: "delete" },
  ],
  erros: [
    { value: "all", label: "Todas as severidades", icon: "list" },
    { value: "Crítico", label: "Crítico", icon: "error" },
    { value: "Alerta", label: "Alerta", icon: "warning" },
    { value: "Aviso", label: "Aviso", icon: "info" },
  ],
};

const SEARCH_PLACEHOLDER: Record<Tab, string> = {
  execucoes: "Pesquisar programa...",
  alteracoes: "Pesquisar item...",
  erros: "Pesquisar erro...",
};

/** "dd/mm/aa - HH:MM:SS" -> "20aa-mm-dd" so a date range can be compared as ISO strings. */
function dateISO(formatted: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{2})/.exec(formatted);
  return m ? `20${m[3]}-${m[2]}-${m[1]}` : "";
}

function inRange(formatted: string, start: string, end: string): boolean {
  const iso = dateISO(formatted);
  if (!iso) return true;
  if (start && iso < start) return false;
  if (end && iso > end) return false;
  return true;
}

/** Today as ISO "yyyy-mm-dd" (computed once) — caps the date filters at the present. */
const TODAY_ISO = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
})();

export function RelatoriosScreen({
  executions,
  changes,
  errors,
}: {
  executions: ExecutionReport[];
  changes: ChangeLogEntry[];
  errors: ErrorLogEntry[];
}) {
  const [tab, setTab] = useState<Tab>("execucoes");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const q = query.trim().toLowerCase();

  const visibleExecutions = executions.filter(
    (e) => inRange(e.startedAt, startDate, endDate) && (filter === "all" || e.status === filter) && (!q || e.programName.toLowerCase().includes(q))
  );
  const visibleChanges = changes.filter(
    (c) => inRange(c.at, startDate, endDate) && (filter === "all" || c.action === filter) && (!q || c.target.toLowerCase().includes(q))
  );
  const visibleErrors = errors.filter(
    (x) => inRange(x.at, startDate, endDate) && (filter === "all" || x.severity === filter) && (!q || `${x.code} ${x.message}`.toLowerCase().includes(q))
  );

  // The "Filtrar por..." options are tab-specific, so reset it (and the search) on tab change.
  const switchTab = (id: Tab) => {
    setTab(id);
    setQuery("");
    setFilter("all");
  };

  return (
    <section className='card flex h-full flex-col gap-5 rounded-xl p-[clamp(1rem,2vw,1.5rem)]'>
      <header className='flex items-center justify-between gap-4 border-b border-white/10 pb-3'>
        <h1 className='text-2xl font-semibold'>Relatórios</h1>
        <Link href='/' aria-label='Fechar' className='btn-press grid size-10 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-white/10'>
          <IconGeneral icon='close' fill={0} className='[--icon-size:1.75rem]' />
        </Link>
      </header>

      {/* Tabs */}
      <nav className='flex flex-wrap gap-2'>
        {TABS.map(({ id, label, icon }) => (
          <button
            key={id}
            type='button'
            onClick={() => switchTab(id)}
            aria-current={tab === id ? "page" : undefined}
            className={clsx(
              "flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 font-semibold transition-colors",
              tab === id ? "btn-link-active" : "hover:bg-white/10"
            )}
          >
            <IconGeneral icon={icon} fill={0} className='[--icon-size:1.25rem]' />
            {label}
          </button>
        ))}
      </nav>

      {/* Filters: date range + search + the per-tab "Filtrar por..." */}
      <div className='flex flex-wrap items-center gap-3'>
        <DatePicker
          label='Data inicial'
          value={startDate}
          max={TODAY_ISO}
          onChange={(iso) => {
            setStartDate(iso);
            if (iso && endDate && endDate < iso) setEndDate("");
          }}
        />
        <span className='opacity-60'>—</span>
        <DatePicker label='Data final' value={endDate} min={startDate} max={TODAY_ISO} onChange={setEndDate} />
        <label className='flex flex-1 items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5'>
          <IconGeneral icon='search' fill={0} className='shrink-0 opacity-70 [--icon-size:1.25rem]' />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={SEARCH_PLACEHOLDER[tab]}
            className='w-full bg-transparent outline-none placeholder:opacity-60'
          />
        </label>
        <SelectMenu icon='filter_list' options={FILTERS[tab]} value={filter} onChange={setFilter} className='min-w-[13rem]' />
      </div>

      {/* Content */}
      {tab === "execucoes" && <ExecutionsTable executions={visibleExecutions} />}
      {tab === "alteracoes" && <ChangesTable changes={visibleChanges} />}
      {tab === "erros" && <ErrorsTable errors={visibleErrors} />}
    </section>
  );
}

/** Scrollable bordered wrapper shared by the report tables. */
function TableShell({ children }: { children: React.ReactNode }) {
  return (
    <div className='min-h-0 flex-1 overflow-y-auto rounded-xl border border-white/10'>
      <table className='w-full border-collapse text-left'>{children}</table>
    </div>
  );
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className='px-4 py-6 text-center opacity-60'>
        {label}
      </td>
    </tr>
  );
}

function ExecutionsTable({ executions }: { executions: ExecutionReport[] }) {
  return (
    <TableShell>
      <thead className='sticky top-0 z-10 text-sm'>
        <tr className='[&>th]:bg-[var(--bg-2)] [&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold'>
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
                className='btn-press grid size-10 cursor-pointer place-items-center rounded-lg text-[var(--brand)] hover:bg-white/10'
              >
                <IconGeneral icon='monitoring' fill={0} className='[--icon-size:1.5rem]' />
              </button>
            </td>
          </tr>
        ))}
        {executions.length === 0 && <EmptyRow colSpan={6} label='Nenhuma execução encontrada.' />}
      </tbody>
    </TableShell>
  );
}

function ChangesTable({ changes }: { changes: ChangeLogEntry[] }) {
  return (
    <TableShell>
      <thead className='sticky top-0 z-10 text-sm'>
        <tr className='[&>th]:bg-[var(--bg-2)] [&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold'>
          <th className='w-12'>#</th>
          <th>Data / Hora</th>
          <th>Ação</th>
          <th>Item</th>
          <th>Usuário</th>
        </tr>
      </thead>
      <tbody>
        {changes.map((change, i) => (
          <tr key={change.id} className='border-t border-white/10 [&>td]:px-4 [&>td]:py-3'>
            <td className='tabular-nums opacity-70'>{i + 1}</td>
            <td className='tabular-nums opacity-80'>{change.at}</td>
            <td>
              <ActionBadge action={change.action} />
            </td>
            <td className='font-medium'>{change.target}</td>
            <td className='opacity-80'>{change.user}</td>
          </tr>
        ))}
        {changes.length === 0 && <EmptyRow colSpan={5} label='Nenhuma alteração encontrada.' />}
      </tbody>
    </TableShell>
  );
}

function ErrorsTable({ errors }: { errors: ErrorLogEntry[] }) {
  return (
    <TableShell>
      <thead className='sticky top-0 z-10 text-sm'>
        <tr className='[&>th]:bg-[var(--bg-2)] [&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold'>
          <th className='w-12'>#</th>
          <th>Data / Hora</th>
          <th>Severidade</th>
          <th>Código</th>
          <th>Descrição</th>
        </tr>
      </thead>
      <tbody>
        {errors.map((err, i) => (
          <tr key={err.id} className='border-t border-white/10 [&>td]:px-4 [&>td]:py-3'>
            <td className='tabular-nums opacity-70'>{i + 1}</td>
            <td className='tabular-nums opacity-80'>{err.at}</td>
            <td>
              <SeverityBadge severity={err.severity} />
            </td>
            <td className='tabular-nums opacity-80'>{err.code}</td>
            <td>{err.message}</td>
          </tr>
        ))}
        {errors.length === 0 && <EmptyRow colSpan={5} label='Nenhum erro encontrado.' />}
      </tbody>
    </TableShell>
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

const ACTION_STYLE: Record<ChangeAction, { icon: string; cls: string }> = {
  Criado: { icon: "add_circle", cls: "text-emerald-400" },
  Editado: { icon: "edit", cls: "text-[var(--brand)]" },
  Removido: { icon: "delete", cls: "text-red-400" },
};

function ActionBadge({ action }: { action: ChangeAction }) {
  const style = ACTION_STYLE[action];
  return (
    <span className={clsx("inline-flex items-center gap-1.5 font-medium", style.cls)}>
      <IconGeneral icon={style.icon} fill={1} className='[--icon-size:1.25rem]' />
      {action}
    </span>
  );
}

const SEVERITY_STYLE: Record<ErrorSeverity, { icon: string; cls: string }> = {
  Crítico: { icon: "error", cls: "text-red-400" },
  Alerta: { icon: "warning", cls: "text-amber-400" },
  Aviso: { icon: "info", cls: "text-[var(--brand)]" },
};

function SeverityBadge({ severity }: { severity: ErrorSeverity }) {
  const style = SEVERITY_STYLE[severity];
  return (
    <span className={clsx("inline-flex items-center gap-1.5 font-medium", style.cls)}>
      <IconGeneral icon={style.icon} fill={1} className='[--icon-size:1.25rem]' />
      {severity}
    </span>
  );
}
