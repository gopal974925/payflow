export interface HealthPayload {
  status: "ok";
  service: string;
  uptimeSeconds: number;
  timestamp: string;
}

export function buildHealthPayload(
  service: string,
  startedAtMs: number,
  nowMs: number = Date.now(),
): HealthPayload {
  return {
    status: "ok",
    service,
    uptimeSeconds: Math.max(0, Math.floor((nowMs - startedAtMs) / 1000)),
    timestamp: new Date(nowMs).toISOString(),
  };
}
