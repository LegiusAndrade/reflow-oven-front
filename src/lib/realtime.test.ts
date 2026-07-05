import { describe, expect, it } from "vitest";
import { SIGNALR_RECONNECT_DELAYS_MS } from "./limits";
import { reconnectDelay } from "./realtime";

/**
 * FE-3 safety invariant: the SignalR reconnect/start backoff must NEVER give up. The old fixed
 * `withAutomaticReconnect([...])` array stopped after ~17 s, leaving a kiosk permanently blind (no
 * sensor readings, no fault banner) after a single backend restart. The schedule must instead cap at
 * its last delay and repeat it forever.
 */
describe("reconnectDelay (SignalR backoff)", () => {
  const last = SIGNALR_RECONNECT_DELAYS_MS[SIGNALR_RECONNECT_DELAYS_MS.length - 1];

  it("returns each scheduled delay in order", () => {
    SIGNALR_RECONNECT_DELAYS_MS.forEach((expected, i) => {
      expect(reconnectDelay(i)).toBe(expected);
    });
  });

  it("caps at the last (max) delay and repeats it forever — never signals give-up", () => {
    // Any attempt past the end returns the cap; crucially it is always a finite number, never
    // null/undefined (which is how a SignalR retry policy tells the client to stop reconnecting).
    for (const attempt of [SIGNALR_RECONNECT_DELAYS_MS.length, 20, 1000, 1_000_000]) {
      const delay = reconnectDelay(attempt);
      expect(delay).toBe(last);
      expect(Number.isFinite(delay)).toBe(true);
    }
  });

  it("clamps a negative/zero attempt to the first delay", () => {
    expect(reconnectDelay(0)).toBe(SIGNALR_RECONNECT_DELAYS_MS[0]);
    expect(reconnectDelay(-5)).toBe(SIGNALR_RECONNECT_DELAYS_MS[0]);
  });

  it("is monotonically non-decreasing (a real backoff, not jitter)", () => {
    for (let i = 1; i < SIGNALR_RECONNECT_DELAYS_MS.length; i++) {
      expect(reconnectDelay(i)).toBeGreaterThanOrEqual(reconnectDelay(i - 1));
    }
  });
});
