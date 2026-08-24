import { calculateAdditionalDocumentItems, type AdditionalDocumentItemInput } from "./documentPricing";

export type AdminShipmentPricingInput = {
  shipmentType?: "documento" | "encomienda";
  docType?: "simple" | "apostillado";
  sheetCount?: number;
  documentItems?: AdditionalDocumentItemInput[];
  weightKg?: number;
  manualPriceEur?: string | number | null;
  extraPriceEur?: string | number | null;
  route?: string;
  requiresApostilleService?: boolean;
  requiresTranslationService?: boolean;
  serviceManualPriceEur?: string | number | null;
  serviceManualPriceSoles?: string | number | null;
  isProvinceDelivery?: boolean;
  provinceCustomerPriceEur?: string | number | null;
  provinceExtraPriceEur?: string | number | null;
  provinceOperationalCostSoles?: string | number | null;
  provinceCarrier?: "olva" | "shalom" | null;
  notes?: string;
};

export function calculateAutomaticParcelPriceEur(weightKg: number, route?: string): { totalEur: number; description: string } {
  const normalizedWeight = Math.max(0.1, Number(weightKg || 1));
  const totalEur = normalizedWeight * 13.5;
  const routeLabel = route === "Torino - Lima" ? "Torino–Lima" : "por peso";
  return { totalEur, description: `Encomienda ${routeLabel} (${normalizedWeight} kg @ 13.5 EUR/kg): ${totalEur.toFixed(2)} EUR` };
}

export function calculateAdminShipmentPricing(input: AdminShipmentPricingInput) {
  const shipmentType = input.shipmentType || "documento";
  const docType = input.docType || "apostillado";
  const sheetCount = Math.max(1, Number(input.sheetCount || 1));
  const weightKg = Math.max(0.1, Number(input.weightKg || 1));
  const route = input.route || "Lima - Torino";
  const rawManualPrice = input.manualPriceEur === undefined || input.manualPriceEur === null ? "" : String(input.manualPriceEur).trim();
  const manualPrice = rawManualPrice === "" ? null : Number(rawManualPrice);
  const rawServiceManualEur = input.serviceManualPriceEur === undefined || input.serviceManualPriceEur === null ? "" : String(input.serviceManualPriceEur).trim();
  const parsedServiceManualEur = Number(rawServiceManualEur);
  const serviceManualPriceEur = rawServiceManualEur !== "" && Number.isFinite(parsedServiceManualEur) && parsedServiceManualEur >= 0 ? parsedServiceManualEur : null;
  const rawServiceManualSoles = input.serviceManualPriceSoles === undefined || input.serviceManualPriceSoles === null ? "" : String(input.serviceManualPriceSoles).trim();
  const parsedServiceManualSoles = Number(rawServiceManualSoles);
  const serviceManualPriceSoles = rawServiceManualSoles !== "" && Number.isFinite(parsedServiceManualSoles) && parsedServiceManualSoles >= 0 ? parsedServiceManualSoles : null;
  const servicesAllowed = shipmentType === "documento" && route === "Torino - Lima";
  const requiresApostilleService = Boolean(input.requiresApostilleService) && servicesAllowed;
  const requiresTranslationService = Boolean(input.requiresTranslationService) && servicesAllowed;
  const servicePriceEur = requiresApostilleService ? serviceManualPriceEur ?? 40 : 0;
  const servicePriceSoles = (requiresApostilleService ? serviceManualPriceSoles ?? 160 : 0) + (requiresTranslationService ? serviceManualPriceSoles ?? 200 : 0);
  const provinceEnabled = Boolean(input.isProvinceDelivery) && route === "Torino - Lima";
  const rawProvinceCustomerPrice = input.provinceCustomerPriceEur === undefined || input.provinceCustomerPriceEur === null ? "" : String(input.provinceCustomerPriceEur).trim();
  const parsedProvinceCustomerPrice = Number(rawProvinceCustomerPrice);
  const automaticProvincePrice = provinceEnabled ? (weightKg <= 5 ? 10 : weightKg <= 10 ? 15 : 0) : 0;
  const provinceCustomerPriceEur = provinceEnabled ? (rawProvinceCustomerPrice !== "" && Number.isFinite(parsedProvinceCustomerPrice) && parsedProvinceCustomerPrice >= 0 ? parsedProvinceCustomerPrice : (automaticProvincePrice || (weightKg > 10 ? 15 : 0))) : 0;
  const rawProvinceExtraPrice = input.provinceExtraPriceEur === undefined || input.provinceExtraPriceEur === null ? "" : String(input.provinceExtraPriceEur).trim();
  const parsedProvinceExtraPrice = Number(rawProvinceExtraPrice);
  const automaticProvinceExtraPrice = provinceEnabled && weightKg > 10 ? Math.round((weightKg - 10) * 1.5 * 100) / 100 : 0;
  const provinceExtraPriceEur = provinceEnabled && rawProvinceExtraPrice !== "" && Number.isFinite(parsedProvinceExtraPrice) && parsedProvinceExtraPrice >= 0 ? parsedProvinceExtraPrice : automaticProvinceExtraPrice;
  const rawProvinceOperationalCost = input.provinceOperationalCostSoles === undefined || input.provinceOperationalCostSoles === null ? "" : String(input.provinceOperationalCostSoles).trim();
  const parsedProvinceOperationalCost = Number(rawProvinceOperationalCost);
  const provinceOperationalCostSoles = provinceEnabled ? (rawProvinceOperationalCost !== "" && Number.isFinite(parsedProvinceOperationalCost) && parsedProvinceOperationalCost >= 0 ? parsedProvinceOperationalCost : shipmentType === "documento" ? 8 : 0) : 0;
  const provinceCarrier = provinceEnabled ? input.provinceCarrier || "shalom" : null;
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
    const automaticParcelPrice = calculateAutomaticParcelPriceEur(weightKg, route);
    totalEur = automaticParcelPrice.totalEur;
    tariffDescription = automaticParcelPrice.description;
  } else if (docType === "simple") {
    const basePrice = sheetCount <= 4 ? 45 : 45 + (sheetCount - 4) * 2;
    totalEur = basePrice + additionalDocuments.totalEur;
    tariffDescription = `Documento simple (${sheetCount} hoja${sheetCount > 1 ? "s" : ""}): ${basePrice} EUR${additionalDocuments.items.length ? `. Adicionales: ${additionalDocuments.items.map(item => item.description).join("; ")}` : ""}`;
  } else {
    const basePrice = sheetCount <= 5 ? 50 : 60;
    totalEur = basePrice + additionalDocuments.totalEur;
    tariffDescription = `Documento apostillado (${sheetCount} hoja${sheetCount > 1 ? "s" : ""}): ${basePrice} EUR${additionalDocuments.items.length ? `. Adicionales: ${additionalDocuments.items.map(item => item.description).join("; ")}` : ""}`;
  }

  const totalWithExtraEur = totalEur + extraPriceEur + servicePriceEur + provinceCustomerPriceEur + provinceExtraPriceEur;
  const provinceDescription = provinceEnabled ? ` Envío a provincia (${provinceCarrier === "olva" ? "Olva" : "Shalom"}): base cliente +${provinceCustomerPriceEur.toFixed(2)} EUR${provinceExtraPriceEur > 0 ? `; extra provincial +${provinceExtraPriceEur.toFixed(2)} EUR` : ""}; costo operativo S/${provinceOperationalCostSoles.toFixed(2)}.` : "";
  const extraDescription = extraPriceEur > 0 ? ` Importe extra: +${extraPriceEur.toFixed(2)} EUR.` : "";
  const serviceDescription = `${requiresApostilleService ? ` Servicio de apostilla Italia–Lima: +${servicePriceEur.toFixed(2)} EUR y +${(serviceManualPriceSoles ?? 160).toFixed(2)} soles.` : ""}${requiresTranslationService ? ` Servicio de traducción Italia–Lima: +${(serviceManualPriceSoles ?? 200).toFixed(2)} soles.` : ""}`;
  return {
    shipmentType,
    docType,
    sheetCount,
    weightKg,
    manualPrice,
    extraPriceEur,
    route,
    requiresApostilleService,
    requiresTranslationService,
    serviceManualPriceEur,
    serviceManualPriceSoles,
    servicePriceEur,
    servicePriceSoles,
    isProvinceDelivery: provinceEnabled,
    provinceCustomerPriceEur,
    provinceExtraPriceEur,
    provinceOperationalCostSoles,
    provinceCarrier,
    totalEur: totalWithExtraEur,
    additionalDocuments,
    notes: `Tarifa: ${tariffDescription}.${serviceDescription}${provinceDescription}${extraDescription} ${input.notes || ""}`.trim(),
  };
}
