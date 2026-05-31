"use client";

import { clsx } from "clsx";
import { useState } from "react";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { useSession } from "@/hooks/useSession";
import { isMaster } from "@/lib/auth";
import { DiagnosticoLog } from "./DiagnosticoLog";
import { DiagnosticoSensores } from "./DiagnosticoSensores";
import { DiagnosticoStats } from "./DiagnosticoStats";
import { ManutencaoTab } from "./ManutencaoTab";

type SubTab = "stats" | "sensores" | "manutencao" | "log";

const SUBTABS: { id: SubTab; label: string; icon: string }[] = [
  { id: "stats", label: "Estatísticas", icon: "leaderboard" },
  { id: "sensores", label: "Sensores", icon: "sensors" },
  { id: "manutencao", label: "Manutenção", icon: "build" },
];

/** The Log sub-tab is reserved for the Master (dev) session. */
const LOG_SUBTAB: { id: SubTab; label: string; icon: string } = { id: "log", label: "Log", icon: "terminal" };

/** Diagnóstico tab: a secondary tab bar over Estatísticas / Sensores / Manutenção (+ Log for Master). */
export function DiagnosticoTab() {
  const [sub, setSub] = useState<SubTab>("stats");
  const master = isMaster(useSession()?.role ?? "Regular");
  const subtabs = master ? [...SUBTABS, LOG_SUBTAB] : SUBTABS;

  return (
    <div className='flex h-full min-h-0 flex-col gap-4'>
      <nav className='flex shrink-0 flex-wrap gap-2'>
        {subtabs.map((t) => (
          <button
            key={t.id}
            type='button'
            onClick={() => setSub(t.id)}
            aria-current={sub === t.id ? "page" : undefined}
            className={clsx(
              "btn-press flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
              sub === t.id ? "bg-[var(--brand)]/15 text-[var(--brand)]" : "border border-[var(--border)] hover:bg-[var(--hover)]"
            )}
          >
            <IconGeneral icon={t.icon} fill={sub === t.id ? 1 : 0} className='[--icon-size:1.125rem]' />
            {t.label}
          </button>
        ))}
      </nav>

      <div className='min-h-0 flex-1 overflow-y-auto pr-3 [scrollbar-gutter:stable]'>
        {sub === "stats" && <DiagnosticoStats />}
        {sub === "sensores" && <DiagnosticoSensores />}
        {sub === "manutencao" && <ManutencaoTab />}
        {sub === "log" && master && <DiagnosticoLog />}
      </div>
    </div>
  );
}
