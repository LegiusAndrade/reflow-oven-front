import clsx from 'clsx';

export interface IIconWifiProps {
  signal: 'OFF' | 'BAD' | 0 | 1 | 2 | 3 | 4;
}

export default function IconWifi({ signal }: IIconWifiProps) {
  const iconSignalWifi = {
    OFF: 'signal_wifi_off',
    BAD: 'signal_wifi_bad',
    0: 'signal_wifi_0_bar',
    1: 'signal_wifi_1_bar',
    2: 'signal_wifi_2_bar',
    3: 'signal_wifi_3_bar',
    4: 'signal_wifi_4_bar',
  };

  return <span className={clsx('material-symbols-rounded')}>{iconSignalWifi[signal]}</span>;
}
