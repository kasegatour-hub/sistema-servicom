export type DocumentPriceKind = "simple" | "apostillado";

export type DocumentPricePreviewInput = {
  docType: DocumentPriceKind;
  sheetCount: number;
  additionalTotalEur?: number;
  manualPriceEur?: string | number | null;
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
  const totalEur = usesManualPrice ? parsedManualPrice : automaticMainEur + additionalTotalEur;
  const label = docType === "simple" ? "Documento simple" : "Documento apostillado";
  const nextChargeDescription = docType === "simple"
    ? `La hoja ${includedSheets + 1} agrega 2,00 €.`
    : `La hoja ${includedSheets + 1} activa un recargo único de 10,00 €.`;

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
    usesManualPrice,
    totalEur,
    isAtIncludedLimit: sheetCount === includedSheets,
    hasSurcharge: surchargeEur > 0,
    nextChargeDescription,
  };
}
