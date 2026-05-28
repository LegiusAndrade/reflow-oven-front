"use client";

import { clsx } from "clsx";
import Link from "next/link";
import { useState } from "react";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { DiagnosticoTab } from "./DiagnosticoTab";
import { GeralTab } from "./GeralTab";
import { NotificacoesTab } from "./NotificacoesTab";
import { RedeTab } from "./RedeTab";
import { UsuariosTab } from "./UsuariosTab";

type Tab = "geral" | "usuarios" | "rede" | "notificacoes" | "diagnostico";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "geral", label: "Geral", icon: "tune" },
  { id: "usuarios", label: "Usuários", icon: "group" },
  { id: "rede", label: "Rede", icon: "wifi" },
  { id: "notificacoes", label: "Notificações", icon: "notifications" },
  { id: "diagnostico", label: "Diagnóstico", icon: "monitor_heart" },
];

/** Configurações screen: 5 tabs (Geral, Usuários, Rede, Notificações, Diagnóstico). Each form
 *  tab carries its own Cancelar/SALVAR; switching tabs discards unsaved edits on that tab. */
export function ConfiguracoesScreen() {
  const [tab, setTab] = useState<Tab>("geral");

  return (
    <section className='card flex h-full flex-col gap-5 rounded-xl p-[clamp(1rem,2vw,1.5rem)]'>
      <header className='flex items-center justify-between gap-4 border-b border-white/10 pb-3'>
        <h1 className='text-2xl font-semibold'>Configurações</h1>
        <Link href='/' aria-label='Fechar' className='btn-press grid size-10 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-white/10'>
          <IconGeneral icon='close' fill={0} className='[--icon-size:1.75rem]' />
        </Link>
      </header>

      <nav className='flex flex-wrap gap-2'>
        {TABS.map(({ id, label, icon }) => (
          <button
            key={id}
            type='button'
            onClick={() => setTab(id)}
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

      <div className='flex min-h-0 flex-1 flex-col'>
        {tab === "geral" && <GeralTab />}
        {tab === "usuarios" && <UsuariosTab />}
        {tab === "rede" && <RedeTab />}
        {tab === "notificacoes" && <NotificacoesTab />}
        {tab === "diagnostico" && <DiagnosticoTab />}
      </div>
    </section>
  );
}
