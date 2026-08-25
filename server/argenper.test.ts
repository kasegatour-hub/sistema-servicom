import { describe, expect, it } from "vitest";
import { parseArgenperEuroQuote } from "./argenper";

describe("cotización pública de Argemper", () => {
  it("extrae compra y venta de euros publicados con punto decimal", () => {
    const quote = parseArgenperEuroQuote("<section>€ Euros Compra: 3.79 Venta: 4.02</section>");
    expect(quote).toEqual({ eurPurchaseRate: 3.79, eurSaleRate: 4.02 });
  });

  it("acepta una publicación con coma decimal", () => {
    const quote = parseArgenperEuroQuote("Euros Compra: 3,79 Venta: 4,02");
    expect(quote?.eurSaleRate).toBe(4.02);
  });
});
