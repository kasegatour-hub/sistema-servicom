export type DocumentPriceKind = "simple" | "apostillado";

export type DocumentPricePreviewInput = {
  docType: DocumentPriceKind;
  sheetCount: number;
  additionalTotalEur?: number;
  manualPriceEur?: string | number | null;
  extraPriceEur?: string | number | null;
  extraDiscountEur?: string | number | null;
};

export function getDocumentPricePreview(input: DocumentPricePreviewInput) {
  const docType = input.docType === "simple" ? "simple" : "apostillado";
  const includedSheets = docType === "simple" ? 4 : 5;
  const maximumSheets = docType === "simple" ? 8 : 10;
  const baseEur = docType === "simple" ? 45 : 50;
  const sheetCount = Math.max(1, Math.min(maximumSheets, Math.round(Number(input.sheetCount) || 1)));
  const extraSheets = Math.max(0, sheetCount - includedSheets);
  const surchargeEur = docType === "simple"
    ? extraSheets * 2
    : (extraSheets > 0 ? 10 : 0);
  const automaticMainEur = baseEur + surchargeEur;
  const additionalTotalEur = Math.max(0, Number(input.additionalTotalEur) || 0);
  const rawManualPrice = input.manualPriceEur === undefined || input.manualPriceEur === null ? "" : String(input.manualPriceEur).trim();
  const parsedManualPrice = rawManualPrice === "" ? Number.NaN : Number(rawManualPrice);
  const usesManualPrice = Number.isFinite(parsedManualPrice) && parsedManualPrice >= 0;
  const rawExtraPrice = input.extraPriceEur === undefined || input.extraPriceEur === null ? "0" : String(input.extraPriceEur).trim();
  const parsedExtraPrice = Number(rawExtraPrice);
  const extraPriceEur = Number.isFinite(parsedExtraPrice) && parsedExtraPrice >= 0 ? parsedExtraPrice : 0;
  const rawExtraDiscount = input.extraDiscountEur === undefined || input.extraDiscountEur === null ? "0" : String(input.extraDiscountEur).trim();
  const parsedExtraDiscount = Number(rawExtraDiscount);
  const extraDiscountEur = Number.isFinite(parsedExtraDiscount) && parsedExtraDiscount >= 0 ? Math.min(parsedExtraDiscount, extraPriceEur) : 0;
  const netExtraPriceEur = Math.max(0, extraPriceEur - extraDiscountEur);
  const totalEur = (usesManualPrice ? parsedManualPrice : automaticMainEur + additionalTotalEur) + netExtraPriceEur;
  const label = docType === "simple" ? "Documento simple" : "Documento apostillado";
  const nextChargeDescription = docType === "simple"
    ? `La hoja ${includedSheets + 1} agrega 2,00 €.`
    : `Las hojas ${includedSheets + 1} a ${maximumSheets} forman un bloque adicional de hasta 5 hojas del mismo tipo: +10,00 €.`;

  return {
    docType,
    label,
    sheetCount,
    includedSheets,
    maximumSheets,
    baseEur,
    extraSheets,
    surchargeEur,
    automaticMainEur,
    additionalTotalEur,
    extraPriceEur,
    extraDiscountEur,
    netExtraPriceEur,
    usesManualPrice,
    totalEur,
    isAtIncludedLimit: sheetCount === includedSheets,
    hasSurcharge: surchargeEur > 0,
    nextChargeDescription,
  };
}
