import { describe, expect, it } from "vitest";
import { calculateAdminShipmentPricing } from "./adminPricing";

describe("calculateAdminShipmentPricing — provincia Italia–Lima", () => {
  it("suma el precio provincial cobrado al cliente y aplica S/ 8 para documentos por defecto", () => {
    const result = calculateAdminShipmentPricing({
      shipmentType: "documento",
      docType: "simple",
      sheetCount: 1,
      route: "Torino - Lima",
      isProvinceDelivery: true,
      provinceCustomerPriceEur: 15,
      provinceOperationalCostSoles: null,
      provinceCarrier: "shalom",
    });

    expect(result.totalEur).toBe(60);
    expect(result.provinceCustomerPriceEur).toBe(15);
    expect(result.provinceOperationalCostSoles).toBe(8);
    expect(result.provinceCarrier).toBe("shalom");
    expect(result.notes).toContain("costo operativo S/8.00");
  });

  it("calcula 10 EUR hasta 5 kg y 15 EUR entre más de 5 y 10 kg para documentos y encomiendas", () => {
    for (const shipmentType of ["documento", "encomienda"] as const) {
      const fiveKg = calculateAdminShipmentPricing({ shipmentType, route: "Torino - Lima", weightKg: 5, isProvinceDelivery: true });
      const sixKg = calculateAdminShipmentPricing({ shipmentType, route: "Torino - Lima", weightKg: 6, isProvinceDelivery: true });
      const tenKg = calculateAdminShipmentPricing({ shipmentType, route: "Torino - Lima", weightKg: 10, isProvinceDelivery: true });
      expect(fiveKg.provinceCustomerPriceEur).toBe(10);
      expect(sixKg.provinceCustomerPriceEur).toBe(15);
      expect(tenKg.provinceCustomerPriceEur).toBe(15);
    }
  });

  it("mantiene 15 EUR como base sobre 10 kg y calcula un extra proporcional editable", () => {
    const result = calculateAdminShipmentPricing({ shipmentType: "encomienda", route: "Torino - Lima", weightKg: 10.1, isProvinceDelivery: true });
    expect(result.provinceCustomerPriceEur).toBe(15);
    expect(result.provinceExtraPriceEur).toBe(0.15);
    expect(result.totalEur).toBe(15.15);
    expect(result.notes).toContain("extra provincial +0.15 EUR");

    const manual = calculateAdminShipmentPricing({ shipmentType: "encomienda", route: "Torino - Lima", weightKg: 12, isProvinceDelivery: true, provinceExtraPriceEur: 9.5 });
    expect(manual.provinceCustomerPriceEur).toBe(15);
    expect(manual.provinceExtraPriceEur).toBe(9.5);
    expect(manual.totalEur).toBe(24.5);
  });

  it("no activa provincia fuera de Italia–Lima", () => {
    const result = calculateAdminShipmentPricing({
      shipmentType: "documento",
      route: "Lima - Torino",
      isProvinceDelivery: true,
      provinceCustomerPriceEur: 20,
      provinceOperationalCostSoles: 12,
      provinceCarrier: "olva",
    });

    expect(result.isProvinceDelivery).toBe(false);
    expect(result.provinceCustomerPriceEur).toBe(0);
    expect(result.provinceOperationalCostSoles).toBe(0);
    expect(result.provinceCarrier).toBeNull();
    expect(result.totalEur).toBe(50);
  });
});
