import { IconGeneral } from '../Icon/IconGeneral';
import IconNotification, { IIconNotificationProps } from '../Icon/Notification';
import IconWifi, { IIconWifiProps } from '../Icon/Wifi';

interface ITopBarProps {
  status: string;
  signalWifi: IIconWifiProps;
  connectedServer: boolean;
  statusNotification: IIconNotificationProps;
}

export default function TopBar({ status, signalWifi, connectedServer, statusNotification }: ITopBarProps) {
  return (
    <div className='top-bar flex items-center justify-between px-6 py-3 rounded-b-xl select-none'>
      {/* Esquerda: status */}
      <div className='sm:text-2xl'>{status}</div>

      {/* Direita: ícones + hora */}
      <div className='ml-auto flex items-center gap-6'>
        <div className='flex items-center gap-3'>
          <IconWifi signal={signalWifi.signal} />
          <IconGeneral icon={connectedServer ? 'public' : 'public_off'} fill={1} />
          <IconNotification status={statusNotification.status} amount={statusNotification.amount} />
        </div>
        <div className='tabular-nums'>
          <span className='sm:text-2xl'>{`12:20 09/05/25`}</span>
        </div>
      </div>
    </div>
  );
}
