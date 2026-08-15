import { describe, expect, it } from "vitest";
import { deriveInteractionInsights } from "./analytics";

const event = (eventName: string, createdAt: string, actorType = "account", actorId: number | null = 7) => ({
  eventName,
  surface: "account",
  actorType,
  actorId,
  createdAt,
});

describe("deriveInteractionInsights", () => {
  it("returns a safe empty baseline without interaction data", () => {
    const result = deriveInteractionInsights([]);

    expect(result).toMatchObject({
      windowDays: 30,
      totalEvents: 0,
      uniqueSessions: 0,
      engagementScore: 0,
      completionRate: 0,
      anomalyScore: 0,
    });
    expect(result.insights[0]).toMatch(/no hay suficientes interacciones/i);
  });

  it("calculates completion and keeps distinct authenticated actors separated", () => {
    const result = deriveInteractionInsights([
      event("shipment_create_started", "2026-08-14T12:00:00.000Z", "account", 7),
      event("shipment_create_completed", "2026-08-14T12:01:00.000Z", "account", 7),
      event("tracking_search_started", "2026-08-14T12:05:00.000Z", "account", 8),
      event("tracking_search_completed", "2026-08-14T12:06:00.000Z", "account", 8),
    ]);

    expect(result.totalEvents).toBe(4);
    expect(result.uniqueSessions).toBe(2);
    expect(result.completionRate).toBe(1);
    expect(result.engagementScore).toBeGreaterThan(0);
    expect(result.topEvents[0].count).toBe(1);
    expect(result.insights.join(" ")).toMatch(/confirmarse|continuidad/i);
  });

  it("does not expose metadata values in the generated insight text", () => {
    const result = deriveInteractionInsights([
      { ...event("receipt_viewed", "2026-08-14T12:00:00.000Z"), metadata: JSON.stringify({ dni: "71234567", phone: "+51970188447" }) },
    ]);

    expect(result.insights.join(" ")).not.toContain("71234567");
    expect(result.insights.join(" ")).not.toContain("+51970188447");
  });
});
