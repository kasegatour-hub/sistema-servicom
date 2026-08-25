import { describe, expect, it } from "vitest";
import { calculateTransferAmount, resolveTransferOffices } from "./transfer.router";

describe("transferencias", () => {
  it("calcula el importe recibido descontando comisión y aplicando cambio", () => {
    expect(calculateTransferAmount(309, 9, 1)).toBe(300);
    expect(calculateTransferAmount(402, 8.04, 4.02, "PEN", "EUR")).toBeCloseTo(98, 2);
  });

  it("nunca devuelve un importe recibido negativo", () => {
    expect(calculateTransferAmount(10, 20, 1)).toBe(0);
  });

  it("deriva las sedes de transferencia según ruta y espacio administrativo", () => {
    expect(resolveTransferOffices("Lima - Torino", false)).toEqual({
      originOffice: "SERVICOM INTERNACIONAL — Lima",
      destinationOffice: "SERVICOM INTERNACIONAL — Torino",
    });
    expect(resolveTransferOffices("Torino - Lima", true)).toEqual({
      originOffice: "KASEGA TOUR EIRL — Torino",
      destinationOffice: "SERVICOM INTERNACIONAL — Lima",
    });
  });
});
