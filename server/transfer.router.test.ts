import { describe, expect, it } from "vitest";
import { calculateTransferAmount } from "./transfer.router";

describe("transferencias", () => {
  it("calcula el importe recibido descontando comisión y aplicando cambio", () => {
    expect(calculateTransferAmount(309, 9, 1)).toBe(300);
    expect(calculateTransferAmount(100, 5, 4)).toBe(380);
  });

  it("nunca devuelve un importe recibido negativo", () => {
    expect(calculateTransferAmount(10, 20, 1)).toBe(0);
  });
});
