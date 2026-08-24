import { describe, expect, it } from "vitest";
import { generateShipmentCode, generateShipmentOrderNumber, isNewShipmentCode, isNewShipmentOrderNumber } from "./shipmentIdentifiers";

describe("shipment identifiers", () => {
  it("genera órdenes nuevas de exactamente 8 dígitos", () => {
    expect(generateShipmentOrderNumber(() => 0)).toBe("10000000");
    expect(generateShipmentOrderNumber(() => 0.999999)).toMatch(/^\d{8}$/);
    expect(isNewShipmentOrderNumber("35209927")).toBe(true);
    expect(isNewShipmentOrderNumber("3520992723")).toBe(false);
  });

  it("genera códigos nuevos con un dígito y tres letras", () => {
    expect(generateShipmentCode(() => 0)).toBe("0AAA");
    expect(generateShipmentCode(() => 0.999999)).toMatch(/^\d[A-Z]{3}$/);
    expect(isNewShipmentCode("7ABC")).toBe(true);
    expect(isNewShipmentCode("DOC-2026-ABCDE")).toBe(false);
  });
});
