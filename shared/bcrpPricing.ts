import { derivePricingCurrency, normalizeIndependentEndpoints, type ShipmentPricingCurrency } from "./shipmentEndpoints";

export const BCRP_COMMISSION_PEN_PER_EUR = 0.15;
export type ShipmentAmountCurrency = ShipmentPricingCurrency | "USD";

export function convertEurToPen(amountEur: number, adjustedPenPerEur?: number | null) {
  if (!Number.isFinite(amountEur) || amountEur < 0 || !Number.isFinite(Number(adjustedPenPerEur)) || Number(adjustedPenPerEur) <= 0) return null;
  return Number((amountEur * Number(adjustedPenPerEur)).toFixed(2));
}

export function formatPenAmount(amountPen: number | null | undefined) {
  return amountPen == null ? "Consulta BCRP pendiente" : `S/ ${amountPen.toFixed(2)}`;
}

export function resolveShipmentPricingCurrency(shipment: { pricingCurrency?: string | null; route?: string | null; originPoint?: string | null; destinationPoint?: string | null }): ShipmentPricingCurrency {
  if (shipment.pricingCurrency === "PEN" || shipment.pricingCurrency === "EUR") return shipment.pricingCurrency;
  return derivePricingCurrency(normalizeIndependentEndpoints({ route: shipment.route, originPoint: shipment.originPoint as any, destinationPoint: shipment.destinationPoint as any }));
}

export function resolveShipmentAmountCurrency(shipment: Parameters<typeof resolveShipmentPricingCurrency>[0] & { manualPriceEur?: number | string | null; manualPriceCurrency?: string | null }): ShipmentAmountCurrency {
  const hasManualPrice = shipment.manualPriceEur !== undefined && shipment.manualPriceEur !== null && String(shipment.manualPriceEur).trim() !== "" && Number.isFinite(Number(shipment.manualPriceEur));
  if (hasManualPrice && (shipment.manualPriceCurrency === "EUR" || shipment.manualPriceCurrency === "USD" || shipment.manualPriceCurrency === "PEN")) return shipment.manualPriceCurrency;
  return resolveShipmentPricingCurrency(shipment);
}

export function formatShipmentAmount(amount: number | string | null | undefined, shipment: Parameters<typeof resolveShipmentAmountCurrency>[0]) {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return "No especificado";
  const currency = resolveShipmentAmountCurrency(shipment);
  return `${numeric.toFixed(2)} ${currency === "PEN" ? "S/" : currency}`;
}
