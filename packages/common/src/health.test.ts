import { describe, it, expect } from "vitest";
import { buildHealthPayload } from "./health";

describe("buildHealthPayload", () => {
  it("reports ok with the service name", () => {
    const payload = buildHealthPayload("auth-service", 0, 5000);
    expect(payload.status).toBe("ok");
    expect(payload.service).toBe("auth-service");
  });

  it("computes uptime in whole seconds", () => {
    expect(buildHealthPayload("auth-service", 1000, 6500).uptimeSeconds).toBe(5);
  });

  it("never returns negative uptime", () => {
    expect(buildHealthPayload("auth-service", 9000, 1000).uptimeSeconds).toBe(0);
  });
});
