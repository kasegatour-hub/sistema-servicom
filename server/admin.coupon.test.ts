import { describe, expect, it, vi, beforeEach } from "vitest";

const dbMocks = vi.hoisted(() => ({
  createDiscountCoupon: vi.fn(),
  getDiscountCouponByCode: vi.fn(),
  incrementDiscountCouponRedemption: vi.fn(),
  createShipment: vi.fn(),
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, ...dbMocks };
});

import { appRouter } from "./routers";
import { createAdminSession } from "./adminSession";
import type { TrpcContext } from "./_core/context";

function createAdminContext(role: "registrador" | "superadmin" = "registrador"): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: { cookie: `servicom_admin_session=${encodeURIComponent(createAdminSession(9, role))}` } } as TrpcContext["req"],
    res: { cookie: () => {}, clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("admin coupons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.createDiscountCoupon.mockResolvedValue({ id: 77 });
    dbMocks.createShipment.mockResolvedValue({ id: 101 });
    dbMocks.incrementDiscountCouponRedemption.mockResolvedValue(true);
  });

  it("allows a registrador to generate a fixed 25 percent coupon with a calendar", async () => {
    const caller = appRouter.createCaller(createAdminContext("registrador"));
    const result = await caller.admin.createCoupon({ code: "servi25-redes", startsAt: "2026-08-14", endsAt: "2026-08-31" });

    expect(result).toMatchObject({ code: "SERVI25-REDES", discountPercent: 25 });
    expect(dbMocks.createDiscountCoupon).toHaveBeenCalledWith(expect.objectContaining({ code: "SERVI25-REDES", createdByAdminId: 9 }));
  });

  it("rejects a calendar whose end is before its start", async () => {
    const caller = appRouter.createCaller(createAdminContext("superadmin"));
    await expect(caller.admin.createCoupon({ startsAt: "2026-08-31", endsAt: "2026-08-14" })).rejects.toThrow("fecha final");
    expect(dbMocks.createDiscountCoupon).not.toHaveBeenCalled();
  });

  it("applies the valid coupon to an administrative shipment and persists the final total", async () => {
    dbMocks.getDiscountCouponByCode.mockResolvedValue({
      id: 12,
      code: "SERVI25-REDES",
      discountPercent: "25.00",
      startsAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      isActive: 1,
      redeemedCount: 0,
    });
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.createShipment({
      status: "En agencia",
      senderName: "Ana",
      senderLastName: "Pérez",
      recipientName: "Marco",
      recipientLastName: "Rossi",
      shipmentType: "documento",
      docType: "apostillado",
      sheetCount: 1,
      weightKg: 1,
      manualPriceEur: null,
      paymentStatus: "Falta cancelar",
      route: "Lima - Torino",
      couponCode: " servi25-redes ",
    });

    expect(result.finalPriceEur).toBe(37.5);
    expect(result.discountPercent).toBe(25);
    const args = dbMocks.createShipment.mock.calls[0];
    expect(args[20]).toBe("SERVI25-REDES");
    expect(args[21]).toBe(50);
    expect(args[22]).toBe(25);
    expect(args[23]).toBe(12.5);
    expect(args[24]).toBe(37.5);
    expect(dbMocks.incrementDiscountCouponRedemption).toHaveBeenCalledWith(12);
  });
});
