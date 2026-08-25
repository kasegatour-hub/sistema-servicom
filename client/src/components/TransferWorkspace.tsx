import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { getReceiptBranding } from "@/lib/userReceipt";
import { Printer, Receipt, RefreshCw } from "lucide-react";

export type TransferForm = {
  senderName: string;
  senderPhone: string;
  senderDocument: string;
  senderPassport: string;
  senderCity: string;
  senderPaymentMethod: string;
  recipientName: string;
  recipientPhone: string;
  recipientDocument: string;
  recipientPassport: string;
  recipientBank: string;
  recipientIban: string;
  recipientCci: string;
  amountSent: string;
  transferFee: string;
  exchangeRate: string;
  status: "Registrada" | "Pagada" | "Cancelada";
  notes: string;
};

type RequiredTransferField = "senderName" | "senderPhone" | "senderDocument" | "recipientName" | "recipientPhone" | "recipientDocument" | "amountSent";
type TransferErrors = Partial<Record<RequiredTransferField, string>> & { general?: string };

const emptyForm: TransferForm = {
  senderName: "",
  senderPhone: "",
  senderDocument: "",
  senderPassport: "",
  senderCity: "TORINO",
  senderPaymentMethod: "Agencia",
  recipientName: "",
  recipientPhone: "",
  recipientDocument: "",
  recipientPassport: "",
  recipientBank: "",
  recipientIban: "",
  recipientCci: "",
  amountSent: "",
  transferFee: "0",
  exchangeRate: "1",
  status: "Registrada",
  notes: "",
};

const esc = (value: unknown) => String(value ?? "").replace(/[&<>\"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[char] || char));
const money = (value: string | number) => Number(value || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function printTransfer(transfer: any) {
  const brand = getReceiptBranding({});
  const created = new Date(transfer.createdAt || Date.now()).toLocaleString("es-PE");
  const copy = (label: string) => `<section class="voucher"><div class="meta"><span>${esc(created)}</span><strong>${label}</strong></div><img src="${brand.logoPath}" class="logo" alt="Servicom Internacional"/><h1>Recibo de transferencia N.° ${esc(transfer.transferNumber)}</h1><div class="columns"><div><h2>Remitente</h2><ul><li><b>Cliente:</b> ${esc(transfer.senderName)}</li><li><b>Ciudad:</b> ${esc(transfer.senderCity || "No indicada")}</li><li><b>Teléfono:</b> ${esc(transfer.senderPhone || "No indicado")}</li><li><b>Documento:</b> ${esc(transfer.senderDocument || "No indicado")}</li><li><b>Modalidad de pago:</b> ${esc(transfer.senderPaymentMethod || "Agencia")}</li></ul></div><div><h2>Destinatario</h2><ul><li><b>Cliente:</b> ${esc(transfer.recipientName)}</li><li><b>Teléfono:</b> ${esc(transfer.recipientPhone || "No indicado")}</li><li><b>Documento:</b> ${esc(transfer.recipientDocument || "No indicado")}</li><li><b>Banco:</b> ${esc(transfer.recipientBank || "No indicado")}</li><li><b>IBAN:</b> ${esc(transfer.recipientIban || "No indicado")}</li><li><b>CCI:</b> ${esc(transfer.recipientCci || "No indicado")}</li></ul></div></div><h2>Datos de la transferencia</h2><ul><li><b>Fecha de operación:</b> ${esc(created)}</li><li><b>Importe transferido:</b> ${money(transfer.amountSent)} ${esc(transfer.currency || "EUR")}</li><li><b>Comisión incluida:</b> ${money(transfer.transferFee)} ${esc(transfer.currency || "EUR")}</li><li><b>Tipo de cambio:</b> ${money(transfer.exchangeRate)}</li><li><b>Importe recibido:</b> ${money(transfer.amountReceived)} ${esc(transfer.currency || "EUR")}</li><li><b>Estado:</b> ${esc(transfer.status)}</li></ul>${transfer.notes ? `<p class="notes"><b>Notas:</b> ${esc(transfer.notes)}</p>` : ""}</section>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Recibo ${esc(transfer.transferNumber)}</title><style>@page{size:A4;margin:10mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#172033;margin:0}.sheet{display:grid;grid-template-rows:1fr 1fr;gap:9mm;height:277mm}.voucher{border-bottom:1px dashed #9aa5b5;padding:2mm 2mm 5mm;break-inside:avoid}.voucher:last-child{border-bottom:0}.meta{display:flex;justify-content:space-between;font-size:9px;color:#5c6675}.logo{width:132px;height:auto;margin:4mm 0 1mm}h1{font-size:19px;margin:2mm 0 5mm}h2{font-size:15px;margin:4mm 0 1mm;border-bottom:1px solid #d5dce5;padding-bottom:1mm}.columns{display:grid;grid-template-columns:1fr 1fr;gap:9mm}ul{margin:1mm 0 0;padding-left:17px;font-size:10px;line-height:1.55}.notes{font-size:10px;margin-top:3mm}@media print{.voucher{page-break-inside:avoid}}</style></head><body><main class="sheet">${copy("Copia para el cliente")}${copy("Copia para Servicom Internacional")}</main><script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}</script></body></html>`;
  const popup = window.open("", "_blank", "width=900,height=900");
  if (!popup) return;
  popup.document.write(html);
  popup.document.close();
}

function normalizePhone(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function validateTransferForm(form: TransferForm): TransferErrors {
  const errors: TransferErrors = {};
  if (form.senderName.trim().length < 2) errors.senderName = "Ingresa el nombre completo del remitente.";
  if (form.senderDocument.trim().length < 1) errors.senderDocument = "Ingresa el DNI o documento del remitente.";
  if (form.senderPhone.replace(/\D/g, "").length < 7) errors.senderPhone = "Ingresa un teléfono válido del remitente.";
  if (form.recipientName.trim().length < 2) errors.recipientName = "Ingresa el nombre completo del destinatario.";
  if (form.recipientDocument.trim().length < 1) errors.recipientDocument = "Ingresa el DNI o documento del destinatario.";
  if (form.recipientPhone.replace(/\D/g, "").length < 7) errors.recipientPhone = "Ingresa un teléfono válido del destinatario.";
  if (!form.amountSent.trim() || !Number.isFinite(Number(form.amountSent)) || Number(form.amountSent) < 0) errors.amountSent = "Ingresa un importe válido.";
  return errors;
}

export function TransferWorkspace() {
  const [form, setForm] = React.useState<TransferForm>(emptyForm);
  const [errors, setErrors] = React.useState<TransferErrors>({});
  const [createdTransfer, setCreatedTransfer] = React.useState<any>(null);
  const transfers = trpc.transfers.list.useQuery(undefined, { retry: false });
  const create = trpc.transfers.create.useMutation({
    onSuccess: transfer => {
      setCreatedTransfer(transfer);
      setForm(emptyForm);
      setErrors({});
      void transfers.refetch();
    },
  });
  const set = (key: keyof TransferForm, value: string) => {
    setForm(current => ({ ...current, [key]: key.endsWith("Phone") ? normalizePhone(value) : value }));
    if (key in errors) setErrors(current => ({ ...current, [key]: undefined }));
  };
  const amountReceived = Math.max(0, (Number(form.amountSent) || 0) - (Number(form.transferFee) || 0)) * (Number(form.exchangeRate) || 0);
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validateTransferForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(current => ({ ...current, general: "Completa los datos esenciales marcados en rojo para registrar la transferencia." }));
      return;
    }
    create.mutate({
      ...form,
      amountSent: Number(form.amountSent),
      transferFee: Number(form.transferFee),
      exchangeRate: Number(form.exchangeRate),
      destinationOffice: "Servicom Internacional — Lima",
      senderDocument: form.senderDocument.trim(),
      senderPassport: form.senderPassport || undefined,
      recipientDocument: form.recipientDocument.trim(),
      recipientPassport: form.recipientPassport || undefined,
      recipientBank: form.recipientBank || undefined,
      recipientIban: form.recipientIban || undefined,
      recipientCci: form.recipientCci || undefined,
    });
  };
  const field = (key: keyof TransferForm, label: string, placeholder = "", required = false) => {
    const error = errors[key as RequiredTransferField];
    const inputId = `transfer-${key}`;
    return <div><label htmlFor={inputId} className="block text-sm font-semibold text-slate-700">{label}{required ? " *" : ""}<Input id={inputId} required={required} value={form[key]} onChange={event => set(key, event.target.value)} placeholder={placeholder} className={`mt-1 h-11 bg-white ${error ? "border-rose-500 ring-1 ring-rose-200" : ""}`} aria-invalid={Boolean(error)} aria-describedby={error ? `${inputId}-error` : undefined} /></label>{error && <p id={`${inputId}-error`} role="alert" className="mt-1 text-xs font-semibold text-rose-700">{error}</p>}</div>;
  };
  return <div className="space-y-6">
    <Card className="border-0 p-5 shadow-lg"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0B2B5E]">Operaciones</p><h2 className="text-2xl font-extrabold text-slate-900">Transferencia</h2><p className="mt-1 max-w-2xl text-sm text-slate-600">Registra primero la información esencial de cada cliente. Los datos bancarios son opcionales y se pueden completar cuando estén disponibles.</p></div><Receipt className="h-8 w-8 text-[#F59E0B]" /></div>
      <form onSubmit={submit} className="mt-5 space-y-5" noValidate>
        <div className="grid gap-3 md:grid-cols-2"><label htmlFor="transfer-origin" className="text-sm font-semibold text-slate-700">Sede regular<Input id="transfer-origin" value="Servicom Internacional — Lima" readOnly className="mt-1 h-11 bg-slate-50" /></label><label className="text-sm font-semibold text-slate-700">Sede de destino<Select value="Lima" onValueChange={() => undefined}><SelectTrigger className="mt-1 h-11 bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Lima">Lima</SelectItem><SelectItem value="Torino">Torino</SelectItem></SelectContent></Select></label></div>
        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="text-lg font-bold text-[#0B2B5E]">Remitente</h3><p className="text-xs text-slate-600">Datos del cliente obligatorios.</p></div><span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#0B2B5E]">1 de 2</span></div><div className="mt-3 grid gap-3 md:grid-cols-3">{field("senderName", "Nombre completo", "Ej. Gisella Rocío Velásquez Coronado", true)}{field("senderDocument", "DNI / documento", "Ej. 74410344", true)}{field("senderPhone", "Teléfono", "Ej. +39 389 766 3723", true)}{field("senderPassport", "Pasaporte (opcional)")}{field("senderCity", "Ciudad")}{field("senderPaymentMethod", "Modalidad de pago", "Agencia")}</div></div>
        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="text-lg font-bold text-[#0B2B5E]">Destinatario</h3><p className="text-xs text-slate-600">Datos del cliente obligatorios.</p></div><span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#0B2B5E]">2 de 2</span></div><div className="mt-3 grid gap-3 md:grid-cols-4">{field("recipientName", "Nombre completo", "Ej. Maruja Coronado Cárdenas", true)}{field("recipientDocument", "DNI / documento", "Ej. 71234567", true)}{field("recipientPhone", "Teléfono", "Ej. +51 970 188 447", true)}{field("recipientPassport", "Pasaporte (opcional)")}</div><div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3"><p className="text-sm font-bold text-emerald-900">Datos bancarios opcionales</p><p className="mt-1 text-xs leading-5 text-emerald-800">Banco, IBAN y CCI no bloquean el registro. Agrégalos si el cliente ya los proporcionó.</p><div className="mt-3 grid gap-3 md:grid-cols-3">{field("recipientBank", "Banco destinatario")}{field("recipientIban", "IBAN")}{field("recipientCci", "CCI")}</div></div></div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4"><h3 className="text-lg font-bold text-[#0B2B5E]">Datos de transferencia</h3><div className="mt-3 grid gap-3 md:grid-cols-4">{field("amountSent", "Importe transferido", "0,00", true)}{field("transferFee", "Comisión incluida", "0,00")}{field("exchangeRate", "Tipo de cambio", "1,0000")}<div className="rounded-lg bg-cyan-100 p-3"><span className="block text-xs font-bold uppercase text-cyan-900">Importe recibido</span><strong className="text-xl text-cyan-950">{amountReceived.toFixed(2)} EUR</strong></div></div><div className="mt-3 grid gap-3 md:grid-cols-2"><label className="text-sm font-semibold text-slate-700">Estado<Select value={form.status} onValueChange={value => set("status", value)}><SelectTrigger className="mt-1 h-11 bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Registrada">Registrada</SelectItem><SelectItem value="Pagada">Pagada</SelectItem><SelectItem value="Cancelada">Cancelada</SelectItem></SelectContent></Select></label><label htmlFor="transfer-notes" className="text-sm font-semibold text-slate-700">Notas<Textarea id="transfer-notes" value={form.notes} onChange={event => set("notes", event.target.value)} className="mt-1 bg-white" placeholder="Observaciones" /></label></div></div>
        {(errors.general || create.error) && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">{errors.general || create.error?.message}</p>}
        <div className="flex flex-wrap justify-end gap-3"><Button type="button" variant="outline" onClick={() => { setForm(emptyForm); setErrors({}); setCreatedTransfer(null); }}><RefreshCw className="mr-2 h-4 w-4" />Limpiar</Button><Button type="submit" disabled={create.isPending} className="min-h-12 bg-[#0B2B5E] px-6 text-white">{create.isPending ? "Guardando…" : "Crear transferencia"}</Button></div>
      </form>
    </Card>
    {createdTransfer && <Card className="border border-emerald-200 bg-emerald-50 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-emerald-800">Transferencia creada correctamente</p><p className="text-2xl font-extrabold text-emerald-950">{createdTransfer.transferNumber}</p></div><Button type="button" onClick={() => printTransfer(createdTransfer)} className="bg-[#0B2B5E] text-white"><Printer className="mr-2 h-4 w-4" />Imprimir recibo</Button></div></Card>}
    <Card className="border-0 p-5 shadow-lg"><div className="flex items-center justify-between gap-3"><div><h3 className="text-xl font-bold text-slate-900">Transferencias recientes</h3><p className="text-sm text-slate-600">Solo visibles para el espacio administrativo actual.</p></div><Button type="button" variant="outline" onClick={() => void transfers.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button></div>{transfers.isLoading ? <p className="mt-4 text-sm text-slate-500">Cargando transferencias…</p> : transfers.data?.length ? <div className="mt-4 space-y-2">{transfers.data.map((item: any) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"><div><strong className="text-[#0B2B5E]">{item.transferNumber}</strong><p className="text-sm text-slate-600">{item.senderName} → {item.recipientName} · {money(item.amountSent)} EUR · {item.status}</p></div><Button type="button" variant="outline" onClick={() => printTransfer(item)}><Printer className="mr-2 h-4 w-4" />Recibo</Button></div>)}</div> : <p className="mt-4 rounded-lg border border-dashed p-4 text-sm text-slate-500">Aún no hay transferencias registradas.</p>}</Card>
  </div>;
}
