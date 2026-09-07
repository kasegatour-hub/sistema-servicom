import React from "react";
import { getDocumentPricePreview, type DocumentPriceKind } from "@/lib/documentPricePreview";
import { convertEurToPen, formatPenAmount } from "@shared/bcrpPricing";

type ManualCurrency = "EUR" | "USD" | "PEN";

type DocumentPricePreviewProps = {
  docType: DocumentPriceKind;
  sheetCount: number;
  additionalTotalEur?: number;
  manualPriceEur?: string | number | null;
  manualPriceCurrency?: ManualCurrency | string | null;
  pricingCurrency?: "EUR" | "PEN" | string | null;
  extraPriceEur?: string | number | null;
  extraDiscountEur?: string | number | null;
  serviceTotalEur?: number;
  serviceSummary?: string;
  penPerEur?: number | null;
};

function currencyLabel(currency: ManualCurrency | "EUR" | "PEN") {
  return currency === "PEN" ? "S/" : currency === "USD" ? "USD" : "€";
}

export function DocumentPricePreview({ docType, sheetCount, additionalTotalEur = 0, manualPriceEur, manualPriceCurrency, pricingCurrency, extraPriceEur = 0, extraDiscountEur = 0, serviceTotalEur = 0, serviceSummary, penPerEur }: DocumentPricePreviewProps) {
  const price = getDocumentPricePreview({ docType, sheetCount, additionalTotalEur, manualPriceEur, extraPriceEur, extraDiscountEur });
  const hasManualPrice = price.usesManualPrice && (manualPriceCurrency === "EUR" || manualPriceCurrency === "USD" || manualPriceCurrency === "PEN");
  const activeCurrency: ManualCurrency | "EUR" | "PEN" = hasManualPrice ? manualPriceCurrency : pricingCurrency === "PEN" ? "PEN" : "EUR";
  const unit = currencyLabel(activeCurrency);
  const totalWithServices = price.totalEur + Math.max(0, serviceTotalEur);
  const totalPen = !hasManualPrice || activeCurrency === "EUR" ? convertEurToPen(totalWithServices, penPerEur) : null;
  const displayTotal = `${totalWithServices.toFixed(2)} ${unit}`;
  const displayPrice = (value: number) => `${value.toFixed(2)} ${unit}`;

  return (
    <div key={`${price.docType}-${price.sheetCount}-${totalWithServices}-${price.usesManualPrice}-${activeCurrency}`} aria-live="polite" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 shadow-sm transition-all duration-200">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Precio estimado · actualización inmediata</p>
          <p data-testid="document-price-total" className="mt-1 text-2xl font-extrabold tabular-nums text-emerald-800">{displayTotal}</p>
          <p data-testid="document-price-currencies" className="mt-1 text-xs font-semibold text-slate-600">Denominaciones disponibles: EUR (€) · USD ($) · PEN (S/)</p>
          {totalPen !== null && <><p data-testid="document-price-total-pen" className="mt-1 text-lg font-bold tabular-nums text-[#0B2B5E]">{formatPenAmount(totalPen)}</p>{penPerEur ? <p data-testid="document-price-rate" className="mt-1 text-xs font-medium text-slate-600">Cotización vigente aplicada: 1 EUR = S/ {Number(penPerEur).toFixed(4)}</p> : null}</>}
          {hasManualPrice && activeCurrency !== "EUR" && <p data-testid="document-price-currency-note" className="mt-1 text-sm font-semibold text-[#0B2B5E]">Importe manual expresado en {activeCurrency === "PEN" ? "soles" : "dólares"}; no se convierte automáticamente.</p>}
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">{price.sheetCount} de {price.maximumSheets} hojas</span>
      </div>

      {price.usesManualPrice ? (
        <p className="mt-3 text-sm font-medium text-amber-900">Precio manual activo: reemplaza la tarifa automática y los documentos adicionales; el importe extra se suma al final.</p>
      ) : (
        <div className="mt-3 space-y-1 text-sm">
          <p>Tarifa base: <strong>{displayPrice(price.baseEur)}</strong> hasta {price.includedSheets} hojas.</p>
          {price.hasSurcharge ? <p className="font-semibold text-emerald-800">Recargo por hojas: +{displayPrice(price.surchargeEur)}{price.docType === "simple" ? ` (${price.extraSheets} hoja${price.extraSheets === 1 ? "" : "s"} adicional${price.extraSheets === 1 ? "" : "es"})` : " (bloque adicional de hasta 5 hojas del mismo tipo)"}.</p> : <p className="text-emerald-800">Sin recargo por hojas todavía. {price.nextChargeDescription}</p>}
          {price.additionalTotalEur > 0 && <p>Documentos adicionales: <strong>+{displayPrice(price.additionalTotalEur)}</strong>.</p>}
          {price.extraPriceEur > 0 && <p className="font-semibold text-emerald-800">Importe extra: <strong>+{displayPrice(price.extraPriceEur)}</strong>{price.extraDiscountEur > 0 ? ` · descuento -${displayPrice(price.extraDiscountEur)} · extra neto +${displayPrice(price.netExtraPriceEur)}` : ""}.</p>}
        </div>
      )}
      {price.usesManualPrice && price.extraPriceEur > 0 && <p className="mt-2 text-sm font-semibold text-emerald-800">Importe extra: +{displayPrice(price.extraPriceEur)}{price.extraDiscountEur > 0 ? ` · descuento -${displayPrice(price.extraDiscountEur)} · extra neto +${displayPrice(price.netExtraPriceEur)}` : ""}.</p>}
      {serviceTotalEur > 0 && <p className="mt-2 rounded-lg bg-white/80 px-3 py-2 text-sm font-semibold text-emerald-800">Servicios: +{displayPrice(serviceTotalEur)}{serviceSummary ? ` · ${serviceSummary}` : ""}.</p>}
    </div>
  );
}
