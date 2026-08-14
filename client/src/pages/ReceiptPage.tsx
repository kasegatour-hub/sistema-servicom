import React, { useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { printUserShipmentReceipt } from "@/lib/userReceipt";
import { getPaymentStatusUi } from "@/lib/paymentStatus";
import { getReceiptPricePresentation } from "@/lib/receiptPrice";
import { getRoutePresentation } from "@/lib/routeDetails";

function getReceiptQuery() {
  const params = new URLSearchParams(window.location.search);
  return {
    orderNumber: params.get("order")?.trim() ?? "",
    code: params.get("code")?.trim().toUpperCase() ?? "",
  };
}

export default function ReceiptPage() {
  const [query] = useState(getReceiptQuery);
  const { data: shipment, isLoading, error } = trpc.shipment.search.useQuery(query, {
    enabled: Boolean(query.orderNumber && query.code),
  });
  const paymentUi = shipment ? getPaymentStatusUi(shipment.paymentStatus) : getPaymentStatusUi(undefined);
  const priceUi = shipment ? getReceiptPricePresentation(shipment) : null;
  const routePresentation = getRoutePresentation(shipment?.route);

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#eef6fb] to-white px-4 py-8 text-[#0B2B5E]">
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex items-center justify-between gap-4">
          <a href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0B2B5E] hover:underline">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver al rastreo
          </a>
          <img src="/manus-storage/servicom_logo_final_e7ce35aa.png" alt="Servicom Internacional" className="h-14 w-auto rounded bg-white p-1 shadow-sm" />
        </div>

        <Card className="border-0 bg-white p-6 shadow-lg ring-1 ring-slate-200 md:p-8">
          <div className="border-b-2 border-[#F28C00] pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#F28C00]">Servicom Internacional</p>
            <h1 className="mt-1 text-2xl font-bold">Recibo de envío</h1>
            <p className="mt-1 text-sm text-slate-600">RUC 20615004708 · Declaración jurada y control de entrega incluidos.</p>
          </div>

          {!query.orderNumber || !query.code ? (
            <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <AlertCircle className="mb-2 h-5 w-5" aria-hidden="true" />
              Esta página necesita una orden y un código de envío para mostrar el recibo.
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center gap-3 py-14 text-sm text-slate-600"><Spinner className="h-5 w-5" /> Cargando recibo…</div>
          ) : error || !shipment ? (
            <div className="mt-6 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <AlertCircle className="mb-2 h-5 w-5" aria-hidden="true" />
              No se encontró un envío con la orden {query.orderNumber} y el código {query.code}.
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              <div className="grid gap-3 rounded-lg bg-slate-50 p-4 text-sm md:grid-cols-2">
                <p><strong>Orden:</strong> {shipment.orderNumber}</p>
                <p><strong>Código de envío:</strong> {shipment.code}</p>
                <p><strong>Remitente:</strong> {shipment.senderName || "No especificado"} {shipment.senderLastName || ""}</p>
                <p><strong>Destinatario:</strong> {shipment.recipientName || "No especificado"} {shipment.recipientLastName || ""}</p>
                <p><strong>Celular destinatario:</strong> {shipment.recipientPhone || "No especificado"}</p>
                <p><strong>Estado del envío:</strong> {shipment.status}</p>
                <p><strong>Ruta:</strong> {routePresentation.route}</p>
                <p><strong>Origen:</strong> {routePresentation.originPrintLabel} · {routePresentation.origin.officeLabel}</p>
                <p><strong>Destino:</strong> {routePresentation.destinationPrintLabel} · {routePresentation.destination.officeLabel}</p>
                <p className="md:col-span-2"><strong>Dirección de entrega:</strong> {routePresentation.destination.address}</p>
                <p className="md:col-span-2"><strong>Contacto de sede:</strong> {routePresentation.destination.phone}</p>
                <p className="md:col-span-2"><strong>Estado de Pago:</strong> <span className={`ml-1 inline-flex rounded px-2 py-0.5 font-semibold ${paymentUi.badgeClass}`}>{paymentUi.label}</span></p>
                <div className="md:col-span-2 rounded-md border-l-4 border-[#F28C00] bg-orange-50 px-4 py-3"><span className="block text-xs font-bold uppercase tracking-wide text-slate-600">Precio final</span><strong className="text-xl font-extrabold text-orange-700">{priceUi?.finalLabel}</strong>{priceUi?.hasDiscount && <span className="ml-2 text-xs font-medium text-slate-600">Precio base {priceUi.baseLabel} · descuento {priceUi.discountPercent.toFixed(0)}%</span>}</div>
              </div>

              <div className="flex flex-col gap-3 rounded-lg border border-[#0B2B5E]/15 bg-[#0B2B5E]/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">Recibo listo para imprimir</p>
                  <p className="text-sm text-slate-600">Incluye el código QR, la declaración jurada y el ticket recortable de la sede de entrega.</p>
                </div>
                <Button type="button" onClick={() => printUserShipmentReceipt(shipment)} className="bg-[#0B2B5E] text-white hover:bg-[#123d78]">
                  <Printer className="mr-2 h-4 w-4" aria-hidden="true" /> Imprimir recibo
                </Button>
              </div>
            </div>
          )}
        </Card>

        <p className="mt-5 text-center text-xs text-slate-500"><CheckCircle2 className="mr-1 inline h-3.5 w-3.5 text-emerald-600" aria-hidden="true" /> Recibo oficial de Servicom Internacional en colaboración con Kasega Tour E.I.R.L.</p>
      </div>
    </main>
  );
}
