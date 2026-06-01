import Link from "next/link";
import { IconGeneral } from "../Icon/IconGeneral";
import IconNotification, { IIconNotificationProps } from "../Icon/Notification";
import IconWifi, { IIconWifiProps } from "../Icon/Wifi";
import { SessionTimer } from "../SessionTimer";
import { ThemeToggle } from "../ThemeToggle";
import { type NetworkLink } from "@/lib/api";

interface ITopBarProps {
  network: { link: NetworkLink; connected: boolean; signalPercent?: number };
  connectedServer: boolean;
  statusNotification: IIconNotificationProps;
  /** Logged-in user shown on the left (null while logged out). */
  user?: { name: string; role: string; loginAt: number } | null;
}

// Map a 0..100 signal percentage to a Wi-Fi icon bucket (0|1|2|3|4).
function percentToBucket(percent: number | undefined): IIconWifiProps["signal"] {
  if (percent === undefined || percent <= 0) return 0;
  if (percent < 25) return 1;
  if (percent < 50) return 2;
  if (percent < 75) return 3;
  return 4;
}

export default function TopBar({ network, connectedServer, statusNotification, user }: ITopBarProps) {
  return (
    <div className='top-bar flex items-center gap-4 rounded-b-xl px-6 py-3 select-none'>
      {/* Esquerda: usuário logado + papel + tempo de sessão */}
      <div className='flex min-w-0 flex-1 items-center gap-3'>
        {user && (
          <>
            <span className='truncate font-medium sm:text-xl'>{user.name}</span>
            <span className='shrink-0 rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-xs'>{user.role}</span>
            <SessionTimer since={user.loginAt} />
          </>
        )}
      </div>

      {/* Direita: ícones de status + tema + hora */}
      <div className='flex shrink-0 items-center gap-4'>
        <div className='flex items-center gap-3'>
          {network.link === "WiFi" ? (
            <IconWifi signal={network.connected ? percentToBucket(network.signalPercent) : "OFF"} />
          ) : network.link === "Cabo" ? (
            <IconGeneral className='[--icon-size:20px] lg:[--icon-size:24px] xl:[--icon-size:28px]' icon='lan' fill={1} />
          ) : (
            <IconWifi signal='OFF' />
          )}
          <IconGeneral className='[--icon-size:20px] lg:[--icon-size:24px] xl:[--icon-size:28px]' icon={connectedServer ? "public" : "public_off"} fill={1} />
          {/* The bell opens the notifications screen (route + store + mark-as-read already exist). */}
          <Link href='/notificacoes' aria-label='Notificações' className='btn-press inline-flex cursor-pointer'>
            <IconNotification status={statusNotification.status} amount={statusNotification.amount} />
          </Link>
          {/* No tema de login (sem usuário) o toggle não faz sentido — só aparece autenticado. */}
          {user && <ThemeToggle />}
        </div>
        <span className='tabular-nums sm:text-2xl'>{"12:20 09/05/25"}</span>
      </div>
    </div>
  );
}
