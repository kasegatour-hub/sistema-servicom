import { describe, expect, it } from "vitest";
import { buildReceiptPriceHtml, getReceiptPricePresentation } from "./receiptPrice";

describe("receiptPrice multimoneda", () => {
  it.each([
    ["EUR", "40.00 EUR"],
    ["USD", "40.00 USD"],
    ["PEN", "40.00 S/"],
  ] as const)("presenta un precio manual en %s", (currency, label) => {
    const presentation = getReceiptPricePresentation({ manualPriceEur: 40, manualPriceCurrency: currency, finalPriceEur: 40 });
    expect(presentation.finalLabel).toBe(label);
    expect(buildReceiptPriceHtml({ manualPriceEur: 40, manualPriceCurrency: currency, finalPriceEur: 40 })).toContain(label);
  });

  it("usa PEN para una tarifa automática interna sin precio manual", () => {
    expect(getReceiptPricePresentation({ finalPriceEur: 150, pricingCurrency: "PEN" }).finalLabel).toBe("150.00 S/");
  });
});
