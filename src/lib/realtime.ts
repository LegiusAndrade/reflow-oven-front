/**
 * SignalR clients for the backend's real-time hubs. The JWT is passed via accessTokenFactory
 * (the backend reads it from the query string for hub connections).
 */
import * as signalR from "@microsoft/signalr";
import { API_URL, fetchWsToken, getToken, type RunPhase, type RunStatusKind, type SensorReadingsDto, type TraceSampleDto } from "./api";
import { SIGNALR_RECONNECT_DELAYS_MS } from "./limits";
import { parseRunPhase, parseRunStatus, parseSensorReadings, parseTraceSample } from "./realtimeSchemas";

/** Delay (ms) before the Nth reconnect/start attempt: index the schedule and repeat the last (capped)
 *  entry forever, so reconnection never gives up on a kiosk left running for days. Exported for tests. */
export const reconnectDelay = (attempt: number): number => SIGNALR_RECONNECT_DELAYS_MS[Math.min(Math.max(0, attempt), SIGNALR_RECONNECT_DELAYS_MS.length - 1)];

/** Same schedule for SignalR's built-in auto-reconnect. Never returns null → reconnects indefinitely
 *  (the previous fixed array gave up after ~17 s, leaving the kiosk permanently blind after one outage). */
const reconnectPolicy: signalR.IRetryPolicy = {
  nextRetryDelayInMilliseconds: ({ previousRetryCount }) => reconnectDelay(previousRetryCount),
};

const build = (path: string): signalR.HubConnection =>
  new signalR.HubConnectionBuilder()
    .withUrl(`${API_URL}${path}`, { accessTokenFactory: async () => getToken() ?? (await fetchWsToken()) ?? "" })
    .withAutomaticReconnect(reconnectPolicy)
    .configureLogging(signalR.LogLevel.Critical)
    .build();

/**
 * Own a hub connection for a kiosk-length lifetime. `withAutomaticReconnect` (with our indefinite
 * policy) covers drops *after* a successful start, but the very first `start()` can still fail (the Pi
 * boots before the backend; a transient network error) and would never be retried — the hub would stay
 * dead for the life of the page. So we retry the initial start forever with the same capped backoff,
 * and rebuild on a full close. `onConnected` runs after each successful (re)start so callers can
 * (re)join their run group. Returns a stop() that cancels retries and stops the connection.
 */
function keepConnected(conn: signalR.HubConnection, onConnected: () => void): () => void {
  let stopped = false;
  let starting = false;
  let attempt = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  const start = async () => {
    if (stopped || starting || conn.state !== signalR.HubConnectionState.Disconnected) return;
    starting = true;
    try {
      await conn.start();
      starting = false;
      attempt = 0;
      if (stopped) {
        void conn.stop().catch(() => {});
        return;
      }
      onConnected();
    } catch {
      starting = false;
      if (stopped) return;
      // Retry the start (backend still unreachable) — capped backoff, forever.
      retryTimer = setTimeout(() => {
        retryTimer = null;
        void start();
      }, reconnectDelay(attempt++));
    }
  };

  // A full close (auto-reconnect exhausted — won't happen with the indefinite policy, but also any
  // close that never entered reconnecting) rebuilds the connection unless we asked it to stop.
  conn.onclose(() => {
    if (!stopped) void start();
  });
  // After the built-in auto-reconnect succeeds, re-run onConnected to re-join the group (SignalR
  // groups are per-connectionId, so a reconnect lands us outside the run group until we re-subscribe).
  conn.onreconnected(() => onConnected());

  void start();

  return () => {
    stopped = true;
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = null;
    void conn.stop().catch(() => {});
  };
}

/** Subscribe to the 1 Hz sensor stream (Diagnóstico / BottomBar). Returns a stop function. */
export function connectDiagnostics(onReading: (_r: SensorReadingsDto) => void): () => void {
  const conn = build("/hubs/diagnostics");
  // Validate at the boundary: drop a malformed/NaN board payload so the gauges keep their last good value.
  const onTick = (r: unknown) => {
    const reading = parseSensorReadings(r);
    if (reading) onReading(reading);
  };
  conn.on("ReadingTick", onTick);
  // The diagnostics tick is broadcast to every connected client (no group), so a reconnect resumes it
  // automatically — nothing to re-join on (re)connect.
  const stop = keepConnected(conn, () => {});
  return () => {
    // Deregister the handler (auto-reconnect would otherwise re-fire it on a stale closure) before stopping.
    conn.off("ReadingTick", onTick);
    stop();
  };
}

export interface RunTelemetryHandlers {
  onTrace?: (_sample: TraceSampleDto) => void;
  onPhase?: (_phase: RunPhase) => void;
  onStatus?: (_status: RunStatusKind) => void;
  onCompleted?: (_executionId: string) => void;
  /** Connection lifecycle for the UI: "reconnecting" when the transport dropped (show "conexão
   *  perdida"), "connected" after the (re)subscribe settled (clear it and re-sync via GET /api/runs/status,
   *  since group messages during the drop were missed). */
  onConnectionChange?: (_state: "reconnecting" | "connected") => void;
}

/** Join a run's group and receive its live trace. Returns a stop function. */
export function connectRunTelemetry(runId: string, handlers: RunTelemetryHandlers): () => void {
  const conn = build("/hubs/telemetry");
  // Validate each board payload at the boundary; an invalid sample/phase/status is dropped rather than
  // pushed to the live chart or the run state.
  const onTrace = (_runId: string, sample: unknown) => {
    const s = parseTraceSample(sample);
    if (s) handlers.onTrace?.(s);
  };
  const onPhase = (_runId: string, phase: unknown) => {
    const p = parseRunPhase(phase);
    if (p) handlers.onPhase?.(p);
  };
  const onStatus = (_runId: string, status: unknown) => {
    const s = parseRunStatus(status);
    if (s) handlers.onStatus?.(s);
  };
  const onCompleted = (_runId: string, executionId: string) => handlers.onCompleted?.(executionId);
  if (handlers.onTrace) conn.on("TraceSample", onTrace);
  if (handlers.onPhase) conn.on("RunPhaseChanged", onPhase);
  if (handlers.onStatus) conn.on("RunStatusChanged", onStatus);
  if (handlers.onCompleted) conn.on("RunCompleted", onCompleted);

  // (Re)join the run's group after every (re)connect — a reconnect lands us outside the group, so
  // without this the trace silently stops forever after any blip. Notify the caller once (re)subscribed.
  const subscribe = () => {
    void conn
      .invoke("SubscribeRun", runId)
      .then(() => handlers.onConnectionChange?.("connected"))
      .catch(() => {
        /* offline: the reconnect/onclose loop will retry the whole connection */
      });
  };
  // Surface the reconnecting state so the RunModal can show "conexão perdida" instead of looking alive.
  conn.onreconnecting(() => handlers.onConnectionChange?.("reconnecting"));

  const stop = keepConnected(conn, subscribe);

  return () => {
    // Deregister handlers (auto-reconnect would re-fire them on stale closures) before stopping.
    conn.off("TraceSample", onTrace);
    conn.off("RunPhaseChanged", onPhase);
    conn.off("RunStatusChanged", onStatus);
    conn.off("RunCompleted", onCompleted);
    stop();
  };
}
