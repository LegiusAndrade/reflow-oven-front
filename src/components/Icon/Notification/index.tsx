import { IconGeneral } from '../IconGeneral';

export interface IIconNotificationProps {
  status: 'PAUSED' | 'NONE' | 'ACTIVE';
  amount: number;
}
const iconSignalNotification = {
  PAUSED: 'notifications_paused',
  NONE: 'notifications',
  ACTIVE: 'notifications',
};
export default function IconNotification({ status, amount }: IIconNotificationProps) {
  console.log('IconNotification -> status, amount', status, amount);
  console.log('IconNotification -> iconSignalNotification[status]', iconSignalNotification[status]);
  return (
    <div className='relative inline-flex'>
      {/* Icon Notification */}
      <IconGeneral icon={iconSignalNotification[status]} iconSizePx={32} fill={status == 'NONE' ? 0 : 1} weight={400} />

      {/* Badge */}
      {amount && status === 'ACTIVE' && (
        <span className='absolute -top-1 -right-1 bg-red-500 text-xs font-bold px-1.5 py-0.5 rounded-full shadow'>{amount}</span>
      )}
    </div>
  );
}
