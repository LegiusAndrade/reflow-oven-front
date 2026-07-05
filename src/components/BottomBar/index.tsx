import { clsx } from "clsx";
import MenuToggle from "../MenuToggle";
import { IconGeneral } from "../Icon/IconGeneral";
import { formatReading, type SensorReadings } from "@/lib/sensors";

export interface IBottomBarProps {
  /** Live board readings, or `null` until the first tick (never a mock). */
  readings: SensorReadings | null;
  /** True when the readings are overdue (connection lost / never up): the strip dims and shows a
   *  "sem sinal" icon so a frozen value never reads as current. */
  stale?: boolean;
  /** Whether the navigation drawer is open (drives the hamburger → X morph). */
  menuOpen?: boolean;
  /** Toggles the navigation drawer. */
  onMenuClick?: () => void;
  /** Hide the hamburger when there's no navigation to reach (e.g. logged out). */
  showMenu?: boolean;
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
export default function BottomBar({ readings, stale = false, menuOpen = false, onMenuClick, showMenu = true }: IBottomBarProps) {
  const r = readings;
  // "—" until the board reports (or when the connection is lost) — no fabricated placeholder.
  const rd = (value: number | undefined, unit: string, suffix: string): string => (r == null ? "—" : `${formatReading(value as number, unit)}${suffix}`);
  const disconnected = r == null || stale;

  return (
    <div className='bottom-bar flex select-none items-center gap-4 rounded-t-xl px-6 py-3'>
      {/* Hidden when the sidebar is docked (large + tall screens) or there's no nav (logged out) */}
      {showMenu && (
        <span className='dock:hidden'>
          <MenuToggle open={menuOpen} onClick={onMenuClick} />
        </span>
      )}

      <div className={clsx("ml-auto flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-base tabular-nums sm:text-lg", disconnected && "opacity-50")}>
        {disconnected && (
          <>
            <IconGeneral icon='sensors_off' fill={1} className='[--icon-size:22px] xl:[--icon-size:26px]' aria-label='Sem leitura ao vivo' />
            <Divider />
          </>
        )}
        <Reading icon='developer_board' value={rd(r?.boardTempC, "°C", " ºC")} />
        <Divider />
        <Reading icon='speed' value={rd(r?.boardFanRpm, "rpm", " RPM")} />
        <Divider />
        <Reading icon='microwave' value={rd(r?.ovenTempC, "°C", " ºC")} />
        <Divider />
        <Reading icon='speed' value={rd(r?.ovenFanRpm, "rpm", " RPM")} />
        <Divider />
        <Reading
          icon='electric_meter'
          value={r == null ? "— @ —" : `${formatReading(r.voltageV, "V")}V @ ${formatReading(r.currentA, "A")}A`}
        />
      </div>
    </div>
  );
}
