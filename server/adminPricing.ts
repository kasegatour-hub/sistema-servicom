import { calculateAdditionalDocumentItems, type AdditionalDocumentItemInput } from "./documentPricing";

export type AdminShipmentPricingInput = {
  shipmentType?: "documento" | "encomienda";
  docType?: "simple" | "apostillado";
  sheetCount?: number;
  documentItems?: AdditionalDocumentItemInput[];
  weightKg?: number;
  manualPriceEur?: string | number | null;
  extraPriceEur?: string | number | null;
  notes?: string;
};

export function calculateAdminShipmentPricing(input: AdminShipmentPricingInput) {
  const shipmentType = input.shipmentType || "documento";
  const docType = input.docType || "apostillado";
  const sheetCount = Math.max(1, Number(input.sheetCount || 1));
  const weightKg = Math.max(0.1, Number(input.weightKg || 1));
  const rawManualPrice = input.manualPriceEur === undefined || input.manualPriceEur === null
    ? ""
    : String(input.manualPriceEur).trim();
  const manualPrice = rawManualPrice === "" ? null : Number(rawManualPrice);
  const rawExtraPrice = input.extraPriceEur === undefined || input.extraPriceEur === null ? "0" : String(input.extraPriceEur).trim();
  const parsedExtraPrice = Number(rawExtraPrice);
  const extraPriceEur = Number.isFinite(parsedExtraPrice) && parsedExtraPrice >= 0 ? parsedExtraPrice : 0;

  let totalEur: number;
  let tariffDescription: string;
  const additionalDocuments = shipmentType === "documento" ? calculateAdditionalDocumentItems(input.documentItems) : { items: [], totalEur: 0 };

  if (manualPrice !== null && Number.isFinite(manualPrice) && manualPrice >= 0) {
    totalEur = manualPrice;
    tariffDescription = shipmentType === "encomienda"
      ? `Encomienda (${weightKg} kg, tarifa manual): ${totalEur.toFixed(2)} EUR`
      : `Documento (${docType}, ${sheetCount} hojas, tarifa manual): ${totalEur.toFixed(2)} EUR`;
  } else if (shipmentType === "encomienda") {
    totalEur = weightKg * 13.5;
    tariffDescription = `Encomienda por peso (${weightKg} kg @ 13.5 EUR/kg): ${totalEur.toFixed(2)} EUR`;
  } else if (docType === "simple") {
    const basePrice = sheetCount <= 4 ? 45 : 45 + (sheetCount - 4) * 2;
    totalEur = basePrice + additionalDocuments.totalEur;
    tariffDescription = `Documento simple (${sheetCount} hoja${sheetCount > 1 ? "s" : ""}): ${basePrice} EUR${additionalDocuments.items.length ? `. Adicionales: ${additionalDocuments.items.map(item => item.description).join("; ")}` : ""}`;
  } else {
    const basePrice = sheetCount <= 5 ? 50 : 60;
    totalEur = basePrice + additionalDocuments.totalEur;
    tariffDescription = `Documento apostillado (${sheetCount} hoja${sheetCount > 1 ? "s" : ""}): ${basePrice} EUR${additionalDocuments.items.length ? `. Adicionales: ${additionalDocuments.items.map(item => item.description).join("; ")}` : ""}`;
  }

  const totalWithExtraEur = totalEur + extraPriceEur;
  const extraDescription = extraPriceEur > 0 ? ` Importe extra: +${extraPriceEur.toFixed(2)} EUR.` : "";
  return {
    shipmentType,
    docType,
    sheetCount,
    weightKg,
    manualPrice,
    extraPriceEur,
    totalEur: totalWithExtraEur,
    additionalDocuments,
    notes: `Tarifa: ${tariffDescription}.${extraDescription} ${input.notes || ""}`.trim(),
  };
}
