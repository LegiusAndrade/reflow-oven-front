"use client";

/**
 * App notifications feed. Backs the TopBar bell badge and the Notificações screen. The data
 * comes from the backend over REST and is POLLED (no SignalR) — see {@link startNotificationsPolling}.
 */
import { api, type NotificationDto } from "./api";
import { NOTIFICATION_MAX_ITEMS, NOTIFICATION_POLL_MS } from "./limits";
import type { JsonStore } from "./localStore";
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

// --- Store ------------------------------------------------------------------------------
// Tiny subscribe/snapshot store shaped like a JsonStore (so `useStore` can consume it). The
// snapshot reference is stable — `current` only changes when the fetched data changes.

const EMPTY: AppNotification[] = [];
let current: AppNotification[] = EMPTY;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((l) => l());
}

function setList(next: AppNotification[]): void {
  current = next;
  emit();
}

// Shaped like a JsonStore so `useStore` can consume it. The feed is server-owned and refreshed
// via the API, so `set`/`update` are inert (no local writes); `useStore` only reads + subscribes.
export const notificationsStore: JsonStore<AppNotification[]> = {
  get: () => current,
  set: setList,
  update: (fn) => setList(fn(current)),
  getServerSnapshot: () => EMPTY,
  subscribe: (cb) => {
    listeners.add(cb);
    return () => void listeners.delete(cb);
  },
};

function mapNotification(dto: NotificationDto): AppNotification {
  return {
    id: dto.id,
    kind: dto.kind,
    title: dto.title,
    message: dto.message,
    at: Date.parse(dto.at),
    read: dto.read,
  };
}

export function unreadCount(list: AppNotification[]): number {
  return list.reduce((n, x) => n + (x.read ? 0 : 1), 0);
}

/** Fetch the feed from the backend and update the store. Keeps the prior list on failure. */
export async function refreshNotifications(): Promise<void> {
  let dtos: NotificationDto[];
  try {
    dtos = await api.listNotifications(NOTIFICATION_MAX_ITEMS);
  } catch (e) {
    logger.error("notifications", "Falha ao buscar notificações.", e);
    return; // keep the prior list
  }

  const seen = new Set(current.map((n) => n.id));
  const next = dtos.map(mapNotification);

  // Surface any not-previously-seen unread item as a toast.
  for (const n of next) {
    if (!n.read && !seen.has(n.id)) showToast(n.title, n.kind === "error" ? "error" : "info");
  }

  // Skip the emit (and the re-render of every consumer) when the feed is unchanged — this polls
  // continuously on a low-power Pi.
  if (!sameList(current, next)) setList(next);
}

/** Shallow feed equality: same ids in the same order with the same read state. */
function sameList(a: AppNotification[], b: AppNotification[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((x, i) => x.id === b[i].id && x.read === b[i].read);
}

/** Mark every notification as read on the server, then refresh (safe to call from an effect). */
export async function markAllRead(): Promise<void> {
  if (!current.some((n) => !n.read)) return;
  try {
    await api.markAllNotificationsRead();
  } catch (e) {
    logger.error("notifications", "Falha ao marcar notificações como lidas.", e);
    return;
  }
  await refreshNotifications();
}

/** Refresh now, then poll every {@link NOTIFICATION_POLL_MS}. Returns a stop function. */
export function startNotificationsPolling(): () => void {
  void refreshNotifications();
  const id = setInterval(() => void refreshNotifications(), NOTIFICATION_POLL_MS);
  return () => clearInterval(id);
}

const pad = (n: number) => String(n).padStart(2, "0");
/** "dd/mm/aa HH:MM" from an epoch (deterministic — same on server and client). */
export function formatNotificationStamp(at: number): string {
  const d = new Date(at);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
