import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  getDeletedShipments: vi.fn(),
  restoreShipment: vi.fn(),
  deleteShipment: vi.fn(),
  getShipmentById: vi.fn(),
  getAllShipments: vi.fn(),
  setShipmentRegistradorVisibility: vi.fn(),
  getShipmentAuditLogs: vi.fn(),
  attachShipmentAuditActorLabels: vi.fn(),
  recordInteractionEvent: vi.fn(),
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, ...dbMocks };
});

import { appRouter } from "./routers";
import { createAdminSession } from "./adminSession";

function adminContext(role: "registrador" | "superadmin", adminId = 9, isWorkspaceIsolated = false): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: { cookie: `servicom_admin_session=${encodeURIComponent(createAdminSession(adminId, role, false, Date.now(), isWorkspaceIsolated))}` } } as TrpcContext["req"],
    res: { cookie: () => {}, clearCookie: () => {} } as TrpcContext["res"],
  };
}

const deletedShipment = {
  id: 42,
  shipmentType: "encomienda",
  registeredByType: "admin",
  registeredById: 9,
  deletedByType: "admin",
  deletedById: 9,
  events: "[]",
};

describe("shipment trash and restoration", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows a Master Admin to restore a shipment from the same space", async () => {
    dbMocks.getDeletedShipments.mockResolvedValue([deletedShipment]);
    dbMocks.restoreShipment.mockResolvedValue(true);

    const caller = appRouter.createCaller(adminContext("superadmin", 9));
    await expect(caller.admin.restoreShipment({ shipmentId: 42 })).resolves.toEqual({ success: true });
    expect(dbMocks.getDeletedShipments).toHaveBeenCalledWith(undefined, undefined, true);
    expect(dbMocks.restoreShipment).toHaveBeenCalledWith(42, expect.objectContaining({ actorType: "admin", actorId: 9 }));
    expect(dbMocks.recordInteractionEvent).toHaveBeenCalledWith(expect.objectContaining({ eventName: "trash_restored" }));
  });

  it("prevents a Registrador from restoring a shipment deleted by another admin", async () => {
    dbMocks.getDeletedShipments.mockResolvedValue([{ ...deletedShipment, deletedById: 22 }]);
    const caller = appRouter.createCaller(adminContext("registrador", 9));

    await expect(caller.admin.restoreShipment({ shipmentId: 42 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.restoreShipment).not.toHaveBeenCalled();
  });

  it("moves a shipment to the reversible trash and records the action", async () => {
    dbMocks.getShipmentById.mockResolvedValue({ id: 42, registeredByType: "admin", registeredById: 9, hiddenFromRegistradoresAt: null });
    dbMocks.deleteShipment.mockResolvedValue(true);
    const caller = appRouter.createCaller(adminContext("registrador", 9));

    await expect(caller.admin.deleteShipment({ id: 42, reason: "Eliminación accidental" })).resolves.toMatchObject({ success: true });
    expect(dbMocks.deleteShipment).toHaveBeenCalledWith(42, expect.objectContaining({ actorType: "admin", actorId: 9 }), "Eliminación accidental");
    expect(dbMocks.recordInteractionEvent).toHaveBeenCalledWith(expect.objectContaining({ eventName: "trash_deleted" }));
  });

  it("prevents a Registrador from deleting a shipment hidden by the Master Admin", async () => {
    dbMocks.getShipmentById.mockResolvedValue({ id: 42, registeredByType: "admin", registeredById: 9, hiddenFromRegistradoresAt: new Date("2026-08-17T12:00:00.000Z") });
    const registrador = appRouter.createCaller(adminContext("registrador", 9));
    await expect(registrador.admin.deleteShipment({ id: 42 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(dbMocks.deleteShipment).not.toHaveBeenCalled();
  });

  it("only allows the Master Admin to see the resolved actor history", async () => {
    dbMocks.getShipmentById.mockResolvedValue({ id: 42, registeredByType: "admin", registeredById: 1 });
    dbMocks.getShipmentAuditLogs.mockResolvedValue([{ id: 7, shipmentId: 42, action: "deleted", actorType: "admin", actorId: 9, actorLabel: "registrador", createdAt: new Date("2026-08-17T12:00:00.000Z") }]);
    dbMocks.attachShipmentAuditActorLabels.mockResolvedValue([{ id: 7, shipmentId: 42, action: "deleted", actorType: "admin", actorId: 9, actorDisplayName: "Operador Lima (operador@servicom.pe)", createdAt: new Date("2026-08-17T12:00:00.000Z") }]);

    const master = appRouter.createCaller(adminContext("superadmin", 1));
    await expect(master.admin.shipmentAudit({ shipmentId: 42 })).resolves.toEqual([expect.objectContaining({ actorDisplayName: "Operador Lima (operador@servicom.pe)" })]);

    const registrador = appRouter.createCaller(adminContext("registrador", 9));
    await expect(registrador.admin.shipmentAudit({ shipmentId: 42 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows only the Master Admin to hide or show an active shipment for Registradores", async () => {
    dbMocks.getShipmentById.mockResolvedValue({ id: 42, registeredByType: "admin", registeredById: 1 });
    dbMocks.setShipmentRegistradorVisibility.mockResolvedValue(true);
    const master = appRouter.createCaller(adminContext("superadmin", 1));
    await expect(master.admin.setShipmentRegistradorVisibility({ shipmentId: 42, hidden: true })).resolves.toEqual({ success: true, hidden: true });
    expect(dbMocks.setShipmentRegistradorVisibility).toHaveBeenCalledWith(42, true, expect.objectContaining({ actorType: "admin", actorId: 1, actorLabel: "superadmin" }), undefined);

    const registrador = appRouter.createCaller(adminContext("registrador", 9));
    await expect(registrador.admin.setShipmentRegistradorVisibility({ shipmentId: 42, hidden: false })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rechaza operaciones directas del Master sobre registros del espacio aislado de Magdalena", async () => {
    dbMocks.getShipmentById.mockResolvedValue({ id: 77, registeredByType: "admin", registeredById: 210001, hiddenFromRegistradoresAt: null });
    const master = appRouter.createCaller(adminContext("superadmin", 1));

    await expect(master.admin.deleteShipment({ id: 77 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(dbMocks.deleteShipment).not.toHaveBeenCalled();
  });

  it("mantiene visibles los registros históricos para el equipo y limita solo el espacio aislado", async () => {
    dbMocks.getAllShipments.mockResolvedValue([]);
    const registrador = appRouter.createCaller(adminContext("registrador", 9));
    await registrador.admin.getAllShipments();
    expect(dbMocks.getAllShipments).toHaveBeenLastCalledWith(undefined, { excludeHiddenForRegistradores: true, ownerAdminId: undefined, excludeIsolatedWorkspaces: true });

    const master = appRouter.createCaller(adminContext("superadmin", 1));
    await master.admin.getAllShipments();
    expect(dbMocks.getAllShipments).toHaveBeenLastCalledWith(undefined, { excludeHiddenForRegistradores: false, ownerAdminId: undefined, excludeIsolatedWorkspaces: true });

    const isolatedMaster = appRouter.createCaller(adminContext("superadmin", 210001, true));
    await isolatedMaster.admin.getAllShipments();
    expect(dbMocks.getAllShipments).toHaveBeenLastCalledWith(undefined, { excludeHiddenForRegistradores: false, ownerAdminId: 210001, excludeIsolatedWorkspaces: false });
  });
});
