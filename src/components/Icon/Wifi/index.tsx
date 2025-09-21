import { IconGeneral } from '../IconGeneral';

export interface IIconWifiProps {
  signal: 'OFF' | 'BAD' | 0 | 1 | 2 | 3 | 4;
}

const iconSignalWifi = {
  OFF: 'signal_wifi_off',
  BAD: 'signal_wifi_bad',
  0: 'signal_wifi_0_bar',
  1: 'signal_wifi_1_bar',
  2: 'signal_wifi_2_bar',
  3: 'signal_wifi_3_bar',
  4: 'signal_wifi_4_bar',
};

export default function IconWifi({ signal }: IIconWifiProps) {
  return <IconGeneral className='[--icon-size:24px] lg:[--icon-size:48px]' icon={iconSignalWifi[signal]} fill={1} />;
}
