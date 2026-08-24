import React, { useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, Download, PenLine, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { buildReceiptDownloadFilename, downloadShipmentReceipt, printUserShipmentReceipt, type ReceiptDownloadFormat } from "@/lib/userReceipt";
import { getPaymentStatusUi } from "@/lib/paymentStatus";
import { getReceiptPricePresentation } from "@/lib/receiptPrice";
import { formatPhoneNumber } from "@/lib/phoneFormatting";
import { getRoutePresentation } from "@/lib/routeDetails";
import ElectronicSignatureDialog from "@/components/ElectronicSignatureDialog";

function getReceiptQuery() {
  const params = new URLSearchParams(window.location.search);
  return {
    orderNumber: params.get("order")?.trim() ?? "",
    code: params.get("code")?.trim().toUpperCase() ?? "",
    signature: params.get("signature")?.trim() ?? "",
  };
}

export default function ReceiptPage() {
  const [query] = useState(getReceiptQuery);
  const shipmentQuery = { orderNumber: query.orderNumber, code: query.code };
  const { data: shipment, isLoading, error, refetch: refetchShipment } = trpc.shipment.search.useQuery(shipmentQuery, {
    enabled: Boolean(query.orderNumber && query.code),
  });
  const completeSignatureMutation = trpc.shipment.completeSignature.useMutation();
  const accountQuery = trpc.account.me.useQuery();
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [signatureError, setSignatureError] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [downloadFormat, setDownloadFormat] = useState<ReceiptDownloadFormat>("pdf");
  const paymentUi = shipment ? getPaymentStatusUi(shipment.paymentStatus) : getPaymentStatusUi(undefined);
  const priceUi = shipment ? getReceiptPricePresentation(shipment) : null;
  const routePresentation = getRoutePresentation(shipment?.route, shipment?.destinationAddress);
  const canSignThisShipment = Boolean(query.signature && accountQuery.data?.id && shipment?.accountId === accountQuery.data.id && shipment.deliveryMode === "remoto" && shipment.signature?.status !== "signed");

  useEffect(() => {
    if (!shipment) return;
    document.title = buildReceiptDownloadFilename({
      recipientName: shipment.recipientName,
      recipientLastName: shipment.recipientLastName,
      orderNumber: shipment.orderNumber,
      shipmentType: shipment.shipmentType,
    });
  }, [shipment]);

  const handleCompleteSignature = async (input: { signerName: string; signerDni?: string; signerEmail?: string; signerPhone?: string; signatureStrokes: string }) => {
    setSignatureError("");
    try {
      await completeSignatureMutation.mutateAsync({ ...shipmentQuery, token: query.signature, ...input });
      setSignatureDialogOpen(false);
      await refetchShipment();
    } catch (completeError: any) {
      setSignatureError(completeError?.message || "No se pudo guardar la firma electrónica.");
    }
  };
  const handlePrintReceipt = async () => {
    if (!shipment) return;
    const refreshed = await refetchShipment();
    await printUserShipmentReceipt(refreshed?.data || shipment);
  };
  const handleDownloadReceipt = async () => {
    if (!shipment) return;
    setDownloadError("");
    setIsDownloading(true);
    try {
      const refreshed = await refetchShipment();
      await downloadShipmentReceipt(refreshed?.data || shipment, downloadFormat);
    } catch (downloadReceiptError) {
      console.error("No se pudo descargar el comprobante", downloadReceiptError);
      setDownloadError("No se pudo generar el archivo. Inténtalo nuevamente.");
    } finally {
      setIsDownloading(false);
    }
  };

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
                <p><strong>Celular remitente:</strong> {formatPhoneNumber(shipment.senderPhone) || "No especificado"}</p>
                <p><strong>Destinatario:</strong> {shipment.recipientName || "No especificado"} {shipment.recipientLastName || ""}</p>
                <p><strong>Celular destinatario:</strong> {formatPhoneNumber(shipment.recipientPhone) || "No especificado"}</p>
                <p><strong>Estado del envío:</strong> {shipment.status}</p>
                <p><strong>Ruta:</strong> {routePresentation.route}</p>
                <p><strong>Origen:</strong> {routePresentation.originPrintLabel} · {routePresentation.origin.officeLabel}</p>
                <p><strong>Destino:</strong> {routePresentation.destinationPrintLabel} · {routePresentation.destination.officeLabel}</p>
                <p className="md:col-span-2"><strong>Dirección de entrega:</strong> {routePresentation.destination.address}</p>
                <p className="md:col-span-2"><strong>Contacto de sede:</strong> {formatPhoneNumber(routePresentation.destination.phone) || routePresentation.destination.phone}</p>
                <p className="md:col-span-2"><strong>Estado de Pago:</strong> <span className={`ml-1 inline-flex rounded px-2 py-0.5 font-semibold ${paymentUi.badgeClass}`}>{paymentUi.label}</span></p>
                <p className="md:col-span-2"><strong>Modalidad:</strong> {shipment.deliveryMode === "remoto" ? "Envío remoto con firma electrónica" : "Entrega en agencia"}</p>
                <div className="md:col-span-2 rounded-md border-l-4 border-[#F28C00] bg-orange-50 px-4 py-3"><span className="block text-xs font-bold uppercase tracking-wide text-slate-600">Precio final</span><strong className="text-xl font-extrabold text-orange-700">{priceUi?.finalLabel}</strong>{priceUi?.hasDiscount && <span className="ml-2 text-xs font-medium text-slate-600">Precio base {priceUi.baseLabel} · descuento {priceUi.discountPercent.toFixed(0)}%</span>}</div>
              </div>

              {shipment.deliveryMode === "remoto" && shipment.signature?.status === "signed" && (
                <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
                  <div>
                    <p className="font-semibold">Firma electrónica registrada</p>
                    <p className="text-sm">Firmante: {shipment.signature.signerName || "Cliente"}{shipment.signature.signedAt ? ` · ${new Date(shipment.signature.signedAt).toLocaleString("es-PE")}` : ""}</p>
                    <p className="mt-1 text-xs text-emerald-800">La evidencia conserva consentimiento versionado, fecha de firma y huella criptográfica para verificación posterior.</p>
                  </div>
                </div>
              )}
              {canSignThisShipment && (
                <div className="flex flex-col gap-4 rounded-lg border border-blue-200 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="flex items-center gap-2 font-semibold text-[#0B2B5E]"><PenLine className="h-4 w-4" aria-hidden="true" /> Recepción remota y firma electrónica pendiente</p>
                    <p className="mt-1 text-sm text-slate-600">Esta solicitud fue enviada por un Administrador o Registrador a tu cuenta Cliente.</p>
                  </div>
                  <Button type="button" onClick={() => setSignatureDialogOpen(true)} disabled={completeSignatureMutation.isPending} className="shrink-0 bg-[#0B2B5E] text-white hover:bg-[#123d78]">
                    <PenLine className="mr-2 h-4 w-4" aria-hidden="true" /> Firmar electrónicamente
                  </Button>
                </div>
              )}
              {shipment.deliveryMode === "agencia" && (
                <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-slate-700"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" /><div><p className="font-semibold">Recepción en agencia</p><p className="text-sm">El remitente debe entregar el paquete en la sede de origen indicada arriba. El personal de la agencia registra la recepción y el destinatario lo recoge en la sede de destino. No requiere firma remota desde este recibo.</p></div></div>
              )}
              {signatureError && !signatureDialogOpen && <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">{signatureError}</p>}

              <div className="flex flex-col gap-3 rounded-lg border border-[#0B2B5E]/15 bg-[#0B2B5E]/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">Recibo listo para descargar o imprimir</p>
                  <p className="text-sm text-slate-600">Selecciona PDF, Word o Markdown. El archivo se descarga con el nombre del destinatario; la impresión es independiente.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select aria-label="Formato de descarga" value={downloadFormat} onChange={(event) => setDownloadFormat(event.target.value as ReceiptDownloadFormat)} disabled={isDownloading} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 focus:border-[#0B2B5E] focus:outline-none">
                    <option value="pdf">PDF (predeterminado)</option>
                    <option value="word">Word (.doc)</option>
                    <option value="md">Markdown (.md)</option>
                  </select>
                  <Button type="button" onClick={handleDownloadReceipt} disabled={isDownloading} className="bg-[#0B2B5E] text-white hover:bg-[#123d78]">
                    <Download className="mr-2 h-4 w-4" aria-hidden="true" /> {isDownloading ? "Generando archivo…" : `Descargar ${downloadFormat === "word" ? "Word" : downloadFormat === "md" ? "MD" : "PDF"}`}
                  </Button>
                  <Button type="button" variant="outline" onClick={handlePrintReceipt}>
                    <Printer className="mr-2 h-4 w-4" aria-hidden="true" /> Imprimir recibo
                  </Button>
                </div>
              </div>
              {downloadError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{downloadError}</p>}
            </div>
          )}
        </Card>

        <ElectronicSignatureDialog
          open={signatureDialogOpen}
          orderNumber={query.orderNumber}
          code={query.code}
          isSubmitting={completeSignatureMutation.isPending}
          errorMessage={signatureError}
          onClose={() => { setSignatureDialogOpen(false); setSignatureError(""); }}
          onSubmit={handleCompleteSignature}
        />

        <p className="mt-5 text-center text-xs text-slate-500"><CheckCircle2 className="mr-1 inline h-3.5 w-3.5 text-emerald-600" aria-hidden="true" /> Recibo oficial de Servicom Internacional.</p>
      </div>
    </main>
  );
}
