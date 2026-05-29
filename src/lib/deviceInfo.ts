/** Repository the Informação QR code points to. */
export const REPO_URL = "https://github.com/LegiusAndrade/reflow-oven-front";

/** Per-board info (version, serial number, hour meter). */
export type BoardInfo = { version: string; serial: string; hours: number };

export type DeviceInfo = {
  /** Storage, in GB. */
  storageFreeGB: number;
  storageTotalGB: number;
  firmwareVersion: string;
  /** Frontend (this app). */
  htmlVersion: string;
  backendVersion: string;
  /** Board IP address. */
  boardIp: string;
  /** Host operating system (the single-board computer running this UI). */
  os: { name: string; kernel: string };
  power: BoardInfo;
  control: BoardInfo;
};

/** Mock device info — real values come from the board/backend (RS422/API). TODO(backend). */
export const DEVICE_INFO: DeviceInfo = {
  storageFreeGB: 12.4,
  storageTotalGB: 32,
  firmwareVersion: "1.4.2",
  htmlVersion: "0.1.0",
  backendVersion: "2.0.1",
  boardIp: "192.168.0.50",
  os: { name: "Armbian 23.11 (Debian Bookworm)", kernel: "Linux 6.1.63-current" },
  power: { version: "Rev. C", serial: "PWR-2024-0042", hours: 842 },
  control: { version: "Rev. B", serial: "CTRL-2024-0001", hours: 1287 },
};
