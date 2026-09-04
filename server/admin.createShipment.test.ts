import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  createShipment: vi.fn(),
  isEncomiendaEnabledForRoute: vi.fn(),
  listShipmentOrderNumbersByPrefix: vi.fn(),
  getDb: vi.fn(),
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, createShipment: dbMocks.createShipment, isEncomiendaEnabledForRoute: dbMocks.isEncomiendaEnabledForRoute, listShipmentOrderNumbersByPrefix: dbMocks.listShipmentOrderNumbersByPrefix, getDb: dbMocks.getDb };
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
    dbMocks.listShipmentOrderNumbersByPrefix.mockResolvedValue([]);
    dbMocks.getDb.mockResolvedValue(undefined);
  });

  it("creates a document with an automatic short code and document tariff notes", async () => {
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

    expect(result.code).toMatch(/^\d[A-Z]{3}$/);
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
    expect(args[29]).toMatchObject({ type: "admin", id: 9 });
  });

  it("normalizes local Peruvian phones before persisting an administrative shipment", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await caller.admin.createShipment({
      status: "En agencia",
      senderName: "Yuliana",
      senderLastName: "Leandro",
      senderDni: "75240795",
      senderPhone: "999 008 125",
      recipientName: "Ana",
      recipientLastName: "Huamancayo",
      recipientDni: "28315728",
      recipientPhone: "945 612 378",
      shipmentType: "documento",
      docType: "simple",
      sheetCount: 1,
      weightKg: 1,
      paymentStatus: "Falta cancelar",
      route: "Lima - Torino",
      contentChecklist: ["Documento principal"],
    });

    const args = dbMocks.createShipment.mock.calls[0];
    expect(args[6]).toBe("+51 999 008 125");
    expect(args[10]).toBe("+51 945 612 378");
  });

  it("persists the apostille service for a document on any route", async () => {
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

  it("derives province delivery from the Torino–Lima + provincia route", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.createShipment({
      status: "En agencia",
      senderName: "Ana",
      senderLastName: "Pérez",
      recipientName: "Marco",
      recipientLastName: "Rossi",
      shipmentType: "encomienda",
      weightKg: 12,
      paymentStatus: "Falta cancelar",
      route: "Torino - Lima + provincia",
      destinationAddress: "SHALOM — Agencia Huancayo · Av. Ferrocarril 123",
      contentChecklist: ["Paquete sellado"],
    });

    const args = dbMocks.createShipment.mock.calls[0];
    expect(args[18]).toBe("Torino - Lima + provincia");
    expect(args[20]).toContain("Agencia Huancayo");
    expect(args[40]).toBe(true);
    expect(result.provinceCustomerPriceEur).toBe(15);
    expect(result.provinceExtraPriceEur).toBe(4);
  });

  it("accepts apostille and translation services on Provincia → Lima", async () => {
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
      route: "Provincia - Lima",
      requiresApostilleService: true,
      requiresTranslationService: true,
      contentChecklist: ["Documento principal"],
    });
    expect(dbMocks.createShipment).toHaveBeenCalledTimes(1);
  });

  it("creates an encomienda with a short code, weight and manual tariff", async () => {
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

    expect(result.code).toMatch(/^\d[A-Z]{3}$/);
    expect(result.orderNumber).toMatch(/^\d{4}-\d{4}$/);
    expect(dbMocks.createShipment).toHaveBeenCalledTimes(1);
    const args = dbMocks.createShipment.mock.calls[0];
    expect(args[0]).toBe(result.orderNumber);
    expect(args[13]).toBe("encomienda");
    expect(args[14]).toBe(2.5);
    expect(args[15]).toBe(40);
    expect(args[16]).toBe(0);
    expect(args[11]).toContain("Encomienda (2.5 kg, tarifa manual): 40.00 EUR");
  });

  it("persists 13 EUR/kg when the administrative workspace is identified by Kasega email", async () => {
    dbMocks.getDb.mockResolvedValue({ select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ name: "Magdalena", email: "magda.barreto.alv@gmail.com" }] }) }) }) });
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.createShipment({
      status: "En agencia", senderName: "Ana", senderLastName: "Pérez", recipientName: "Marco", recipientLastName: "Rossi",
      shipmentType: "encomienda", weightKg: 2, paymentStatus: "Falta cancelar", route: "Lima - Torino", contentChecklist: ["Paquete sellado"],
    });
    const args = dbMocks.createShipment.mock.calls[0];
    expect(result.finalPriceEur).toBe(26);
    expect(args[22]).toBe(26);
    expect(args[25]).toBe(26);
    expect(args[11]).toContain("2 kg @ 13 EUR/kg");
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
