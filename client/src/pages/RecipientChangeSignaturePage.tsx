import React, { useState } from "react";
import { CheckCircle2, Download, FileSignature, Loader2, Printer, ShieldCheck, X } from "lucide-react";
import { useLocation } from "wouter";
import ElectronicSignatureDialog from "@/components/ElectronicSignatureDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { getReceiptBranding } from "@/lib/userReceipt";
import { getIdentityDocumentLabel } from "@shared/identityDocuments";
import { buildSignatureSvgMarkup } from "../../../shared/signature";

function getRequestQuery() {
  const params = new URLSearchParams(window.location.search);
  return { requestId: Number(params.get("solicitud")), token: params.get("token")?.trim() || "" };
}

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

export default function RecipientChangeSignaturePage() {
  const [, setLocation] = useLocation();
  const query = getRequestQuery();
  const enabled = Number.isInteger(query.requestId) && query.requestId > 0 && query.token.length >= 20;
  const requestQuery = trpc.recipientChangeSignature.get.useQuery(query, { enabled });
  const completeMutation = trpc.recipientChangeSignature.complete.useMutation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState("");
  const request = requestQuery.data;
  const signed = request?.status === "signed";
  const branding = request ? getReceiptBranding({ registeredByEmail: request.registeredByEmail, registeredById: request.registeredById }) : null;
  const routeIsLimaTorino = request?.route === "Lima - Torino";
  const declarationTitle = routeIsLimaTorino
    ? "DECLARACIÓN JURADA DE AUTORIZACIÓN DE CAMBIO DE DESTINATARIO — PERÚ / ITALIA"
    : "DECLARACIÓN JURADA DE AUTORIZACIÓN DE CAMBIO DE DESTINATARIO — ITALIA / PERÚ";

  const close = () => setLocation("/");
  const sign = async (input: { signatureStrokes: string }) => {
    setError("");
    try {
      await completeMutation.mutateAsync({ ...query, signatureStrokes: input.signatureStrokes });
      setDialogOpen(false);
      await requestQuery.refetch();
    } catch (issue: any) {
      setError(issue?.message || "No se pudo registrar la firma.");
    }
  };

  const downloadDeclaration = () => {
    if (!request || !branding) return;
    const signature = signed && request.signatureStrokes ? buildSignatureSvgMarkup(request.signatureStrokes, "electronic-signature-svg") : "<em>Pendiente de firma electrónica</em>";
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Declaración cambio destinatario ${escapeHtml(request.orderNumber)}</title><style>body{font-family:Arial,sans-serif;color:#14213d;margin:40px;line-height:1.55}header{display:flex;gap:18px;align-items:center;border-bottom:3px solid #f28c00;padding-bottom:14px}img{width:92px;height:92px;object-fit:contain}h1{font-size:19px;margin:12px 0;text-align:center}h2{font-size:14px;margin:16px 0 8px}.box{border:1px solid #cbd5e1;border-radius:10px;padding:14px;margin:12px 0}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.muted{color:#475569;font-size:12px}.signature{border-top:1px solid #64748b;margin-top:30px;padding-top:8px}@media print{body{margin:22px}}</style></head><body><header><img src="${escapeHtml(new URL(branding.logoPath, window.location.origin).href)}"><div><strong>${escapeHtml(branding.companyName)}</strong><br><span class="muted">${escapeHtml(branding.subtitle)} · RUC ${escapeHtml(branding.ruc)}</span></div></header><h1>${escapeHtml(declarationTitle)}</h1><p>Yo, <strong>${escapeHtml(request.senderName)}</strong>, declaro bajo juramento que autorizo el cambio de destinatario del envío identificado con Orden <strong>${escapeHtml(request.orderNumber)}</strong> y Código <strong>${escapeHtml(request.code)}</strong>, en la ruta <strong>${escapeHtml(request.route)}</strong>.</p><div class="grid"><div class="box"><h2>DESTINATARIO ANTERIOR</h2><strong>${escapeHtml(request.previousRecipientName || "No indicado")}</strong><br>${escapeHtml(getIdentityDocumentLabel(request.previousRecipientDocumentType))}: ${escapeHtml(request.previousRecipientDni || "No indicado")}<br>Celular: ${escapeHtml(request.previousRecipientPhone || "No indicado")}</div><div class="box"><h2>NUEVO DESTINATARIO AUTORIZADO</h2><strong>${escapeHtml(request.newRecipientName)}</strong><br>${escapeHtml(getIdentityDocumentLabel(request.newRecipientDocumentType))}: ${escapeHtml(request.newRecipientDni)}<br>Celular: ${escapeHtml(request.newRecipientPhone)}</div></div><p>Declaro que la información entregada es verdadera y autorizo a ${escapeHtml(branding.companyName)} a actualizar exclusivamente los datos del destinatario indicados en esta declaración, manteniendo la trazabilidad del envío y la evidencia de firma electrónica.</p><p class="muted">${routeIsLimaTorino ? "Declaración emitida para operación Perú–Italia." : "Declaración emitida para operación Italia–Perú."} La firma electrónica queda asociada a esta solicitud y a la fecha de aceptación.</p><div class="signature"><strong>Firma electrónica del remitente</strong><br>${signature}<br><span class="muted">${signed ? `Firmado por ${escapeHtml(request.signerName || request.senderName)} el ${request.signedAt ? new Date(request.signedAt).toLocaleString("es-PE") : ""}` : "Pendiente de firma"}</span></div></body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `declaracion-cambio-destinatario-${String(request.orderNumber).replace(/[^a-zA-Z0-9-]/g, "")}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!enabled) return <main className="min-h-screen bg-slate-50 p-6"><Card className="mx-auto max-w-xl p-6 text-center"><h1 className="text-xl font-bold text-[#0B2B5E]">Enlace de firma no válido</h1><p className="mt-2 text-slate-600">Solicita un nuevo enlace a la agencia.</p><Button className="mt-5" variant="outline" onClick={close}>Ir al rastreo</Button></Card></main>;
  if (requestQuery.isLoading) return <main className="min-h-screen bg-slate-50 p-6"><Card className="mx-auto flex max-w-xl items-center justify-center gap-3 p-8 text-[#0B2B5E]"><Loader2 className="h-5 w-5 animate-spin" />Preparando declaración…</Card></main>;
  if (!request || !branding) return <main className="min-h-screen bg-slate-50 p-6"><Card className="mx-auto max-w-xl p-6 text-center"><h1 className="text-xl font-bold text-rose-700">No se pudo abrir la solicitud</h1><p className="mt-2 text-slate-600">El enlace pudo haber vencido. Solicita uno nuevo a la agencia.</p></Card></main>;

  return <main className="min-h-screen bg-slate-50 p-4 sm:p-8"><Card className="mx-auto max-w-3xl overflow-hidden border-0 shadow-xl"><header className="bg-[#0B2B5E] px-5 py-5 text-white sm:px-7"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex gap-3"><img src={branding.logoPath} alt="" className="h-14 w-14 rounded-lg bg-white object-contain p-1" /><div><p className="text-xs font-semibold text-orange-200">{branding.companyName}</p><h1 className="mt-1 text-xl font-bold">Cambio protegido de destinatario</h1><p className="mt-1 text-sm text-blue-100">Orden {request.orderNumber} · Código {request.code}</p></div></div><Button type="button" size="sm" variant="outline" onClick={close} className="border-white/60 bg-white/10 text-white hover:bg-white hover:text-[#0B2B5E]"><X className="mr-1 h-4 w-4" />Cerrar</Button></div></header><div className="space-y-5 p-5 sm:p-7"><section className={`rounded-xl border p-4 ${signed ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}><div className="flex gap-3"><div className={`mt-0.5 rounded-full p-2 ${signed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{signed ? <CheckCircle2 className="h-5 w-5" /> : <FileSignature className="h-5 w-5" />}</div><div><h2 className="font-bold text-slate-900">{signed ? "Cambio firmado y aplicado" : "Declaración pendiente de firma"}</h2><p className="mt-1 text-sm text-slate-700">Ruta: <strong>{request.route}</strong> · Remitente: <strong>{request.senderName}</strong></p>{signed && <p className="mt-2 text-sm text-emerald-800">La modificación se aplicó el {request.signedAt ? new Date(request.signedAt).toLocaleString("es-PE") : "momento indicado"}.</p>}</div></div></section><section className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="text-base font-extrabold text-[#0B2B5E]">{declarationTitle}</h2><p className="mt-3 text-sm leading-6 text-slate-700">El remitente autoriza a {branding.companyName} a reemplazar el destinatario indicado únicamente después de registrar su firma electrónica. La evidencia, fecha y trazado de firma quedan vinculados a esta solicitud.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Destinatario anterior</p><p className="mt-1 font-bold text-slate-900">{request.previousRecipientName || "No indicado"}</p><p className="mt-1 text-sm text-slate-600">{getIdentityDocumentLabel(request.previousRecipientDocumentType)}: {request.previousRecipientDni || "No indicado"}<br />Celular: {request.previousRecipientPhone || "No indicado"}</p></div><div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3"><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Nuevo destinatario autorizado</p><p className="mt-1 font-bold text-slate-900">{request.newRecipientName}</p><p className="mt-1 text-sm text-slate-700">{getIdentityDocumentLabel(request.newRecipientDocumentType)}: {request.newRecipientDni}<br />Celular: {request.newRecipientPhone}</p></div></div></section><section className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#0B2B5E]" /><p className="text-sm text-slate-600">Al firmar confirmas que eres el remitente y autorizas el cambio detallado. No firmes si la información no coincide con tu solicitud.</p></div></section>{error && <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}<div className="flex flex-col gap-2 sm:flex-row"><Button type="button" variant="outline" className="flex-1" onClick={downloadDeclaration}><Download className="mr-2 h-4 w-4" />Descargar declaración</Button><Button type="button" variant="outline" className="flex-1" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Imprimir / Guardar PDF</Button>{!signed && <Button type="button" className="flex-1 bg-[#0B2B5E] text-white hover:bg-[#123d78]" onClick={() => setDialogOpen(true)} disabled={completeMutation.isPending}><FileSignature className="mr-2 h-4 w-4" />Firmar ahora</Button>}</div></div></Card><ElectronicSignatureDialog open={dialogOpen} orderNumber={request.orderNumber} code={request.code} isSubmitting={completeMutation.isPending} errorMessage={error} onClose={() => { setDialogOpen(false); setError(""); }} onSubmit={(input) => void sign(input)} /></main>;
}
