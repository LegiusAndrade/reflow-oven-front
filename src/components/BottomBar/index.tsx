import { IconGeneral } from "../Icon/IconGeneral";
import type { SensorReadings } from "@/lib/sensors";

export interface IBottomBarProps {
  readings: SensorReadings;
  /** Called when the hamburger button is tapped (opens the navigation drawer). */
  onMenuClick?: () => void;
}

function Reading({ icon, value }: { icon: string; value: string }) {
  return (
    <div className='flex items-center gap-2'>
      <IconGeneral icon={icon} fill={0} className='[--icon-size:24px] xl:[--icon-size:28px]' />
      <span className='whitespace-nowrap'>{value}</span>
    </div>
  );
}

function Divider() {
  return <span className='h-5 w-px shrink-0 bg-current opacity-30' aria-hidden='true' />;
}

/**
 * Persistent bottom bar shown on every screen: a hamburger menu on the left and
 * the live sensor strip on the right (board/oven temps, fan RPMs, voltage @ current).
 */
export default function BottomBar({ readings, onMenuClick }: IBottomBarProps) {
  const { boardTempC, boardFanRpm, ovenTempC, ovenFanRpm, voltageV, currentA } = readings;

  return (
    <div className='bottom-bar flex select-none items-center gap-4 rounded-t-xl px-6 py-3'>
      <button
        type='button'
        onClick={onMenuClick}
        aria-label='Abrir menu'
        className='grid cursor-pointer place-items-center rounded-full p-1 transition-colors hover:bg-white/10'
      >
        <IconGeneral icon='menu' fill={0} className='[--icon-size:28px]' />
      </button>

      <div className='ml-auto flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-base tabular-nums sm:text-lg'>
        <Reading icon='developer_board' value={`${boardTempC} ºC`} />
        <Divider />
        <Reading icon='speed' value={`${boardFanRpm} RPM`} />
        <Divider />
        <Reading icon='microwave' value={`${ovenTempC} ºC`} />
        <Divider />
        <Reading icon='speed' value={`${ovenFanRpm} RPM`} />
        <Divider />
        <Reading icon='electric_meter' value={`${voltageV}V @ ${currentA}A`} />
      </div>
    </div>
  );
}
