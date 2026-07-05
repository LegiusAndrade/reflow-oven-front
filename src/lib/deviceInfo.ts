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
  /** Per board — null when that board hasn't reported (the screen renders "—", never a mock). */
  power: BoardInfo | null;
  control: BoardInfo | null;
};
