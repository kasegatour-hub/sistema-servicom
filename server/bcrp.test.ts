import { describe, expect, it } from "vitest";
import { parseBcrpEuroQuote } from "./bcrp";

describe("cotización EUR/PEN del BCRP", () => {
  it("toma el último periodo válido de la respuesta oficial", () => {
    expect(parseBcrpEuroQuote({ periods: [
      { name: "01.09.2026", values: ["3.92"] },
      { name: "02.09.2026", values: ["3,95"] },
    ] })).toEqual({ period: "02.09.2026", bcrpRatePenPerEur: 3.95 });
  });

  it("rechaza una respuesta sin tipo válido", () => {
    expect(parseBcrpEuroQuote({ periods: [{ name: "02.09.2026", values: ["-"] }] })).toBeNull();
  });
});
