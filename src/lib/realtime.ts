/**
 * SignalR clients for the backend's real-time hubs. The JWT is passed via accessTokenFactory
 * (the backend reads it from the query string for hub connections).
 */
import * as signalR from "@microsoft/signalr";
import { API_URL, getToken, type RunPhase, type RunStatusKind, type SensorReadingsDto, type TraceSampleDto } from "./api";

const build = (path: string): signalR.HubConnection =>
  new signalR.HubConnectionBuilder()
    .withUrl(`${API_URL}${path}`, { accessTokenFactory: () => getToken() ?? "" })
    .withAutomaticReconnect()
    .configureLogging(signalR.LogLevel.Critical)
    .build();

/** Subscribe to the 1 Hz sensor stream (Diagnóstico / BottomBar). Returns a stop function. */
export function connectDiagnostics(onReading: (_r: SensorReadingsDto) => void): () => void {
  const conn = build("/hubs/diagnostics");
  const onTick = (r: SensorReadingsDto) => onReading(r);
  conn.on("ReadingTick", onTick);
  const started = conn.start().catch(() => {
    /* offline: callers keep their last value */
  });
  return () => {
    // Deregister the handler (auto-reconnect would otherwise re-fire it on a stale closure) and
    // wait for the start to settle before stopping, so a stop during connection still tears down.
    conn.off("ReadingTick", onTick);
    void started.finally(() => conn.stop());
  };
}

export interface RunTelemetryHandlers {
  onTrace?: (_sample: TraceSampleDto) => void;
  onPhase?: (_phase: RunPhase) => void;
  onStatus?: (_status: RunStatusKind) => void;
  onCompleted?: (_executionId: string) => void;
}

/** Join a run's group and receive its live trace. Returns a stop function. */
export function connectRunTelemetry(runId: string, handlers: RunTelemetryHandlers): () => void {
  const conn = build("/hubs/telemetry");
  const onTrace = (_runId: string, sample: TraceSampleDto) => handlers.onTrace?.(sample);
  const onPhase = (_runId: string, phase: RunPhase) => handlers.onPhase?.(phase);
  const onStatus = (_runId: string, status: RunStatusKind) => handlers.onStatus?.(status);
  const onCompleted = (_runId: string, executionId: string) => handlers.onCompleted?.(executionId);
  if (handlers.onTrace) conn.on("TraceSample", onTrace);
  if (handlers.onPhase) conn.on("RunPhaseChanged", onPhase);
  if (handlers.onStatus) conn.on("RunStatusChanged", onStatus);
  if (handlers.onCompleted) conn.on("RunCompleted", onCompleted);

  const started = conn
    .start()
    .then(() => conn.invoke("SubscribeRun", runId))
    .catch(() => {
      /* offline */
    });

  return () => {
    // Deregister handlers (auto-reconnect would re-fire them on stale closures) and wait for the
    // start to settle before stopping, so a stop issued during connection still tears down.
    conn.off("TraceSample", onTrace);
    conn.off("RunPhaseChanged", onPhase);
    conn.off("RunStatusChanged", onStatus);
    conn.off("RunCompleted", onCompleted);
    void started.finally(() => conn.stop());
  };
}
