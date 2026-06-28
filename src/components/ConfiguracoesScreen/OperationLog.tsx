"use client";

import { clsx } from "clsx";
import { useEffect, useState } from "react";
import { DatePicker } from "@/components/DatePicker";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { Pagination } from "@/components/Pagination";
import { TableScrollBox } from "@/components/TableScrollBox";
import { api, ApiError, type OperationCategory, type OperationLogEntryDto, type OperationLogQuery } from "@/lib/api";
import { OPERATION_LOG_PAGE_SIZE } from "@/lib/limits";
import { showToast } from "@/lib/toast";

/** Category chips — the user's "separar por tipos". "Tudo" = no filter; the rest are the backend
 *  OperationCategory values (the wire literal drives `?category=`, the label is pt-BR). */
const CATEGORIES: { value: OperationCategory | "all"; label: string; icon: string }[] = [
  { value: "all", label: "Tudo", icon: "list" },
  { value: "Execucao", label: "Execução", icon: "play_circle" },
  { value: "Alteracao", label: "Alteração", icon: "edit" },
  { value: "Usuario", label: "Usuário", icon: "person" },
  { value: "Erro", label: "Erro", icon: "error" },
  { value: "Comunicacao", label: "Comunicação", icon: "lan" },
  { value: "Falha", label: "Falha", icon: "warning" },
  { value: "Calibracao", label: "Calibração", icon: "tune" },
  { value: "Manutencao", label: "Manutenção", icon: "build" },
];

/** pt-BR labels for the accent-free wire enums (TIPO / OBJETO columns). */
const TYPE_LABEL: Record<string, string> = {
  Criacao: "Criação",
  Alteracao: "Alteração",
  Remocao: "Remoção",
  Execucao: "Execução",
  Erro: "Erro",
  Comunicacao: "Comunicação",
  Login: "Login",
  Logout: "Logout",
  Calibracao: "Calibração",
  Limpeza: "Limpeza",
  ResetFabrica: "Reset de fábrica",
};
const OBJECT_LABEL: Record<string, string> = {
  Programa: "Programa",
  Execucao: "Execução",
  Falha: "Falha",
  Usuario: "Usuário",
  Configuracao: "Configuração",
  Controlador: "Controlador",
  Sessao: "Sessão",
  Sistema: "Sistema",
};

const pad = (n: number) => String(n).padStart(2, "0");
const fmtStamp = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

/** Today as ISO "yyyy-mm-dd" — caps the date filters at the present (same convention as Relatórios). */
const TODAY_ISO = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
})();

/** Widen a date-only bound to a raw timestamp so the backend's `>=`/`<=` stays inclusive (a `to` of
 *  "yyyy-mm-dd" must reach end-of-day). Empty -> undefined. Mirrors the Relatórios date filter. */
const fromTs = (d: string) => (d ? `${d}T00:00:00` : undefined);
const toTs = (d: string) => (d ? `${d}T23:59:59.999` : undefined);

/**
 * Diagnóstico → Log: the Master-only audit trail ("Log de Operação"), mirroring the print's
 * DATA · OPERADOR · TIPO · OBJETO · OBJETO ID · DADOS table. Replaces the old system/browser log.
 * Server-paged (volume) and filtered by category ("Tudo" = no filter). The endpoint is Master-only;
 * the Log sub-tab already gates on that.
 */
export function OperationLog() {
  const [category, setCategory] = useState<OperationCategory | "all">("all");
  const [startDate, setStartDate] = useState(""); // ISO "yyyy-mm-dd" (or "") — período filter
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(0); // 0-based, for the Pagination component
  const [rows, setRows] = useState<OperationLogEntryDto[]>([]);
  const [total, setTotal] = useState(0);
  const [failed, setFailed] = useState(false);

  const pages = Math.max(1, Math.ceil(total / OPERATION_LOG_PAGE_SIZE));
  const activePage = Math.min(page, pages - 1);

  useEffect(() => {
    let alive = true;
    const q: OperationLogQuery = {
      page: activePage + 1, // backend is 1-based
      pageSize: OPERATION_LOG_PAGE_SIZE,
      category: category === "all" ? undefined : category,
      from: fromTs(startDate),
      to: toTs(endDate),
    };
    api
      .operationLog(q)
      .then((res) => {
        if (!alive) return;
        setRows(res.items);
        setTotal(res.total);
        setFailed(false);
      })
      .catch((e) => {
        if (!alive) return;
        setFailed(true);
        showToast(e instanceof ApiError ? e.message : "Falha ao carregar o log de operação", "error");
      });
    return () => {
      alive = false;
    };
  }, [category, activePage, startDate, endDate]);

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-3'>
      {/* Período (date range) — same filter pattern as the Relatórios; narrows the whole server-paged
          set, not just the current page. "Data final" widens to end-of-day so it stays inclusive. */}
      <div className='flex shrink-0 flex-wrap items-center gap-3'>
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
      </div>

      {/* Category chips — "separar por tipos". Single non-wrapping row (scrolls if it overflows) so it
          costs one chrome row, not two, on the 1024×600 device. */}
      <div className='flex shrink-0 gap-1 overflow-x-auto pb-0.5'>
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            type='button'
            onClick={() => {
              setCategory(c.value);
              setPage(0);
            }}
            aria-current={category === c.value ? "page" : undefined}
            className={clsx(
              "btn-press flex shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors",
              category === c.value ? "bg-(--brand)/15 text-(--brand)" : "border border-(--border) hover:bg-(--hover)"
            )}
          >
            <IconGeneral icon={c.icon} fill={category === c.value ? 1 : 0} className='[--icon-size:0.95rem]' />
            {c.label}
          </button>
        ))}
      </div>

      {/* DATA · OPERADOR · TIPO · OBJETO · OBJETO ID · DADOS */}
      <TableScrollBox className='min-h-0 flex-1'>
        <table className='w-full table-fixed border-collapse text-left text-sm'>
          <thead className='sticky top-0 z-10'>
            <tr className='[&>th]:bg-(--bg-2) [&>th]:px-3 [&>th]:py-2 [&>th]:font-semibold [&>th]:whitespace-nowrap'>
              <th className='w-40'>Data</th>
              <th>Operador</th>
              <th>Tipo</th>
              <th>Objeto</th>
              <th>Objeto ID</th>
              <th className='w-[34%]'>Dados</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className='border-t border-(--border) align-top [&>td]:px-3 [&>td]:py-2'>
                <td className='tabular-nums whitespace-nowrap opacity-80'>{fmtStamp(r.at)}</td>
                <td className={clsx("wrap-break-word", r.operatorName === "Sistema" ? "italic opacity-60" : "font-medium")} title={r.operatorName}>
                  {r.operatorName}
                </td>
                <td className='wrap-break-word' title={TYPE_LABEL[r.type] ?? r.type}>
                  {TYPE_LABEL[r.type] ?? r.type}
                </td>
                <td className='wrap-break-word opacity-80' title={OBJECT_LABEL[r.object] ?? r.object}>
                  {OBJECT_LABEL[r.object] ?? r.object}
                </td>
                <td className='font-mono text-xs break-all opacity-60' title={r.objectId ?? undefined}>
                  {r.objectId ?? "—"}
                </td>
                <td>
                  <DataCell data={r.data} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className='px-3 py-6 text-center opacity-60'>
                  {failed ? "Não foi possível carregar o log de operação." : "Nenhum registro."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableScrollBox>

      {/* Pagination — obrigatória (volume de dados) */}
      <div className='flex shrink-0 items-center justify-between gap-3'>
        <span className='tabular-nums text-sm opacity-70'>{`${total} registro${total === 1 ? "" : "s"}`}</span>
        <Pagination pages={pages} active={activePage} onChange={setPage} />
        <span className='w-24 shrink-0' />
      </div>
    </div>
  );
}

/** The DADOS column: each field as a mono pill + its value — "antes → depois" when both exist, else the value. */
function DataCell({ data }: { data: OperationLogEntryDto["data"] }) {
  if (!data || data.length === 0) return <span className='opacity-40'>—</span>;
  return (
    <div className='flex min-w-0 flex-col gap-1'>
      {data.map((f, i) => {
        const changed = f.before != null && f.before !== "";
        return (
          <div key={i} className='flex flex-wrap items-baseline gap-1.5'>
            <span className='shrink-0 rounded bg-(--surface-2) px-1.5 py-0.5 font-mono text-xs'>{f.field}</span>
            {changed ? (
              <span className='inline-flex flex-wrap items-baseline gap-1'>
                <span className='font-mono text-xs break-all text-red-700/90 line-through dark:text-red-300/90'>{f.before}</span>
                <span className='opacity-40'>→</span>
                <span className='font-mono text-xs break-all text-emerald-700 dark:text-emerald-300'>{f.after ?? "—"}</span>
              </span>
            ) : (
              <span className='font-mono text-xs break-all opacity-80'>{f.after ?? "—"}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
