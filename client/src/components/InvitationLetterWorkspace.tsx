import { useMemo, useState } from "react";
import { Download, FileText, Printer, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { downloadInvitationLetterPdf, printInvitationLetter, type InvitationLetterData, type InvitationPerson } from "@/lib/invitationLetter";

const emptyPerson = (): InvitationPerson => ({ firstName: "", lastName: "", birthDate: "", birthPlace: "", nationality: "", identityCard: "", passport: "", residencePermit: "", address: "", occupation: "", phone: "", email: "" });
const initialData = (): InvitationLetterData => ({ inviter: emptyPerson(), invitee: emptyPerson(), relationship: "Familiar", purpose: "Turismo / visita familiar", arrivalDate: "", departureDate: "", hostingAddress: "", city: "Torino", date: new Date().toISOString().slice(0, 10), financialSupport: true, healthInsurance: true, financialGuarantee: false, inviteeIdAttached: true, financialGuaranteeAttached: false, otherAttachment: "" });

function PersonFields({ heading, person, onChange, invitee = false }: { heading: string; person: InvitationPerson; onChange: (field: keyof InvitationPerson, value: string) => void; invitee?: boolean }) {
  const prefix = invitee ? "invitado" : "invitante";
  return <section className="rounded-xl border border-slate-200 bg-slate-50 p-4"><h3 className="mb-4 text-base font-bold text-[#0B2B5E]">{heading}</h3><div className="grid grid-cols-1 gap-3 md:grid-cols-3">
    <div><label htmlFor={`${prefix}-nombre`} className="text-sm font-medium">Nombres *</label><Input id={`${prefix}-nombre`} value={person.firstName} onChange={e => onChange("firstName", e.target.value)} required /></div>
    <div><label htmlFor={`${prefix}-apellido`} className="text-sm font-medium">Apellidos *</label><Input id={`${prefix}-apellido`} value={person.lastName} onChange={e => onChange("lastName", e.target.value)} required /></div>
    <div><label htmlFor={`${prefix}-nacimiento`} className="text-sm font-medium">Fecha de nacimiento</label><Input id={`${prefix}-nacimiento`} type="date" value={person.birthDate} onChange={e => onChange("birthDate", e.target.value)} /></div>
    <div><label htmlFor={`${prefix}-lugar`} className="text-sm font-medium">Lugar de nacimiento</label><Input id={`${prefix}-lugar`} value={person.birthPlace} onChange={e => onChange("birthPlace", e.target.value)} placeholder="Ej.: Lima, Perú" /></div>
    <div><label htmlFor={`${prefix}-nacionalidad`} className="text-sm font-medium">Nacionalidad</label><Input id={`${prefix}-nacionalidad`} value={person.nationality} onChange={e => onChange("nationality", e.target.value)} /></div>
    <div><label htmlFor={`${prefix}-documento`} className="text-sm font-medium">Documento de identidad</label><Input id={`${prefix}-documento`} value={person.identityCard} onChange={e => onChange("identityCard", e.target.value)} /></div>
    <div><label htmlFor={`${prefix}-pasaporte`} className="text-sm font-medium">Pasaporte</label><Input id={`${prefix}-pasaporte`} value={person.passport} onChange={e => onChange("passport", e.target.value)} /></div>
    {!invitee && <div><label htmlFor="invitante-permiso" className="text-sm font-medium">Permiso de residencia</label><Input id="invitante-permiso" value={person.residencePermit} onChange={e => onChange("residencePermit", e.target.value)} /></div>}
    <div><label htmlFor={`${prefix}-ocupacion`} className="text-sm font-medium">Ocupación</label><Input id={`${prefix}-ocupacion`} value={person.occupation} onChange={e => onChange("occupation", e.target.value)} /></div>
    <div className="md:col-span-2"><label htmlFor={`${prefix}-direccion`} className="text-sm font-medium">Dirección</label><Input id={`${prefix}-direccion`} value={person.address} onChange={e => onChange("address", e.target.value)} /></div>
    <div><label htmlFor={`${prefix}-telefono`} className="text-sm font-medium">Teléfono</label><Input id={`${prefix}-telefono`} value={person.phone} onChange={e => onChange("phone", e.target.value)} /></div>
    <div><label htmlFor={`${prefix}-email`} className="text-sm font-medium">Correo</label><Input id={`${prefix}-email`} type="email" value={person.email} onChange={e => onChange("email", e.target.value)} /></div>
  </div></section>;
}

export function InvitationLetterWorkspace({ shipments = [] as any[] }: { shipments?: any[] }) {
  const [data, setData] = useState<InvitationLetterData>(initialData);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const knownShipments = useMemo(() => shipments.filter((shipment: any) => shipment?.recipientName || shipment?.senderName), [shipments]);
  const updatePerson = (role: "inviter" | "invitee", field: keyof InvitationPerson, value: string) => setData(current => ({ ...current, [role]: { ...current[role], [field]: value } }));
  const loadInvitee = (shipmentId: string) => {
    const shipment = knownShipments.find((item: any) => String(item.id) === shipmentId);
    if (!shipment) return;
    setData(current => ({ ...current, invitee: { ...current.invitee, firstName: shipment.recipientName || "", lastName: shipment.recipientLastName || "", identityCard: shipment.recipientDni || "", phone: shipment.recipientPhone || "" } }));
  };
  const validate = () => {
    if (!data.inviter.firstName || !data.inviter.lastName || !data.invitee.firstName || !data.invitee.lastName || !data.arrivalDate || !data.departureDate || !data.hostingAddress) {
      setError("Completa al menos los nombres, apellidos, dirección de hospedaje y el período de estadía.");
      return false;
    }
    setError("");
    return true;
  };
  const download = async () => {
    if (!validate()) return;
    setBusy(true);
    try { await downloadInvitationLetterPdf(data); } catch { setError("No se pudo generar la carta PDF. Inténtalo nuevamente."); } finally { setBusy(false); }
  };
  const print = () => { if (validate()) { try { printInvitationLetter(data); } catch { setError("No se pudo abrir la impresión. Verifica que el navegador permita ventanas emergentes."); } } };
  return <Card className="mb-8 border-0 p-6 shadow-lg"><div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#F28C00]">Uso interno · Administrador y Registrador</p><h2 className="mt-1 text-xl font-bold text-[#0B2B5E]">Carta de invitación</h2><p className="mt-1 max-w-2xl text-sm text-slate-600">Completa rápidamente la declaración de hospedaje con la información del invitante y la persona invitada. Revisa el contenido antes de firmar o presentar.</p></div><FileText className="h-10 w-10 text-[#0B2B5E]" aria-hidden="true" /></div>
    <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Borrador operativo basado en la plantilla aportada. Debe revisarse antes de usarlo ante una autoridad.</div>
    {knownShipments.length > 0 && <div className="mb-5 rounded-lg border border-blue-100 bg-blue-50 p-4"><label htmlFor="invitation-shipment" className="block text-sm font-semibold text-[#0B2B5E]">Autocompletar invitado desde un envío registrado</label><select id="invitation-shipment" aria-label="Autocompletar invitado desde un envío registrado" defaultValue="" onChange={e => loadInvitee(e.target.value)} className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"><option value="">Seleccionar envío (opcional)</option>{knownShipments.map((shipment: any) => <option key={shipment.id} value={shipment.id}>{shipment.orderNumber} · {[shipment.recipientName, shipment.recipientLastName].filter(Boolean).join(" ") || "Sin destinatario"}</option>)}</select><p className="mt-1 text-xs text-slate-600">Carga nombre, apellido, documento y teléfono del destinatario; confirma el resto de información antes de emitir.</p></div>}
    <div className="space-y-5"><PersonFields heading="Datos del invitante / anfitrión" person={data.inviter} onChange={(field, value) => updatePerson("inviter", field, value)} /><PersonFields heading="Datos del invitado" person={data.invitee} onChange={(field, value) => updatePerson("invitee", field, value)} invitee />
      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4"><h3 className="mb-4 text-base font-bold text-[#0B2B5E]">Visita, hospedaje y anexos</h3><div className="grid grid-cols-1 gap-3 md:grid-cols-3"><div><label htmlFor="invitation-relationship" className="text-sm font-medium">Relación</label><Input id="invitation-relationship" value={data.relationship} onChange={e => setData(current => ({ ...current, relationship: e.target.value }))} /></div><div><label htmlFor="invitation-purpose" className="text-sm font-medium">Finalidad de la visita</label><Input id="invitation-purpose" value={data.purpose} onChange={e => setData(current => ({ ...current, purpose: e.target.value }))} /></div><div><label htmlFor="invitation-city" className="text-sm font-medium">Ciudad de emisión</label><Input id="invitation-city" value={data.city} onChange={e => setData(current => ({ ...current, city: e.target.value }))} /></div><div><label htmlFor="invitation-arrival" className="text-sm font-medium">Inicio de estadía *</label><Input id="invitation-arrival" type="date" value={data.arrivalDate} onChange={e => setData(current => ({ ...current, arrivalDate: e.target.value }))} required /></div><div><label htmlFor="invitation-departure" className="text-sm font-medium">Fin de estadía *</label><Input id="invitation-departure" type="date" value={data.departureDate} onChange={e => setData(current => ({ ...current, departureDate: e.target.value }))} required /></div><div><label htmlFor="invitation-date" className="text-sm font-medium">Fecha de emisión</label><Input id="invitation-date" type="date" value={data.date} onChange={e => setData(current => ({ ...current, date: e.target.value }))} /></div><div className="md:col-span-3"><label htmlFor="invitation-hosting" className="text-sm font-medium">Dirección de hospedaje *</label><Textarea id="invitation-hosting" value={data.hostingAddress} onChange={e => setData(current => ({ ...current, hostingAddress: e.target.value }))} required /></div><div className="md:col-span-3"><label htmlFor="invitation-other" className="text-sm font-medium">Otros anexos</label><Input id="invitation-other" value={data.otherAttachment} onChange={e => setData(current => ({ ...current, otherAttachment: e.target.value }))} placeholder="Ej.: copia de contrato de alquiler" /></div></div><div className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">{[["financialSupport", "Asumir gastos de sostenimiento"], ["healthInsurance", "Seguro sanitario"], ["financialGuarantee", "Garantía económica adicional"], ["inviteeIdAttached", "Adjuntar identidad del invitante"], ["financialGuaranteeAttached", "Adjuntar garantía financiera"]].map(([field, label]) => <label key={field} className="flex items-center gap-2 rounded-md bg-white p-2"><input type="checkbox" checked={Boolean(data[field as keyof InvitationLetterData])} onChange={e => setData(current => ({ ...current, [field]: e.target.checked }))} />{label}</label>)}</div></section>
    </div>
    {error && <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    <div className="mt-6 flex flex-wrap gap-3"><Button type="button" onClick={download} disabled={busy} className="bg-[#0B2B5E] text-white hover:bg-[#123d78]"><Download className="mr-2 h-4 w-4" />{busy ? "Generando PDF…" : "Descargar carta PDF"}</Button><Button type="button" variant="outline" onClick={print}><Printer className="mr-2 h-4 w-4" />Imprimir carta</Button><Button type="button" variant="outline" onClick={() => { setData(initialData()); setError(""); }}><RotateCcw className="mr-2 h-4 w-4" />Limpiar formulario</Button></div>
  </Card>;
}
