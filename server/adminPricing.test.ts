import { describe, expect, it } from "vitest";
import { calculateAdminShipmentPricing } from "./adminPricing";

describe("calculateAdminShipmentPricing", () => {
  it("calculates an encomienda at 15 EUR per kilogram", () => {
    const pricing = calculateAdminShipmentPricing({ shipmentType: "encomienda", weightKg: 2.5 });

    expect(pricing.totalEur).toBe(37.5);
    expect(pricing.manualPrice).toBeNull();
    expect(pricing.notes).toContain("2.5 kg @ 15 EUR/kg");
  });

  it("uses 15 EUR per kilogram as the normal Torino–Lima base", () => {
    expect(calculateAdminShipmentPricing({ shipmentType: "encomienda", weightKg: 1, route: "Torino - Lima" }).totalEur).toBe(15);
    expect(calculateAdminShipmentPricing({ shipmentType: "encomienda", weightKg: 5, route: "Torino - Lima" }).totalEur).toBe(75);
    expect(calculateAdminShipmentPricing({ shipmentType: "encomienda", weightKg: 10, route: "Torino - Lima" }).totalEur).toBe(150);
  });

  it("applies provincial tiers only when province is enabled", () => {
    const normal = calculateAdminShipmentPricing({ shipmentType: "encomienda", weightKg: 10, route: "Torino - Lima" });
    const provincial = calculateAdminShipmentPricing({ shipmentType: "encomienda", weightKg: 10, route: "Torino - Lima", isProvinceDelivery: true });
    expect(normal.totalEur).toBe(150);
    expect(provincial.provinceCustomerPriceEur).toBe(15);
    expect(provincial.totalEur).toBe(165);
  });

  it("incluye en notas solo el tramo provincial que se cobró", () => {
    const upToFiveKg = calculateAdminShipmentPricing({ shipmentType: "encomienda", weightKg: 5, route: "Torino - Lima", isProvinceDelivery: true, provinceCarrier: "shalom" });
    const aboveFiveKg = calculateAdminShipmentPricing({ shipmentType: "encomienda", weightKg: 10, route: "Torino - Lima", isProvinceDelivery: true, provinceCarrier: "shalom" });

    expect(upToFiveKg.notes).toContain("+10.00 EUR (hasta 5 kg)");
    expect(upToFiveKg.notes).not.toContain("+15.00 EUR");
    expect(aboveFiveKg.notes).toContain("+15.00 EUR (más de 5 kg)");
    expect(aboveFiveKg.notes).not.toContain("+10.00 EUR");
  });

  it("uses the 15 EUR/kg base above 10 kg and keeps manual base pricing available", () => {
    const pricing = calculateAdminShipmentPricing({ shipmentType: "encomienda", weightKg: 11, route: "Torino - Lima" });
    expect(pricing.totalEur).toBe(165);
    expect(pricing.notes).toContain("11 kg @ 15 EUR/kg");
    expect(calculateAdminShipmentPricing({ shipmentType: "encomienda", weightKg: 11, route: "Torino - Lima", manualPriceEur: "120" }).totalEur).toBe(120);
  });

  it("uses the manual price for an encomienda when provided", () => {
    const pricing = calculateAdminShipmentPricing({ shipmentType: "encomienda", weightKg: 2.5, manualPriceEur: "40" });

    expect(pricing.totalEur).toBe(40);
    expect(pricing.manualPrice).toBe(40);
    expect(pricing.notes).toContain("tarifa manual");
  });

  it("adds an extra amount to both automatic and manual shipment prices", () => {
    expect(calculateAdminShipmentPricing({ shipmentType: "encomienda", weightKg: 2, extraPriceEur: "5.50" })).toMatchObject({ totalEur: 35.5, extraPriceEur: 5.5 });
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

  it("regenera una nota antigua cuando cambia la tarifa automática", () => {
    const refreshed = calculateAdminShipmentPricing({
      shipmentType: "encomienda",
      weightKg: 1,
      route: "Torino - Lima",
      notes: "Tarifa: Encomienda Torino–Lima (1 kg @ 13.5 EUR/kg): 13.50 EUR",
    });

    expect(refreshed.notes).toContain("1 kg @ 15 EUR/kg");
    expect(refreshed.notes).toContain("15.00 EUR");
    expect(refreshed.notes).not.toContain("13.5");
    expect(refreshed.notes).not.toContain("13.50");
  });

  it("actualiza la parte automática sin perder la nota libre separada", () => {
    const before = calculateAdminShipmentPricing({ shipmentType: "encomienda", weightKg: 1, route: "Torino - Lima" });
    const withFreeform = `${before.notes}\n\nLlamar antes de entregar.`;
    const refreshed = calculateAdminShipmentPricing({ shipmentType: "encomienda", weightKg: 2, route: "Torino - Lima", notes: withFreeform });

    expect(refreshed.notes).toContain("2 kg @ 15 EUR/kg");
    expect(refreshed.notes).toContain("30.00 EUR");
    expect(refreshed.notes).toContain("Llamar antes de entregar.");
    expect(refreshed.notes).not.toContain("1 kg @ 15 EUR/kg");
  });


describe("precio manual multimoneda", () => {
  it.each([
    ["EUR", "40.00 EUR"],
    ["USD", "40.00 USD"],
    ["PEN", "40.00 PEN"],
  ] as const)("conserva la moneda %s en el total y las notas", (currency, label) => {
    const pricing = calculateAdminShipmentPricing({ shipmentType: "documento", manualPriceEur: "40", manualPriceCurrency: currency, route: "Lima - Provincia", isProvinceDelivery: true });
    expect(pricing.manualPriceCurrency).toBe(currency);
    expect(pricing.totalEur).toBe(50);
    expect(pricing.notes).toContain(`tarifa manual): ${label}`);
    expect(pricing.notes).toContain("+10.00");
  });
});
