/**
 * Live readings reported by the STM32 power board over RS422 and streamed to the UI over SignalR
 * (the diagnostics hub). This UI only consumes the data — see `useLiveReadings`, which returns `null`
 * until the first real tick, so no placeholder/mock value is ever displayed.
 */
export type SensorReadings = {
  /** Power-board heatsink temperature (NTC), in °C */
  boardTempC: number;
  /** Power-board cooler fan speed, in RPM */
  boardFanRpm: number;
  /** Oven grill temperature (type-K thermocouple), in °C */
  ovenTempC: number;
  /** Oven cooler fan speed, in RPM */
  ovenFanRpm: number;
  /** Output voltage, in V */
  voltageV: number;
  /** Output current via Hall sensor, in A */
  currentA: number;
};

/** Display a live reading: RPM as a whole number, everything else (°C/V/A) with one decimal. */
export function formatReading(value: number, unit: string): string {
  return unit === "rpm" ? String(Math.round(value)) : value.toFixed(1);
}
