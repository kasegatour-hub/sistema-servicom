import { calculateAdditionalDocumentItems, type AdditionalDocumentItemInput } from "./documentPricing";

import { isProvinceShipmentRoute, isTorinoLimaRoute } from "./shipmentRoutes";
import { getParcelRateEurPerKg } from "./workspacePricing";

export type AdminShipmentPricingInput = {
  shipmentType?: "documento" | "encomienda";
  docType?: "simple" | "apostillado";
  sheetCount?: number;
  documentItems?: AdditionalDocumentItemInput[];
  weightKg?: number;
  manualPriceEur?: string | number | null;
  extraPriceEur?: string | number | null;
  extraDiscountEur?: string | number | null;
  route?: string;
  requiresApostilleService?: boolean;
  requiresTranslationService?: boolean;
  serviceManualPriceEur?: string | number | null;
  serviceManualPriceSoles?: string | number | null;
  isProvinceDelivery?: boolean;
  provinceCustomerPriceEur?: string | number | null;
  provinceExtraPriceEur?: string | number | null;
  provinceOperationalCostSoles?: string | number | null;
  provinceCarrier?: string | null;
  notes?: string;
  workspaceAdminId?: number | null;
  workspaceAdminEmail?: string | null;
};

export function calculateAutomaticParcelPriceEur(weightKg: number, route?: string, rateEurPerKg = 15): { totalEur: number; description: string } {
  const normalizedWeight = Math.max(0.1, Number(weightKg || 1));
  const billableWeight = normalizedWeight > 15 ? 10 : normalizedWeight;
  const totalEur = billableWeight * rateEurPerKg;
  const routeLabel = isTorinoLimaRoute(route) ? "Torino–Lima" : "por peso";
  const capNote = normalizedWeight > 15 ? ` (base automática limitada a ${billableWeight} kg; el excedente se gestiona como adicional provincial si corresponde)` : "";
  return { totalEur, description: `Encomienda ${routeLabel} (${normalizedWeight} kg @ ${rateEurPerKg} EUR/kg): ${totalEur.toFixed(2)} EUR${capNote}` };
}

export const GENERATED_SHIPMENT_NOTE_PREFIX = "Tarifa:";

export function extractFreeformShipmentNotes(notes: string | null | undefined, previousGeneratedNote = "") {
  const value = String(notes ?? "").trim();
  if (!value) return "";
  if (!value.startsWith(GENERATED_SHIPMENT_NOTE_PREFIX)) return value;
  if (previousGeneratedNote && value.startsWith(previousGeneratedNote)) return value.slice(previousGeneratedNote.length).trim();
  const separatorIndex = value.indexOf("\n\n");
  return separatorIndex >= 0 ? value.slice(separatorIndex + 2).trim() : "";
}

export function mergeShipmentNotes(generatedNote: string, freeformNote: string | null | undefined) {
  const generated = generatedNote.trim();
  const freeform = String(freeformNote ?? "").trim();
  return freeform ? `${generated}\n\n${freeform}` : generated;
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
  const servicesAllowed = shipmentType === "documento" && isTorinoLimaRoute(route);
  const requiresApostilleService = Boolean(input.requiresApostilleService) && servicesAllowed;
  const requiresTranslationService = Boolean(input.requiresTranslationService) && servicesAllowed;
  const apostillePriceEur = requiresApostilleService ? serviceManualPriceEur ?? 40 : 0;
  const translationPriceEur = requiresTranslationService ? 50 : 0;
  const servicePriceEur = apostillePriceEur + translationPriceEur;
  const apostillePriceSoles = requiresApostilleService ? serviceManualPriceSoles ?? 160 : 0;
  const translationPriceSoles = requiresTranslationService ? 200 : 0;
  const servicePriceSoles = apostillePriceSoles + translationPriceSoles;
  const provinceEnabled = (Boolean(input.isProvinceDelivery) || isProvinceShipmentRoute(route)) && isTorinoLimaRoute(route);
  const rawProvinceCustomerPrice = input.provinceCustomerPriceEur === undefined || input.provinceCustomerPriceEur === null ? "" : String(input.provinceCustomerPriceEur).trim();
  const parsedProvinceCustomerPrice = Number(rawProvinceCustomerPrice);
  const automaticProvincePrice = provinceEnabled ? (weightKg <= 5 ? 10 : 15) : 0;
  const provinceCustomerPriceEur = provinceEnabled ? (rawProvinceCustomerPrice !== "" && Number.isFinite(parsedProvinceCustomerPrice) && parsedProvinceCustomerPrice >= 0 ? parsedProvinceCustomerPrice : automaticProvincePrice) : 0;
  const rawProvinceExtraPrice = input.provinceExtraPriceEur === undefined || input.provinceExtraPriceEur === null ? "" : String(input.provinceExtraPriceEur).trim();
  const parsedProvinceExtraPrice = Number(rawProvinceExtraPrice);
  const automaticProvinceExtraPrice = provinceEnabled && weightKg > 10 ? Math.round((weightKg - 10) * 2 * 100) / 100 : 0;
  const provinceExtraPriceEur = provinceEnabled && rawProvinceExtraPrice !== "" && Number.isFinite(parsedProvinceExtraPrice) && parsedProvinceExtraPrice >= 0 ? parsedProvinceExtraPrice : automaticProvinceExtraPrice;
  const rawProvinceOperationalCost = input.provinceOperationalCostSoles === undefined || input.provinceOperationalCostSoles === null ? "" : String(input.provinceOperationalCostSoles).trim();
  const parsedProvinceOperationalCost = Number(rawProvinceOperationalCost);
  const provinceOperationalCostSoles = provinceEnabled ? (rawProvinceOperationalCost !== "" && Number.isFinite(parsedProvinceOperationalCost) && parsedProvinceOperationalCost >= 0 ? parsedProvinceOperationalCost : shipmentType === "documento" ? 8 : 0) : 0;
  const provinceCarrier = provinceEnabled ? input.provinceCarrier || "shalom" : null;
  const rawExtraPrice = input.extraPriceEur === undefined || input.extraPriceEur === null ? "0" : String(input.extraPriceEur).trim();
  const parsedExtraPrice = Number(rawExtraPrice);
  const extraPriceEur = Number.isFinite(parsedExtraPrice) && parsedExtraPrice >= 0 ? parsedExtraPrice : 0;
  const rawExtraDiscount = input.extraDiscountEur === undefined || input.extraDiscountEur === null ? "0" : String(input.extraDiscountEur).trim();
  const parsedExtraDiscount = Number(rawExtraDiscount);
  const extraDiscountEur = Number.isFinite(parsedExtraDiscount) && parsedExtraDiscount >= 0 ? Math.min(parsedExtraDiscount, extraPriceEur) : 0;
  const netExtraPriceEur = Math.max(0, extraPriceEur - extraDiscountEur);
  const parcelRateEurPerKg = getParcelRateEurPerKg(input);

  let totalEur: number;
  let tariffDescription: string;
  const additionalDocuments = shipmentType === "documento" ? calculateAdditionalDocumentItems(input.documentItems) : { items: [], totalEur: 0 };

  if (manualPrice !== null && Number.isFinite(manualPrice) && manualPrice >= 0) {
    totalEur = manualPrice;
    tariffDescription = shipmentType === "encomienda"
      ? `Encomienda (${weightKg} kg, tarifa manual): ${totalEur.toFixed(2)} EUR`
      : `Documento (${docType}, ${sheetCount} hojas, tarifa manual): ${totalEur.toFixed(2)} EUR`;
  } else if (shipmentType === "encomienda") {
    const automaticParcelPrice = calculateAutomaticParcelPriceEur(weightKg, route, parcelRateEurPerKg);
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

  const totalWithExtraEur = totalEur + netExtraPriceEur + servicePriceEur + provinceCustomerPriceEur + provinceExtraPriceEur;
  const usesAutomaticProvincePrice = provinceEnabled && rawProvinceCustomerPrice === "";
  const provinceTierLabel = weightKg <= 5 ? "hasta 5 kg" : "más de 5 kg";
  const provinceDescription = provinceEnabled
    ? ` Envío a provincia (${provinceCarrier || "agencia seleccionada"}): +${provinceCustomerPriceEur.toFixed(2)} EUR${usesAutomaticProvincePrice ? ` (${provinceTierLabel})` : ""}${provinceExtraPriceEur > 0 ? `; excedente sobre 10 kg (2,00 EUR/kg): +${provinceExtraPriceEur.toFixed(2)} EUR` : ""}.`
    : "";
  const extraDescription = extraPriceEur > 0 ? ` Importe extra: +${extraPriceEur.toFixed(2)} EUR${extraDiscountEur > 0 ? `; descuento del extra: -${extraDiscountEur.toFixed(2)} EUR; extra neto: +${netExtraPriceEur.toFixed(2)} EUR` : ""}.` : "";
  const serviceDescription = `${requiresApostilleService ? ` Servicio de apostilla Italia–Lima: +${apostillePriceEur.toFixed(2)} EUR y +${apostillePriceSoles.toFixed(2)} soles.` : ""}${requiresTranslationService ? ` Servicio de traducción Italia–Lima: +${translationPriceEur.toFixed(2)} EUR y +${translationPriceSoles.toFixed(2)} soles.` : ""}`;
  const generatedNote = `${GENERATED_SHIPMENT_NOTE_PREFIX} ${tariffDescription}.${serviceDescription}${provinceDescription}${extraDescription}`.trim();
  return {
    shipmentType,
    docType,
    sheetCount,
    weightKg,
    parcelRateEurPerKg,
    manualPrice,
    extraPriceEur,
    extraDiscountEur,
    netExtraPriceEur,
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
    notes: mergeShipmentNotes(generatedNote, extractFreeformShipmentNotes(input.notes)),
  };
}
