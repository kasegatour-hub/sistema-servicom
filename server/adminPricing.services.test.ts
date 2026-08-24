import { describe, expect, it } from "vitest";
import { calculateAdminShipmentPricing } from "./adminPricing";

describe("servicios de documentos Italia–Lima", () => {
  it("aplica apostilla de 40 EUR y 160 soles", () => {
    const pricing = calculateAdminShipmentPricing({ shipmentType: "documento", docType: "apostillado", route: "Torino - Lima", requiresApostilleService: true });
    expect(pricing.servicePriceEur).toBe(40);
    expect(pricing.servicePriceSoles).toBe(160);
    expect(pricing.totalEur).toBe(90);
  });

  it("aplica traducción de 200 soles y admite precios manuales", () => {
    const pricing = calculateAdminShipmentPricing({ shipmentType: "documento", docType: "simple", route: "Torino - Lima", requiresTranslationService: true, serviceManualPriceSoles: 250, serviceManualPriceEur: 12 });
    expect(pricing.servicePriceSoles).toBe(250);
    expect(pricing.totalEur).toBe(45);
  });

  it("no aplica estos servicios fuera de Torino–Lima", () => {
    const pricing = calculateAdminShipmentPricing({ shipmentType: "documento", route: "Lima - Torino", requiresApostilleService: true, requiresTranslationService: true });
    expect(pricing.servicePriceEur).toBe(0);
    expect(pricing.servicePriceSoles).toBe(0);
  });
});
