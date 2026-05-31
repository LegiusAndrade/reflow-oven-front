"use client";

import { useEffect, useState } from "react";

import { api, type NetworkLink } from "@/lib/api";
import { SYSTEM_STATUS_POLL_MS } from "@/lib/limits";
import { logger } from "@/lib/logger";

export interface SystemStatusSnapshot {
  link: NetworkLink;
  connected: boolean;
  signalPercent?: number;
  centralOnline: boolean;
}

const EMPTY: SystemStatusSnapshot = {
  link: "Nenhum",
  connected: false,
  centralOnline: false,
};

const sameStatus = (a: SystemStatusSnapshot, b: SystemStatusSnapshot): boolean =>
  a.link === b.link && a.connected === b.connected && a.signalPercent === b.signalPercent && a.centralOnline === b.centralOnline;

export function useSystemStatus(enabled: boolean): SystemStatusSnapshot {
  const [status, setStatus] = useState<SystemStatusSnapshot>(EMPTY);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;

    async function load(): Promise<void> {
      try {
        const s = await api.systemStatus();
        if (!alive) return;
        const next: SystemStatusSnapshot = {
          link: s.network.link,
          connected: s.network.link !== "Nenhum",
          signalPercent: s.network.signalPercent,
          centralOnline: s.centralServerOnline,
        };
        // Keep the same reference when nothing changed so we don't re-render every poll (this runs
        // continuously on a low-power Pi).
        setStatus((prev) => (sameStatus(prev, next) ? prev : next));
      } catch (e) {
        if (!alive) return;
        logger.error("system", "failed to fetch status", e);
        // Treat a failed fetch as offline; keep the last signal reading.
        setStatus((prev) => {
          const next = { ...prev, link: "Nenhum" as NetworkLink, connected: false, centralOnline: false };
          return sameStatus(prev, next) ? prev : next;
        });
      }
    }

    void load();
    const id = setInterval(() => void load(), SYSTEM_STATUS_POLL_MS);

    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [enabled]);

  return status;
}
