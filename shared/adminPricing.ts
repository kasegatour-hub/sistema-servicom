import { calculateAdditionalDocumentItems, type AdditionalDocumentItemInput } from "./documentPricing";

import { isProvinceShipmentRoute, isTorinoLimaRoute } from "./shipmentRoutes";
import { derivePricingCurrency, normalizeIndependentEndpoints, type ShipmentPricingCurrency } from "./shipmentEndpoints";
import { getParcelRateEurPerKg } from "./workspacePricing";

export type ManualPriceCurrency = "EUR" | "USD" | "PEN";

export type AdminShipmentPricingInput = {
  shipmentType?: "documento" | "encomienda";
  docType?: "simple" | "apostillado";
  sheetCount?: number;
  documentItems?: AdditionalDocumentItemInput[];
  weightKg?: number;
  manualPriceEur?: string | number | null;
  manualPriceCurrency?: ManualPriceCurrency | null;
  extraPriceEur?: string | number | null;
  extraDiscountEur?: string | number | null;
  route?: string;
  originAddress?: string | null;
  destinationAddress?: string | null;
  requiresApostilleService?: boolean;
  requiresTranslationService?: boolean;
  serviceManualPriceEur?: string | number | null;
  serviceManualPriceSoles?: string | number | null;
  serviceManualPriceCurrency?: ManualPriceCurrency | null;
  apostilleManualPrice?: string | number | null;
  apostilleManualCurrency?: ManualPriceCurrency | null;
  translationManualPrice?: string | number | null;
  translationManualCurrency?: ManualPriceCurrency | null;
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
  const pricingCurrency: ShipmentPricingCurrency = derivePricingCurrency(normalizeIndependentEndpoints({ route, isProvinceDelivery: input.isProvinceDelivery }));
  const manualPriceCurrency: ManualPriceCurrency = input.manualPriceCurrency === "USD" || input.manualPriceCurrency === "PEN" || input.manualPriceCurrency === "EUR" ? input.manualPriceCurrency : "EUR";
  const rawManualPrice = input.manualPriceEur === undefined || input.manualPriceEur === null ? "" : String(input.manualPriceEur).trim();
  const manualPrice = rawManualPrice === "" ? null : Number(rawManualPrice);
  const usesManualPrice = manualPrice !== null && Number.isFinite(manualPrice) && manualPrice >= 0;
  const priceUnit: ManualPriceCurrency | ShipmentPricingCurrency = usesManualPrice ? manualPriceCurrency : pricingCurrency;
  const rawServiceManualEur = input.serviceManualPriceEur === undefined || input.serviceManualPriceEur === null ? "" : String(input.serviceManualPriceEur).trim();
  const parsedServiceManualEur = Number(rawServiceManualEur);
  const serviceManualPriceEur = rawServiceManualEur !== "" && Number.isFinite(parsedServiceManualEur) && parsedServiceManualEur >= 0 ? parsedServiceManualEur : null;
  const rawServiceManualSoles = input.serviceManualPriceSoles === undefined || input.serviceManualPriceSoles === null ? "" : String(input.serviceManualPriceSoles).trim();
  const parsedServiceManualSoles = Number(rawServiceManualSoles);
  const serviceManualPriceSoles = rawServiceManualSoles !== "" && Number.isFinite(parsedServiceManualSoles) && parsedServiceManualSoles >= 0 ? parsedServiceManualSoles : null;
  const serviceManualPriceCurrency: ManualPriceCurrency = input.serviceManualPriceCurrency || "EUR";
  const servicesAllowed = shipmentType === "documento";
  const requiresApostilleService = Boolean(input.requiresApostilleService) && servicesAllowed;
  const requiresTranslationService = Boolean(input.requiresTranslationService) && servicesAllowed;
  const parseServiceAmount = (value: string | number | null | undefined) => {
    if (value === undefined || value === null || String(value).trim() === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  };
  const apostilleManualPrice = parseServiceAmount(input.apostilleManualPrice) ?? (serviceManualPriceEur ?? serviceManualPriceSoles ?? null);
  const translationManualPrice = parseServiceAmount(input.translationManualPrice);
  const apostilleManualCurrency: ManualPriceCurrency = input.apostilleManualCurrency || serviceManualPriceCurrency;
  const translationManualCurrency: ManualPriceCurrency = input.translationManualCurrency || serviceManualPriceCurrency;
  const apostillePriceEur = requiresApostilleService ? (apostilleManualCurrency === "EUR" ? apostilleManualPrice ?? 40 : 40) : 0;
  const translationPriceEur = requiresTranslationService ? (translationManualCurrency === "EUR" ? translationManualPrice ?? 50 : 50) : 0;
  const servicePriceEur = apostillePriceEur + translationPriceEur;
  const apostillePriceSoles = requiresApostilleService ? (apostilleManualCurrency === "PEN" ? apostilleManualPrice ?? 160 : 160) : 0;
  const translationPriceSoles = requiresTranslationService ? (translationManualCurrency === "PEN" ? translationManualPrice ?? 200 : 200) : 0;
  const servicePriceSoles = apostillePriceSoles + translationPriceSoles;
  const apostillePriceUsd = requiresApostilleService ? (apostilleManualCurrency === "USD" ? apostilleManualPrice ?? 40 : 40) : 0;
  const translationPriceUsd = requiresTranslationService ? (translationManualCurrency === "USD" ? translationManualPrice ?? 50 : 50) : 0;
  const servicePriceUsd = apostillePriceUsd + translationPriceUsd;
  const servicePriceInPriceUnit = priceUnit === "PEN" ? servicePriceSoles : priceUnit === "USD" ? servicePriceUsd : servicePriceEur;
  const provinceEnabled = Boolean(input.isProvinceDelivery) || isProvinceShipmentRoute(route);
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

  if (usesManualPrice) {
    totalEur = manualPrice;
    tariffDescription = shipmentType === "encomienda"
      ? `Encomienda (${weightKg} kg, tarifa manual): ${totalEur.toFixed(2)} ${manualPriceCurrency}`
      : `Documento (${docType}, ${sheetCount} hojas, tarifa manual): ${totalEur.toFixed(2)} ${manualPriceCurrency}`;
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

  // Todos los componentes numéricos del total se expresan en priceUnit. Esto evita
  // mezclar un documento manual en PEN con servicios o provincia calculados en EUR.
  const totalWithExtraEur = totalEur + netExtraPriceEur + servicePriceInPriceUnit + provinceCustomerPriceEur + provinceExtraPriceEur;
  const usesAutomaticProvincePrice = provinceEnabled && rawProvinceCustomerPrice === "";
  const provinceTierLabel = weightKg <= 5 ? "hasta 5 kg" : "más de 5 kg";
  const provinceDescription = provinceEnabled
    ? ` Envío a provincia (${provinceCarrier || "agencia seleccionada"}): +${provinceCustomerPriceEur.toFixed(2)} ${priceUnit}${usesAutomaticProvincePrice ? ` (${provinceTierLabel})` : ""}${provinceExtraPriceEur > 0 ? `; excedente sobre 10 kg (2,00 ${priceUnit}/kg): +${provinceExtraPriceEur.toFixed(2)} ${priceUnit}` : ""}.`
    : "";
  const extraDescription = extraPriceEur > 0 ? ` Importe extra: +${extraPriceEur.toFixed(2)} ${priceUnit}${extraDiscountEur > 0 ? `; descuento del extra: -${extraDiscountEur.toFixed(2)} ${priceUnit}; extra neto: +${netExtraPriceEur.toFixed(2)} ${priceUnit}` : ""}.` : "";
  const serviceDescription = `${requiresApostilleService ? " Servicio contratado: Apostillado." : ""}${requiresTranslationService ? " Servicio contratado: Traducción." : ""}`;
  const generatedNote = `${GENERATED_SHIPMENT_NOTE_PREFIX} ${tariffDescription}.${serviceDescription}${provinceDescription}${extraDescription}`.trim();
  return {
    shipmentType,
    docType,
    sheetCount,
    weightKg,
    parcelRateEurPerKg,
    manualPrice,
    manualPriceCurrency,
    usesManualPrice,
    extraPriceEur,
    extraDiscountEur,
    netExtraPriceEur,
    route,
    requiresApostilleService,
    requiresTranslationService,
    serviceManualPriceEur,
    serviceManualPriceSoles,
    serviceManualPriceCurrency,
    apostilleManualPrice,
    apostilleManualCurrency,
    translationManualPrice,
    translationManualCurrency,
    servicePriceEur,
    servicePriceSoles,
    servicePriceUsd,
    servicePriceInPriceUnit,
    isProvinceDelivery: provinceEnabled,
    provinceCustomerPriceEur,
    provinceExtraPriceEur,
    provinceOperationalCostSoles,
    provinceCarrier,
    totalEur: totalWithExtraEur,
    pricingCurrency,
    priceUnit,
    additionalDocuments,
    notes: mergeShipmentNotes(generatedNote, extractFreeformShipmentNotes(input.notes)),
  };
}
