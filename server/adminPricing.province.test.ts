import { describe, expect, it } from "vitest";
import { calculateAdminShipmentPricing } from "./adminPricing";

describe("calculateAdminShipmentPricing — provincia Italia–Lima", () => {
  it("suma el importe extra a la tarifa automática o manual y permite descontarlo sin reemplazar la base", () => {
    const automatic = calculateAdminShipmentPricing({ shipmentType: "encomienda", weightKg: 2, extraPriceEur: 9 });
    expect(automatic.totalEur).toBe(36);
    expect(automatic.manualPrice).toBeNull();

    const manual = calculateAdminShipmentPricing({ shipmentType: "encomienda", weightKg: 2, manualPriceEur: 40, extraPriceEur: 9 });
    expect(manual.totalEur).toBe(49);

    const discounted = calculateAdminShipmentPricing({ shipmentType: "encomienda", weightKg: 2, manualPriceEur: 40, extraPriceEur: 9, extraDiscountEur: 4 });
    expect(discounted.totalEur).toBe(45);
    expect(discounted.extraPriceEur).toBe(9);
    expect(discounted.extraDiscountEur).toBe(4);
    expect(discounted.netExtraPriceEur).toBe(5);
    expect(discounted.notes).toContain("descuento del extra: -4.00 EUR");
  });

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
    expect(result.notes).not.toContain("costo operativo");
  });

  it("aplica tarifa fija de 10 EUR de 1 a 5 kg y 15 EUR sobre 5 hasta 15 kg", () => {
    for (const shipmentType of ["documento", "encomienda"] as const) {
      for (const weightKg of [1, 2, 5]) {
        expect(calculateAdminShipmentPricing({ shipmentType, route: "Torino - Lima", weightKg, isProvinceDelivery: true }).provinceCustomerPriceEur).toBe(10);
      }
      for (const weightKg of [5.1, 7, 10, 15]) {
        expect(calculateAdminShipmentPricing({ shipmentType, route: "Torino - Lima", weightKg, isProvinceDelivery: true }).provinceCustomerPriceEur).toBe(15);
      }
    }
  });

  it("calcula 1,50 EUR únicamente por cada kg excedente sobre 15 kg y permite editarlo", () => {
    const result = calculateAdminShipmentPricing({ shipmentType: "encomienda", route: "Torino - Lima", weightKg: 15.1, isProvinceDelivery: true });
    expect(result.provinceCustomerPriceEur).toBe(15);
    expect(result.provinceExtraPriceEur).toBe(0.15);
    expect(result.totalEur).toBe(150.15);
    expect(result.notes).toContain("excedente sobre 15 kg");

    const manual = calculateAdminShipmentPricing({ shipmentType: "encomienda", route: "Torino - Lima", weightKg: 16, isProvinceDelivery: true, provinceExtraPriceEur: 9.5 });
    expect(manual.provinceCustomerPriceEur).toBe(15);
    expect(manual.provinceExtraPriceEur).toBe(9.5);
  });

  it("limita la tarifa base automática a 10 kg cuando el peso supera 15 kg", () => {
    const withoutProvince = calculateAdminShipmentPricing({ shipmentType: "encomienda", route: "Torino - Lima", weightKg: 16 });
    expect(withoutProvince.totalEur).toBe(135);
    const withProvince = calculateAdminShipmentPricing({ shipmentType: "encomienda", route: "Torino - Lima", weightKg: 16, isProvinceDelivery: true });
    expect(withProvince.provinceCustomerPriceEur).toBe(15);
    expect(withProvince.provinceExtraPriceEur).toBe(1.5);
    expect(withProvince.totalEur).toBe(151.5);
  });

  it("conserva FedEx y DHL como operadores válidos y regenera el resumen tarifario", () => {
    for (const provinceCarrier of ["fedex", "dhl"] as const) {
      const result = calculateAdminShipmentPricing({ shipmentType: "encomienda", route: "Torino - Lima", weightKg: 10, isProvinceDelivery: true, provinceCarrier, notes: "Cambio solicitado por el cliente" });
      expect(result.provinceCarrier).toBe(provinceCarrier);
      expect(result.totalEur).toBe(150);
      expect(result.notes).toContain(`Envío a provincia (${provinceCarrier})`);
      expect(result.notes).toContain("Cambio solicitado por el cliente");
    }
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
