"use client";

/**
 * Client-side notifications feed (mock stage). Backs the TopBar bell badge and the Notificações
 * screen. Seeds a few entries with FIXED timestamps (so server and client render identically);
 * new entries are pushed locally via {@link addNotification}. A real feed will come from the
 * backend later. TODO(backend): replace the seed/local push with a server stream.
 */
import { NOTIFICATION_MAX_ITEMS } from "./limits";
import { createJsonStore } from "./localStore";
import { logger } from "./logger";
import { showToast } from "./toast";

export type NotificationKind = "update" | "error" | "info";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  message: string;
  /** epoch ms */
  at: number;
  read: boolean;
}

const SEED: AppNotification[] = [
  { id: "seed-update", kind: "update", title: "Atualização disponível", message: "Nova versão 1.4.0 da interface está pronta para instalar.", at: 1779840000000, read: false },
  { id: "seed-error", kind: "error", title: "Falha registrada", message: "Sobretemperatura na grelha durante a última execução.", at: 1779750000000, read: false },
  { id: "seed-info", kind: "info", title: "Sistema iniciado", message: "Interface conectada ao backend.", at: 1779600000000, read: true },
];

export const notificationsStore = createJsonStore<AppNotification[]>("reflow:notifications:v1", SEED);

export function unreadCount(list: AppNotification[]): number {
  return list.reduce((n, x) => n + (x.read ? 0 : 1), 0);
}

/** Mark every notification as read (idempotent — safe to call from an effect). */
export function markAllRead(): void {
  notificationsStore.update((list) => (list.some((n) => !n.read) ? list.map((n) => ({ ...n, read: true })) : list));
}

/** Push a new notification to the top and surface it as a toast. */
export function addNotification(kind: NotificationKind, title: string, message: string): void {
  const entry: AppNotification = { id: `n-${Date.now()}`, kind, title, message, at: Date.now(), read: false };
  notificationsStore.update((list) => [entry, ...list].slice(0, NOTIFICATION_MAX_ITEMS));
  showToast(title);
  logger.info("notif", title);
}

const pad = (n: number) => String(n).padStart(2, "0");
/** "dd/mm/aa HH:MM" from an epoch (deterministic — same on server and client). */
export function formatNotificationStamp(at: number): string {
  const d = new Date(at);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
