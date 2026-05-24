/**
 * Live readings reported by the STM32 power board over RS422.
 * The serial bridge lives in a separate repo; this UI only consumes the data,
 * so for now we render placeholder values (see {@link MOCK_READINGS}).
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

/** Placeholder readings mirroring the Figma "Initial Page" mockup. */
export const MOCK_READINGS: SensorReadings = {
  boardTempC: 80,
  boardFanRpm: 2000,
  ovenTempC: 30,
  ovenFanRpm: 2000,
  voltageV: 110,
  currentA: 20,
};
