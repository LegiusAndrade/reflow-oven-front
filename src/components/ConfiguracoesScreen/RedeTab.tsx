"use client";

import { clsx } from "clsx";
import { useEffect, useState } from "react";
import { IconGeneral } from "@/components/Icon/IconGeneral";
import { useSession } from "@/hooks/useSession";
import { ApiError, api, type NetworkInterfaceDto, type NetworkLink } from "@/lib/api";
import { NETWORK_FIELD_MAX_LENGTH, PING_PORT_MAX, PING_PORT_MIN } from "@/lib/limits";
import { showToast } from "@/lib/toast";
import { FormFooter, NumberField, TextLine, Toggle } from "./fields";

/** Local working copy of the wired config. The GET only returns ip/staticIp/preferredLink — the
 *  other four (mask/gateway/dns*) are PUT-only, so they start blank and the user types them. */
interface WiredForm {
  staticIp: boolean;
  ip: string;
  mask: string;
  gateway: string;
  dnsPrimary: string;
  dnsSecondary: string;
  preferredLink: NetworkLink;
}

const EMPTY_FORM: WiredForm = {
  staticIp: false,
  ip: "",
  mask: "",
  gateway: "",
  dnsPrimary: "",
  dnsSecondary: "",
  preferredLink: "Nenhum",
};

/** Rede tab: list interfaces + set priority, ping test (host + optional port), wired IP config. */
export function RedeTab() {
  const isAdmin = useSession()?.role === "Admin";

  // --- Interfaces ---------------------------------------------------------------------
  const [interfaces, setInterfaces] = useState<NetworkInterfaceDto[]>([]);
  const [loadingInterfaces, setLoadingInterfaces] = useState(true);
  const [settingPriority, setSettingPriority] = useState<string | null>(null);
  /** Name of the interface the backend currently considers active/priority (for highlight). */
  const [activeInterface, setActiveInterface] = useState("");

  // --- Wired config -------------------------------------------------------------------
  const [form, setForm] = useState<WiredForm>(EMPTY_FORM);
  const [base, setBase] = useState<WiredForm>(EMPTY_FORM);
  const dirty = JSON.stringify(form) !== JSON.stringify(base);
  const setField = (patch: Partial<WiredForm>) => setForm((f) => ({ ...f, ...patch }));

  // --- Ping ---------------------------------------------------------------------------
  const [pingHost, setPingHost] = useState("");
  const [pingPort, setPingPort] = useState(0);
  const [pinging, setPinging] = useState(false);
  const [pingResult, setPingResult] = useState<{ ok: boolean; lines: string[] } | null>(null);

  useEffect(() => {
    let alive = true;
    // Best-effort load: list interfaces and seed the wired form from the current status.
    (async () => {
      try {
        const list = await api.systemInterfaces();
        if (alive) setInterfaces(list);
      } catch {
        // leave empty — the "Nenhuma interface." note covers it.
      } finally {
        if (alive) setLoadingInterfaces(false);
      }
      try {
        const status = await api.getNetwork();
        if (!alive) return;
        setActiveInterface(status.interface);
        // GET only carries ip / staticIp / preferredLink (= status.link); mask/gateway/dns* stay blank.
        const seeded: WiredForm = { ...EMPTY_FORM, ip: status.ip, staticIp: status.staticIp, preferredLink: status.link };
        setForm(seeded);
        setBase(seeded);
      } catch {
        // leave EMPTY_FORM.
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const refreshInterfaces = async () => {
    try {
      setInterfaces(await api.systemInterfaces());
    } catch {
      // keep the current list on a refresh failure.
    }
  };

  const setPriority = async (name: string) => {
    setSettingPriority(name);
    try {
      await api.setPriorityInterface(name);
      await refreshInterfaces();
      setActiveInterface(name);
      showToast("Interface prioritária definida");
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Falha ao definir interface", "error");
    } finally {
      setSettingPriority(null);
    }
  };

  const saveWired = async () => {
    try {
      await api.updateNetwork({
        staticIp: form.staticIp,
        ip: form.ip,
        mask: form.mask,
        gateway: form.gateway,
        dnsPrimary: form.dnsPrimary,
        dnsSecondary: form.dnsSecondary,
        preferredLink: form.preferredLink,
      });
      setBase(form);
      showToast("Configurações de rede salvas");
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Falha ao salvar", "error");
    }
  };

  // Real ICMP/TCP ping via the backend (the browser can't ping directly). Admin only.
  const runPing = async () => {
    if (!isAdmin) return;
    const host = pingHost.trim() || form.gateway || "192.168.0.1";
    const port = pingPort > 0 ? pingPort : undefined;
    setPinging(true);
    setPingResult(null);
    try {
      const res = await api.ping(host, port);
      setPingResult(
        res.ok
          ? { ok: true, lines: [`Resposta de ${res.host}: tempo=${Math.round(res.ms)}ms`, "Pacotes: enviados=1, recebidos=1, perdidos=0"] }
          : { ok: false, lines: [`Host de destino inacessível: ${res.host}`, "Pacotes: enviados=1, recebidos=0, perdidos=1 (100% de perda)"] }
      );
    } catch (e) {
      setPingResult({ ok: false, lines: [e instanceof ApiError ? e.message : `Falha ao testar ${host}`] });
      if (e instanceof ApiError) showToast(e.message, "error");
    } finally {
      setPinging(false);
    }
  };

  return (
    <div className='flex h-full min-h-0 flex-col gap-5'>
      <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-3 [scrollbar-gutter:stable]'>
        <section className='flex flex-col gap-2'>
          <h3 className='font-semibold'>Interfaces de rede</h3>
          {loadingInterfaces ? (
            <p className='text-sm opacity-60'>Carregando…</p>
          ) : interfaces.length === 0 ? (
            <p className='text-sm opacity-60'>Nenhuma interface.</p>
          ) : (
            <ul className='flex flex-col gap-2'>
              {interfaces.map((iface) => {
                const isActive = !!activeInterface && iface.name === activeInterface;
                return (
                  <li
                    key={iface.name}
                    className={clsx(
                      "flex flex-wrap items-center gap-3 rounded-xl border p-3",
                      isActive ? "border-[var(--brand)] bg-[var(--brand)]/5" : "border-[var(--border)]"
                    )}
                  >
                    <IconGeneral icon={iface.kind === "Ethernet" ? "lan" : "wifi"} fill={0} className='opacity-70 [--icon-size:1.25rem]' />
                    <span className='font-medium'>{iface.name}</span>
                    <span className='text-sm opacity-60'>{iface.kind === "Ethernet" ? "Cabo" : "Wi-Fi"}</span>
                    <span
                      className={clsx(
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                        iface.up ? "bg-emerald-500/15 text-emerald-500" : "bg-rose-500/15 text-rose-500"
                      )}
                    >
                      {iface.up ? "Ativa" : "Inativa"}
                    </span>
                    <span className='text-sm tabular-nums opacity-70'>{iface.ip || "—"}</span>
                    {isAdmin && (
                      <button
                        type='button'
                        onClick={() => setPriority(iface.name)}
                        disabled={settingPriority !== null}
                        className='btn-press ml-auto cursor-pointer rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--hover)] disabled:cursor-not-allowed disabled:opacity-50'
                      >
                        {settingPriority === iface.name ? "Definindo…" : "Definir como prioritária"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className='flex flex-wrap gap-3 border-t border-[var(--border)] pt-4'>
          <TextLine
            label='Endereço IP'
            value={form.ip}
            onChange={(ip) => setField({ ip })}
            maxLength={NETWORK_FIELD_MAX_LENGTH}
            placeholder='192.168.0.1'
            className='flex-1'
            disabled={!isAdmin || !form.staticIp}
          />
          <TextLine
            label='Máscara Sub-Rede'
            value={form.mask}
            onChange={(mask) => setField({ mask })}
            maxLength={NETWORK_FIELD_MAX_LENGTH}
            placeholder='255.255.255.0'
            className='flex-1'
            disabled={!isAdmin || !form.staticIp}
          />
          <TextLine
            label='Gateway Padrão'
            value={form.gateway}
            onChange={(gateway) => setField({ gateway })}
            maxLength={NETWORK_FIELD_MAX_LENGTH}
            placeholder='192.168.0.1'
            className='flex-1'
            disabled={!isAdmin || !form.staticIp}
          />
        </div>
        <div className='flex flex-wrap gap-3'>
          <TextLine
            label='Servidor DNS Principal'
            value={form.dnsPrimary}
            onChange={(dnsPrimary) => setField({ dnsPrimary })}
            maxLength={NETWORK_FIELD_MAX_LENGTH}
            placeholder='8.8.8.8'
            className='flex-1'
            disabled={!isAdmin || !form.staticIp}
          />
          <TextLine
            label='Servidor DNS Secundário'
            value={form.dnsSecondary}
            onChange={(dnsSecondary) => setField({ dnsSecondary })}
            maxLength={NETWORK_FIELD_MAX_LENGTH}
            placeholder='8.8.4.4'
            className='flex-1'
            disabled={!isAdmin || !form.staticIp}
          />
        </div>
        <div className='flex items-center gap-3'>
          <Toggle checked={form.staticIp} onChange={(staticIp) => setField({ staticIp })} label='IP Fixo' disabled={!isAdmin} />
          <span>IP Fixo</span>
        </div>

        <section className='flex flex-col gap-2 border-t border-[var(--border)] pt-4'>
          <h3 className='font-semibold'>Teste de Ping</h3>
          <div className='flex flex-wrap items-end gap-3'>
            <TextLine
              label='Host / IP'
              value={pingHost}
              onChange={setPingHost}
              maxLength={NETWORK_FIELD_MAX_LENGTH}
              placeholder={form.gateway || "192.168.0.1"}
              className='min-w-[12rem] flex-1'
              disabled={!isAdmin}
            />
            <NumberField
              label='Porta (opcional)'
              value={pingPort}
              onChange={setPingPort}
              min={PING_PORT_MIN}
              max={PING_PORT_MAX}
              className='w-32'
            />
            <button
              type='button'
              onClick={runPing}
              disabled={pinging || !isAdmin}
              className='btn-action flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 font-semibold disabled:cursor-not-allowed disabled:opacity-50'
            >
              <IconGeneral icon={pinging ? "progress_activity" : "network_ping"} fill={0} className={clsx("[--icon-size:1.25rem]", pinging && "animate-spin")} />
              {pinging ? "Testando..." : "Testar"}
            </button>
          </div>
          {!isAdmin && <p className='text-xs opacity-50'>Apenas administradores podem executar o teste de ping.</p>}
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

      <FormFooter dirty={dirty && isAdmin} onCancel={() => setForm(base)} onSave={saveWired} />
    </div>
  );
}
