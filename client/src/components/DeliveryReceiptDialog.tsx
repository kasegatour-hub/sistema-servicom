import React, { useEffect, useRef, useState } from "react";
import { X, Printer, Download, Eraser, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

type DeliveryOperation = "documento" | "encomienda" | "transferencia";

type DeliveryReceiptDialogProps = {
  open: boolean;
  operation: DeliveryOperation;
  reference: string;
  operationId?: number;
  order?: string | null;
  code?: string | null;
  recipientName?: string | null;
  recipientLastName?: string | null;
  recipientDni?: string | null;
  brand?: "servicom" | "kasega";
  onClose: () => void;
};

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[character] || character));

export function DeliveryReceiptDialog({ open, operation, reference, operationId, order, code, recipientName, recipientLastName, recipientDni, brand = "servicom", onClose }: DeliveryReceiptDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [fullName, setFullName] = useState([recipientName, recipientLastName].filter(Boolean).join(" ").trim());
  const [dni, setDni] = useState(recipientDni || "");
  const [deliveredAt, setDeliveredAt] = useState(() => new Date());
  const [hasSignature, setHasSignature] = useState(false);
  const company = brand === "kasega" ? "KASEGA TOUR EIRL" : "SERVICOM INTERNACIONAL";
  const operationLabel = operation === "documento" ? "DOCUMENTO" : operation === "encomienda" ? "ENCOMIENDA" : "TRANSFERENCIA";
  const persistReceipt = trpc.admin.createDeliveryReceipt.useMutation();

  useEffect(() => {
    if (!open) return;
    setFullName([recipientName, recipientLastName].filter(Boolean).join(" ").trim());
    setDni(recipientDni || "");
    setDeliveredAt(new Date());
    setHasSignature(false);
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  }, [open, recipientName, recipientLastName, recipientDni]);

  if (!open) return null;

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * (canvas.width / rect.width), y: (event.clientY - rect.top) * (canvas.height / rect.height) };
  };
  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const position = point(event);
    if (!canvas || !context || !position) return;
    drawingRef.current = true;
    canvas.setPointerCapture?.(event.pointerId);
    context.strokeStyle = "#0B2B5E";
    context.lineWidth = 2.6;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(position.x, position.y);
  };
  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const position = point(event);
    const context = canvasRef.current?.getContext("2d");
    if (!position || !context) return;
    context.lineTo(position.x, position.y);
    context.stroke();
    setHasSignature(true);
  };
  const stop = () => { drawingRef.current = false; };
  const clear = () => { canvasRef.current?.getContext("2d")?.clearRect(0, 0, 720, 180); setHasSignature(false); };
  const signature = () => canvasRef.current?.toDataURL("image/png") || "";
  const html = () => {
    const date = deliveredAt.toLocaleString("es-PE", { dateStyle: "long", timeStyle: "short" });
    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Comprobante de recepción ${escapeHtml(reference)}</title><style>@page{size:A4;margin:16mm}body{font-family:Arial,sans-serif;color:#102e5d;margin:0}.ticket{border:2px solid #102e5d;padding:24px;min-height:620px}.brand{font-size:22px;font-weight:800;letter-spacing:.04em;border-bottom:3px solid #f59e0b;padding-bottom:10px}.title{text-align:center;font-size:20px;font-weight:800;margin:28px 0;color:#102e5d}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;border:1px solid #cbd5e1;padding:14px}.label{font-size:11px;font-weight:800;text-transform:uppercase;color:#64748b}.value{font-size:15px;font-weight:700;margin-top:3px}.statement{margin-top:24px;border-left:5px solid #f59e0b;padding:14px;background:#fff7ed;line-height:1.55;color:#243b5a}.signature{margin-top:44px;display:grid;grid-template-columns:1fr 1fr;gap:40px;text-align:center}.line{border-top:1px dashed #102e5d;padding-top:8px;font-size:12px;font-weight:800}.signature img{max-width:240px;height:65px;object-fit:contain;display:block;margin:-26px auto 4px}.foot{margin-top:40px;font-size:10px;text-align:center;color:#64748b}</style></head><body><div class="ticket"><div class="brand">${escapeHtml(company)}</div><div class="title">COMPROBANTE DE RECEPCIÓN DE ${operationLabel}</div><div class="grid"><div><div class="label">Referencia</div><div class="value">${escapeHtml(reference)}</div></div><div><div class="label">Orden / código</div><div class="value">${escapeHtml([order, code].filter(Boolean).join(" · ") || "No indicado")}</div></div><div><div class="label">Fecha y hora de entrega</div><div class="value">${escapeHtml(date)}</div></div><div><div class="label">Empresa responsable</div><div class="value">${escapeHtml(company)}</div></div></div><div class="statement">Por medio del presente documento se deja constancia de que el destinatario recibe el ${operationLabel.toLowerCase()} indicado, conforme y sin observaciones al momento de la entrega.</div><div class="grid" style="margin-top:22px"><div><div class="label">Nombre completo del receptor</div><div class="value">${escapeHtml(fullName || "No indicado")}</div></div><div><div class="label">DNI / documento</div><div class="value">${escapeHtml(dni || "No indicado")}</div></div></div><div class="signature"><div><div class="line">Firma de ${escapeHtml(company)}</div><div style="margin-top:55px;font-size:11px">Responsable de entrega</div></div><div>${hasSignature ? `<img src="${signature()}" alt="Firma del receptor">` : ""}<div class="line">Firma del receptor</div><div style="margin-top:8px;font-size:11px">${escapeHtml(fullName || "Destinatario")}</div></div></div><div class="foot">Documento de recepción generado para la operación ${escapeHtml(reference)} · Fecha registrada: ${escapeHtml(date)}</div></div></body></html>`;
  };
  const persist = () => {
    if (!operationId || !fullName.trim() || !dni.trim() || !hasSignature) return;
    void persistReceipt.mutateAsync({ operationType: operation, operationId, operationReference: reference, brand, legalEntity: company, recipientName: fullName.trim().split(/\s+/).slice(0, -1).join(" ") || fullName.trim(), recipientLastName: fullName.trim().split(/\s+/).at(-1) || "NO INDICADO", recipientDni: dni.trim(), signerName: fullName.trim(), signerDni: dni.trim(), signatureStrokes: signature(), consentTextVersion: "delivery-receipt-v1" });
  };
  const print = () => { persist(); const printWindow = window.open("", "_blank", "width=900,height=900"); if (!printWindow) return; printWindow.document.write(html()); printWindow.document.close(); printWindow.focus(); window.setTimeout(() => printWindow.print(), 150); };
  const download = () => { persist(); const blob = new Blob([html()], { type: "text/html;charset=utf-8" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `recepcion-${operation}-${reference}-${fullName || "destinatario"}.html`.replace(/\s+/g, "-"); anchor.click(); URL.revokeObjectURL(url); };

  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="delivery-receipt-title">
    <div className="max-h-[94dvh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-[#0B2B5E] px-5 py-4 text-white sm:px-7"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">{company}</p><h2 id="delivery-receipt-title" className="text-xl font-extrabold sm:text-2xl">Recepción de {operationLabel.toLowerCase()}</h2><p className="mt-1 text-sm text-blue-100">Completa los datos del receptor y firma en el dispositivo.</p></div><Button type="button" variant="outline" className="border-white/50 bg-transparent text-white hover:bg-white/10" onClick={onClose} aria-label="Cerrar comprobante"><X className="h-5 w-5" /></Button></header>
      <div className="space-y-5 p-5 sm:p-7"><div className="grid gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 sm:grid-cols-3"><div><p className="text-xs font-bold uppercase text-slate-500">Referencia</p><p className="font-bold text-[#0B2B5E]">{reference}</p></div><div><p className="text-xs font-bold uppercase text-slate-500">Orden / código</p><p className="font-bold text-[#0B2B5E]">{[order, code].filter(Boolean).join(" · ") || "No indicado"}</p></div><div><p className="text-xs font-bold uppercase text-slate-500">Fecha y hora</p><p className="font-bold text-[#0B2B5E]">{deliveredAt.toLocaleString("es-PE")}</p></div></div>
        <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold text-slate-700">Nombres y apellidos completos<input className="mt-1 h-12 w-full rounded-lg border border-slate-300 px-3" value={fullName} onChange={event => setFullName(event.target.value.toUpperCase())} placeholder="NOMBRE Y APELLIDOS" /></label><label className="text-sm font-bold text-slate-700">DNI o documento<input className="mt-1 h-12 w-full rounded-lg border border-slate-300 px-3" value={dni} onChange={event => setDni(event.target.value.toUpperCase())} placeholder="DNI / DOCUMENTO" /></label></div>
        <div className="rounded-xl border border-slate-200 p-4"><div className="mb-2 flex items-center justify-between gap-3"><label htmlFor="delivery-signature-canvas" className="text-sm font-bold text-[#0B2B5E]">Firma del receptor en el dispositivo</label><Button type="button" size="sm" variant="outline" onClick={clear}><Eraser className="mr-2 h-4 w-4" />Limpiar</Button></div><canvas id="delivery-signature-canvas" ref={canvasRef} width={720} height={180} className="h-40 w-full touch-none rounded-lg border-2 border-blue-300 bg-white" onPointerDown={start} onPointerMove={draw} onPointerUp={stop} onPointerCancel={stop} onPointerLeave={stop} /><p className="mt-2 text-xs text-slate-500">La firma queda asociada a {reference} y a la fecha de recepción.</p></div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><CheckCircle2 className="mr-2 inline h-4 w-4" />Al confirmar, se generará el comprobante con la identidad legal de {company}.</div><div className="flex flex-wrap justify-end gap-3"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="button" variant="outline" onClick={download}><Download className="mr-2 h-4 w-4" />Descargar</Button><Button type="button" onClick={print} disabled={!fullName.trim() || !dni.trim() || !hasSignature} className="bg-[#0B2B5E] text-white"><Printer className="mr-2 h-4 w-4" />Imprimir comprobante</Button></div></div>
    </div></div>;
}

export default DeliveryReceiptDialog;
