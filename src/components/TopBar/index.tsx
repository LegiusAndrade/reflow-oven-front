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
        <div className={`server-status ${connectedServer ? 'connected' : 'disconnected'}`}></div>
        <div className='notification-bell'>{amountNotifications > 0 && <span className='notification-count'>{amountNotifications}</span>}</div>
      </div>
    </div>
  );
}
