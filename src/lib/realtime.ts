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
    .configureLogging(signalR.LogLevel.Warning)
    .build();

/** Subscribe to the 1 Hz sensor stream (Diagnóstico / BottomBar). Returns a stop function. */
export function connectDiagnostics(onReading: (_r: SensorReadingsDto) => void): () => void {
  const conn = build("/hubs/diagnostics");
  conn.on("ReadingTick", onReading);
  conn.start().catch(() => {
    /* offline: callers keep their last value */
  });
  return () => void conn.stop();
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
  if (handlers.onTrace) conn.on("TraceSample", (_runId: string, sample: TraceSampleDto) => handlers.onTrace?.(sample));
  if (handlers.onPhase) conn.on("RunPhaseChanged", (_runId: string, phase: RunPhase) => handlers.onPhase?.(phase));
  if (handlers.onStatus) conn.on("RunStatusChanged", (_runId: string, status: RunStatusKind) => handlers.onStatus?.(status));
  if (handlers.onCompleted) conn.on("RunCompleted", (_runId: string, executionId: string) => handlers.onCompleted?.(executionId));

  conn
    .start()
    .then(() => conn.invoke("SubscribeRun", runId))
    .catch(() => {
      /* offline */
    });

  return () => void conn.stop();
}
