export type DocumentKind = "simple" | "apostillado";

export type AdditionalDocumentItemInput = {
  docType: DocumentKind;
  sheetCount: number;
  manualPriceEur?: string | number | null;
};

export type PricedDocumentItem = {
  docType: DocumentKind;
  sheetCount: number;
  automaticPriceEur: number;
  finalPriceEur: number;
  usesManualPrice: boolean;
  description: string;
};

export function calculateDocumentItemPricing(input: AdditionalDocumentItemInput): PricedDocumentItem {
  const docType = input.docType === "simple" ? "simple" : "apostillado";
  const maximum = docType === "simple" ? 8 : 10;
  const sheetCount = Math.max(1, Math.min(maximum, Math.round(Number(input.sheetCount) || 1)));
  const automaticPriceEur = docType === "simple"
    ? (sheetCount <= 4 ? 45 : 45 + (sheetCount - 4) * 2)
    : (sheetCount <= 5 ? 50 : 60);
  const rawManualPrice = input.manualPriceEur === undefined || input.manualPriceEur === null ? "" : String(input.manualPriceEur).trim();
  const parsedManualPrice = rawManualPrice === "" ? Number.NaN : Number(rawManualPrice);
  const usesManualPrice = Number.isFinite(parsedManualPrice) && parsedManualPrice >= 0;
  const finalPriceEur = usesManualPrice ? parsedManualPrice : automaticPriceEur;
  const label = docType === "simple" ? "Documento simple" : "Documento apostillado";
  const description = `${label} (${sheetCount} hoja${sheetCount === 1 ? "" : "s"}${usesManualPrice ? ", precio manual" : ""}): ${finalPriceEur.toFixed(2)} EUR`;

  return { docType, sheetCount, automaticPriceEur, finalPriceEur, usesManualPrice, description };
}

export function calculateAdditionalDocumentItems(items: AdditionalDocumentItemInput[] | undefined) {
  const pricedItems = (items || []).map(calculateDocumentItemPricing);
  return {
    items: pricedItems,
    totalEur: pricedItems.reduce((total, item) => total + item.finalPriceEur, 0),
  };
}
