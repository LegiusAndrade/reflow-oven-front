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
  return (
    <div className='relative inline-flex'>
      {/* Icon Notification */}
      <IconGeneral
        icon={iconSignalNotification[status]}
        className='[--icon-size:20px] lg:[--icon-size:24px] xl:[--icon-size:28px]'
        fill={status == 'NONE' ? 0 : 1}
      />

      {/* Badge */}
      {amount > 0 && status === 'ACTIVE' && (
        <span className='absolute -top-1 -right-1 bg-red-500 text-xs font-bold px-1.5 py-0.5 rounded-full shadow'>{amount}</span>
      )}
    </div>
  );
}
