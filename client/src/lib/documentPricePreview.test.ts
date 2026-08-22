import { describe, expect, it } from "vitest";
import { getDocumentPricePreview } from "./documentPricePreview";

describe("getDocumentPricePreview", () => {
  it("updates the simple-document surcharge for every sheet after the four included sheets", () => {
    expect(getDocumentPricePreview({ docType: "simple", sheetCount: 4 })).toMatchObject({ automaticMainEur: 45, surchargeEur: 0, totalEur: 45, isAtIncludedLimit: true });
    expect(getDocumentPricePreview({ docType: "simple", sheetCount: 6 })).toMatchObject({ extraSheets: 2, surchargeEur: 4, automaticMainEur: 49, totalEur: 49 });
  });

  it("shows the apostille surcharge at the sixth sheet and retains the configured limit", () => {
    expect(getDocumentPricePreview({ docType: "apostillado", sheetCount: 5 })).toMatchObject({ automaticMainEur: 50, surchargeEur: 0 });
    expect(getDocumentPricePreview({ docType: "apostillado", sheetCount: 6 })).toMatchObject({ automaticMainEur: 60, surchargeEur: 10, totalEur: 60 });
    expect(getDocumentPricePreview({ docType: "apostillado", sheetCount: 99 }).sheetCount).toBe(10);
  });

  it("uses the manual total when supplied and otherwise includes additional documents", () => {
    expect(getDocumentPricePreview({ docType: "simple", sheetCount: 6, additionalTotalEur: 50 })).toMatchObject({ totalEur: 99, usesManualPrice: false });
    expect(getDocumentPricePreview({ docType: "simple", sheetCount: 6, additionalTotalEur: 50, manualPriceEur: "70" })).toMatchObject({ totalEur: 70, usesManualPrice: true });
  });

  it("adds the configured extra amount without replacing the calculated tariff", () => {
    expect(getDocumentPricePreview({ docType: "simple", sheetCount: 4, extraPriceEur: 7.5 })).toMatchObject({ totalEur: 52.5, extraPriceEur: 7.5 });
  });
});
