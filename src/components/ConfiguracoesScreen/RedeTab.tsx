"use client";

import { clsx } from "clsx";
import { useState } from "react";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { NETWORK_FIELD_MAX_LENGTH } from "@/lib/limits";
import { showToast } from "@/lib/toast";
import { FormFooter, TextLine, Toggle, useSettingsDraft } from "./fields";

/** Rede tab: IP / mask / gateway / DNS + static-IP toggle. */
export function RedeTab() {
  const { draft, setDraft, dirty, save, cancel } = useSettingsDraft();
  const net = draft.network;
  const setNet = (patch: Partial<typeof net>) => setDraft({ ...draft, network: { ...net, ...patch } });

  const [pingHost, setPingHost] = useState("");
  const [pinging, setPinging] = useState(false);
  const [pingResult, setPingResult] = useState<{ ok: boolean; lines: string[] } | null>(null);

  // Mock ping (a browser can't really ping). TODO(backend): run a real ping via the API/RS422.
  const runPing = () => {
    const host = pingHost.trim() || net.gateway || "192.168.0.1";
    setPinging(true);
    setPingResult(null);
    window.setTimeout(() => {
      const ok = Math.random() < 0.85;
      if (ok) {
        const times = Array.from({ length: 4 }, () => 8 + Math.floor(Math.random() * 30));
        const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
        setPingResult({
          ok: true,
          lines: [...times.map((t) => `Resposta de ${host}: bytes=32 tempo=${t}ms TTL=64`), `Pacotes: enviados=4, recebidos=4, perdidos=0 · média=${avg}ms`],
        });
      } else {
        setPingResult({ ok: false, lines: [`Host de destino inacessível: ${host}`, "Pacotes: enviados=4, recebidos=0, perdidos=4 (100% de perda)"] });
      }
      setPinging(false);
    }, 800);
  };

  return (
    <div className='flex h-full min-h-0 flex-col gap-5'>
      <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1'>
        <div className='flex flex-wrap gap-3'>
          <TextLine label='Endereço IP' value={net.ip} onChange={(ip) => setNet({ ip })} maxLength={NETWORK_FIELD_MAX_LENGTH} placeholder='192.168.0.1' className='flex-1' disabled={net.staticIp} />
          <TextLine
            label='Máscara Sub-Rede'
            value={net.mask}
            onChange={(mask) => setNet({ mask })}
            maxLength={NETWORK_FIELD_MAX_LENGTH}
            placeholder='255.255.255.0'
            className='flex-1'
            disabled={net.staticIp}
          />
          <TextLine
            label='Gateway Padrão'
            value={net.gateway}
            onChange={(gateway) => setNet({ gateway })}
            maxLength={NETWORK_FIELD_MAX_LENGTH}
            placeholder='192.168.0.1'
            className='flex-1'
            disabled={net.staticIp}
          />
        </div>
        <div className='flex flex-wrap gap-3'>
          <TextLine
            label='Servidor DNS Principal'
            value={net.dnsPrimary}
            onChange={(dnsPrimary) => setNet({ dnsPrimary })}
            maxLength={NETWORK_FIELD_MAX_LENGTH}
            placeholder='8.8.8.8'
            className='flex-1'
            disabled={net.staticIp}
          />
          <TextLine
            label='Servidor DNS Secundário'
            value={net.dnsSecondary}
            onChange={(dnsSecondary) => setNet({ dnsSecondary })}
            maxLength={NETWORK_FIELD_MAX_LENGTH}
            placeholder='8.8.4.4'
            className='flex-1'
            disabled={net.staticIp}
          />
        </div>
        <div className='flex items-center gap-3'>
          <Toggle checked={net.staticIp} onChange={(staticIp) => setNet({ staticIp })} label='IP Fixo' />
          <span>IP Fixo</span>
        </div>

        <section className='flex flex-col gap-2 border-t border-white/10 pt-4'>
          <h3 className='font-semibold'>Teste de Ping</h3>
          <div className='flex flex-wrap items-end gap-3'>
            <TextLine
              label='Host / IP'
              value={pingHost}
              onChange={setPingHost}
              maxLength={NETWORK_FIELD_MAX_LENGTH}
              placeholder={net.gateway || "192.168.0.1"}
              className='min-w-[12rem] flex-1'
            />
            <button
              type='button'
              onClick={runPing}
              disabled={pinging}
              className='btn-action flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 font-semibold disabled:cursor-not-allowed disabled:opacity-50'
            >
              <IconGeneral icon={pinging ? "progress_activity" : "network_ping"} fill={0} className={clsx("[--icon-size:1.25rem]", pinging && "animate-spin")} />
              {pinging ? "Testando..." : "Testar"}
            </button>
          </div>
          {pingResult && (
            <div className={clsx("rounded-xl border p-3 text-sm", pingResult.ok ? "border-emerald-400/30 bg-emerald-500/10" : "border-red-400/30 bg-red-500/10")}>
              <ul className='flex flex-col gap-1 tabular-nums'>
                {pingResult.lines.map((line, idx) => (
                  <li key={idx} className={clsx(idx === pingResult.lines.length - 1 && "mt-1 font-medium")}>
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      <FormFooter
        dirty={dirty}
        onCancel={cancel}
        onSave={() => {
          save();
          // TODO(backend): show this on the API success response.
          showToast("Configurações salvas");
        }}
      />
    </div>
  );
}
