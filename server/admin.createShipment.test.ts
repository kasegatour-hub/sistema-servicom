import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  createShipment: vi.fn(),
  isEncomiendaEnabledForRoute: vi.fn(),
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, createShipment: dbMocks.createShipment, isEncomiendaEnabledForRoute: dbMocks.isEncomiendaEnabledForRoute };
});

import { appRouter } from "./routers";
import { createAdminSession } from "./adminSession";
import type { TrpcContext } from "./_core/context";

function createAdminContext(role: "registrador" | "superadmin" = "registrador"): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: { cookie: `servicom_admin_session=${encodeURIComponent(createAdminSession(9, role))}` },
    } as TrpcContext["req"],
    res: { cookie: () => {}, clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("admin.createShipment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.createShipment.mockResolvedValue({ id: 101 });
    dbMocks.isEncomiendaEnabledForRoute.mockResolvedValue(true);
  });

  it("creates a document with an automatic DOC code and document tariff notes", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.createShipment({
      status: "En agencia",
      senderName: "Ana",
      senderLastName: "Pérez",
      recipientName: "Marco",
      recipientLastName: "Rossi",
      shipmentType: "documento",
      docType: "simple",
      sheetCount: 6,
      weightKg: 1,
      manualPriceEur: null,
      paymentStatus: "Falta cancelar",
      route: "Lima - Torino",
      documentItems: [{ docType: "apostillado", sheetCount: 2, manualPriceEur: "35" }],
      contentChecklist: ["Documento principal", "Copia apostillada"],
    });

    expect(result.code).toMatch(/^DOC-\d{4}-[A-Z0-9]{5}$/);
    expect(result.trackingUrl).toContain(`order=${result.orderNumber}`);
    expect(result.trackingUrl).toContain(`code=${result.code}`);
    expect(dbMocks.createShipment).toHaveBeenCalledTimes(1);
    const args = dbMocks.createShipment.mock.calls[0];
    expect(args[13]).toBe("documento");
    expect(args[14]).toBe(1);
    expect(args[15]).toBeNull();
    expect(args[16]).toBe(0);
    expect(args[11]).toContain("Documento simple (6 hojas): 49 EUR");
    expect(JSON.parse(args[26])).toMatchObject([{ docType: "apostillado", sheetCount: 2, finalPriceEur: 35, usesManualPrice: true }]);
    expect(JSON.parse(args[27])).toEqual(["Documento principal", "Copia apostillada"]);
    expect(args[32]).toBe("simple");
    expect(args[33]).toBe(6);
    expect(args[34]).toBe(false);
  });

  it("persists the apostille service only for a Torino–Lima document", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await caller.admin.createShipment({
      status: "En agencia",
      senderName: "Ana",
      senderLastName: "Pérez",
      recipientName: "Marco",
      recipientLastName: "Rossi",
      shipmentType: "documento",
      docType: "simple",
      sheetCount: 1,
      weightKg: 1,
      paymentStatus: "Falta cancelar",
      route: "Torino - Lima",
      requiresApostilleService: true,
      contentChecklist: ["Documento principal"],
    });

    expect(dbMocks.createShipment.mock.calls[0][34]).toBe(true);
  });

  it("rejects the apostille service outside the Torino–Lima document route", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(caller.admin.createShipment({
      status: "En agencia",
      senderName: "Ana",
      senderLastName: "Pérez",
      recipientName: "Marco",
      recipientLastName: "Rossi",
      shipmentType: "documento",
      docType: "simple",
      sheetCount: 1,
      weightKg: 1,
      paymentStatus: "Falta cancelar",
      route: "Lima - Torino",
      requiresApostilleService: true,
      contentChecklist: ["Documento principal"],
    })).rejects.toThrow(/Torino - Lima/);
    expect(dbMocks.createShipment).not.toHaveBeenCalled();
  });

  it("creates an encomienda with an ENC code, weight and manual tariff", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.createShipment({
      status: "Por entregar en agencia",
      senderName: "Ana",
      senderLastName: "Pérez",
      recipientName: "Marco",
      recipientLastName: "Rossi",
      shipmentType: "encomienda",
      docType: "apostillado",
      sheetCount: 1,
      weightKg: 2.5,
      manualPriceEur: "40",
      paymentStatus: "Pagado",
      route: "Lima - Torino",
      contentChecklist: ["Paquete sellado"],
    });

    expect(result.code).toMatch(/^ENC-\d{4}-[A-Z0-9]{5}$/);
    expect(dbMocks.createShipment).toHaveBeenCalledTimes(1);
    const args = dbMocks.createShipment.mock.calls[0];
    expect(args[13]).toBe("encomienda");
    expect(args[14]).toBe(2.5);
    expect(args[15]).toBe(40);
    expect(args[16]).toBe(0);
    expect(args[11]).toContain("Encomienda (2.5 kg, tarifa manual): 40.00 EUR");
  });

  it("blocks Lima–Torino encomiendas when the Master Admin has disabled that route", async () => {
    dbMocks.isEncomiendaEnabledForRoute.mockResolvedValue(false);
    const caller = appRouter.createCaller(createAdminContext());

    await expect(caller.admin.createShipment({
      status: "En agencia",
      senderName: "Ana",
      senderLastName: "Pérez",
      recipientName: "Marco",
      recipientLastName: "Rossi",
      shipmentType: "encomienda",
      docType: "apostillado",
      sheetCount: 1,
      weightKg: 2,
      paymentStatus: "Falta cancelar",
      route: "Lima - Torino",
      contentChecklist: ["Paquete sellado"],
    })).rejects.toThrow(/desactivadas temporalmente/i);

    expect(dbMocks.createShipment).not.toHaveBeenCalled();
  });
});
