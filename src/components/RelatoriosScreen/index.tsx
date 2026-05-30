"use client";

import { clsx } from "clsx";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DatePicker } from "@/components/DatePicker";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { Pagination } from "@/components/Pagination";
import { SelectMenu, type ISelectOption } from "@/components/SelectMenu";
import { TableScrollBox } from "@/components/TableScrollBox";
import type { ChangeLogEntry, ErrorLogEntry, ExecutionReport } from "@/lib/reports";
import { ApiError } from "@/lib/api";
import { fetchChangeDetail, fetchChanges, fetchErrorDetail, fetchErrors, fetchExecutionDetail, fetchExecutions } from "@/lib/reportsClient";
import { showToast } from "@/lib/toast";
import { ActionBadge, SeverityBadge, StatusBadge } from "./badges";
import { ChangeDetail } from "./ChangeDetail";
import { ErrorDetail } from "./ErrorDetail";
import { ExecutionDetail } from "./ExecutionDetail";

type Tab = "execucoes" | "alteracoes" | "erros";

// Approx. heights used to compute how many rows fit per page (so the table paginates instead
// of scrolling). Kept a touch generous so a partial row never forces a scrollbar.
const HEADER_H = 46;
const ROW_H = 50;
// Smallest page size. On the 1024×600 device the area only fits ~1 row, so we show a block of
// this many with internal scroll; larger screens fit more and paginate without scroll.
const MIN_ROWS_PER_PAGE = 6;

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

export function RelatoriosScreen() {
  const [executions, setExecutions] = useState<ExecutionReport[]>([]);
  const [changes, setChanges] = useState<ChangeLogEntry[]>([]);
  const [errors, setErrors] = useState<ErrorLogEntry[]>([]);

  useEffect(() => {
    Promise.all([fetchExecutions().then(setExecutions), fetchChanges().then(setChanges), fetchErrors().then(setErrors)]).catch((e) =>
      showToast(e instanceof ApiError ? e.message : "Falha ao carregar os relatórios")
    );
  }, []);

  const [tab, setTab] = useState<Tab>("execucoes");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(0);
  const tableAreaRef = useRef<HTMLDivElement>(null);
  const [areaH, setAreaH] = useState(0);
  // A selected row opens a full-area detail overlay (execução/erro) or a modal (alteração);
  // both keep the underlying table state (tab/filter/page) intact.
  const [detail, setDetail] = useState<{ kind: "exec"; data: ExecutionReport } | { kind: "error"; data: ErrorLogEntry } | null>(null);
  const [change, setChange] = useState<ChangeLogEntry | null>(null);
  const [changeOpen, setChangeOpen] = useState(false);
  const openChange = (c: ChangeLogEntry) => {
    fetchChangeDetail(c.id)
      .then((full) => setChange(full))
      .catch(() => setChange(c))
      .finally(() => setChangeOpen(true));
  };
  const openExec = (exec: ExecutionReport) =>
    void fetchExecutionDetail(exec.id)
      .then((full) => setDetail({ kind: "exec", data: full }))
      .catch(() => setDetail({ kind: "exec", data: exec }));
  const openError = (err: ErrorLogEntry) =>
    void fetchErrorDetail(err.id)
      .then((full) => setDetail({ kind: "error", data: full }))
      .catch(() => setDetail({ kind: "error", data: err }));

  // Measure the table area so we can paginate by the number of rows that fit (no scrollbar),
  // mirroring how the program gallery/cards fill their space.
  useEffect(() => {
    const el = tableAreaRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setAreaH(rect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const q = query.trim().toLowerCase();

  const visibleExecutions = executions.filter(
    (e) => inRange(e.startedAt, startDate, endDate) && (filter === "all" || e.status === filter) && (!q || e.programName.toLowerCase().includes(q))
  );
  const visibleChanges = changes.filter(
    (c) => inRange(c.at, startDate, endDate) && (filter === "all" || c.action === filter) && (!q || c.target.toLowerCase().includes(q))
  );
  const visibleErrors = errors.filter(
    (x) =>
      inRange(x.at, startDate, endDate) && (filter === "all" || x.severity === filter) && (!q || `${x.code} ${x.message}`.toLowerCase().includes(q))
  );

  const count = tab === "execucoes" ? visibleExecutions.length : tab === "alteracoes" ? visibleChanges.length : visibleErrors.length;
  // Rows that fit the measured area; on a small area (1024×600) we still show a full block,
  // which then scrolls internally. Larger areas fit more, so they paginate without scrolling.
  const fit = Math.max(1, Math.floor((areaH - HEADER_H) / ROW_H));
  const perPage = Math.max(MIN_ROWS_PER_PAGE, fit);
  const pages = Math.max(1, Math.ceil(count / perPage));
  const activePage = Math.min(page, pages - 1);
  const start = activePage * perPage;

  // The "Filtrar por..." options are tab-specific, so reset it (and the search) on tab change.
  const switchTab = (id: Tab) => {
    setTab(id);
    setQuery("");
    setFilter("all");
    setPage(0);
  };

  return (
    <section className='card relative flex h-full flex-col gap-5 rounded-xl p-[clamp(1rem,2vw,1.5rem)]'>
      <header className='flex items-center justify-between gap-4 border-b border-[var(--border)] pb-3'>
        <h1 className='text-2xl font-semibold'>Relatórios</h1>
        <Link
          href='/'
          aria-label='Fechar'
          className='btn-press grid size-10 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-[var(--hover)]'
        >
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
              tab === id ? "btn-link-active" : "hover:bg-[var(--hover)]"
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
            setPage(0);
          }}
        />
        <span className='opacity-60'>—</span>
        <DatePicker
          label='Data final'
          value={endDate}
          min={startDate}
          max={TODAY_ISO}
          onChange={(iso) => {
            setEndDate(iso);
            setPage(0);
          }}
        />
        <label className='flex flex-1 items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5'>
          <IconGeneral icon='search' fill={0} className='shrink-0 opacity-70 [--icon-size:1.25rem]' />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder={SEARCH_PLACEHOLDER[tab]}
            className='w-full bg-transparent outline-none placeholder:opacity-60'
          />
        </label>
        <SelectMenu
          icon='filter_list'
          options={FILTERS[tab]}
          value={filter}
          onChange={(v) => {
            setFilter(v);
            setPage(0);
          }}
          className='min-w-[13rem]'
        />
      </div>

      {/* Content: one page of rows, sized to the measured area so it paginates instead of scrolling */}
      <div ref={tableAreaRef} className='min-h-0 flex-1'>
        {tab === "execucoes" && (
          <ExecutionsTable executions={visibleExecutions.slice(start, start + perPage)} startIndex={start} onOpen={openExec} />
        )}
        {tab === "alteracoes" && <ChangesTable changes={visibleChanges.slice(start, start + perPage)} startIndex={start} onOpen={openChange} />}
        {tab === "erros" && (
          <ErrorsTable errors={visibleErrors.slice(start, start + perPage)} startIndex={start} onOpen={openError} />
        )}
      </div>

      {/* Footer: record count on the left, pagination centered */}
      <footer className='grid grid-cols-[1fr_auto_1fr] items-center gap-4'>
        <span className='text-sm opacity-70'>{`${count} registro${count === 1 ? "" : "s"}`}</span>
        <Pagination pages={pages} active={activePage} onChange={setPage} />
        <span />
      </footer>

      {/* Full-area detail overlay for an execução/erro (covers the content, keeps it mounted) */}
      {detail && (
        <div className='card absolute inset-0 z-20 flex flex-col rounded-xl p-[clamp(1rem,2vw,1.5rem)]'>
          {detail.kind === "exec" ? (
            <ExecutionDetail exec={detail.data} onClose={() => setDetail(null)} />
          ) : (
            <ErrorDetail err={detail.data} onClose={() => setDetail(null)} />
          )}
        </div>
      )}

      {/* Change detail (modal) */}
      <ChangeDetail change={change} open={changeOpen} onClose={() => setChangeOpen(false)} />
    </section>
  );
}

/** Bordered wrapper shared by the report tables; fills the measured table area. */
function TableShell({ children }: { children: React.ReactNode }) {
  return (
    <TableScrollBox>
      <table className='w-full border-collapse text-left'>{children}</table>
    </TableScrollBox>
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

function ExecutionsTable({
  executions,
  startIndex,
  onOpen,
}: {
  executions: ExecutionReport[];
  startIndex: number;
  onOpen: (_exec: ExecutionReport) => void;
}) {
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
          <tr key={exec.id} className='border-t border-[var(--border)] [&>td]:px-4 [&>td]:py-3'>
            <td className='tabular-nums opacity-70'>{startIndex + i + 1}</td>
            <td className='font-medium'>{exec.programName}</td>
            <td className='tabular-nums opacity-80'>{exec.startedAt}</td>
            <td className='tabular-nums opacity-80'>{exec.duration}</td>
            <td>
              <StatusBadge status={exec.status} />
            </td>
            <td>
              <button
                type='button'
                onClick={() => onOpen(exec)}
                aria-label='Ver detalhe da execução'
                className='btn-press grid size-10 cursor-pointer place-items-center rounded-lg text-[var(--brand)] hover:bg-[var(--hover)]'
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

function ChangesTable({ changes, startIndex, onOpen }: { changes: ChangeLogEntry[]; startIndex: number; onOpen: (_change: ChangeLogEntry) => void }) {
  return (
    <TableShell>
      <thead className='sticky top-0 z-10 text-sm'>
        <tr className='[&>th]:bg-[var(--bg-2)] [&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold'>
          <th className='w-12'>#</th>
          <th>Data / Hora</th>
          <th>Ação</th>
          <th>Item</th>
          <th>Usuário</th>
          <th className='w-12' />
        </tr>
      </thead>
      <tbody>
        {changes.map((change, i) => (
          <tr key={change.id} className='border-t border-[var(--border)] [&>td]:px-4 [&>td]:py-3'>
            <td className='tabular-nums opacity-70'>{startIndex + i + 1}</td>
            <td className='tabular-nums opacity-80'>{change.at}</td>
            <td>
              <ActionBadge action={change.action} />
            </td>
            <td className='font-medium'>{change.target}</td>
            <td className='opacity-80'>{change.user}</td>
            <td>
              <DetailButton label='Ver detalhe da alteração' onClick={() => onOpen(change)} />
            </td>
          </tr>
        ))}
        {changes.length === 0 && <EmptyRow colSpan={6} label='Nenhuma alteração encontrada.' />}
      </tbody>
    </TableShell>
  );
}

function ErrorsTable({ errors, startIndex, onOpen }: { errors: ErrorLogEntry[]; startIndex: number; onOpen: (_err: ErrorLogEntry) => void }) {
  return (
    <TableShell>
      <thead className='sticky top-0 z-10 text-sm'>
        <tr className='[&>th]:bg-[var(--bg-2)] [&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold'>
          <th className='w-12'>#</th>
          <th>Data / Hora</th>
          <th>Severidade</th>
          <th>Código</th>
          <th>Descrição</th>
          <th className='w-12' />
        </tr>
      </thead>
      <tbody>
        {errors.map((err, i) => (
          <tr key={err.id} className='border-t border-[var(--border)] [&>td]:px-4 [&>td]:py-3'>
            <td className='tabular-nums opacity-70'>{startIndex + i + 1}</td>
            <td className='tabular-nums opacity-80'>{err.at}</td>
            <td>
              <SeverityBadge severity={err.severity} />
            </td>
            <td className='tabular-nums opacity-80'>{err.code}</td>
            <td>{err.message}</td>
            <td>
              <DetailButton label='Ver detalhe do erro' onClick={() => onOpen(err)} />
            </td>
          </tr>
        ))}
        {errors.length === 0 && <EmptyRow colSpan={6} label='Nenhum erro encontrado.' />}
      </tbody>
    </TableShell>
  );
}

/** Trailing "see detail" icon button shared by the Alterações/Erros rows. */
function DetailButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type='button'
      onClick={onClick}
      aria-label={label}
      className='btn-press grid size-10 cursor-pointer place-items-center rounded-lg text-[var(--brand)] hover:bg-[var(--hover)]'
    >
      <IconGeneral icon='visibility' fill={0} className='[--icon-size:1.5rem]' />
    </button>
  );
}
