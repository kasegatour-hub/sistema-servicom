import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("shipment.search", () => {
  it("should find a shipment by order number and code", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.shipment.search({
      orderNumber: "352 099 2723",
      code: "CA06721WB",
    });

    expect(result).toBeDefined();
    expect(result.orderNumber).toBe("352 099 2723");
    expect(result.code).toBe("CA06721WB");
    expect(result.status).toBe("Entregado");
    expect(result.events).toBeDefined();
    expect(Array.isArray(result.events)).toBe(true);
    expect(result.events.length).toBeGreaterThan(0);
  });

  it("should parse events correctly", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.shipment.search({
      orderNumber: "352 099 2723",
      code: "CA06721WB",
    });

    const firstEvent = result.events[0];
    expect(firstEvent.stage).toBe("Registrado");
    expect(firstEvent.date).toBeDefined();
    expect(firstEvent.description).toBeDefined();
  });

  it("should throw NOT_FOUND for non-existent shipment", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.shipment.search({
        orderNumber: "999 999 9999",
        code: "INVALID",
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.code).toBe("NOT_FOUND");
      expect(error.message).toBe("Envío no encontrado");
    }
  });

  it("should validate required fields", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.shipment.search({
        orderNumber: "",
        code: "CA06721WB",
      });
      expect.fail("Should have thrown a validation error");
    } catch (error: any) {
      expect(error.code).toBe("BAD_REQUEST");
    }
  });

  it("should have all 5 stages in the timeline", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.shipment.search({
      orderNumber: "352 099 2723",
      code: "CA06721WB",
    });

    const stages = result.events.map((e: any) => e.stage);
    expect(stages).toContain("Registrado");
    expect(stages).toContain("En origen");
    expect(stages).toContain("En tránsito");
    expect(stages).toContain("En destino");
    expect(stages).toContain("Entregado");
  });
});
