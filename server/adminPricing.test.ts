import { describe, expect, it } from "vitest";
import { calculateAdminShipmentPricing } from "./adminPricing";

describe("calculateAdminShipmentPricing", () => {
  it("calculates an encomienda at 13.5 EUR per kilogram", () => {
    const pricing = calculateAdminShipmentPricing({ shipmentType: "encomienda", weightKg: 2.5 });

    expect(pricing.totalEur).toBe(33.75);
    expect(pricing.manualPrice).toBeNull();
    expect(pricing.notes).toContain("2.5 kg @ 13.5 EUR/kg");
  });

  it("uses the manual price for an encomienda when provided", () => {
    const pricing = calculateAdminShipmentPricing({ shipmentType: "encomienda", weightKg: 2.5, manualPriceEur: "40" });

    expect(pricing.totalEur).toBe(40);
    expect(pricing.manualPrice).toBe(40);
    expect(pricing.notes).toContain("tarifa manual");
  });

  it("keeps the existing document tariffs", () => {
    expect(calculateAdminShipmentPricing({ shipmentType: "documento", docType: "simple", sheetCount: 4 }).totalEur).toBe(45);
    expect(calculateAdminShipmentPricing({ shipmentType: "documento", docType: "simple", sheetCount: 6 }).totalEur).toBe(49);
    expect(calculateAdminShipmentPricing({ shipmentType: "documento", docType: "apostillado", sheetCount: 5 }).totalEur).toBe(50);
    expect(calculateAdminShipmentPricing({ shipmentType: "documento", docType: "apostillado", sheetCount: 6 }).totalEur).toBe(60);
  });
});
