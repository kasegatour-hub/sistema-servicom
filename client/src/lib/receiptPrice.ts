export type ReceiptPriceCurrency = "EUR" | "USD" | "PEN";

export type ReceiptPriceData = {
  manualPriceEur?: string | number | null;
  manualPriceCurrency?: ReceiptPriceCurrency | string | null;
  pricingCurrency?: "EUR" | "PEN" | string | null;
  extraPriceEur?: string | number | null;
  basePriceEur?: string | number | null;
  discountPercent?: string | number | null;
  discountAmountEur?: string | number | null;
  finalPriceEur?: string | number | null;
  notes?: string | null;
};

function finiteNumber(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function resolveCurrency(data: ReceiptPriceData): ReceiptPriceCurrency {
  const hasManualPrice = data.manualPriceEur !== undefined && data.manualPriceEur !== null && String(data.manualPriceEur).trim() !== "" && finiteNumber(data.manualPriceEur) !== null;
  if (hasManualPrice && (data.manualPriceCurrency === "EUR" || data.manualPriceCurrency === "USD" || data.manualPriceCurrency === "PEN")) return data.manualPriceCurrency;
  if (data.pricingCurrency === "PEN") return "PEN";
  return "EUR";
}

export function currencyLabel(currency: ReceiptPriceCurrency) {
  return currency === "PEN" ? "S/" : currency === "EUR" ? "€" : "$";
}

export function getReceiptPricePresentation(data: ReceiptPriceData) {
  const currency = resolveCurrency(data);
  const unit = currencyLabel(currency);
  const basePrice = finiteNumber(data.basePriceEur) ?? finiteNumber(data.manualPriceEur);
  const finalPrice = finiteNumber(data.finalPriceEur) ?? basePrice;
  const extraPrice = finiteNumber(data.extraPriceEur) ?? 0;
  const discountPercent = finiteNumber(data.discountPercent) ?? 0;
  const discountAmount = finiteNumber(data.discountAmountEur) ?? 0;
  return {
    currency,
    unit,
    basePrice,
    finalPrice,
    extraPrice,
    discountPercent,
    discountAmount,
    hasDiscount: discountPercent > 0 && discountAmount > 0 && basePrice !== null && finalPrice !== null,
    finalLabel: finalPrice === null ? "Según tarifa" : `${unit} ${finalPrice.toFixed(2)}`,
    baseLabel: basePrice === null ? "Según tarifa" : `${unit} ${basePrice.toFixed(2)}`,
  };
}

export function buildReceiptPriceHtml(data: ReceiptPriceData) {
  const price = getReceiptPricePresentation(data);
  return `<div class="price-highlight"><span class="price-label">PRECIO FINAL</span><strong class="price-value">${price.finalLabel}</strong>${price.extraPrice > 0 ? `<span class="price-base">Importe extra: +${price.unit} ${price.extraPrice.toFixed(2)}</span>` : ""}${price.hasDiscount ? `<span class="price-base">Precio base: ${price.baseLabel} · Descuento ${price.discountPercent.toFixed(0)}% (-${price.unit} ${price.discountAmount.toFixed(2)})</span>` : ""}</div>`;
}
