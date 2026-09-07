import { describe, expect, it } from "vitest";
import { convertEurToPen, formatShipmentAmount, resolveShipmentPricingCurrency } from "./bcrpPricing";

describe("precios EUR/PEN por ruta", () => {
  it("convierte euros con la tasa BCRP ajustada", () => {
    expect(convertEurToPen(40, 4.15)).toBe(166);
  });

  it("usa soles para una ruta peruana histórica", () => {
    const shipment = { route: "Provincia - Lima" };
    expect(resolveShipmentPricingCurrency(shipment)).toBe("PEN");
    expect(formatShipmentAmount(25, shipment)).toBe("S/ 25.00");
  });

  it("usa euros para una ruta internacional", () => {
    const shipment = { route: "Torino - Lima" };
    expect(resolveShipmentPricingCurrency(shipment)).toBe("EUR");
    expect(formatShipmentAmount(25, shipment)).toBe("€ 25.00");
  });
});
