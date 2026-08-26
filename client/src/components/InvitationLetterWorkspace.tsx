import React, { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Download, Eye, KeyRound, PenLine, Plus, Printer, ReceiptText, RotateCcw, Save, Search, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PhoneInput } from "@/components/PhoneInput";
import { ManualDateField } from "@/components/ManualDateField";
import { trpc } from "@/lib/trpc";
import { buildInvitationLetterItalianFallback, downloadInvitationLetterPdf, printInvitationLetter, type InvitationLetterData, type InvitationLetterItalian, type InvitationLetterSignatureView, type InvitationPerson } from "@/lib/invitationLetter";
import { downloadInvitationLetterReceipt, getInvitationLetterTotal, printInvitationLetterReceipt, type InvitationLetterExtra, type InvitationLetterPricing } from "@/lib/invitationLetterReceipt";
import { rankFuzzyMatches } from "@shared/fuzzySearch";
import { isValidInternationalPhone } from "@shared/phoneValidation";
import type { InvitationPersonCandidate } from "@shared/invitationPeople";

const BIRTH_PLACES = ["AMAZONAS", "CHACHAPOYAS", "ÁNCASH", "HUARAZ", "APURÍMAC", "ABANCAY", "AREQUIPA", "AYACUCHO", "CAJAMARCA", "CALLAO", "CUSCO", "HUANCAVELICA", "HUÁNUCO", "ICA", "JUNÍN", "HUANCAYO", "LA LIBERTAD", "TRUJILLO", "LAMBAYEQUE", "CHICLAYO", "LIMA", "LORETO", "IQUITOS", "MADRE DE DIOS", "PUERTO MALDONADO", "MOQUEGUA", "PASCO", "CERRO DE PASCO", "PIURA", "PUNO", "SAN MARTÍN", "MOYOBAMBA", "TACNA", "TUMBES", "UCAYALI", "PUCALLPA", "TORINO", "ROMA", "MILANO", "NAPOLI", "FIRENZE", "GENOVA", "VENEZIA", "BOLOGNA", "PALERMO"];
const NATIONALITIES = ["PERUANA", "ITALIANA", "ARGENTINA", "BOLIVIANA", "BRASILEÑA", "CHILENA", "COLOMBIANA", "ECUATORIANA", "ESPAÑOLA", "FRANCESA", "MEXICANA", "VENEZOLANA"];
const uppercase = (value: string) => value.toLocaleUpperCase("es-PE").replace(/\s+/g, " ");

const emptyPerson = (): InvitationPerson => ({ firstName: "", lastName: "", birthDate: "", birthPlace: "", nationality: "", identityCard: "", passport: "", residencePermit: "", address: "", occupation: "", phone: "", email: "" });
const initialData = (): InvitationLetterData => ({ inviter: emptyPerson(), invitee: emptyPerson(), relationship: "FAMILIAR", purpose: "TURISMO / VISITA FAMILIAR", arrivalDate: "", departureDate: "", city: "TORINO", date: new Date().toISOString().slice(0, 10), financialSupport: true, healthInsurance: true, financialGuarantee: false, accommodationDeclared: true, accommodationAtHome: true, accommodationAtOtherAddress: false, inviteeIdAttached: true, financialGuaranteeAttached: false, otherAnnexes: "", companyAnnexes: "" });
const LETTERS_PER_PAGE = 6;
const normalizePersonIdentity = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
const isSameInvitationPerson = (inviter: InvitationPerson, invitee: InvitationPerson) => {
  const sameName = normalizePersonIdentity(`${inviter.firstName} ${inviter.lastName}`) === normalizePersonIdentity(`${invitee.firstName} ${invitee.lastName}`);
  const inviterIdentifiers = [inviter.passport, inviter.identityCard, inviter.email].map(normalizePersonIdentity).filter(Boolean);
  const inviteeIdentifiers = [invitee.passport, invitee.identityCard, invitee.email].map(normalizePersonIdentity).filter(Boolean);
  return sameName || inviterIdentifiers.some(identifier => inviteeIdentifiers.includes(identifier));
};
type LetterView = "create" | "history" | "trash";
type ItalianInput = Pick<InvitationLetterItalian, "inviter" | "invitee" | "relationship" | "purpose" | "city">;
type LetterPricingDraft = { manualPriceEur: string; extras: InvitationLetterExtra[] };
type SavedLetter = { id?: number; createdAt?: string | Date; data: InvitationLetterData; italian: InvitationLetterItalian; signature?: InvitationLetterSignatureView | null; pricing: InvitationLetterPricing };
const initialPricing = (): LetterPricingDraft => ({ manualPriceEur: "", extras: [] });
const parseAmount = (value: unknown, fallback = 0) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : fallback;
};
const getRecordPricing = (record: any): InvitationLetterPricing => {
  let extras: InvitationLetterExtra[] = [];
  try { extras = Array.isArray(record.extraItems) ? record.extraItems : JSON.parse(record.extraItems || "[]"); } catch { extras = []; }
  return { basePriceEur: parseAmount(record.basePriceEur, 15), manualPriceEur: record.manualPriceEur === null || record.manualPriceEur === undefined || record.manualPriceEur === "" ? null : parseAmount(record.manualPriceEur), extras: extras.map(item => ({ description: String(item.description || ""), amountEur: parseAmount(item.amountEur) })) };
};
const normalizeInvitationPerson = (person: InvitationPerson): InvitationPerson => Object.fromEntries(Object.entries(person).map(([field, value]) => [field, ["birthDate", "phone", "email"].includes(field) ? value : uppercase(String(value))])) as InvitationPerson;
const normalizeInvitationData = (data: InvitationLetterData): InvitationLetterData => ({ ...data, inviter: normalizeInvitationPerson(data.inviter), invitee: normalizeInvitationPerson(data.invitee), relationship: uppercase(data.relationship), purpose: uppercase(data.purpose), city: uppercase(data.city), otherAnnexes: uppercase(data.otherAnnexes || ""), companyAnnexes: uppercase(data.companyAnnexes || "") });
const toItalianInput = (data: InvitationLetterData): ItalianInput => ({ inviter: { birthPlace: data.inviter.birthPlace, nationality: data.inviter.nationality, residencePermit: data.inviter.residencePermit, address: data.inviter.address, occupation: data.inviter.occupation }, invitee: { birthPlace: data.invitee.birthPlace, nationality: data.invitee.nationality, address: data.invitee.address, occupation: data.invitee.occupation }, relationship: data.relationship, purpose: data.purpose, city: data.city });
const canPrepareItalian = (input: ItalianInput) => Object.values(input.inviter).every(value => String(value).trim()) && Object.values(input.invitee).every(value => String(value).trim()) && [input.relationship, input.purpose, input.city].every(value => value.trim());
const invitationSaveErrorMessage = (issue: unknown) => {
  const message = issue instanceof Error ? issue.message.trim() : "";
  if (!message || /^internal server error$/i.test(message)) return "No se pudo crear la carta. Verifica tu conexión e inténtalo nuevamente.";
  if (/No se pudo guardar la Carta de invitación/i.test(message)) return "La carta no recibió una confirmación de guardado. Actualiza el historial de cartas antes de intentar de nuevo.";
  return message;
};

function parseSavedLetter(record: any): SavedLetter | null {
  try {
    const data = { accommodationDeclared: true, accommodationAtHome: true, accommodationAtOtherAddress: false, otherAnnexes: "", companyAnnexes: "", ...JSON.parse(record.letterData) } as InvitationLetterData;
    const italian = JSON.parse(record.italianData) as InvitationLetterItalian;
    return data?.inviter && data?.invitee && italian?.inviter && italian?.invitee ? { id: record.id, createdAt: record.createdAt, data, italian, signature: record.signature || null, pricing: getRecordPricing(record) } : null;
  } catch { return null; }
}

function FuzzyUppercaseInput({ id, label, value, onChange, placeholder, options, required = true, error = "" }: { id: string; label: string; value: string; onChange: (value: string) => void; placeholder?: string; options: string[]; required?: boolean; error?: string }) {
  const [open, setOpen] = useState(false);
  const suggestions = useMemo(() => value.trim() ? rankFuzzyMatches(options, value, item => item).slice(0, 6) : [], [options, value]);
  return <div className="relative"><label htmlFor={id} className="text-sm font-medium">{label}{required ? " *" : ""}</label><Input id={id} value={value} onFocus={() => { if (value.trim()) setOpen(true); }} onBlur={() => window.setTimeout(() => setOpen(false), 120)} onChange={event => { onChange(uppercase(event.target.value)); setOpen(true); }} placeholder={placeholder} required={required} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className={`mt-1 h-11 bg-white pr-10 uppercase ${error ? "border-rose-500 ring-1 ring-rose-200" : ""}`} autoComplete="off" /><button type="button" aria-label={`Ver sugerencias para ${label}`} onMouseDown={event => event.preventDefault()} onClick={() => setOpen(current => !current)} className="absolute right-2 top-8 rounded p-1 text-slate-400 hover:bg-blue-50 hover:text-[#0B2B5E]"><Search className="h-4 w-4" aria-hidden="true" /></button>{error && <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-rose-700">{error}</p>}{open && suggestions.length > 0 && <div className="absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">{suggestions.map(suggestion => <button key={suggestion} type="button" onMouseDown={event => event.preventDefault()} onClick={() => { onChange(suggestion); setOpen(false); }} className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-[#0B2B5E] hover:bg-blue-50">{suggestion}</button>)}</div>}</div>;
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

function PersonFields({ heading, person, onChange, invitee = false, errors = {} }: { heading: string; person: InvitationPerson; onChange: (field: keyof InvitationPerson, value: string) => void; invitee?: boolean; errors?: Record<string, string> }) {
  const prefix = invitee ? "invitado" : "invitante";
  const errorFor = (field: keyof InvitationPerson) => errors[`${invitee ? "invitee" : "inviter"}.${field}`] || "";
  const textField = (field: keyof InvitationPerson, label: string, placeholder?: string) => <div><label htmlFor={`${prefix}-${field}`} className="text-sm font-medium">{label} *</label><Input id={`${prefix}-${field}`} value={person[field]} onChange={e => onChange(field, uppercase(e.target.value))} placeholder={placeholder} required aria-invalid={Boolean(errorFor(field))} aria-describedby={errorFor(field) ? `${prefix}-${field}-error` : undefined} className={`mt-1 h-11 bg-white uppercase ${errorFor(field) ? "border-rose-500 ring-1 ring-rose-200" : ""}`} />{errorFor(field) && <p id={`${prefix}-${field}-error`} role="alert" className="mt-1 text-xs text-rose-700">{errorFor(field)}</p>}</div>;
  return <section className="rounded-xl border border-slate-200 bg-slate-50 p-4"><h3 className="mb-4 text-base font-bold text-[#0B2B5E]">{heading}</h3><div className="grid grid-cols-1 gap-3 md:grid-cols-3">
    {textField("firstName", "Nombres / Nome(i)")}
    {textField("lastName", "Apellidos / Cognome")}
    <ManualDateField id={`${prefix}-nacimiento`} label="Fecha de nacimiento / Data di nascita" value={person.birthDate} onChange={value => onChange("birthDate", value)} required maxYear={new Date().getFullYear()} error={errorFor("birthDate")} />
    <FuzzyUppercaseInput id={`${prefix}-lugar`} label="Lugar de nacimiento / Luogo di nascita" value={person.birthPlace} onChange={value => onChange("birthPlace", value)} placeholder="Ej.: LIMA" options={BIRTH_PLACES} error={errorFor("birthPlace")} />
    <FuzzyUppercaseInput id={`${prefix}-nacionalidad`} label="Nacionalidad / Nazionalità" value={person.nationality} onChange={value => onChange("nationality", value)} placeholder="Ej.: PERUANA" options={NATIONALITIES} error={errorFor("nationality")} />
    {!invitee && textField("identityCard", "Documento de identidad / Documento d'identità")}
    {textField("passport", "Pasaporte / Passaporto")}
    {!invitee && textField("residencePermit", "Permiso de residencia / Permesso di soggiorno")}
    {textField("occupation", "Ocupación / Professione")}
    <div className="md:col-span-2">{textField("address", "Dirección / Indirizzo")}</div>
    {!invitee && <><div><label htmlFor={`${prefix}-telefono`} className="text-sm font-medium">Teléfono / Telefono *</label><PhoneInput id={`${prefix}-telefono`} value={person.phone} onChange={value => onChange("phone", value)} required placeholder="970 188 447" className={`mt-1 ${errorFor("phone") ? "rounded-md ring-1 ring-rose-300" : ""}`} />{errorFor("phone") && <p role="alert" className="mt-1 text-xs text-rose-700">{errorFor("phone")}</p>}</div>
    <div><label htmlFor={`${prefix}-email`} className="text-sm font-medium">Correo / E-mail <span className="font-normal text-slate-500">(opcional)</span></label><Input id={`${prefix}-email`} type="email" value={person.email} onChange={e => onChange("email", e.target.value.trim())} className="mt-1 h-11 bg-white" autoComplete="email" /></div></>}
  </div></section>;
}

export function InvitationLetterWorkspace({ shipments = [] as any[] }: { shipments?: any[] }) {
  const [data, setData] = useState<InvitationLetterData>(initialData);
  const [savedLetter, setSavedLetter] = useState<SavedLetter | null>(null);
  const [pricing, setPricing] = useState<LetterPricingDraft>(initialPricing);
  const [temporaryAccount, setTemporaryAccount] = useState<{ email: string; password: string } | null>(null);
  const [preparedSignatureUrl, setPreparedSignatureUrl] = useState<string>("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [letterView, setLetterView] = useState<LetterView>("create");
  const [letterSort, setLetterSort] = useState<"recent" | "old">("recent");
  const [letterPage, setLetterPage] = useState(1);
  const [showDeletedLetters, setShowDeletedLetters] = useState(false);
  const [preparedItalian, setPreparedItalian] = useState<{ key: string; value: InvitationLetterItalian } | null>(null);
  const lettersQuery = trpc.admin.listInvitationLetters.useQuery();
  const deletedLettersQuery = trpc.admin.listDeletedInvitationLetters.useQuery(undefined, { enabled: showDeletedLetters });
  const normalizedDraft = useMemo(() => normalizeInvitationData(data), [data]);
  const italianInput = useMemo(() => toItalianInput(normalizedDraft), [normalizedDraft]);
  const italianKey = useMemo(() => JSON.stringify(italianInput), [italianInput]);
  const preparedKeyRef = useRef("");
  const reconcilePersistedLetter = async (variables: { data: InvitationLetterData; italian: InvitationLetterItalian }) => {
    const result = await lettersQuery.refetch();
    const record = (result.data || []).find((candidate: any) => {
      const stored = parseSavedLetter(candidate);
      return stored?.data.inviter.passport === variables.data.inviter.passport && stored.data.inviter.identityCard === variables.data.inviter.identityCard && stored.data.invitee.passport === variables.data.invitee.passport && stored.data.invitee.firstName === variables.data.invitee.firstName && stored.data.invitee.lastName === variables.data.invitee.lastName && stored.data.date === variables.data.date;
    });
    if (!record) return false;
    const stored = parseSavedLetter(record);
    if (!stored) return false;
    setSavedLetter(stored);
    setError("");
    setLetterView("history");
    return true;
  };
  const saveRecordMutation = trpc.admin.saveInvitationLetter.useMutation({
    onSuccess: (record, variables) => { setSavedLetter({ id: record.id, createdAt: record.createdAt, data: variables.data, italian: variables.italian, signature: null, pricing: getRecordPricing({ ...record, manualPriceEur: record.manualPriceEur ?? variables.pricing?.manualPriceEur, extraItems: record.extraItems ?? variables.pricing?.extras }) }); setTemporaryAccount(record.account?.created && record.account?.temporaryPassword ? { email: record.account.email || "", password: record.account.temporaryPassword } : null); setError(""); setLetterView("history"); lettersQuery.refetch(); },
    onError: async (issue, variables) => { if (await reconcilePersistedLetter(variables)) return; setError(invitationSaveErrorMessage(issue)); },
  });
  const translateMutation = trpc.admin.translateInvitationLetter.useMutation();
  useEffect(() => {
    if (!canPrepareItalian(italianInput) || preparedKeyRef.current === italianKey || translateMutation.isPending) return;
    const timer = window.setTimeout(() => {
      preparedKeyRef.current = italianKey;
      translateMutation.mutate(italianInput, { onSuccess: italian => setPreparedItalian({ key: italianKey, value: italian }), onError: () => { preparedKeyRef.current = ""; } });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [italianInput, italianKey, translateMutation]);
  const refreshInvitationLetterLists = () => { void lettersQuery.refetch(); void deletedLettersQuery.refetch(); };
  const deleteLetterMutation = trpc.admin.deleteInvitationLetter.useMutation({
    onSuccess: () => { setError(""); refreshInvitationLetterLists(); },
    onError: issue => setError(issue.message || "No se pudo enviar la carta a papelera."),
  });
  const restoreLetterMutation = trpc.admin.restoreInvitationLetter.useMutation({
    onSuccess: () => { setError(""); refreshInvitationLetterLists(); },
    onError: issue => setError(issue.message || "No se pudo restaurar la carta."),
  });
  const prepareSignatureMutation = trpc.admin.prepareInvitationLetterSignature.useMutation({
    onSuccess: result => {
      if (result.status === "signed") { setError("La Carta ya fue firmada electrónicamente."); return; }
      setPreparedSignatureUrl(result.signatureUrl);
      const opened = window.open(result.signatureUrl, "_blank", "noopener,noreferrer");
      if (!opened) setError("La firma está preparada. Usa el enlace visible para abrirla en otra pestaña.");
      refreshInvitationLetterLists();
    },
    onError: issue => setError(issue.message || "No se pudo preparar la firma de la Carta."),
  });
  const sendSignatureMutation = trpc.admin.sendInvitationLetterSignature.useMutation({
    onSuccess: result => { setPreparedSignatureUrl(result.signatureUrl || ""); setError(result.status === "signed" ? "La Carta ya fue firmada electrónicamente." : "Notificación de firma enviada al correo del invitante."); refreshInvitationLetterLists(); },
    onError: issue => setError(issue.message || "No se pudo enviar la notificación de firma."),
  });
  const orderedLetters = useMemo(() => [...(lettersQuery.data || [])].sort((left: any, right: any) => {
    const difference = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    return letterSort === "recent" ? difference : -difference;
  }), [lettersQuery.data, letterSort]);
  const totalLetterPages = Math.max(1, Math.ceil(orderedLetters.length / LETTERS_PER_PAGE));
  const activeLetterPage = Math.min(letterPage, totalLetterPages);
  const visibleLetters = orderedLetters.slice((activeLetterPage - 1) * LETTERS_PER_PAGE, activeLetterPage * LETTERS_PER_PAGE);
  const markUnsaved = () => setSavedLetter(null);
  const updatePerson = (role: "inviter" | "invitee", field: keyof InvitationPerson, value: string) => { markUnsaved(); setFieldErrors(current => ({ ...current, [`${role}.${field}`]: "" })); setData(current => ({ ...current, [role]: { ...current[role], [field]: value } })); };
  const updateData = <K extends keyof InvitationLetterData>(field: K, value: InvitationLetterData[K]) => { markUnsaved(); setFieldErrors(current => ({ ...current, [String(field)]: "" })); setData(current => ({ ...current, [field]: value })); };
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
    const requiredFields: Array<[keyof InvitationPerson, string]> = [["firstName", "nombres"], ["lastName", "apellidos"], ["birthDate", "fecha de nacimiento"], ["birthPlace", "lugar de nacimiento"], ["nationality", "nacionalidad"], ["passport", "pasaporte"], ["address", "dirección"], ["occupation", "ocupación"]];
    if (requiresResidencePermit) requiredFields.push(["identityCard", "documento de identidad"], ["residencePermit", "permiso de residencia"], ["phone", "teléfono"]);
    const missing = requiredFields.find(([field]) => !String(person[field] || "").trim());
    if (missing) return `Completa ${missing[1]} de ${role}. El correo es opcional. / Completa ${missing[1]} per ${role}. L'e-mail è facoltativa.`;
    if (requiresResidencePermit && !isValidInternationalPhone(person.phone)) return `El teléfono de ${role} no coincide con los dígitos requeridos por el país seleccionado.`;
    if (requiresResidencePermit && person.email && !/^\S+@\S+\.\S+$/.test(person.email)) return `El correo de ${role} no es válido.`;
    return "";
  };
  const validate = () => {
    const inviterError = validatePerson(data.inviter, "la persona invitante", true);
    const inviteeError = validatePerson(data.invitee, "la persona invitada", false);
    const nextErrors: Record<string, string> = {};
    const addMissing = (role: "inviter" | "invitee", person: InvitationPerson, requiresResidencePermit: boolean) => {
      const requiredFields: Array<[keyof InvitationPerson, string]> = [["firstName", "Completa los nombres."], ["lastName", "Completa los apellidos."], ["birthDate", "Completa la fecha de nacimiento."], ["birthPlace", "Completa el lugar de nacimiento."], ["nationality", "Completa la nacionalidad."], ["passport", "Completa el pasaporte."], ["address", "Completa la dirección."], ["occupation", "Completa la ocupación."]];
      if (requiresResidencePermit) requiredFields.push(["identityCard", "Completa el documento de identidad."], ["residencePermit", "Completa el permiso de residencia."], ["phone", "Completa un teléfono válido."]);
      requiredFields.forEach(([field, message]) => { if (!String(person[field] || "").trim()) nextErrors[`${role}.${field}`] = message; });
      if (requiresResidencePermit && person.phone && !isValidInternationalPhone(person.phone)) nextErrors[`${role}.phone`] = "El teléfono no coincide con el país seleccionado.";
      if (requiresResidencePermit && person.email && !/^\S+@\S+\.\S+$/.test(person.email)) nextErrors[`${role}.email`] = "El correo no es válido.";
    };
    addMissing("inviter", data.inviter, true); addMissing("invitee", data.invitee, false);
    if (!data.arrivalDate) nextErrors.arrivalDate = "Completa el inicio de estadía.";
    if (!data.departureDate) nextErrors.departureDate = "Completa el fin de estadía.";
    if (!data.city.trim()) nextErrors.city = "Completa la ciudad de emisión.";
    if (!data.date) nextErrors.date = "Completa la fecha de emisión.";
    const samePeople = isSameInvitationPerson(data.inviter, data.invitee);
    if (samePeople) { nextErrors["inviter.firstName"] = "La persona invitante debe ser distinta de la invitada."; nextErrors["invitee.firstName"] = "La persona invitada debe ser distinta de la invitante."; }
    if (data.arrivalDate && data.departureDate && new Date(data.departureDate) < new Date(data.arrivalDate)) nextErrors.departureDate = "La fecha de fin debe ser posterior al inicio.";
    if (Object.keys(nextErrors).length > 0) { setFieldErrors(nextErrors); setError(samePeople ? "La persona invitante y la persona invitada deben ser distintas. Verifica los campos marcados en rojo." : "Revisa los campos marcados en rojo antes de crear la carta."); return false; }
    setFieldErrors({});
    setError("");
    return true;
  };
  const startNewLetter = () => { setData(initialData()); setPricing(initialPricing()); setSavedLetter(null); setTemporaryAccount(null); setPreparedSignatureUrl(""); setPreparedItalian(null); preparedKeyRef.current = ""; setFieldErrors({}); setError(""); setLetterView("create"); };
  const save = () => {
    if (!validate()) return;
    setData(normalizedDraft);
    const dataToSave = { ...normalizedDraft, otherAnnexes: normalizedDraft.otherAnnexes || "", companyAnnexes: normalizedDraft.companyAnnexes || "" };
    const italian = preparedItalian?.key === italianKey ? preparedItalian.value : buildInvitationLetterItalianFallback(dataToSave);
    const extras = pricing.extras.filter(extra => extra.description.trim() || parseAmount(extra.amountEur) > 0).map(extra => ({ description: extra.description.trim(), amountEur: parseAmount(extra.amountEur) }));
    saveRecordMutation.mutate({ data: dataToSave, italian, pricing: { manualPriceEur: pricing.manualPriceEur.trim() ? parseAmount(pricing.manualPriceEur) : null, extras } });
  };
  const download = async () => { if (!savedLetter) { setError("Guarda primero el borrador antes de descargar la carta."); return; } try { await downloadInvitationLetterPdf(savedLetter.data, savedLetter.italian, savedLetter.signature); } catch (issue) { console.error("Error al generar la carta PDF", issue); setError("No se pudo generar la carta PDF. Inténtalo nuevamente."); } };
  const print = () => { if (!savedLetter) { setError("Guarda primero el borrador antes de imprimir la carta."); return; } try { printInvitationLetter(savedLetter.data, savedLetter.italian, savedLetter.signature); } catch { setError("No se pudo abrir la impresión. Verifica que el navegador permita ventanas emergentes."); } };
  const receiptInput = (letter: SavedLetter) => ({ id: letter.id || 0, data: letter.data, pricing: letter.pricing, createdAt: letter.createdAt, signature: letter.signature });
  const downloadReceipt = () => { if (!savedLetter?.id) { setError("Guarda la Carta antes de descargar el comprobante."); return; } try { downloadInvitationLetterReceipt(receiptInput(savedLetter)); } catch { setError("No se pudo abrir el comprobante. Verifica que el navegador permita ventanas emergentes."); } };
  const printReceipt = () => { if (!savedLetter?.id) { setError("Guarda la Carta antes de imprimir el comprobante."); return; } try { printInvitationLetterReceipt(receiptInput(savedLetter)); } catch { setError("No se pudo abrir el comprobante. Verifica que el navegador permita ventanas emergentes."); } };
  const restoreStoredLetter = (record: any) => {
    const stored = parseSavedLetter(record);
    if (!stored) { setError("No se pudo abrir la información guardada de esta carta."); return null; }
    setData(stored.data); setPricing({ manualPriceEur: stored.pricing.manualPriceEur === null || stored.pricing.manualPriceEur === undefined ? "" : String(stored.pricing.manualPriceEur), extras: stored.pricing.extras }); setSavedLetter(stored); setError(""); setLetterView("create");
    return stored;
  };
  const downloadStoredLetter = async (record: any) => { const stored = parseSavedLetter(record); if (!stored) { setError("No se pudo descargar la información guardada de esta carta."); return; } try { await downloadInvitationLetterPdf(stored.data, stored.italian, stored.signature); } catch (issue) { console.error("Error al generar la carta PDF guardada", issue); setError("No se pudo generar la carta PDF. Inténtalo nuevamente."); } };
  const printStoredLetter = (record: any) => { const stored = parseSavedLetter(record); if (!stored) { setError("No se pudo imprimir la información guardada de esta carta."); return; } try { printInvitationLetter(stored.data, stored.italian, stored.signature); } catch { setError("No se pudo abrir la impresión. Verifica que el navegador permita ventanas emergentes."); } };
  const downloadStoredReceipt = (record: any) => { const stored = parseSavedLetter(record); if (!stored || !stored.id) { setError("No se pudo generar el comprobante de esta Carta."); return; } try { downloadInvitationLetterReceipt(receiptInput(stored)); } catch { setError("No se pudo abrir el comprobante. Verifica que el navegador permita ventanas emergentes."); } };
  const printStoredReceipt = (record: any) => { const stored = parseSavedLetter(record); if (!stored || !stored.id) { setError("No se pudo generar el comprobante de esta Carta."); return; } try { printInvitationLetterReceipt(receiptInput(stored)); } catch { setError("No se pudo abrir el comprobante. Verifica que el navegador permita ventanas emergentes."); } };
  const pricingPreview: InvitationLetterPricing = { basePriceEur: 15, manualPriceEur: pricing.manualPriceEur.trim() ? parseAmount(pricing.manualPriceEur) : null, extras: pricing.extras };
  const updatePricing = (next: Partial<LetterPricingDraft>) => { markUnsaved(); setPricing(current => ({ ...current, ...next })); };
  const updateExtra = (index: number, change: Partial<InvitationLetterExtra>) => { markUnsaved(); setPricing(current => ({ ...current, extras: current.extras.map((extra, extraIndex) => extraIndex === index ? { ...extra, ...change } : extra) })); };
  return <Card className="mb-8 border-0 p-6 shadow-lg"><div className="mb-6 flex flex-col gap-3 rounded-lg bg-[#0B2B5E] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-xl font-bold text-white">Carta de invitación / Lettera d'invito</h2><div className="flex flex-wrap gap-2" role="tablist" aria-label="Secciones de Carta de invitación"><Button type="button" role="tab" aria-selected={letterView === "create"} aria-controls="invitation-create-panel" size="sm" variant={letterView === "create" ? "secondary" : "outline"} onClick={() => { setShowDeletedLetters(false); startNewLetter(); }} className={letterView === "create" ? "bg-white text-[#0B2B5E] hover:bg-blue-50" : "border-white/70 text-white hover:bg-white/10 hover:text-white"}>Crear carta nueva</Button><Button type="button" role="tab" aria-selected={letterView === "history" && !showDeletedLetters} aria-controls="invitation-history-panel" size="sm" variant={letterView === "history" && !showDeletedLetters ? "secondary" : "outline"} onClick={() => { setShowDeletedLetters(false); setLetterView("history"); }} className={letterView === "history" && !showDeletedLetters ? "bg-white text-[#0B2B5E] hover:bg-blue-50" : "border-white/70 text-white hover:bg-white/10 hover:text-white"}>Cartas generadas ({orderedLetters.length})</Button><Button type="button" role="tab" aria-selected={showDeletedLetters} size="sm" variant={showDeletedLetters ? "secondary" : "outline"} onClick={() => { setShowDeletedLetters(true); setLetterView("history"); }} className={showDeletedLetters ? "bg-white text-[#0B2B5E] hover:bg-blue-50" : "border-white/70 text-white hover:bg-white/10 hover:text-white"}><Trash2 className="mr-1 h-4 w-4" />Papelera</Button></div></div>
    {temporaryAccount && <section className="mb-5 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 text-amber-950"><div className="flex gap-3"><KeyRound className="mt-0.5 h-5 w-5 shrink-0" /><div><h3 className="font-bold">Acceso temporal creado para el invitante</h3><p className="mt-1 text-sm">Entrega esta credencial al cliente. Se muestra solo en esta sesión y deberá cambiarse al ingresar.</p><p className="mt-3 rounded bg-white px-3 py-2 font-mono text-sm"><strong>Correo:</strong> {temporaryAccount.email}<br /><strong>Contraseña temporal:</strong> {temporaryAccount.password}</p></div></div></section>}
    {preparedSignatureUrl && <section className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-[#0B2B5E]"><p className="font-semibold">Enlace de firma preparado</p><a className="mt-2 block break-all text-sm underline" href={preparedSignatureUrl} target="_blank" rel="noreferrer">{preparedSignatureUrl}</a></section>}
    {letterView === "create" && <><div id="invitation-create-panel" role="tabpanel" className="space-y-5"><InvitationPersonLookup id="invitation-inviter-search" title="Buscar invitante guardado / Cerca invitante salvato" onSelect={candidate => applyPersonCandidate("inviter", candidate)} /><PersonFields heading="Datos del invitante / Dati dell'invitante" person={data.inviter} onChange={(field, value) => updatePerson("inviter", field, value)} errors={fieldErrors} /><InvitationPersonLookup id="invitation-invitee-search" title="Buscar invitado guardado / Cerca invitato salvato" onSelect={candidate => applyPersonCandidate("invitee", candidate)} /><PersonFields heading="Datos del invitado / Dati della persona invitata" person={data.invitee} onChange={(field, value) => updatePerson("invitee", field, value)} invitee errors={fieldErrors} />
      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="mb-4 text-base font-bold text-[#0B2B5E]">Visita y declaraciones / Visita e dichiarazioni</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div><label htmlFor="invitation-relationship" className="text-sm font-medium">Relación / Rapporto *</label><Input id="invitation-relationship" value={data.relationship} onChange={e => updateData("relationship", uppercase(e.target.value))} required className="mt-1 h-11 bg-white uppercase" /></div>
          <div><label htmlFor="invitation-purpose" className="text-sm font-medium">Finalidad de la visita / Scopo della visita *</label><Input id="invitation-purpose" value={data.purpose} onChange={e => updateData("purpose", uppercase(e.target.value))} required className="mt-1 h-11 bg-white uppercase" /></div>
          <div><label htmlFor="invitation-city" className="text-sm font-medium">Ciudad de emisión / Città di emissione *</label><Input id="invitation-city" value={data.city} onChange={e => updateData("city", uppercase(e.target.value))} required aria-invalid={Boolean(fieldErrors.city)} className={`mt-1 h-11 bg-white uppercase ${fieldErrors.city ? "border-rose-500 ring-1 ring-rose-200" : ""}`} />{fieldErrors.city && <p role="alert" className="mt-1 text-xs text-rose-700">{fieldErrors.city}</p>}</div>
          <ManualDateField id="invitation-arrival" label="Inicio de estadía / Inizio soggiorno" value={data.arrivalDate} onChange={value => updateData("arrivalDate", value)} required minYear={1900} error={fieldErrors.arrivalDate} />
          <ManualDateField id="invitation-departure" label="Fin de estadía / Fine soggiorno" value={data.departureDate} onChange={value => updateData("departureDate", value)} required minYear={1900} error={fieldErrors.departureDate} />
          <ManualDateField id="invitation-date" label="Fecha de emisión / Data di emissione" value={data.date} onChange={value => updateData("date", value)} required minYear={1900} error={fieldErrors.date} />
        </div>
        <fieldset className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3"><legend className="px-1 text-sm font-semibold text-[#0B2B5E]">Alojamiento declarado / Alloggio dichiarato</legend><p className="mb-2 text-xs text-slate-600">Estas casillas se reflejan exactamente en la sección de hospedaje de la carta.</p><div className="grid grid-cols-1 gap-2 text-sm"><label className="flex items-center gap-2 rounded-md bg-white p-2"><input type="checkbox" checked={data.accommodationDeclared} onChange={e => updateData("accommodationDeclared", e.target.checked)} />Declaro que puedo hospedar / Dichiaro di voler ospitare</label><label className="flex items-center gap-2 rounded-md bg-white p-2"><input type="checkbox" checked={data.accommodationAtHome} onChange={e => updateData("accommodationAtHome", e.target.checked)} />En mi domicilio indicado / Presso la mia abitazione</label><label className="flex items-center gap-2 rounded-md bg-white p-2"><input type="checkbox" checked={data.accommodationAtOtherAddress} onChange={e => updateData("accommodationAtOtherAddress", e.target.checked)} />En otra dirección / Al seguente indirizzo</label></div></fieldset>
        <div className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">{[["financialSupport", "Asumir gastos de sostenimiento / Sostenimento"], ["healthInsurance", "Seguro sanitario / Assicurazione sanitaria"], ["financialGuarantee", "Garantía económica adicional / Garanzia economica"], ["inviteeIdAttached", "Adjuntar identidad del invitante / Documento invitante"], ["financialGuaranteeAttached", "Adjuntar garantía financiera / Garanzia finanziaria"]].map(([field, label]) => <label key={field} className="flex items-center gap-2 rounded-md bg-white p-2"><input type="checkbox" checked={Boolean(data[field as keyof InvitationLetterData])} onChange={e => updateData(field as keyof InvitationLetterData, e.target.checked as never)} />{label}</label>)}</div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2"><div><label htmlFor="invitation-other-annexes" className="text-sm font-medium">Otros documentos / Altri documenti <span className="font-normal text-slate-500">(opcional)</span></label><Textarea id="invitation-other-annexes" value={data.otherAnnexes ?? ""} onChange={event => updateData("otherAnnexes", uppercase(event.target.value))} placeholder="Ej.: COPIA DE PASAPORTE, PARTIDA DE NACIMIENTO" className="mt-1 min-h-20 bg-white uppercase" /></div><div><label htmlFor="invitation-company-annexes" className="text-sm font-medium">Anexos de sociedades o entidades / Allegati per le Società-Enti <span className="font-normal text-slate-500">(opcional)</span></label><Textarea id="invitation-company-annexes" value={data.companyAnnexes ?? ""} onChange={event => updateData("companyAnnexes", uppercase(event.target.value))} placeholder="ESCRIBE LOS ANEXOS EMPRESARIALES, UNO POR LÍNEA" className="mt-1 min-h-20 bg-white uppercase" /></div></div>
        <section className="mt-5 rounded-xl border border-orange-200 bg-orange-50 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="font-bold text-[#0B2B5E]">Cobro de Carta de invitación</h4><p className="mt-1 text-xs text-slate-600">La tarifa automática es EUR 15.00. El precio manual la reemplaza; los extras se suman al total.</p></div><p className="rounded-lg bg-white px-3 py-2 text-sm font-extrabold text-[#0B2B5E]">TOTAL: EUR {getInvitationLetterTotal(pricingPreview).toFixed(2)}</p></div><div className="mt-4 grid gap-3 md:grid-cols-2"><div className="rounded-lg bg-white p-3"><label className="text-sm font-medium" htmlFor="invitation-manual-price">Precio manual en EUR <span className="font-normal text-slate-500">(opcional)</span></label><Input id="invitation-manual-price" type="number" min="0" step="0.01" inputMode="decimal" value={pricing.manualPriceEur} onChange={event => updatePricing({ manualPriceEur: event.target.value })} placeholder="15.00" className="mt-1 h-11" /><p className="mt-1 text-xs text-slate-500">Vacío: se aplica automáticamente EUR 15.00.</p></div><div className="rounded-lg bg-white p-3"><p className="text-sm font-medium">Base automática</p><p className="mt-2 text-lg font-bold text-[#0B2B5E]">EUR 15.00</p><p className="text-xs text-slate-500">Costo de creación de Carta de invitación.</p></div></div><div className="mt-4 rounded-lg bg-white p-3"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-medium">Extras detallados</p><p className="text-xs text-slate-500">Registra cada cargo adicional que se sumará al comprobante.</p></div><Button type="button" size="sm" variant="outline" onClick={() => updatePricing({ extras: [...pricing.extras, { description: "", amountEur: 0 }] })}><Plus className="mr-1 h-4 w-4" />Agregar extra</Button></div>{pricing.extras.length > 0 && <div className="mt-3 space-y-2">{pricing.extras.map((extra, index) => <div key={index} className="grid gap-2 sm:grid-cols-[1fr_10rem_auto]"><Input aria-label={`Descripción extra ${index + 1}`} value={extra.description} onChange={event => updateExtra(index, { description: uppercase(event.target.value) })} placeholder="Ej.: SERVICIO ADICIONAL" className="h-10 uppercase" /><Input aria-label={`Importe extra ${index + 1}`} type="number" min="0" step="0.01" inputMode="decimal" value={extra.amountEur || ""} onChange={event => updateExtra(index, { amountEur: parseAmount(event.target.value) })} placeholder="0.00" className="h-10" /><Button type="button" size="sm" variant="outline" className="border-rose-200 text-rose-700" onClick={() => updatePricing({ extras: pricing.extras.filter((_, extraIndex) => extraIndex !== index) })}>Quitar</Button></div>)}</div>}</div></section>
      </section>
    </div>
    <div className="mt-6 flex flex-wrap gap-3"><Button type="button" onClick={save} disabled={saveRecordMutation.isPending} className="bg-[#F28C00] text-white hover:bg-[#d97800]"><Save className="mr-2 h-4 w-4" />{saveRecordMutation.isPending ? "Generando carta…" : "Crear carta"}</Button><Button type="button" onClick={download} disabled={!savedLetter} className="bg-[#0B2B5E] text-white hover:bg-[#123d78] disabled:bg-slate-300"><Download className="mr-2 h-4 w-4" />Descargar carta PDF</Button><Button type="button" variant="outline" onClick={print} disabled={!savedLetter}><Printer className="mr-2 h-4 w-4" />Imprimir carta</Button><Button type="button" variant="outline" onClick={downloadReceipt} disabled={!savedLetter?.id}><ReceiptText className="mr-2 h-4 w-4" />Descargar recibo</Button><Button type="button" variant="outline" onClick={printReceipt} disabled={!savedLetter?.id}><Printer className="mr-2 h-4 w-4" />Imprimir recibo</Button><Button type="button" variant="outline" onClick={startNewLetter}><RotateCcw className="mr-2 h-4 w-4" />Limpiar formulario</Button></div></>}
    {error && <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {saveRecordMutation.isPending && <p role="status" className="mt-4 flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm font-medium text-orange-800">Generando y guardando la Carta de invitación…</p>}
    {translateMutation.isPending && !saveRecordMutation.isPending && <p role="status" className="mt-4 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-[#0B2B5E]">Preparando la versión italiana en segundo plano mientras completas los datos.</p>}
    {savedLetter && !translateMutation.isPending && <p role="status" className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="h-4 w-4" />Carta creada y preparada con la plantilla italiana. Ya puedes descargarla o imprimirla.</p>}
    {letterView === "history" && <section id="invitation-history-panel" role="tabpanel" className="border-t border-slate-200 pt-2"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-lg font-bold text-[#0B2B5E]">Cartas de invitación generadas</h3><p className="text-sm text-slate-600">Historial de cartas guardadas, ordenado como los registros de documentos y encomiendas.</p></div><label className="text-sm font-medium text-slate-700">Ordenar <select value={letterSort} onChange={event => { setLetterSort(event.target.value as "recent" | "old"); setLetterPage(1); }} className="ml-2 h-9 rounded-md border border-slate-300 bg-white px-2"><option value="recent">Recientes (descendentes)</option><option value="old">Antiguas (ascendentes)</option></select></label></div>
      {lettersQuery.isLoading ? <p className="mt-4 text-sm text-slate-500">Cargando cartas…</p> : visibleLetters.length === 0 ? <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600">Aún no hay cartas guardadas.</p> : <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Invitado</th><th className="px-4 py-3">Invitante</th><th className="px-4 py-3">Firma</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Creada</th><th className="px-4 py-3">Acciones</th></tr></thead><tbody>{visibleLetters.map((record: any) => <tr key={record.id} className="border-t border-slate-100"><td className="px-4 py-3 font-semibold text-slate-800">{record.inviteeName} {record.inviteeLastName}</td><td className="px-4 py-3 text-slate-600">{record.inviterName} {record.inviterLastName}</td><td className="px-4 py-3">{record.signature?.status === "signed" ? <span className="font-medium text-emerald-700">Firmada</span> : <span className="font-medium text-amber-700">Pendiente</span>}</td><td className="px-4 py-3 font-semibold text-[#0B2B5E]">EUR {getInvitationLetterTotal(getRecordPricing(record)).toFixed(2)}</td><td className="px-4 py-3 text-slate-600">{new Date(record.createdAt).toLocaleDateString()}</td><td className="sticky right-0 z-10 min-w-[23rem] bg-white px-4 py-3 shadow-[-8px_0_14px_rgba(15,23,42,0.08)]"><div className="flex min-w-[21rem] flex-wrap gap-2"><Button type="button" size="sm" variant="outline" onClick={() => restoreStoredLetter(record)}><Eye className="mr-1 h-4 w-4" />Abrir</Button><Button type="button" size="sm" variant="outline" aria-label={`Descargar carta de ${record.inviteeName} ${record.inviteeLastName}`} onClick={() => void downloadStoredLetter(record)}><Download className="h-4 w-4" /></Button><Button type="button" size="sm" variant="outline" aria-label={`Imprimir carta de ${record.inviteeName} ${record.inviteeLastName}`} onClick={() => printStoredLetter(record)}><Printer className="h-4 w-4" /></Button><Button type="button" size="sm" variant="outline" aria-label={`Descargar recibo de ${record.inviteeName} ${record.inviteeLastName}`} onClick={() => downloadStoredReceipt(record)}><ReceiptText className="h-4 w-4" /></Button><Button type="button" size="sm" variant="outline" aria-label={`Imprimir recibo de ${record.inviteeName} ${record.inviteeLastName}`} onClick={() => printStoredReceipt(record)}><Printer className="h-4 w-4" /></Button>{record.signature?.status !== "signed" && <><Button type="button" size="sm" variant="outline" aria-label="Firmar ahora" className="min-h-10 border-[#0B2B5E] bg-blue-50 font-bold text-[#0B2B5E] hover:bg-blue-100" disabled={prepareSignatureMutation.isPending} onClick={() => prepareSignatureMutation.mutate({ id: record.id })}><PenLine className="mr-1 h-4 w-4" />Firmar ahora</Button><Button type="button" size="sm" variant="outline" aria-label="Enviar" className="min-h-10 border-[#0B2B5E] bg-white font-bold text-[#0B2B5E] hover:bg-blue-50" disabled={sendSignatureMutation.isPending} onClick={() => sendSignatureMutation.mutate({ id: record.id })}><Send className="mr-1 h-4 w-4" />Enviar</Button></>}<Button type="button" size="sm" variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800" aria-label={`Enviar a papelera la carta de ${record.inviteeName} ${record.inviteeLastName}`} disabled={deleteLetterMutation.isPending} onClick={() => deleteLetterMutation.mutate({ id: record.id })}><Trash2 className="mr-1 h-4 w-4" />Eliminar</Button></div></td></tr>)}</tbody></table></div>}
      {totalLetterPages > 1 && <div className="mt-4 flex items-center justify-between text-sm"><Button type="button" size="sm" variant="outline" disabled={activeLetterPage === 1} onClick={() => setLetterPage(page => Math.max(1, page - 1))}>Anterior</Button><span>Página {activeLetterPage} de {totalLetterPages}</span><Button type="button" size="sm" variant="outline" disabled={activeLetterPage === totalLetterPages} onClick={() => setLetterPage(page => Math.min(totalLetterPages, page + 1))}>Siguiente</Button></div>}
      <section className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4"><button type="button" onClick={() => setShowDeletedLetters(visible => !visible)} aria-expanded={showDeletedLetters} className="flex w-full items-center justify-between text-left"><span><span className="flex items-center gap-2 text-base font-bold text-[#0B2B5E]"><Trash2 className="h-4 w-4" />Papelera de cartas</span><span className="mt-1 block text-sm font-normal text-slate-600">Las cartas eliminadas no se borran: puedes restaurarlas cuando lo necesites.</span></span><span className="text-sm font-medium text-[#0B2B5E]">{showDeletedLetters ? "Ocultar" : "Ver papelera"}</span></button>{showDeletedLetters && <div className="mt-4">{deletedLettersQuery.isLoading ? <p className="text-sm text-slate-500">Cargando papelera…</p> : (deletedLettersQuery.data || []).length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">La papelera está vacía.</p> : <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white"><table className="min-w-full text-left text-sm"><thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Invitado</th><th className="px-4 py-3">Eliminada</th><th className="px-4 py-3">Eliminó</th><th className="px-4 py-3">Acción</th></tr></thead><tbody>{(deletedLettersQuery.data || []).map((record: any) => <tr key={record.id} className="border-t border-slate-100"><td className="px-4 py-3 font-semibold text-slate-800">{record.inviteeName} {record.inviteeLastName}</td><td className="px-4 py-3 text-slate-600">{record.deletedAt ? new Date(record.deletedAt).toLocaleString() : "—"}</td><td className="px-4 py-3 text-slate-600">{record.deletedByAdminLabel || (record.deletedByAdminId ? `Administrador #${record.deletedByAdminId}` : "—")}</td><td className="px-4 py-3"><Button type="button" size="sm" variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800" disabled={restoreLetterMutation.isPending} onClick={() => restoreLetterMutation.mutate({ id: record.id })}><RotateCcw className="mr-1 h-4 w-4" />Restaurar</Button></td></tr>)}</tbody></table></div>}</div>}</section>
    </section>}
  </Card>;
}
