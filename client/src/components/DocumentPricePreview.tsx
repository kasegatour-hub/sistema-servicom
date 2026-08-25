import React from "react";
import { getDocumentPricePreview, type DocumentPriceKind } from "@/lib/documentPricePreview";

type DocumentPricePreviewProps = {
  docType: DocumentPriceKind;
  sheetCount: number;
  additionalTotalEur?: number;
  manualPriceEur?: string | number | null;
  extraPriceEur?: string | number | null;
  extraDiscountEur?: string | number | null;
};

export function DocumentPricePreview({ docType, sheetCount, additionalTotalEur = 0, manualPriceEur, extraPriceEur = 0, extraDiscountEur = 0 }: DocumentPricePreviewProps) {
  const price = getDocumentPricePreview({ docType, sheetCount, additionalTotalEur, manualPriceEur, extraPriceEur, extraDiscountEur });

  return (
    <div key={`${price.docType}-${price.sheetCount}-${price.totalEur}-${price.usesManualPrice}`} aria-live="polite" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 shadow-sm transition-all duration-200">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Precio estimado · actualización inmediata</p>
          <p data-testid="document-price-total" className="mt-1 text-2xl font-extrabold tabular-nums text-emerald-800">{price.totalEur.toFixed(2)} €</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">{price.sheetCount} de {price.maximumSheets} hojas</span>
      </div>

      {price.usesManualPrice ? (
        <p className="mt-3 text-sm font-medium text-amber-900">Precio manual activo: reemplaza la tarifa automática y los documentos adicionales; el importe extra se suma al final.</p>
      ) : (
        <div className="mt-3 space-y-1 text-sm">
          <p>Tarifa base: <strong>{price.baseEur.toFixed(2)} €</strong> hasta {price.includedSheets} hojas.</p>
          {price.hasSurcharge ? <p className="font-semibold text-emerald-800">Recargo por hojas: +{price.surchargeEur.toFixed(2)} €{price.docType === "simple" ? ` (${price.extraSheets} hoja${price.extraSheets === 1 ? "" : "s"} adicional${price.extraSheets === 1 ? "" : "es"})` : ""}.</p> : <p className="text-emerald-800">Sin recargo por hojas todavía. {price.nextChargeDescription}</p>}
          {price.additionalTotalEur > 0 && <p>Documentos adicionales: <strong>+{price.additionalTotalEur.toFixed(2)} €</strong>.</p>}
          {price.extraPriceEur > 0 && <p className="font-semibold text-emerald-800">Importe extra: <strong>+{price.extraPriceEur.toFixed(2)} €</strong>{price.extraDiscountEur > 0 ? ` · descuento -${price.extraDiscountEur.toFixed(2)} € · extra neto +${price.netExtraPriceEur.toFixed(2)} €` : ""}.</p>}
        </div>
      )}
      {price.usesManualPrice && price.extraPriceEur > 0 && <p className="mt-2 text-sm font-semibold text-emerald-800">Importe extra: +{price.extraPriceEur.toFixed(2)} €{price.extraDiscountEur > 0 ? ` · descuento -${price.extraDiscountEur.toFixed(2)} € · extra neto +${price.netExtraPriceEur.toFixed(2)} €` : ""}.</p>}
    </div>
  );
}
