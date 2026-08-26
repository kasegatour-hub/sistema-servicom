import React, { useState } from "react";
import { CheckCircle2, FileSignature, Loader2, ShieldCheck, X } from "lucide-react";
import { useLocation } from "wouter";
import ElectronicSignatureDialog from "@/components/ElectronicSignatureDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { getRoutePresentation } from "@/lib/routeDetails";

function getSignatureQuery() {
  const params = new URLSearchParams(window.location.search);
  return { orderNumber: params.get("order")?.trim() || "", code: params.get("code")?.trim().toUpperCase() || "", token: params.get("token")?.trim() || "" };
}

function isKasegaShipment(shipment: any) {
  return [210001, 210002].includes(Number(shipment?.registeredById)) || /^(magda\.barreto\.alv@gmail\.com|kasegatour@gmail\.com)$/i.test(String(shipment?.registeredByEmail || "").trim());
}

export default function ShipmentSignaturePage() {
  const [, setLocation] = useLocation();
  const query = getSignatureQuery();
  const enabled = Boolean(query.orderNumber && query.code && query.token.length >= 20);
  const shipmentQuery = trpc.shipment.search.useQuery({ orderNumber: query.orderNumber, code: query.code }, { enabled });
  const completeMutation = trpc.shipment.completeSignature.useMutation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState("");
  const shipment = shipmentQuery.data;
  const signed = shipment?.signature?.status === "signed";
  // El enlace ya fue validado por el token seguro, su orden y su código en el servidor.
  // La firma pública debe funcionar igual que Carta de invitación, incluso si el cliente aún no inició sesión.
  const canSign = Boolean(shipment && !signed && shipment.deliveryMode === "remoto");
  const brandingName = isKasegaShipment(shipment) ? "KASEGA TOUR EIRL" : "SERVICOM INTERNACIONAL";
  const route = getRoutePresentation(shipment?.route, shipment?.destinationAddress);
  const sender = `${shipment?.senderName || ""} ${shipment?.senderLastName || ""}`.trim() || "No especificado";
  const recipient = `${shipment?.recipientName || ""} ${shipment?.recipientLastName || ""}`.trim() || "No especificado";

  const close = () => setLocation("/");
  const sign = async (input: { signerName: string; signerDni?: string; signerEmail?: string; signerPhone?: string; signatureStrokes: string }) => {
    setError("");
    try {
      await completeMutation.mutateAsync({ ...query, ...input });
      setDialogOpen(false);
      await shipmentQuery.refetch();
    } catch (issue: any) {
      setError(issue?.message || "No se pudo registrar la firma.");
    }
  };

  if (!enabled) return <main className="min-h-screen bg-slate-50 p-6"><Card className="mx-auto max-w-xl p-6 text-center"><h1 className="text-xl font-bold text-[#0B2B5E]">Enlace de firma no válido</h1><p className="mt-2 text-slate-600">Solicita a {brandingName} un nuevo enlace de firma.</p><a href="/" className="mt-5 inline-flex text-sm font-semibold text-[#0B2B5E] underline">Ir al rastreo de envíos</a></Card></main>;
  if (shipmentQuery.isLoading) return <main className="min-h-screen bg-slate-50 p-6"><Card className="mx-auto flex max-w-xl items-center justify-center gap-3 p-8 text-[#0B2B5E]"><Loader2 className="h-5 w-5 animate-spin" />Preparando la declaración…</Card></main>;
  if (!shipment) return <main className="min-h-screen bg-slate-50 p-6"><Card className="mx-auto max-w-xl p-6 text-center"><h1 className="text-xl font-bold text-rose-700">No se pudo abrir el envío</h1><p className="mt-2 text-slate-600">El enlace pudo haber vencido o el envío ya no está disponible.</p><a href="/" className="mt-5 inline-flex text-sm font-semibold text-[#0B2B5E] underline">Ir al rastreo de envíos</a></Card></main>;

  return <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
    <Card className="mx-auto max-w-2xl overflow-hidden border-0 shadow-xl">
      <header className="bg-[#0B2B5E] px-6 py-5 text-white"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-orange-300">{brandingName}</p><h1 className="mt-1 text-2xl font-bold">Firma de envío</h1><p className="mt-1 text-sm text-blue-100">Revisa la declaración jurada y firma con tu dedo o mouse.</p></div><Button type="button" size="sm" variant="outline" onClick={close} className="border-white/60 bg-white/10 text-white hover:bg-white hover:text-[#0B2B5E]"><X className="mr-1 h-4 w-4" />Cerrar ventana</Button></div></header>
      <div className="space-y-5 p-6">
        <section className={`rounded-xl border p-4 ${signed ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}><div className="flex gap-3"><div className={`mt-0.5 rounded-full p-2 ${signed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{signed ? <CheckCircle2 className="h-5 w-5" /> : <FileSignature className="h-5 w-5" />}</div><div><h2 className="font-bold text-slate-900">{signed ? "Después: Declaración firmada" : "Antes: Declaración pendiente de firma"}</h2><p className="mt-1 text-sm text-slate-700">Remitente: <strong>{sender}</strong><br />Destinatario: <strong>{recipient}</strong><br />Orden: <strong>{shipment.orderNumber}</strong> · Código: <strong>{shipment.code}</strong></p>{signed && <p className="mt-2 text-sm text-emerald-800">Firma registrada{shipment.signature?.signedAt ? ` el ${new Date(shipment.signature.signedAt).toLocaleString("es-PE")}` : " correctamente"}.</p>}</div></div></section>
        <section className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="text-base font-extrabold text-[#0B2B5E]">Declaración jurada de contenido</h2><p className="mt-3 text-sm leading-6 text-slate-700">Declaro que el envío corresponde a la información indicada, que su contenido es lícito y autorizo a {brandingName} a realizar la recepción, revisión y traslado conforme a la ruta <strong>{route.route}</strong>.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Origen</p><p className="mt-1 font-semibold text-slate-900">{route.originPrintLabel}</p><p className="text-sm text-slate-600">{route.origin.address}</p></div><div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Destino</p><p className="mt-1 font-semibold text-slate-900">{route.destinationPrintLabel}</p><p className="text-sm text-slate-600">{route.destination.address}</p></div></div></section>
        <section className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#0B2B5E]" /><p className="text-sm text-slate-600">Al firmar, confirmas que revisaste la declaración jurada. El trazo, el consentimiento, la fecha y la huella criptográfica quedan asociados únicamente a esta orden y código.</p></div></section>
        {error && <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" role="alert">{error}</p>}
        {!signed && !canSign && <p className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">Este enlace no está disponible para firmar. Solicita un nuevo enlace a {brandingName}.</p>}
        {!signed && canSign && <Button type="button" className="w-full bg-[#0B2B5E] text-white hover:bg-[#123d78]" onClick={() => setDialogOpen(true)} disabled={completeMutation.isPending}><FileSignature className="mr-2 h-4 w-4" />Firmar ahora</Button>}
        <div className="border-t border-slate-200 pt-4 text-center"><p className="text-xs text-slate-500">Al cerrar esta ventana volverás al rastreo público.</p><a href="/" className="mt-2 inline-flex text-sm font-semibold text-[#0B2B5E] underline">Ir al rastreo de envíos</a></div>
      </div>
    </Card>
    <ElectronicSignatureDialog open={dialogOpen} orderNumber={shipment.orderNumber} code={shipment.code} isSubmitting={completeMutation.isPending} errorMessage={error} onClose={() => { setDialogOpen(false); setError(""); }} onSubmit={(input) => void sign(input)} />
  </main>;
}
