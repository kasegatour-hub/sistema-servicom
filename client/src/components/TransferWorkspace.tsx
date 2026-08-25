import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IdentityDocumentField } from "@/components/IdentityDocumentField";
import { PhoneInput } from "@/components/PhoneInput";
import { trpc } from "@/lib/trpc";
import { getReceiptBranding } from "@/lib/userReceipt";
import { getRoutePresentation, ROUTES, type ShipmentRoute } from "@/lib/routeDetails";
import { RefreshCw, Receipt, Printer, BadgePercent, ArrowRightLeft } from "lucide-react";
import { getIdentityDocumentError, isValidIdentityDocument, type IdentityDocumentType } from "@shared/identityDocuments";
import { calculateTransferAmount, calculateTransferFee, getTransferCommissionPercent, type TransferCurrency } from "@shared/transferCalculation";

export type TransferForm = {
  route: "" | ShipmentRoute;
  senderName: string;
  senderPhone: string;
  senderDocument: string;
  senderDocumentType: IdentityDocumentType;
  senderCity: string;
  senderPaymentMethod: string;
  recipientName: string;
  recipientPhone: string;
  recipientDocument: string;
  recipientDocumentType: IdentityDocumentType;
  recipientBank: string;
  recipientIban: string;
  recipientCci: string;
  amountSent: string;
  exchangeRate: string;
  currency: TransferCurrency;
  destinationCurrency: TransferCurrency;
  exchangeRateSource: "paridad" | "argenper" | "manual";
  status: "Registrada" | "Pagada" | "Cancelada";
  notes: string;
};

type RequiredTransferField = "senderName" | "senderPhone" | "senderDocument" | "recipientName" | "recipientPhone" | "recipientDocument" | "amountSent";
type TransferErrors = Partial<Record<RequiredTransferField | "route", string>> & { general?: string };

const emptyForm: TransferForm = {
  route: "", senderName: "", senderPhone: "", senderDocument: "", senderDocumentType: "dni_peru", senderCity: "", senderPaymentMethod: "Agencia",
  recipientName: "", recipientPhone: "", recipientDocument: "", recipientDocumentType: "dni_peru", recipientBank: "", recipientIban: "", recipientCci: "",
  amountSent: "", exchangeRate: "1", currency: "EUR", destinationCurrency: "EUR", exchangeRateSource: "paridad", status: "Registrada", notes: "",
};

const esc = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[char] || char));
const money = (value: string | number) => Number(value || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const documentLabel = (type?: string) => type === "pasaporte" ? "Pasaporte" : type === "carta_identita_italia" ? "Carta d’identità italiana" : "DNI peruano";

export function getTransferRouteOffices(route: ShipmentRoute, branding = getReceiptBranding({})) {
  const details = getRoutePresentation(route);
  const officeFor = (location: typeof details.origin) => {
    const isTorino = location.shortLabel.startsWith("Torino");
    const isKasegaTorino = isTorino && branding.isKasega;
    return {
      city: isTorino ? "Torino" : "Lima",
      label: isKasegaTorino ? `${branding.companyName} — Torino` : `SERVICOM INTERNACIONAL — ${isTorino ? "Torino" : "Lima"}`,
      address: isKasegaTorino ? branding.address : location.address,
      phone: isKasegaTorino ? branding.phone : location.phone,
    };
  };
  return { route: details.route, origin: officeFor(details.origin), destination: officeFor(details.destination) };
}

function printTransfer(transfer: any) {
  const brand = getReceiptBranding({ registeredById: transfer.createdByAdminId });
  const route = transfer.route === ROUTES.TORINO_LIMA ? ROUTES.TORINO_LIMA : ROUTES.LIMA_TORINO;
  const offices = getTransferRouteOffices(route, brand);
  const originOffice = transfer.originOffice || offices.origin.label;
  const destinationOffice = transfer.destinationOffice || offices.destination.label;
  const created = new Date(transfer.createdAt || Date.now()).toLocaleString("es-PE");
  const sourceCurrency = transfer.currency || "EUR";
  const destinationCurrency = transfer.destinationCurrency || "EUR";
  const copy = (label: string) => `<section class="voucher"><div class="meta"><span>${esc(created)}</span><strong>${label}</strong></div><img src="${brand.logoPath}" class="logo" alt="${esc(brand.companyName)}"/><h1>${esc(brand.companyName)}<br/>Recibo de transferencia N.° ${esc(transfer.transferNumber)}</h1>${brand.contact ? `<p class="contact">${esc(brand.contact)}</p>` : ""}<h2>Ruta y sedes</h2><ul><li><b>Ruta:</b> ${esc(route)}</li><li><b>Sede de origen:</b> ${esc(originOffice)} · ${esc(offices.origin.address)} · ${esc(offices.origin.phone)}</li><li><b>Sede de destino:</b> ${esc(destinationOffice)} · ${esc(offices.destination.address)} · ${esc(offices.destination.phone)}</li></ul><div class="columns"><div><h2>Remitente</h2><ul><li><b>Cliente:</b> ${esc(transfer.senderName)}</li><li><b>Ciudad:</b> ${esc(transfer.senderCity || offices.origin.city)}</li><li><b>Teléfono:</b> ${esc(transfer.senderPhone || "No indicado")}</li><li><b>${documentLabel(transfer.senderDocumentType)}:</b> ${esc(transfer.senderDocument || "No indicado")}</li><li><b>Modalidad de pago:</b> ${esc(transfer.senderPaymentMethod || "Agencia")}</li></ul></div><div><h2>Destinatario</h2><ul><li><b>Cliente:</b> ${esc(transfer.recipientName)}</li><li><b>Teléfono:</b> ${esc(transfer.recipientPhone || "No indicado")}</li><li><b>${documentLabel(transfer.recipientDocumentType)}:</b> ${esc(transfer.recipientDocument || "No indicado")}</li><li><b>Banco:</b> ${esc(transfer.recipientBank || "No indicado")}</li><li><b>IBAN:</b> ${esc(transfer.recipientIban || "No indicado")}</li><li><b>CCI:</b> ${esc(transfer.recipientCci || "No indicado")}</li></ul></div></div><h2>Datos de la transferencia</h2><ul><li><b>Fecha de operación:</b> ${esc(created)}</li><li><b>Importe transferido:</b> ${money(transfer.amountSent)} ${esc(sourceCurrency)}</li><li><b>Comisión (${money(transfer.commissionPercent || 0)}%):</b> ${money(transfer.transferFee)} ${esc(sourceCurrency)}</li><li><b>Tipo de cambio:</b> ${money(transfer.exchangeRate)} ${esc(sourceCurrency)} por ${esc(destinationCurrency)} (${esc(transfer.exchangeRateSource || "manual")})</li><li><b>Importe recibido:</b> ${money(transfer.amountReceived)} ${esc(destinationCurrency)}</li><li><b>Estado:</b> ${esc(transfer.status)}</li></ul>${transfer.notes ? `<p class="notes"><b>Notas:</b> ${esc(transfer.notes)}</p>` : ""}</section>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Recibo ${esc(transfer.transferNumber)}</title><style>@page{size:A4;margin:10mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#172033;margin:0}.sheet{display:grid;grid-template-rows:1fr 1fr;gap:9mm;height:277mm}.voucher{border-bottom:1px dashed #9aa5b5;padding:2mm 2mm 5mm;break-inside:avoid}.voucher:last-child{border-bottom:0}.meta{display:flex;justify-content:space-between;font-size:9px;color:#5c6675}.logo{width:132px;height:auto;margin:4mm 0 1mm}h1{font-size:19px;margin:2mm 0 5mm}.contact{font-size:9px;line-height:1.45;margin:0 0 3mm;color:#475569}h2{font-size:15px;margin:4mm 0 1mm;border-bottom:1px solid #d5dce5;padding-bottom:1mm}.columns{display:grid;grid-template-columns:1fr 1fr;gap:9mm}ul{margin:1mm 0 0;padding-left:17px;font-size:10px;line-height:1.55}.notes{font-size:10px;margin-top:3mm}@media print{.voucher{page-break-inside:avoid}}</style></head><body><main class="sheet">${copy("Copia para el cliente")}${copy(`Copia para ${brand.companyName}`)}</main><script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}</script></body></html>`;
  const popup = window.open("", "_blank", "width=900,height=900");
  if (!popup) return;
  popup.document.write(html);
  popup.document.close();
}

export function validateTransferForm(form: TransferForm): TransferErrors {
  const errors: TransferErrors = {};
  if (form.route !== ROUTES.LIMA_TORINO && form.route !== ROUTES.TORINO_LIMA) errors.route = "Elige la ruta de la transferencia.";
  if (form.senderName.trim().length < 2) errors.senderName = "Ingresa el nombre completo del remitente.";
  if (!isValidIdentityDocument(form.senderDocument, form.senderDocumentType)) errors.senderDocument = getIdentityDocumentError(form.senderDocumentType);
  if (form.senderPhone.replace(/\D/g, "").length < 7) errors.senderPhone = "Ingresa un teléfono válido del remitente.";
  if (form.recipientName.trim().length < 2) errors.recipientName = "Ingresa el nombre completo del destinatario.";
  if (!isValidIdentityDocument(form.recipientDocument, form.recipientDocumentType)) errors.recipientDocument = getIdentityDocumentError(form.recipientDocumentType);
  if (form.recipientPhone.replace(/\D/g, "").length < 7) errors.recipientPhone = "Ingresa un teléfono válido del destinatario.";
  if (!form.amountSent.trim() || !Number.isFinite(Number(form.amountSent)) || Number(form.amountSent) <= 0) errors.amountSent = "Ingresa un importe mayor que cero.";
  return errors;
}

export function TransferWorkspace({ admin }: { admin?: { id?: number; email?: string } | null }) {
  const [form, setForm] = React.useState<TransferForm>(emptyForm);
  const [errors, setErrors] = React.useState<TransferErrors>({});
  const [createdTransfer, setCreatedTransfer] = React.useState<any>(null);
  const branding = getReceiptBranding({ registeredById: admin?.id, registeredByEmail: admin?.email });
  const selectedRoute = form.route || null;
  const routeOffices = selectedRoute ? getTransferRouteOffices(selectedRoute, branding) : null;
  const transfers = trpc.transfers.list.useQuery(undefined, { retry: false });
  const usesArgenper = form.currency === "PEN" && form.destinationCurrency === "EUR";
  const argenperQuote = trpc.transfers.argenperQuote.useQuery(undefined, { retry: false, enabled: usesArgenper });
  const create = trpc.transfers.create.useMutation({ onSuccess: transfer => { setCreatedTransfer(transfer); setForm(emptyForm); setErrors({}); void transfers.refetch(); } });

  React.useEffect(() => {
    if (!usesArgenper || form.exchangeRateSource !== "argenper" || !argenperQuote.data?.adjustedPenPerEur) return;
    const nextRate = String(argenperQuote.data.adjustedPenPerEur);
    if (form.exchangeRate !== nextRate) setForm(current => ({ ...current, exchangeRate: nextRate }));
  }, [usesArgenper, form.exchangeRateSource, form.exchangeRate, argenperQuote.data?.adjustedPenPerEur]);

  const set = (key: keyof TransferForm, value: string) => {
    setForm(current => ({ ...current, [key]: value }));
    if (key in errors) setErrors(current => ({ ...current, [key]: undefined }));
  };
  const setSourceCurrency = (currency: TransferCurrency) => setForm(current => {
    if (currency === "EUR") return { ...current, currency, destinationCurrency: "EUR", exchangeRate: "1", exchangeRateSource: "paridad" };
    return { ...current, currency, destinationCurrency: "EUR", exchangeRate: argenperQuote.data?.adjustedPenPerEur ? String(argenperQuote.data.adjustedPenPerEur) : current.exchangeRate, exchangeRateSource: "argenper" };
  });
  const commissionPercent = getTransferCommissionPercent(form.currency, form.destinationCurrency);
  const transferFee = calculateTransferFee(Number(form.amountSent) || 0, commissionPercent);
  const amountReceived = calculateTransferAmount(Number(form.amountSent) || 0, transferFee, Number(form.exchangeRate) || 0, form.currency, form.destinationCurrency);
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validateTransferForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) { setErrors(current => ({ ...current, general: "Completa los datos esenciales marcados en rojo para registrar la transferencia." })); return; }
    create.mutate({ ...form, route: form.route as ShipmentRoute, amountSent: Number(form.amountSent), transferFee, exchangeRate: Number(form.exchangeRate), recipientBank: form.recipientBank || undefined, recipientIban: form.recipientIban || undefined, recipientCci: form.recipientCci || undefined });
  };
  const field = (key: keyof TransferForm, label: string, placeholder = "", required = false) => {
    const error = errors[key as RequiredTransferField];
    const inputId = `transfer-${key}`;
    return <div><label htmlFor={inputId} className="block text-sm font-semibold text-slate-700">{label}{required ? " *" : ""}<Input id={inputId} required={required} value={form[key]} onChange={event => set(key, event.target.value)} placeholder={placeholder} className={`mt-1 h-11 bg-white ${error ? "border-rose-500 ring-1 ring-rose-200" : ""}`} aria-invalid={Boolean(error)} aria-describedby={error ? `${inputId}-error` : undefined} /></label>{error && <p id={`${inputId}-error`} role="alert" className="mt-1 text-xs font-semibold text-rose-700">{error}</p>}</div>;
  };
  const documentError = (key: "senderDocument" | "recipientDocument") => errors[key] || "";

  return <div className="space-y-6">
    <Card className="border-0 p-5 shadow-lg"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0B2B5E]">Operaciones</p><h2 className="text-2xl font-extrabold text-slate-900">Transferencia</h2><p className="mt-1 max-w-2xl text-sm text-slate-600">Registra la identidad y el teléfono completo de ambas personas. Banco, IBAN y CCI son opcionales.</p></div><Receipt className="h-8 w-8 text-[#F59E0B]" /></div>
      <form onSubmit={submit} className="mt-5 space-y-5" noValidate>
        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4"><label className="block text-sm font-semibold text-slate-700">Ruta de transferencia *<Select value={form.route} onValueChange={value => { const route = value as ShipmentRoute; setForm(current => ({ ...current, route, senderCity: route === ROUTES.TORINO_LIMA ? "TORINO" : "LIMA" })); setErrors(current => ({ ...current, route: undefined })); }}><SelectTrigger className={`mt-1 h-12 bg-white ${errors.route ? "border-rose-500 ring-1 ring-rose-200" : ""}`} aria-invalid={Boolean(errors.route)}><SelectValue placeholder="Elige Lima–Torino o Torino–Lima" /></SelectTrigger><SelectContent><SelectItem value={ROUTES.LIMA_TORINO}>Lima – Torino</SelectItem><SelectItem value={ROUTES.TORINO_LIMA}>Torino – Lima</SelectItem></SelectContent></Select></label>{errors.route && <p role="alert" className="mt-1 text-xs font-semibold text-rose-700">{errors.route}</p>}{routeOffices ? <div className="mt-3 grid gap-3 text-sm md:grid-cols-2"><div className="rounded-lg border border-blue-100 bg-white p-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Sede de origen</p><p className="mt-1 font-extrabold text-[#0B2B5E]">{routeOffices.origin.label}</p><p className="mt-1 text-xs leading-5 text-slate-600">{routeOffices.origin.address}<br />{routeOffices.origin.phone}</p></div><div className="rounded-lg border border-blue-100 bg-white p-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Sede de destino</p><p className="mt-1 font-extrabold text-[#0B2B5E]">{routeOffices.destination.label}</p><p className="mt-1 text-xs leading-5 text-slate-600">{routeOffices.destination.address}<br />{routeOffices.destination.phone}</p></div></div> : <p className="mt-2 text-xs text-slate-600">Selecciona la ruta para ver la sede de origen y la sede de destino correctas.</p>}</div>
        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="text-lg font-bold text-[#0B2B5E]">Remitente</h3><p className="text-xs text-slate-600">Datos del cliente obligatorios.</p></div><span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#0B2B5E]">1 de 2</span></div><div className="mt-3 grid gap-3 md:grid-cols-3">{field("senderName", "Nombre completo", "Ej. Gisella Rocío Velásquez Coronado", true)}<IdentityDocumentField id="transfer-sender-document" label="Documento de identidad del remitente" documentType={form.senderDocumentType} onDocumentTypeChange={value => set("senderDocumentType", value)} value={form.senderDocument} onValueChange={value => set("senderDocument", value)} required error={documentError("senderDocument")} /><div><label className="block text-sm font-semibold text-slate-700">Teléfono / WhatsApp *</label><PhoneInput id="transfer-sender-phone" value={form.senderPhone} onChange={value => set("senderPhone", value)} placeholder="970 188 447" required className="mt-1" />{errors.senderPhone && <p role="alert" className="mt-1 text-xs font-semibold text-rose-700">{errors.senderPhone}</p>}</div><div className="rounded-lg border border-slate-200 bg-white px-3 py-2"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Ciudad de origen</p><p className="mt-1 font-extrabold text-[#0B2B5E]">{routeOffices?.origin.city.toUpperCase() || "Selecciona la ruta"}</p></div>{field("senderPaymentMethod", "Modalidad de pago", "Agencia")}</div></div>
        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="text-lg font-bold text-[#0B2B5E]">Destinatario</h3><p className="text-xs text-slate-600">Datos del cliente obligatorios.</p></div><span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#0B2B5E]">2 de 2</span></div><div className="mt-3 grid gap-3 md:grid-cols-3">{field("recipientName", "Nombre completo", "Ej. Maruja Coronado Cárdenas", true)}<IdentityDocumentField id="transfer-recipient-document" label="Documento de identidad del destinatario" documentType={form.recipientDocumentType} onDocumentTypeChange={value => set("recipientDocumentType", value)} value={form.recipientDocument} onValueChange={value => set("recipientDocument", value)} required error={documentError("recipientDocument")} /><div><label className="block text-sm font-semibold text-slate-700">Teléfono / WhatsApp *</label><PhoneInput id="transfer-recipient-phone" value={form.recipientPhone} onChange={value => set("recipientPhone", value)} placeholder="970 188 447" required className="mt-1" />{errors.recipientPhone && <p role="alert" className="mt-1 text-xs font-semibold text-rose-700">{errors.recipientPhone}</p>}</div></div><div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3"><p className="text-sm font-bold text-emerald-900">Datos bancarios opcionales</p><p className="mt-1 text-xs leading-5 text-emerald-800">Banco, IBAN y CCI no bloquean el registro. Agrégalos si el cliente ya los proporcionó.</p><div className="mt-3 grid gap-3 md:grid-cols-3">{field("recipientBank", "Banco destinatario")}{field("recipientIban", "IBAN")}{field("recipientCci", "CCI")}</div></div></div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="text-lg font-bold text-[#0B2B5E]">Datos de transferencia</h3><p className="mt-1 text-xs text-slate-600">La comisión se calcula automáticamente según el par de monedas.</p></div><BadgePercent className="h-6 w-6 text-amber-700" /></div><div className="mt-3 grid gap-3 md:grid-cols-4">{field("amountSent", `Importe enviado (${form.currency})`, "0,00", true)}<label className="block text-sm font-semibold text-slate-700">Moneda enviada<Select value={form.currency} onValueChange={value => setSourceCurrency(value as TransferCurrency)}><SelectTrigger className="mt-1 h-11 bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="EUR">EUR — Euro</SelectItem><SelectItem value="PEN">PEN — Sol peruano</SelectItem></SelectContent></Select></label><div className="rounded-lg bg-white p-3 ring-1 ring-amber-200"><span className="block text-xs font-bold uppercase text-amber-900">Comisión automática</span><strong className="text-xl text-amber-950">{commissionPercent.toFixed(2)}%</strong><span className="mt-1 block text-xs text-amber-900">{money(transferFee)} {form.currency}</span></div><div className="rounded-lg bg-cyan-100 p-3"><span className="block text-xs font-bold uppercase text-cyan-900">Importe recibido</span><strong className="text-xl text-cyan-950">{amountReceived.toFixed(2)} {form.destinationCurrency}</strong></div></div>{usesArgenper ? <div className="mt-3 rounded-xl border border-cyan-200 bg-cyan-50 p-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="flex items-center gap-2 text-sm font-bold text-cyan-950"><ArrowRightLeft className="h-4 w-4" />Cotización PEN → EUR</p><p className="mt-1 text-xs text-cyan-800">Referencia Argemper: venta {argenperQuote.data ? money(argenperQuote.data.eurSaleRate) : "…"} + 0,15 = {argenperQuote.data ? money(argenperQuote.data.adjustedPenPerEur) : "…"} PEN por EUR.</p></div><Button type="button" variant="outline" onClick={() => { setForm(current => ({ ...current, exchangeRateSource: "argenper" })); void argenperQuote.refetch(); }} disabled={argenperQuote.isFetching} className="border-cyan-300 bg-white text-cyan-900"><RefreshCw className={`mr-2 h-4 w-4 ${argenperQuote.isFetching ? "animate-spin" : ""}`} />Actualizar Argemper</Button></div><div className="mt-3 grid gap-3 md:grid-cols-2"><label htmlFor="transfer-exchange-rate" className="text-sm font-semibold text-slate-700">Tipo de cambio aplicado (PEN por EUR)<Input id="transfer-exchange-rate" inputMode="decimal" value={form.exchangeRate} onChange={event => { set("exchangeRate", event.target.value.replace(/[^0-9.,]/g, "").replace(",", ".")); set("exchangeRateSource", "manual"); }} className="mt-1 h-11 bg-white" /></label><div className="rounded-lg bg-white p-3 text-sm text-cyan-950"><strong>{form.exchangeRateSource === "manual" ? "Tipo de cambio manual" : "Cotización Argemper aplicada"}</strong><p className="mt-1 text-xs text-slate-600">Puedes escribir un valor distinto si acuerdas otro tipo de cambio con el cliente.</p></div></div>{argenperQuote.error && <p role="alert" className="mt-2 text-xs font-semibold text-rose-700">No se pudo consultar Argemper. Ingresa manualmente el tipo de cambio acordado.</p>}</div> : <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700"><strong>EUR → EUR:</strong> se aplica comisión automática de 3 % y tipo de cambio 1,00.</div>}<div className="mt-3 grid gap-3 md:grid-cols-2"><label className="text-sm font-semibold text-slate-700">Estado<Select value={form.status} onValueChange={value => set("status", value)}><SelectTrigger className="mt-1 h-11 bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Registrada">Registrada</SelectItem><SelectItem value="Pagada">Pagada</SelectItem><SelectItem value="Cancelada">Cancelada</SelectItem></SelectContent></Select></label><label htmlFor="transfer-notes" className="text-sm font-semibold text-slate-700">Notas<Textarea id="transfer-notes" value={form.notes} onChange={event => set("notes", event.target.value)} className="mt-1 bg-white" placeholder="Observaciones" /></label></div></div>
        {(errors.general || create.error) && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">{errors.general || create.error?.message}</p>}
        <div className="flex flex-wrap justify-end gap-3"><Button type="button" variant="outline" onClick={() => { setForm(emptyForm); setErrors({}); setCreatedTransfer(null); }}><RefreshCw className="mr-2 h-4 w-4" />Limpiar</Button><Button type="submit" disabled={create.isPending} className="min-h-12 bg-[#0B2B5E] px-6 text-white">{create.isPending ? "Guardando…" : "Crear transferencia"}</Button></div>
      </form>
    </Card>
    {createdTransfer && <Card className="border border-emerald-200 bg-emerald-50 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-emerald-800">Transferencia creada correctamente</p><p className="text-2xl font-extrabold text-emerald-950">{createdTransfer.transferNumber}</p></div><Button type="button" onClick={() => printTransfer(createdTransfer)} className="bg-[#0B2B5E] text-white"><Printer className="mr-2 h-4 w-4" />Imprimir recibo</Button></div></Card>}
    <Card className="border-0 p-5 shadow-lg"><div className="flex items-center justify-between gap-3"><div><h3 className="text-xl font-bold text-slate-900">Transferencias recientes</h3><p className="text-sm text-slate-600">Solo visibles para el espacio administrativo actual.</p></div><Button type="button" variant="outline" onClick={() => void transfers.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button></div>{transfers.isLoading ? <p className="mt-4 text-sm text-slate-500">Cargando transferencias…</p> : transfers.data?.length ? <div className="mt-4 space-y-2">{transfers.data.map((item: any) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"><div><strong className="text-[#0B2B5E]">{item.transferNumber}</strong><p className="text-sm text-slate-600">{item.senderName} → {item.recipientName} · {money(item.amountSent)} {item.currency || "EUR"} · {item.status}</p></div><Button type="button" variant="outline" onClick={() => printTransfer(item)}><Printer className="mr-2 h-4 w-4" />Recibo</Button></div>)}</div> : <p className="mt-4 rounded-lg border border-dashed p-4 text-sm text-slate-500">Aún no hay transferencias registradas.</p>}</Card>
  </div>;
}
