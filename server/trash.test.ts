import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  getDeletedShipments: vi.fn(),
  restoreShipment: vi.fn(),
  deleteShipment: vi.fn(),
  recordInteractionEvent: vi.fn(),
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, ...dbMocks };
});

import { appRouter } from "./routers";
import { createAdminSession } from "./adminSession";

function adminContext(role: "registrador" | "superadmin", adminId = 9): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: { cookie: `servicom_admin_session=${encodeURIComponent(createAdminSession(adminId, role))}` } } as TrpcContext["req"],
    res: { cookie: () => {}, clearCookie: () => {} } as TrpcContext["res"],
  };
}

const deletedShipment = {
  id: 42,
  shipmentType: "encomienda",
  deletedByType: "admin",
  deletedById: 9,
  events: "[]",
};

describe("shipment trash and restoration", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows the Master Admin to restore a shipment deleted by another actor", async () => {
    dbMocks.getDeletedShipments.mockResolvedValue([deletedShipment]);
    dbMocks.restoreShipment.mockResolvedValue(true);

    const caller = appRouter.createCaller(adminContext("superadmin", 1));
    await expect(caller.admin.restoreShipment({ shipmentId: 42 })).resolves.toEqual({ success: true });
    expect(dbMocks.restoreShipment).toHaveBeenCalledWith(42, expect.objectContaining({ actorType: "admin", actorId: 1 }));
    expect(dbMocks.recordInteractionEvent).toHaveBeenCalledWith(expect.objectContaining({ eventName: "trash_restored" }));
  });

  it("prevents a Registrador from restoring a shipment deleted by another admin", async () => {
    dbMocks.getDeletedShipments.mockResolvedValue([{ ...deletedShipment, deletedById: 22 }]);
    const caller = appRouter.createCaller(adminContext("registrador", 9));

    await expect(caller.admin.restoreShipment({ shipmentId: 42 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.restoreShipment).not.toHaveBeenCalled();
  });

  it("moves a shipment to the reversible trash and records the action", async () => {
    dbMocks.deleteShipment.mockResolvedValue(true);
    const caller = appRouter.createCaller(adminContext("registrador", 9));

    await expect(caller.admin.deleteShipment({ id: 42, reason: "Eliminación accidental" })).resolves.toMatchObject({ success: true });
    expect(dbMocks.deleteShipment).toHaveBeenCalledWith(42, expect.objectContaining({ actorType: "admin", actorId: 9 }), "Eliminación accidental");
    expect(dbMocks.recordInteractionEvent).toHaveBeenCalledWith(expect.objectContaining({ eventName: "trash_deleted" }));
  });
});
