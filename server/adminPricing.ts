export type AdminShipmentPricingInput = {
  shipmentType?: "documento" | "encomienda";
  docType?: "simple" | "apostillado";
  sheetCount?: number;
  weightKg?: number;
  manualPriceEur?: string | number | null;
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

  let totalEur: number;
  let tariffDescription: string;

  if (manualPrice !== null && Number.isFinite(manualPrice) && manualPrice >= 0) {
    totalEur = manualPrice;
    tariffDescription = shipmentType === "encomienda"
      ? `Encomienda (${weightKg} kg, tarifa manual): ${totalEur.toFixed(2)} EUR`
      : `Documento (${docType}, ${sheetCount} hojas, tarifa manual): ${totalEur.toFixed(2)} EUR`;
  } else if (shipmentType === "encomienda") {
    totalEur = weightKg * 13.5;
    tariffDescription = `Encomienda por peso (${weightKg} kg @ 13.5 EUR/kg): ${totalEur.toFixed(2)} EUR`;
  } else if (docType === "simple") {
    totalEur = sheetCount <= 4 ? 45 : 45 + (sheetCount - 4) * 2;
    tariffDescription = `Documento simple (${sheetCount} hoja${sheetCount > 1 ? "s" : ""}): ${totalEur} EUR`;
  } else {
    totalEur = sheetCount <= 5 ? 50 : 60;
    tariffDescription = `Documento apostillado (${sheetCount} hoja${sheetCount > 1 ? "s" : ""}): ${totalEur} EUR`;
  }

  return {
    shipmentType,
    docType,
    sheetCount,
    weightKg,
    manualPrice,
    totalEur,
    notes: `Tarifa: ${tariffDescription}. ${input.notes || ""}`.trim(),
  };
}
