export type ReceiptPriceData = {
  manualPriceEur?: string | number | null;
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

export function getReceiptPricePresentation(data: ReceiptPriceData) {
  const basePrice = finiteNumber(data.basePriceEur) ?? finiteNumber(data.manualPriceEur);
  const finalPrice = finiteNumber(data.finalPriceEur) ?? basePrice;
  const discountPercent = finiteNumber(data.discountPercent) ?? 0;
  const discountAmount = finiteNumber(data.discountAmountEur) ?? 0;
  return {
    basePrice,
    finalPrice,
    discountPercent,
    discountAmount,
    hasDiscount: discountPercent > 0 && discountAmount > 0 && basePrice !== null && finalPrice !== null,
    finalLabel: finalPrice === null ? "Según tarifa" : `${finalPrice.toFixed(2)} EUR`,
    baseLabel: basePrice === null ? "Según tarifa" : `${basePrice.toFixed(2)} EUR`,
  };
}

export function buildReceiptPriceHtml(data: ReceiptPriceData) {
  const price = getReceiptPricePresentation(data);
  return `<div class="price-highlight"><span class="price-label">PRECIO FINAL</span><strong class="price-value">${price.finalLabel}</strong>${price.hasDiscount ? `<span class="price-base">Precio base: ${price.baseLabel} · Descuento ${price.discountPercent.toFixed(0)}% (-${price.discountAmount.toFixed(2)} EUR)</span>` : ""}</div>`;
}
