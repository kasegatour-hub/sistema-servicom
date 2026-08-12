import { describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getShipmentByOrderAndCode: vi.fn(),
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, getShipmentByOrderAndCode: dbMocks.getShipmentByOrderAndCode };
});

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const fixture = {
  orderNumber: "3520992723",
  code: "CA06721WB",
  status: "Entregado",
  paymentStatus: "Pagado",
  events: JSON.stringify([
    { stage: "En agencia", date: "2026-07-01T08:00:00Z", description: "Recibido en agencia" },
    { stage: "En tránsito", date: "2026-07-03T14:15:00Z", description: "En camino" },
    { stage: "En destino", date: "2026-07-06T16:20:00Z", description: "Llegó a destino" },
    { stage: "Entregado", date: "2026-07-07T19:30:37.054Z", description: "Entregado" },
  ]),
};

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("shipment.search", () => {
  it("finds a shipment by normalized order number and code", async () => {
    dbMocks.getShipmentByOrderAndCode.mockResolvedValue(fixture);
    const result = await appRouter.createCaller(createPublicContext()).shipment.search({
      orderNumber: "352 099 2723",
      code: "ca06721wb",
    });
    expect(result.orderNumber).toBe("3520992723");
    expect(result.code).toBe("CA06721WB");
    expect(result.status).toBe("Entregado");
    expect(result.paymentStatus).toBe("Pagado");
    expect(result.events).toHaveLength(4);
  });

  it("parses events and preserves supported stages", async () => {
    dbMocks.getShipmentByOrderAndCode.mockResolvedValue(fixture);
    const result = await appRouter.createCaller(createPublicContext()).shipment.search({
      orderNumber: "3520992723",
      code: "CA06721WB",
    });
    const stages = result.events.map((event: any) => event.stage);
    expect(stages).toEqual(["En agencia", "En tránsito", "En destino", "Entregado"]);
  });

  it("throws NOT_FOUND for a missing shipment", async () => {
    dbMocks.getShipmentByOrderAndCode.mockResolvedValue(undefined);
    await expect(appRouter.createCaller(createPublicContext()).shipment.search({
      orderNumber: "9999999999",
      code: "INVALID",
    })).rejects.toMatchObject({ code: "NOT_FOUND", message: "Envío no encontrado" });
  });

  it("validates required fields", async () => {
    await expect(appRouter.createCaller(createPublicContext()).shipment.search({
      orderNumber: "",
      code: "CA06721WB",
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
