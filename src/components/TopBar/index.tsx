import { IconGeneral } from "../Icon/IconGeneral";
import IconNotification, { IIconNotificationProps } from "../Icon/Notification";
import IconWifi, { IIconWifiProps } from "../Icon/Wifi";
import { SessionTimer } from "../SessionTimer";
import { ThemeToggle } from "../ThemeToggle";

interface ITopBarProps {
  signalWifi: IIconWifiProps;
  connectedServer: boolean;
  statusNotification: IIconNotificationProps;
  /** Logged-in user shown on the left (null while logged out). */
  user?: { name: string; role: string; loginAt: number } | null;
}

export default function TopBar({ signalWifi, connectedServer, statusNotification, user }: ITopBarProps) {
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
          <IconWifi signal={signalWifi.signal} />
          <IconGeneral className='[--icon-size:20px] lg:[--icon-size:24px] xl:[--icon-size:28px]' icon={connectedServer ? "public" : "public_off"} fill={1} />
          <IconNotification status={statusNotification.status} amount={statusNotification.amount} />
          <ThemeToggle />
        </div>
        <span className='tabular-nums sm:text-2xl'>{"12:20 09/05/25"}</span>
      </div>
    </div>
  );
}
