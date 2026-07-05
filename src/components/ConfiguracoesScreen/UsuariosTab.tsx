"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DatePicker } from "@/components/DatePicker";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { Pagination } from "@/components/Pagination";
import { SelectMenu, type ISelectOption } from "@/components/SelectMenu";
import { SkeletonRows } from "@/components/Skeleton";
import { TableScrollBox } from "@/components/TableScrollBox";
import { useSession } from "@/hooks/useSession";
import { useStore } from "@/hooks/useStore";
import { ApiError } from "@/lib/api";
import { showToast } from "@/lib/toast";
import { reloadUsers, removeUser, type User, usersStore } from "@/lib/users";
import { UserCreateModal } from "./UserCreateModal";
import { UserDetailModal } from "./UserDetailModal";
import { UserEditModal } from "./UserEditModal";
import { UserStatusBadge } from "./userBadges";

const HEADER_H = 46;
const ROW_H = 50;
const MIN_ROWS_PER_PAGE = 6;

type Filter = "all" | "Ativo" | "Inativo" | "Admin" | "Regular";

const FILTER_OPTIONS: ISelectOption<Filter>[] = [
  { value: "all", label: "Todos os usuários", icon: "group" },
  { value: "Ativo", label: "Ativos", icon: "check_circle" },
  { value: "Inativo", label: "Inativos", icon: "do_not_disturb_on" },
  { value: "Admin", label: "Admin", icon: "shield_person" },
  { value: "Regular", label: "Regular", icon: "person" },
];

const TODAY_ISO = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
})();

/** "dd/mm/aa - HH:MM" -> "20aa-mm-dd" for ISO range comparison. */
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

/** Usuários tab: searchable/filterable, paginated user table with detail/edit/delete actions. */
export function UsuariosTab() {
  const users = useStore(usersStore);
  // You can never delete your own account — hide the action on the signed-in user's own row.
  const selfId = useSession()?.id;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(0);
  const tableAreaRef = useRef<HTMLDivElement>(null);
  const [areaH, setAreaH] = useState(0);

  // Detail / edit / delete dialogs (the target is kept while closing so content stays during fade).
  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // Distinguish a load error from a genuinely empty list (see the empty-state message + OperationLog:203).
  const [failed, setFailed] = useState(false);

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

  // Refetch on mount so the list (and each row's `canDelete` flag) is current — usersStore is a
  // load-once cache that could otherwise keep stale rows (e.g. missing canDelete) from an earlier session.
  useEffect(() => {
    reloadUsers()
      .then(() => setFailed(false))
      .catch((e) => {
        setFailed(true);
        showToast(e instanceof ApiError ? e.message : "Falha ao carregar os usuários", "error");
      })
      .finally(() => setLoaded(true));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (filter === "Ativo" || filter === "Inativo") {
        if (u.status !== filter) return false;
      } else if (filter === "Admin" || filter === "Regular") {
        if (u.type !== filter) return false;
      }
      if (!inRange(u.lastLogin, startDate, endDate)) return false;
      return q ? u.name.toLowerCase().includes(q) : true;
    });
  }, [users, query, filter, startDate, endDate]);

  const fit = Math.max(1, Math.floor((areaH - HEADER_H) / ROW_H));
  const perPage = Math.max(MIN_ROWS_PER_PAGE, fit);
  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const activePage = Math.min(page, pages - 1);
  const start = activePage * perPage;
  const shown = filtered.slice(start, start + perPage);

  const openDetail = (u: User) => {
    setDetailUser(u);
    setDetailOpen(true);
  };
  const openEdit = (u: User) => {
    setEditUser(u);
    setEditOpen(true);
  };
  const openDelete = (u: User) => {
    setDeleteUser(u);
    setDeleteOpen(true);
  };

  return (
    <div className='flex h-full min-h-0 flex-col gap-5'>
      {/* Filters: date range + search + filter */}
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
        <label className='flex flex-1 items-center gap-2 rounded-xl border border-(--border) px-4 py-2.5'>
          <IconGeneral icon='search' fill={0} className='shrink-0 opacity-70 [--icon-size:1.25rem]' />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder='Pesquisar usuário...'
            className='w-full bg-transparent outline-none placeholder:opacity-60'
          />
        </label>
        <SelectMenu
          icon='filter_list'
          options={FILTER_OPTIONS}
          value={filter}
          onChange={(v) => {
            setFilter(v);
            setPage(0);
          }}
          className='min-w-[13.5rem]'
        />
      </div>

      {/* Table */}
      <div ref={tableAreaRef} className='min-h-0 flex-1'>
        <TableScrollBox>
          <table className='w-full border-collapse text-left'>
            <thead className='sticky top-0 z-10 text-sm'>
              <tr className='[&>th]:bg-(--bg-2) [&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold'>
                <th className='w-12'>#</th>
                <th>Usuário</th>
                <th>Tipo de Usuário</th>
                <th>Status</th>
                <th>Último Login</th>
                <th className='w-32' />
              </tr>
            </thead>
            <tbody>
              {shown.map((u, i) => (
                <tr key={u.id} className='border-t border-(--border) [&>td]:px-4 [&>td]:py-3'>
                  <td className='tabular-nums opacity-70'>{start + i + 1}</td>
                  <td className='font-medium'>{u.name}</td>
                  <td className='opacity-80'>{u.type}</td>
                  <td>
                    <UserStatusBadge status={u.status} />
                  </td>
                  <td className='tabular-nums opacity-80'>{u.lastLogin}</td>
                  <td>
                    <div className='flex items-center justify-end gap-1 text-(--brand)'>
                      <RowAction icon='visibility' label={`Detalhe de ${u.name}`} onClick={() => openDetail(u)} />
                      <RowAction icon='edit' label={`Editar ${u.name}`} onClick={() => openEdit(u)} />
                      {u.canDelete && u.id !== selfId && <RowAction icon='delete' label={`Remover ${u.name}`} onClick={() => openDelete(u)} danger />}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 &&
                (loaded ? (
                  <tr>
                    <td colSpan={6} className='px-4 py-6 text-center opacity-60'>
                      {failed ? "Não foi possível carregar os usuários." : "Nenhum usuário encontrado."}
                    </td>
                  </tr>
                ) : (
                  <SkeletonRows cols={6} />
                ))}
            </tbody>
          </table>
        </TableScrollBox>
      </div>

      {/* Footer: count + pagination */}
      <footer className='grid grid-cols-[1fr_auto_1fr] items-center gap-4'>
        <span className='text-sm opacity-70'>{`${filtered.length} usuário${filtered.length === 1 ? "" : "s"}`}</span>
        <Pagination pages={pages} active={activePage} onChange={setPage} />
        <button
          type='button'
          onClick={() => setCreateOpen(true)}
          className='btn-action flex cursor-pointer items-center gap-2 justify-self-end rounded-xl px-4 py-2.5 font-semibold'
        >
          <IconGeneral icon='person_add' fill={0} className='[--icon-size:1.25rem]' />
          Novo Usuário
        </button>
      </footer>

      <UserCreateModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <UserDetailModal user={detailUser} open={detailOpen} onClose={() => setDetailOpen(false)} />
      <UserEditModal user={editUser} open={editOpen} onClose={() => setEditOpen(false)} />
      <ConfirmDialog
        open={deleteOpen}
        tone='danger'
        title='Remover usuário?'
        description={deleteUser ? `Tem certeza que deseja remover o usuário ${deleteUser.name}?` : ""}
        confirmLabel='Sim'
        cancelLabel='Não'
        onConfirm={async () => {
          if (deleteUser) {
            try {
              await removeUser(deleteUser.id);
              showToast("Usuário removido");
            } catch (e) {
              showToast(e instanceof ApiError ? e.message : "Falha ao remover usuário", "error");
            }
          }
          setDeleteOpen(false);
        }}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}

function RowAction({ icon, label, onClick, danger }: { icon: string; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type='button'
      onClick={onClick}
      aria-label={label}
      className={`btn-press grid size-9 cursor-pointer place-items-center rounded-lg hover:bg-(--hover) ${danger ? "text-red-700 dark:text-red-400" : ""}`}
    >
      <IconGeneral icon={icon} fill={0} className='[--icon-size:1.375rem]' />
    </button>
  );
}
