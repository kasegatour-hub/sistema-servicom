import { describe, expect, it } from "vitest";
import { calculateAdminShipmentPricing } from "./adminPricing";

describe("calculateAdminShipmentPricing", () => {
  it("calculates an encomienda at 13.5 EUR per kilogram", () => {
    const pricing = calculateAdminShipmentPricing({ shipmentType: "encomienda", weightKg: 2.5 });

    expect(pricing.totalEur).toBe(33.75);
    expect(pricing.manualPrice).toBeNull();
    expect(pricing.notes).toContain("2.5 kg @ 13.5 EUR/kg");
  });

  it("applies the Torino–Lima automatic tiers from 1 to 5 kg and from 6 to 10 kg", () => {
    expect(calculateAdminShipmentPricing({ shipmentType: "encomienda", weightKg: 1, route: "Torino - Lima" }).totalEur).toBe(10);
    expect(calculateAdminShipmentPricing({ shipmentType: "encomienda", weightKg: 5, route: "Torino - Lima" }).totalEur).toBe(10);
    expect(calculateAdminShipmentPricing({ shipmentType: "encomienda", weightKg: 6, route: "Torino - Lima" }).totalEur).toBe(15);
    expect(calculateAdminShipmentPricing({ shipmentType: "encomienda", weightKg: 10, route: "Torino - Lima" }).totalEur).toBe(15);
  });

  it("requires a manual price for Torino–Lima above 10 kg", () => {
    const pricing = calculateAdminShipmentPricing({ shipmentType: "encomienda", weightKg: 11, route: "Torino - Lima" });

    expect(pricing.totalEur).toBe(0);
    expect(pricing.notes).toContain("requiere Precio manual en EUR");
    expect(calculateAdminShipmentPricing({ shipmentType: "encomienda", weightKg: 11, route: "Torino - Lima", manualPriceEur: "120" }).totalEur).toBe(120);
  });

  it("uses the manual price for an encomienda when provided", () => {
    const pricing = calculateAdminShipmentPricing({ shipmentType: "encomienda", weightKg: 2.5, manualPriceEur: "40" });

    expect(pricing.totalEur).toBe(40);
    expect(pricing.manualPrice).toBe(40);
    expect(pricing.notes).toContain("tarifa manual");
  });

  it("adds an extra amount to both automatic and manual shipment prices", () => {
    expect(calculateAdminShipmentPricing({ shipmentType: "encomienda", weightKg: 2, extraPriceEur: "5.50" })).toMatchObject({ totalEur: 32.5, extraPriceEur: 5.5 });
    expect(calculateAdminShipmentPricing({ shipmentType: "documento", manualPriceEur: "50", extraPriceEur: 3 })).toMatchObject({ totalEur: 53, extraPriceEur: 3 });
  });

  it("preserves an explicitly entered manual price for a document", () => {
    const pricing = calculateAdminShipmentPricing({ shipmentType: "documento", manualPriceEur: "50" });

    expect(pricing.totalEur).toBe(50);
    expect(pricing.manualPrice).toBe(50);
  });

  it("keeps the existing document tariffs", () => {
    expect(calculateAdminShipmentPricing({ shipmentType: "documento", docType: "simple", sheetCount: 4 }).totalEur).toBe(45);
    expect(calculateAdminShipmentPricing({ shipmentType: "documento", docType: "simple", sheetCount: 6 }).totalEur).toBe(49);
    expect(calculateAdminShipmentPricing({ shipmentType: "documento", docType: "apostillado", sheetCount: 5 }).totalEur).toBe(50);
    expect(calculateAdminShipmentPricing({ shipmentType: "documento", docType: "apostillado", sheetCount: 6 }).totalEur).toBe(60);
  });

  it("adds flexible document items using automatic and manual prices", () => {
    const pricing = calculateAdminShipmentPricing({
      shipmentType: "documento",
      docType: "apostillado",
      sheetCount: 1,
      documentItems: [
        { docType: "simple", sheetCount: 6 },
        { docType: "apostillado", sheetCount: 2, manualPriceEur: "35" },
      ],
    });

    expect(pricing.additionalDocuments.items).toHaveLength(2);
    expect(pricing.additionalDocuments.items[0]).toMatchObject({ automaticPriceEur: 49, finalPriceEur: 49, usesManualPrice: false });
    expect(pricing.additionalDocuments.items[1]).toMatchObject({ automaticPriceEur: 50, finalPriceEur: 35, usesManualPrice: true });
    expect(pricing.totalEur).toBe(134);
    expect(pricing.notes).toContain("Adicionales:");
  });
});
