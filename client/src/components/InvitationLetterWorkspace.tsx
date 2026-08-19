import React, { useMemo, useState } from "react";
import { CheckCircle2, Download, Eye, Printer, RotateCcw, Save, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PhoneInput } from "@/components/PhoneInput";
import { ManualDateField } from "@/components/ManualDateField";
import { trpc } from "@/lib/trpc";
import { downloadInvitationLetterPdf, printInvitationLetter, type InvitationLetterData, type InvitationLetterItalian, type InvitationPerson } from "@/lib/invitationLetter";
import { rankFuzzyMatches } from "@shared/fuzzySearch";
import { isValidInternationalPhone } from "@shared/phoneValidation";
import type { InvitationPersonCandidate } from "@shared/invitationPeople";

const BIRTH_PLACES = ["LIMA", "CALLAO", "CUSCO", "AREQUIPA", "TRUJILLO", "PIURA", "CHICLAYO", "HUANCAYO", "TORINO", "ROMA", "MILANO", "NAPOLI", "FIRENZE", "GENOVA", "VENEZIA", "BOLOGNA", "PALERMO"];
const NATIONALITIES = ["PERUANA", "ITALIANA", "ARGENTINA", "BOLIVIANA", "BRASILEÑA", "CHILENA", "COLOMBIANA", "ECUATORIANA", "ESPAÑOLA", "FRANCESA", "MEXICANA", "VENEZOLANA"];
const uppercase = (value: string) => value.toLocaleUpperCase("es-PE").replace(/\s+/g, " ");

const emptyPerson = (): InvitationPerson => ({ firstName: "", lastName: "", birthDate: "", birthPlace: "", nationality: "", identityCard: "", passport: "", residencePermit: "", address: "", occupation: "", phone: "", email: "" });
const initialData = (): InvitationLetterData => ({ inviter: emptyPerson(), invitee: emptyPerson(), relationship: "FAMILIAR", purpose: "TURISMO / VISITA FAMILIAR", arrivalDate: "", departureDate: "", city: "TORINO", date: new Date().toISOString().slice(0, 10), financialSupport: true, healthInsurance: true, financialGuarantee: false, accommodationDeclared: true, accommodationAtHome: true, accommodationAtOtherAddress: false, inviteeIdAttached: true, financialGuaranteeAttached: false, otherAnnexes: "", companyAnnexes: "" });
const LETTERS_PER_PAGE = 6;

function parseSavedLetter(record: any): { data: InvitationLetterData; italian: InvitationLetterItalian } | null {
  try {
    const data = { accommodationDeclared: true, accommodationAtHome: true, accommodationAtOtherAddress: false, otherAnnexes: "", companyAnnexes: "", ...JSON.parse(record.letterData) } as InvitationLetterData;
    const italian = JSON.parse(record.italianData) as InvitationLetterItalian;
    return data?.inviter && data?.invitee && italian?.inviter && italian?.invitee ? { data, italian } : null;
  } catch { return null; }
}

function FuzzyUppercaseInput({ id, label, value, onChange, placeholder, options, required = true }: { id: string; label: string; value: string; onChange: (value: string) => void; placeholder?: string; options: string[]; required?: boolean }) {
  const [open, setOpen] = useState(false);
  const suggestions = useMemo(() => value.trim() ? rankFuzzyMatches(options, value, item => item).slice(0, 6) : [], [options, value]);
  return <div className="relative"><label htmlFor={id} className="text-sm font-medium">{label}{required ? " *" : ""}</label><Search className="pointer-events-none absolute left-3 top-8 h-4 w-4 text-slate-400" aria-hidden="true" /><Input id={id} value={value} onFocus={() => setOpen(true)} onChange={event => { onChange(uppercase(event.target.value)); setOpen(true); }} placeholder={placeholder} required={required} className="mt-1 h-11 bg-white pl-9 uppercase" autoComplete="off" />{open && value.trim() && <div className="absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">{suggestions.length > 0 ? suggestions.map(suggestion => <button key={suggestion} type="button" onClick={() => { onChange(suggestion); setOpen(false); }} className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-[#0B2B5E] hover:bg-blue-50">{suggestion}</button>) : <p className="px-3 py-2 text-sm text-slate-500">Sin coincidencias; puedes conservar el valor escrito en mayúsculas. / Nessuna corrispondenza; puoi mantenere il valore in maiuscolo.</p>}</div>}</div>;
}

function InvitationPersonLookup({ id, title, onSelect }: { id: string; title: string; onSelect: (candidate: InvitationPersonCandidate) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const normalizedQuery = query.trim();
  const peopleQuery = trpc.admin.searchInvitationPeople.useQuery({ query: normalizedQuery || "XX" }, { enabled: normalizedQuery.length >= 2 });
  const results = peopleQuery.data || [];
  const sourceText = (candidate: InvitationPersonCandidate) => candidate.sources.map(source => source === "carta" ? "carta" : source === "directorio" ? "directorio" : "envío").join(", ");
  const document = (candidate: InvitationPersonCandidate) => candidate.passport || candidate.identityCard;
  return <section className="rounded-lg border border-blue-100 bg-blue-50 p-4"><label htmlFor={id} className="block text-sm font-semibold text-[#0B2B5E]">{title}</label><p className="mt-1 text-xs text-slate-600">Busca por pasaporte, carta d’identità, DNI, nombre o apellido. Se muestran coincidencias similares aunque falten tildes o haya errores menores.</p><div className="relative mt-2"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden="true" /><Input id={id} aria-label={title} value={query} onFocus={() => setOpen(true)} onChange={event => { setQuery(uppercase(event.target.value)); setOpen(true); }} placeholder="Documento, nombre o apellido…" autoComplete="off" className="h-11 bg-white pl-9 uppercase" />{open && normalizedQuery.length >= 2 && <div className="absolute z-40 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">{peopleQuery.isFetching ? <p className="px-3 py-2 text-sm text-slate-500">Buscando personas…</p> : results.length > 0 ? results.map(candidate => <button key={candidate.key} type="button" onMouseDown={event => event.preventDefault()} onClick={() => { onSelect(candidate); setQuery(""); setOpen(false); }} className="w-full rounded-md px-3 py-2 text-left hover:bg-blue-50"><span className="block text-sm font-semibold text-[#0B2B5E]">{candidate.firstName} {candidate.lastName}</span><span className="block text-xs text-slate-600">{document(candidate) || "Sin documento"}{candidate.phone ? ` · ${candidate.phone}` : ""} · {sourceText(candidate)}</span></button>) : <p className="px-3 py-2 text-sm text-slate-500">No se encontraron coincidencias. Puedes completar los datos manualmente.</p>}</div>}</div></section>;
}

function PersonFields({ heading, person, onChange, invitee = false }: { heading: string; person: InvitationPerson; onChange: (field: keyof InvitationPerson, value: string) => void; invitee?: boolean }) {
  const prefix = invitee ? "invitado" : "invitante";
  const textField = (field: keyof InvitationPerson, label: string, placeholder?: string) => <div><label htmlFor={`${prefix}-${field}`} className="text-sm font-medium">{label} *</label><Input id={`${prefix}-${field}`} value={person[field]} onChange={e => onChange(field, uppercase(e.target.value))} placeholder={placeholder} required className="mt-1 h-11 bg-white uppercase" /></div>;
  return <section className="rounded-xl border border-slate-200 bg-slate-50 p-4"><h3 className="mb-4 text-base font-bold text-[#0B2B5E]">{heading}</h3><div className="grid grid-cols-1 gap-3 md:grid-cols-3">
    {textField("firstName", "Nombres / Nome(i)")}
    {textField("lastName", "Apellidos / Cognome")}
    <ManualDateField id={`${prefix}-nacimiento`} label="Fecha de nacimiento / Data di nascita" value={person.birthDate} onChange={value => onChange("birthDate", value)} required maxYear={new Date().getFullYear()} />
    <FuzzyUppercaseInput id={`${prefix}-lugar`} label="Lugar de nacimiento / Luogo di nascita" value={person.birthPlace} onChange={value => onChange("birthPlace", value)} placeholder="Ej.: LIMA" options={BIRTH_PLACES} />
    <FuzzyUppercaseInput id={`${prefix}-nacionalidad`} label="Nacionalidad / Nazionalità" value={person.nationality} onChange={value => onChange("nationality", value)} placeholder="Ej.: PERUANA" options={NATIONALITIES} />
    {textField("identityCard", "Documento de identidad / Documento d'identità")}
    {textField("passport", "Pasaporte / Passaporto")}
    {!invitee && textField("residencePermit", "Permiso de residencia / Permesso di soggiorno")}
    {textField("occupation", "Ocupación / Professione")}
    <div className="md:col-span-2">{textField("address", "Dirección / Indirizzo")}</div>
    <div><label htmlFor={`${prefix}-telefono`} className="text-sm font-medium">Teléfono / Telefono *</label><PhoneInput id={`${prefix}-telefono`} value={person.phone} onChange={value => onChange("phone", value)} required placeholder="970 188 447" className="mt-1" /></div>
    <div><label htmlFor={`${prefix}-email`} className="text-sm font-medium">Correo / E-mail <span className="font-normal text-slate-500">(opcional)</span></label><Input id={`${prefix}-email`} type="email" value={person.email} onChange={e => onChange("email", e.target.value.trim())} className="mt-1 h-11 bg-white" autoComplete="email" /></div>
  </div></section>;
}

export function InvitationLetterWorkspace({ shipments = [] as any[] }: { shipments?: any[] }) {
  const [data, setData] = useState<InvitationLetterData>(initialData);
  const [savedLetter, setSavedLetter] = useState<{ data: InvitationLetterData; italian: InvitationLetterItalian } | null>(null);
  const [error, setError] = useState("");
  const [letterSort, setLetterSort] = useState<"recent" | "old">("recent");
  const [letterPage, setLetterPage] = useState(1);
  const [showDeletedLetters, setShowDeletedLetters] = useState(false);
  const lettersQuery = trpc.admin.listInvitationLetters.useQuery();
  const deletedLettersQuery = trpc.admin.listDeletedInvitationLetters.useQuery(undefined, { enabled: showDeletedLetters });
  const saveRecordMutation = trpc.admin.saveInvitationLetter.useMutation({
    onSuccess: (record, variables) => { setSavedLetter({ data: variables.data, italian: variables.italian }); setError(""); lettersQuery.refetch(); },
    onError: issue => setError(issue.message || "No se pudo guardar la carta de invitación."),
  });
  const translateMutation = trpc.admin.translateInvitationLetter.useMutation({
    onSuccess: italian => saveRecordMutation.mutate({ data: { ...data, otherAnnexes: data.otherAnnexes ?? "", companyAnnexes: data.companyAnnexes ?? "" }, italian }),
    onError: issue => setError(issue.message || "No se pudo preparar la versión italiana. Revisa tu conexión e inténtalo nuevamente."),
  });
  const refreshInvitationLetterLists = () => { void lettersQuery.refetch(); void deletedLettersQuery.refetch(); };
  const deleteLetterMutation = trpc.admin.deleteInvitationLetter.useMutation({
    onSuccess: () => { setError(""); refreshInvitationLetterLists(); },
    onError: issue => setError(issue.message || "No se pudo enviar la carta a papelera."),
  });
  const restoreLetterMutation = trpc.admin.restoreInvitationLetter.useMutation({
    onSuccess: () => { setError(""); refreshInvitationLetterLists(); },
    onError: issue => setError(issue.message || "No se pudo restaurar la carta."),
  });
  const orderedLetters = useMemo(() => [...(lettersQuery.data || [])].sort((left: any, right: any) => {
    const difference = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    return letterSort === "recent" ? difference : -difference;
  }), [lettersQuery.data, letterSort]);
  const totalLetterPages = Math.max(1, Math.ceil(orderedLetters.length / LETTERS_PER_PAGE));
  const activeLetterPage = Math.min(letterPage, totalLetterPages);
  const visibleLetters = orderedLetters.slice((activeLetterPage - 1) * LETTERS_PER_PAGE, activeLetterPage * LETTERS_PER_PAGE);
  const markUnsaved = () => setSavedLetter(null);
  const updatePerson = (role: "inviter" | "invitee", field: keyof InvitationPerson, value: string) => { markUnsaved(); setData(current => ({ ...current, [role]: { ...current[role], [field]: value } })); };
  const updateData = <K extends keyof InvitationLetterData>(field: K, value: InvitationLetterData[K]) => { markUnsaved(); setData(current => ({ ...current, [field]: value })); };
  const applyPersonCandidate = (role: "inviter" | "invitee", candidate: InvitationPersonCandidate) => {
    markUnsaved();
    setData(current => {
      const person = current[role];
      const changes: Partial<InvitationPerson> = {};
      (Object.keys(person) as Array<keyof InvitationPerson>).forEach(field => {
        const candidateValue = candidate[field as keyof InvitationPersonCandidate];
        if (typeof candidateValue === "string" && candidateValue.trim()) changes[field] = field === "phone" || field === "email" || field === "birthDate" ? candidateValue : uppercase(candidateValue);
      });
      return { ...current, [role]: { ...person, ...changes } };
    });
  };
  const validatePerson = (person: InvitationPerson, role: string, requiresResidencePermit: boolean) => {
    const requiredFields: Array<[keyof InvitationPerson, string]> = [["firstName", "nombres"], ["lastName", "apellidos"], ["birthDate", "fecha de nacimiento"], ["birthPlace", "lugar de nacimiento"], ["nationality", "nacionalidad"], ["identityCard", "documento de identidad"], ["passport", "pasaporte"], ["address", "dirección"], ["occupation", "ocupación"], ["phone", "teléfono"]];
    if (requiresResidencePermit) requiredFields.push(["residencePermit", "permiso de residencia"]);
    const missing = requiredFields.find(([field]) => !String(person[field] || "").trim());
    if (missing) return `Completa ${missing[1]} de ${role}. El correo es opcional. / Completa ${missing[1]} per ${role}. L'e-mail è facoltativa.`;
    if (!isValidInternationalPhone(person.phone)) return `El teléfono de ${role} no coincide con los dígitos requeridos por el país seleccionado.`;
    if (person.email && !/^\S+@\S+\.\S+$/.test(person.email)) return `El correo de ${role} no es válido.`;
    return "";
  };
  const validate = () => {
    const inviterError = validatePerson(data.inviter, "la persona invitante", true);
    const inviteeError = validatePerson(data.invitee, "la persona invitada", false);
    if (inviterError || inviteeError || !data.arrivalDate || !data.departureDate || !data.city || !data.date) { setError(inviterError || inviteeError || "Completa la ciudad, fecha de emisión y el período de estadía. / Completa città, data di emissione e periodo di soggiorno."); return false; }
    if (new Date(data.departureDate) < new Date(data.arrivalDate)) { setError("La fecha de fin de estadía debe ser posterior a la fecha de inicio. / La data di fine deve essere successiva alla data di inizio."); return false; }
    setError("");
    return true;
  };
  const save = () => { if (validate()) translateMutation.mutate({ inviter: { birthPlace: data.inviter.birthPlace, nationality: data.inviter.nationality, residencePermit: data.inviter.residencePermit, address: data.inviter.address, occupation: data.inviter.occupation }, invitee: { birthPlace: data.invitee.birthPlace, nationality: data.invitee.nationality, address: data.invitee.address, occupation: data.invitee.occupation }, relationship: data.relationship, purpose: data.purpose, city: data.city }); };
  const download = async () => { if (!savedLetter) { setError("Guarda primero el borrador antes de descargar la carta."); return; } try { await downloadInvitationLetterPdf(savedLetter.data, savedLetter.italian); } catch (issue) { console.error("Error al generar la carta PDF", issue); setError("No se pudo generar la carta PDF. Inténtalo nuevamente."); } };
  const print = () => { if (!savedLetter) { setError("Guarda primero el borrador antes de imprimir la carta."); return; } try { printInvitationLetter(savedLetter.data, savedLetter.italian); } catch { setError("No se pudo abrir la impresión. Verifica que el navegador permita ventanas emergentes."); } };
  const restoreStoredLetter = (record: any) => {
    const stored = parseSavedLetter(record);
    if (!stored) { setError("No se pudo abrir la información guardada de esta carta."); return null; }
    setData(stored.data); setSavedLetter(stored); setError("");
    return stored;
  };
  const downloadStoredLetter = async (record: any) => { const stored = parseSavedLetter(record); if (!stored) { setError("No se pudo descargar la información guardada de esta carta."); return; } try { await downloadInvitationLetterPdf(stored.data, stored.italian); } catch (issue) { console.error("Error al generar la carta PDF guardada", issue); setError("No se pudo generar la carta PDF. Inténtalo nuevamente."); } };
  const printStoredLetter = (record: any) => { const stored = parseSavedLetter(record); if (!stored) { setError("No se pudo imprimir la información guardada de esta carta."); return; } try { printInvitationLetter(stored.data, stored.italian); } catch { setError("No se pudo abrir la impresión. Verifica que el navegador permita ventanas emergentes."); } };
  return <Card className="mb-8 border-0 p-6 shadow-lg"><div className="mb-6 rounded-lg bg-[#0B2B5E] px-5 py-4"><h2 className="text-xl font-bold text-white">Carta de invitación / Lettera d'invito</h2></div>
    <div className="space-y-5"><InvitationPersonLookup id="invitation-inviter-search" title="Buscar invitante guardado / Cerca invitante salvato" onSelect={candidate => applyPersonCandidate("inviter", candidate)} /><PersonFields heading="Datos del invitante / Dati dell'invitante" person={data.inviter} onChange={(field, value) => updatePerson("inviter", field, value)} /><InvitationPersonLookup id="invitation-invitee-search" title="Buscar invitado guardado / Cerca invitato salvato" onSelect={candidate => applyPersonCandidate("invitee", candidate)} /><PersonFields heading="Datos del invitado / Dati della persona invitata" person={data.invitee} onChange={(field, value) => updatePerson("invitee", field, value)} invitee />
      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="mb-4 text-base font-bold text-[#0B2B5E]">Visita y declaraciones / Visita e dichiarazioni</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div><label htmlFor="invitation-relationship" className="text-sm font-medium">Relación / Rapporto *</label><Input id="invitation-relationship" value={data.relationship} onChange={e => updateData("relationship", uppercase(e.target.value))} required className="mt-1 h-11 bg-white uppercase" /></div>
          <div><label htmlFor="invitation-purpose" className="text-sm font-medium">Finalidad de la visita / Scopo della visita *</label><Input id="invitation-purpose" value={data.purpose} onChange={e => updateData("purpose", uppercase(e.target.value))} required className="mt-1 h-11 bg-white uppercase" /></div>
          <div><label htmlFor="invitation-city" className="text-sm font-medium">Ciudad de emisión / Città di emissione *</label><Input id="invitation-city" value={data.city} onChange={e => updateData("city", uppercase(e.target.value))} required className="mt-1 h-11 bg-white uppercase" /></div>
          <ManualDateField id="invitation-arrival" label="Inicio de estadía / Inizio soggiorno" value={data.arrivalDate} onChange={value => updateData("arrivalDate", value)} required minYear={1900} />
          <ManualDateField id="invitation-departure" label="Fin de estadía / Fine soggiorno" value={data.departureDate} onChange={value => updateData("departureDate", value)} required minYear={1900} />
          <ManualDateField id="invitation-date" label="Fecha de emisión / Data di emissione" value={data.date} onChange={value => updateData("date", value)} required minYear={1900} />
        </div>
        <fieldset className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3"><legend className="px-1 text-sm font-semibold text-[#0B2B5E]">Alojamiento declarado / Alloggio dichiarato</legend><p className="mb-2 text-xs text-slate-600">Estas casillas se reflejan exactamente en la sección de hospedaje de la carta.</p><div className="grid grid-cols-1 gap-2 text-sm"><label className="flex items-center gap-2 rounded-md bg-white p-2"><input type="checkbox" checked={data.accommodationDeclared} onChange={e => updateData("accommodationDeclared", e.target.checked)} />Declaro que puedo hospedar / Dichiaro di voler ospitare</label><label className="flex items-center gap-2 rounded-md bg-white p-2"><input type="checkbox" checked={data.accommodationAtHome} onChange={e => updateData("accommodationAtHome", e.target.checked)} />En mi domicilio indicado / Presso la mia abitazione</label><label className="flex items-center gap-2 rounded-md bg-white p-2"><input type="checkbox" checked={data.accommodationAtOtherAddress} onChange={e => updateData("accommodationAtOtherAddress", e.target.checked)} />En otra dirección / Al seguente indirizzo</label></div></fieldset>
        <div className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">{[["financialSupport", "Asumir gastos de sostenimiento / Sostenimento"], ["healthInsurance", "Seguro sanitario / Assicurazione sanitaria"], ["financialGuarantee", "Garantía económica adicional / Garanzia economica"], ["inviteeIdAttached", "Adjuntar identidad del invitante / Documento invitante"], ["financialGuaranteeAttached", "Adjuntar garantía financiera / Garanzia finanziaria"]].map(([field, label]) => <label key={field} className="flex items-center gap-2 rounded-md bg-white p-2"><input type="checkbox" checked={Boolean(data[field as keyof InvitationLetterData])} onChange={e => updateData(field as keyof InvitationLetterData, e.target.checked as never)} />{label}</label>)}</div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2"><div><label htmlFor="invitation-other-annexes" className="text-sm font-medium">Otros documentos / Altri documenti <span className="font-normal text-slate-500">(opcional)</span></label><Textarea id="invitation-other-annexes" value={data.otherAnnexes ?? ""} onChange={event => updateData("otherAnnexes", event.target.value)} placeholder="Ej.: Copia de pasaporte, partida de nacimiento" className="mt-1 min-h-20 bg-white" /></div><div><label htmlFor="invitation-company-annexes" className="text-sm font-medium">Anexos de sociedades o entidades / Allegati per le Società-Enti <span className="font-normal text-slate-500">(opcional)</span></label><Textarea id="invitation-company-annexes" value={data.companyAnnexes ?? ""} onChange={event => updateData("companyAnnexes", event.target.value)} placeholder="Escribe los anexos empresariales, uno por línea" className="mt-1 min-h-20 bg-white" /></div></div>
      </section>
    </div>
    {error && <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {savedLetter && <p role="status" className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="h-4 w-4" />Carta guardada y preparada con la plantilla italiana. Ya puedes descargarla o imprimirla.</p>}
    <div className="mt-6 flex flex-wrap gap-3"><Button type="button" onClick={save} disabled={translateMutation.isPending || saveRecordMutation.isPending} className="bg-[#0B2B5E] text-white hover:bg-[#123d78]"><Save className="mr-2 h-4 w-4" />{translateMutation.isPending || saveRecordMutation.isPending ? "Guardando…" : "Guardar carta"}</Button><Button type="button" onClick={download} disabled={!savedLetter} className="bg-[#0B2B5E] text-white hover:bg-[#123d78] disabled:bg-slate-300"><Download className="mr-2 h-4 w-4" />Descargar carta PDF</Button><Button type="button" variant="outline" onClick={print} disabled={!savedLetter}><Printer className="mr-2 h-4 w-4" />Imprimir carta</Button><Button type="button" variant="outline" onClick={() => { setData(initialData()); setSavedLetter(null); setError(""); }}><RotateCcw className="mr-2 h-4 w-4" />Limpiar formulario</Button></div>
    <section className="mt-8 border-t border-slate-200 pt-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-lg font-bold text-[#0B2B5E]">Cartas de invitación generadas</h3><p className="text-sm text-slate-600">Historial de cartas guardadas, ordenado como los registros de documentos y encomiendas.</p></div><label className="text-sm font-medium text-slate-700">Ordenar <select value={letterSort} onChange={event => { setLetterSort(event.target.value as "recent" | "old"); setLetterPage(1); }} className="ml-2 h-9 rounded-md border border-slate-300 bg-white px-2"><option value="recent">Recientes (descendentes)</option><option value="old">Antiguas (ascendentes)</option></select></label></div>
      {lettersQuery.isLoading ? <p className="mt-4 text-sm text-slate-500">Cargando cartas…</p> : visibleLetters.length === 0 ? <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600">Aún no hay cartas guardadas.</p> : <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Invitado</th><th className="px-4 py-3">Invitante</th><th className="px-4 py-3">Creada</th><th className="px-4 py-3">Acciones</th></tr></thead><tbody>{visibleLetters.map((record: any) => <tr key={record.id} className="border-t border-slate-100"><td className="px-4 py-3 font-semibold text-slate-800">{record.inviteeName} {record.inviteeLastName}</td><td className="px-4 py-3 text-slate-600">{record.inviterName} {record.inviterLastName}</td><td className="px-4 py-3 text-slate-600">{new Date(record.createdAt).toLocaleDateString()}</td><td className="px-4 py-3"><div className="flex min-w-max gap-2"><Button type="button" size="sm" variant="outline" onClick={() => restoreStoredLetter(record)}><Eye className="mr-1 h-4 w-4" />Abrir</Button><Button type="button" size="sm" variant="outline" aria-label={`Descargar carta de ${record.inviteeName} ${record.inviteeLastName}`} onClick={() => void downloadStoredLetter(record)}><Download className="h-4 w-4" /></Button><Button type="button" size="sm" variant="outline" aria-label={`Imprimir carta de ${record.inviteeName} ${record.inviteeLastName}`} onClick={() => printStoredLetter(record)}><Printer className="h-4 w-4" /></Button><Button type="button" size="sm" variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800" aria-label={`Enviar a papelera la carta de ${record.inviteeName} ${record.inviteeLastName}`} disabled={deleteLetterMutation.isPending} onClick={() => deleteLetterMutation.mutate({ id: record.id })}><Trash2 className="mr-1 h-4 w-4" />Eliminar</Button></div></td></tr>)}</tbody></table></div>}
      {totalLetterPages > 1 && <div className="mt-4 flex items-center justify-between text-sm"><Button type="button" size="sm" variant="outline" disabled={activeLetterPage === 1} onClick={() => setLetterPage(page => Math.max(1, page - 1))}>Anterior</Button><span>Página {activeLetterPage} de {totalLetterPages}</span><Button type="button" size="sm" variant="outline" disabled={activeLetterPage === totalLetterPages} onClick={() => setLetterPage(page => Math.min(totalLetterPages, page + 1))}>Siguiente</Button></div>}
      <section className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4"><button type="button" onClick={() => setShowDeletedLetters(visible => !visible)} aria-expanded={showDeletedLetters} className="flex w-full items-center justify-between text-left"><span><span className="flex items-center gap-2 text-base font-bold text-[#0B2B5E]"><Trash2 className="h-4 w-4" />Papelera de cartas</span><span className="mt-1 block text-sm font-normal text-slate-600">Las cartas eliminadas no se borran: puedes restaurarlas cuando lo necesites.</span></span><span className="text-sm font-medium text-[#0B2B5E]">{showDeletedLetters ? "Ocultar" : "Ver papelera"}</span></button>{showDeletedLetters && <div className="mt-4">{deletedLettersQuery.isLoading ? <p className="text-sm text-slate-500">Cargando papelera…</p> : (deletedLettersQuery.data || []).length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">La papelera está vacía.</p> : <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white"><table className="min-w-full text-left text-sm"><thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Invitado</th><th className="px-4 py-3">Eliminada</th><th className="px-4 py-3">Eliminó</th><th className="px-4 py-3">Acción</th></tr></thead><tbody>{(deletedLettersQuery.data || []).map((record: any) => <tr key={record.id} className="border-t border-slate-100"><td className="px-4 py-3 font-semibold text-slate-800">{record.inviteeName} {record.inviteeLastName}</td><td className="px-4 py-3 text-slate-600">{record.deletedAt ? new Date(record.deletedAt).toLocaleString() : "—"}</td><td className="px-4 py-3 text-slate-600">{record.deletedByAdminLabel || (record.deletedByAdminId ? `Administrador #${record.deletedByAdminId}` : "—")}</td><td className="px-4 py-3"><Button type="button" size="sm" variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800" disabled={restoreLetterMutation.isPending} onClick={() => restoreLetterMutation.mutate({ id: record.id })}><RotateCcw className="mr-1 h-4 w-4" />Restaurar</Button></td></tr>)}</tbody></table></div>}</div>}</section>
    </section>
  </Card>;
}
