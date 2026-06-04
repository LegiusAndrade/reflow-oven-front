"use client";

import { clsx } from "clsx";
import Link from "next/link";
import { useState } from "react";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { useSession } from "@/hooks/useSession";
import { isMaster } from "@/lib/auth";
import { CalibracaoTab } from "./CalibracaoTab";
import { DiagnosticoTab } from "./DiagnosticoTab";
import { GeralTab } from "./GeralTab";
import { LixeiraTab } from "./LixeiraTab";
import { NotificacoesTab } from "./NotificacoesTab";
import { RedeTab } from "./RedeTab";
import { UsuariosTab } from "./UsuariosTab";

type Tab = "geral" | "usuarios" | "rede" | "notificacoes" | "diagnostico" | "calibracao" | "lixeira";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "geral", label: "Geral", icon: "tune" },
  { id: "usuarios", label: "Usuários", icon: "group" },
  { id: "rede", label: "Rede", icon: "wifi" },
  { id: "notificacoes", label: "Notificações", icon: "notifications" },
  { id: "diagnostico", label: "Diagnóstico", icon: "monitor_heart" },
];

/** The Calibração tab is reserved for the technician (calibration) session. */
const CALIBRACAO_TAB: { id: Tab; label: string; icon: string } = { id: "calibracao", label: "Calibração", icon: "instant_mix" };

/** The Lixeira (soft-delete trash, #8) is reserved for the Master (dev) session. */
const LIXEIRA_TAB: { id: Tab; label: string; icon: string } = { id: "lixeira", label: "Lixeira", icon: "delete" };

/** Configurações screen: 5 tabs (Geral, Usuários, Rede, Notificações, Diagnóstico). Each form
 *  tab carries its own Cancelar/SALVAR; switching tabs discards unsaved edits on that tab. */
export function ConfiguracoesScreen() {
  const [tab, setTab] = useState<Tab>("geral");
  const session = useSession();
  const master = isMaster(session?.role ?? "Regular");
  // Lixeira is appended for the Master; Calibração only for the technician ("calibracao") session.
  const tabs = [...TABS, ...(master ? [LIXEIRA_TAB] : []), ...(session?.calibration ? [CALIBRACAO_TAB] : [])];

  return (
    <section className='card flex h-full flex-col gap-5 rounded-xl p-[clamp(1rem,2vw,1.5rem)]'>
      <header className='flex items-center justify-between gap-4 border-b border-(--border) pb-3'>
        <h1 className='text-2xl font-semibold'>Configurações</h1>
        <Link href='/' aria-label='Fechar' className='btn-press grid size-10 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-(--hover)'>
          <IconGeneral icon='close' fill={0} className='[--icon-size:1.75rem]' />
        </Link>
      </header>

      <nav className='flex flex-wrap gap-2'>
        {tabs.map(({ id, label, icon }) => (
          <button
            key={id}
            type='button'
            onClick={() => setTab(id)}
            aria-current={tab === id ? "page" : undefined}
            className={clsx(
              "flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 font-semibold transition-colors",
              tab === id ? "btn-link-active" : "hover:bg-(--hover)"
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
        {tab === "lixeira" && master && <LixeiraTab />}
        {tab === "calibracao" && session?.calibration && <CalibracaoTab />}
      </div>
    </section>
  );
}
