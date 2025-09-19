import clsx from 'clsx';
import IconWifi, { IIconWifiProps } from '../Icon/Wifi';

interface ITopBarProps {
  status: string;
  signalWifi: IIconWifiProps;
  connectedServer: boolean;
  amountNotifications: number;
}

export default function TopBar({ status, signalWifi, connectedServer, amountNotifications }: ITopBarProps) {
  return (
    <div className='top-bar px-6 py-3 rounded-b-xl flex space-between items-center'>
      <div className='text-xl'>{status}</div>
      <div className='flex items-center gap-4'>
        <IconWifi signal={signalWifi.signal} />
        <span className={clsx('material-symbols-rounded')}>{connectedServer ? 'public' : 'public_off'}</span>
        <div className='relative inline-flex'>
          {/* Icone */}
          <span className='material-symbols-rounded' style={{ fontVariationSettings: "'FILL' 1", fontSize: 32 }}>
            {amountNotifications > 0 ? 'notifications' : 'notifications_off'}
          </span>

          {/* Badge */}
          {amountNotifications > 0 && (
            <span className='absolute -top-1 -right-1 bg-red-500 text-xs font-bold px-1.5 py-0.5 rounded-full shadow'>{amountNotifications}</span>
          )}
        </div>
      </div>
    </div>
  );
}
