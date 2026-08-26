import { describe, expect, it } from "vitest";
import { calculateTransferAmount, calculateTransferFee, getTransferCommissionPercent } from "./transferCalculation";

describe("reglas de comisión de transferencias", () => {
  it("aplica 3 % de comisión para EUR a EUR", () => {
    const commission = getTransferCommissionPercent("EUR", "EUR");
    expect(commission).toBe(3);
    expect(calculateTransferFee(100, commission)).toBe(3);
    expect(calculateTransferAmount(100, 3, 1, "EUR", "EUR")).toBe(97);
  });

  it("aplica 2 % de comisión y convierte PEN a EUR con la cotización aplicada", () => {
    const commission = getTransferCommissionPercent("PEN", "EUR");
    expect(commission).toBe(2);
    expect(calculateTransferFee(402, commission)).toBe(8.04);
    expect(calculateTransferAmount(402, 8.04, 4.02, "PEN", "EUR")).toBeCloseTo(98, 2);
  });

  it("convierte EUR a PEN y conserva el importe neto cuando ambas monedas son soles", () => {
    expect(calculateTransferAmount(100, 0, 4.15, "EUR", "PEN")).toBeCloseTo(415, 2);
    expect(calculateTransferAmount(100, 3, 1, "PEN", "PEN")).toBe(97);
  });
});
