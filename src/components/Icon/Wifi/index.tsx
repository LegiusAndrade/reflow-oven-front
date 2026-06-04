import { IconGeneral } from "../IconGeneral";

export interface IIconWifiProps {
  signal: "OFF" | "BAD" | 0 | 1 | 2 | 3 | 4;
  /** Sizing/spacing classes (e.g. the shared `[--icon-size:…]`) so it matches its TopBar neighbors. */
  className?: string;
}

/** Default size — matches the other TopBar status icons when no className is passed. */
const DEFAULT_WIFI_CLASS = "[--icon-size:20px] lg:[--icon-size:24px] xl:[--icon-size:28px]";

const iconSignalWifi = {
  OFF: "signal_wifi_off",
  BAD: "signal_wifi_bad",
  0: "signal_wifi_0_bar",
  1: "signal_wifi_1_bar",
  2: "signal_wifi_2_bar",
  3: "signal_wifi_3_bar",
  4: "signal_wifi_4_bar",
};

export default function IconWifi({ signal, className }: IIconWifiProps) {
  return <IconGeneral className={className ?? DEFAULT_WIFI_CLASS} icon={iconSignalWifi[signal]} fill={1} />;
}
