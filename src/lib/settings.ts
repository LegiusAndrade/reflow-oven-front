import { createJsonStore } from "./localStore";

export type NotificationKind = "Normal" | "Atenção" | "Crítica" | "Grave";
export type NotificationProcess = "Parar Processo" | "Continuar Processo";
export type BuzzerSound = "Contínuo" | "Pulsante";

/** One configurable alert in the Notificações tab. */
export type NotificationSetting = {
  id: string;
  alert: string;
  process: NotificationProcess;
  /** Buzzer on/off; when off, `sound` is irrelevant. */
  buzzer: boolean;
  sound: BuzzerSound;
  kind: NotificationKind;
};

/** All persisted device settings (Configurações screen). */
export type Settings = {
  pid: { p: number; i: number; d: number };
  oven: { maxTemp: number; maxFanRpm: number };
  process: { maxExtraTimeSec: number };
  voltage: { min: number; max: number };
  network: { ip: string; mask: string; gateway: string; dnsPrimary: string; dnsSecondary: string; staticIp: boolean };
  notifications: NotificationSetting[];
};

export const DEFAULT_SETTINGS: Settings = {
  pid: { p: 2, i: 0.5, d: 0.1 },
  oven: { maxTemp: 300, maxFanRpm: 5000 },
  process: { maxExtraTimeSec: 60 },
  voltage: { min: 100, max: 250 },
  network: { ip: "192.168.0.1", mask: "255.255.255.0", gateway: "192.168.0.1", dnsPrimary: "8.8.8.8", dnsSecondary: "8.8.4.4", staticIp: false },
  notifications: [
    { id: "fault", alert: "Fault", process: "Parar Processo", buzzer: true, sound: "Contínuo", kind: "Normal" },
    { id: "oven-overtemp", alert: "Excesso de temperatura Forno", process: "Continuar Processo", buzzer: true, sound: "Pulsante", kind: "Atenção" },
    { id: "board-overtemp", alert: "Excesso de temperatura Placa", process: "Continuar Processo", buzzer: false, sound: "Contínuo", kind: "Crítica" },
    { id: "temp-timeout", alert: "Temperatura não atingida no tempo limite", process: "Continuar Processo", buzzer: false, sound: "Contínuo", kind: "Grave" },
    { id: "pcb-fan-stopped", alert: "Ventilador PCB parado", process: "Parar Processo", buzzer: true, sound: "Contínuo", kind: "Crítica" },
    { id: "oven-temp-sensor-fail", alert: "Sensor temperatura do forno com falha", process: "Parar Processo", buzzer: true, sound: "Contínuo", kind: "Grave" },
    { id: "board-temp-sensor-fail", alert: "Sensor temperatura da placa com falha", process: "Parar Processo", buzzer: true, sound: "Contínuo", kind: "Grave" },
    { id: "mains-undervoltage", alert: "Tensão da rede abaixo do valor estipulado", process: "Continuar Processo", buzzer: true, sound: "Pulsante", kind: "Atenção" },
    { id: "mains-overvoltage", alert: "Tensão da rede acima do valor estipulado", process: "Continuar Processo", buzzer: true, sound: "Pulsante", kind: "Atenção" },
    { id: "board-supply-undervoltage", alert: "Tensão de alimentação da placa abaixo do valor estipulado", process: "Parar Processo", buzzer: true, sound: "Contínuo", kind: "Crítica" },
    { id: "board-supply-overvoltage", alert: "Tensão de alimentação da placa acima do valor estipulado", process: "Parar Processo", buzzer: true, sound: "Contínuo", kind: "Crítica" },
  ],
};

/** Persisted in localStorage (mock stage). TODO(backend): replace with the API/RS422.
 *  Key bumped to v2 when the full notification list (image 8) was added, so older saved
 *  settings don't hide the new alerts. */
export const settingsStore = createJsonStore<Settings>("reflow:settings:v2", DEFAULT_SETTINGS);
