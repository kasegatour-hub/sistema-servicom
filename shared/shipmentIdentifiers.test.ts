import { describe, expect, it } from "vitest";
import { formatTrackingCodeInput, formatTrackingOrderInput, generateMonthlyParcelOrderNumber, generateShipmentCode, generateShipmentOrderNumber, getMonthlyParcelOrderPrefix, getTrackingCodeError, getTrackingOrderError, isNewShipmentCode, isNewShipmentOrderNumber } from "./shipmentIdentifiers";

describe("shipment identifiers", () => {
  it("genera órdenes nuevas de exactamente 8 dígitos", () => {
    expect(generateShipmentOrderNumber(() => 0)).toBe("10000000");
    expect(generateShipmentOrderNumber(() => 0.999999)).toMatch(/^\d{8}$/);
    expect(isNewShipmentOrderNumber("35209927")).toBe(true);
    expect(isNewShipmentOrderNumber("3520992723")).toBe(false);
  });

  it("genera encomiendas mensuales MMAA-XXXX con dos dígitos de serie antes del rango operativo", () => {
    const august2026 = new Date("2026-08-15T12:00:00.000Z");
    expect(getMonthlyParcelOrderPrefix(august2026)).toBe("0826");
    expect(generateMonthlyParcelOrderNumber({ existingOrderNumbers: [], isProvinceDelivery: false, date: august2026 })).toBe("0826-0001");
    expect(generateMonthlyParcelOrderNumber({ existingOrderNumbers: ["0826-0001", "0826-0002"], isProvinceDelivery: false, date: august2026 })).toBe("0826-0003");
    expect(isNewShipmentOrderNumber("0826-0019")).toBe(true);
  });

  it("respeta el límite final de 20 para sede y 14 para provincia, avanzando la serie sin duplicar", () => {
    const august2026 = new Date("2026-08-15T12:00:00.000Z");
    const normalUsed = Array.from({ length: 20 }, (_, index) => `0826-00${String(index + 1).padStart(2, "0")}`);
    const provinceUsed = Array.from({ length: 14 }, (_, index) => `0826-00${String(index + 1).padStart(2, "0")}`);
    expect(generateMonthlyParcelOrderNumber({ existingOrderNumbers: normalUsed, isProvinceDelivery: false, date: august2026 })).toBe("0826-0101");
    expect(generateMonthlyParcelOrderNumber({ existingOrderNumbers: provinceUsed, isProvinceDelivery: true, date: august2026 })).toBe("0826-0101");
  });

  it("reutiliza el primer espacio libre después de una entrega", () => {
    const august2026 = new Date("2026-08-15T12:00:00.000Z");
    expect(generateMonthlyParcelOrderNumber({ existingOrderNumbers: ["0826-0001", "0826-0003"], isProvinceDelivery: false, date: august2026 })).toBe("0826-0002");
    expect(generateMonthlyParcelOrderNumber({ existingOrderNumbers: ["0826-0001", "0826-0002"], isProvinceDelivery: false, date: august2026 })).toBe("0826-0003");
  });

  it("usa la misma secuencia mensual para documentos y encomiendas", () => {
    const august2026 = new Date("2026-08-15T12:00:00.000Z");
    const firstDocument = generateMonthlyParcelOrderNumber({ existingOrderNumbers: [], isProvinceDelivery: false, date: august2026 });
    const firstEncomienda = generateMonthlyParcelOrderNumber({ existingOrderNumbers: [firstDocument], isProvinceDelivery: false, date: august2026 });
    const firstProvinceDocument = generateMonthlyParcelOrderNumber({ existingOrderNumbers: [firstDocument, firstEncomienda], isProvinceDelivery: true, date: august2026 });

    expect(firstDocument).toBe("0826-0001");
    expect(firstEncomienda).toBe("0826-0002");
    expect(firstProvinceDocument).toBe("0826-0003");
    expect(firstDocument).toMatch(/^\d{4}-\d{4}$/);
    expect(firstProvinceDocument).toMatch(/^\d{4}-\d{4}$/);
  });

  it("limita y formatea los campos antes de enviar el rastreo", () => {
    expect(formatTrackingOrderInput("08260019")).toBe("0826-0019");
    expect(formatTrackingOrderInput("0826001999")).toBe("082600199");
    expect(formatTrackingCodeInput("7abcde")).toBe("7ABC");
    expect(getTrackingOrderError("08260019")).toContain("falta el guion");
    expect(getTrackingCodeError("7AB")).toContain("faltan 1 letras");
    expect(getTrackingOrderError("0826-0019")).toBeNull();
    expect(getTrackingCodeError("7ABC")).toBeNull();
  });

  it("genera códigos nuevos con un dígito y tres letras", () => {
    expect(generateShipmentCode(() => 0)).toBe("0AAA");
    expect(generateShipmentCode(() => 0.999999)).toMatch(/^\d[A-Z]{3}$/);
    expect(isNewShipmentCode("7ABC")).toBe(true);
    expect(isNewShipmentCode("DOC-2026-ABCDE")).toBe(false);
  });
});
