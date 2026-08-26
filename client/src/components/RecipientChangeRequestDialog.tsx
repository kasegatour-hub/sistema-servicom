import React, { useEffect, useState } from "react";
import { Copy, FileSignature, MailCheck, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type IdentityType = "dni_peru" | "pasaporte" | "carta_identita_italia";
const identityLabels: Record<IdentityType, string> = { dni_peru: "DNI peruano", pasaporte: "Pasaporte", carta_identita_italia: "Carta d’identità italiana" };

export function RecipientChangeRequestDialog({ shipment, onClose }: { shipment: any | null; onClose: () => void }) {
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dni, setDni] = useState("");
  const [documentType, setDocumentType] = useState<IdentityType>("dni_peru");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<any>(null);
  const mutation = trpc.admin.requestRecipientChange.useMutation();

  useEffect(() => {
    if (!shipment) return;
    setName(""); setLastName(""); setDni(""); setDocumentType("dni_peru"); setPhone(""); setResult(null);
  }, [shipment?.id]);

  const submit = async () => {
    if (!shipment) return;
    try {
      const response = await mutation.mutateAsync({ shipmentId: shipment.id, recipientName: name.trim(), recipientLastName: lastName.trim(), recipientDni: dni.trim(), recipientDocumentType: documentType, recipientPhone: phone.trim() });
      setResult(response);
      toast.success(response.accountNotified ? "Solicitud enviada a la cuenta Cliente." : "Enlace de firma generado para compartir con el remitente.");
    } catch (error: any) {
      toast.error(error?.message || "No se pudo crear la solicitud.");
    }
  };

  const copyLink = async () => {
    if (!result?.signatureUrl) return;
    try { await navigator.clipboard.writeText(result.signatureUrl); toast.success("Enlace de firma copiado."); } catch { toast.error("No se pudo copiar el enlace automáticamente."); }
  };

  return <Dialog open={Boolean(shipment)} onOpenChange={(open) => !open && onClose()}><DialogContent className="max-h-[92dvh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle className="flex items-center gap-2 text-[#0B2B5E]"><FileSignature className="h-5 w-5" />Solicitud firmada de cambio de destinatario</DialogTitle></DialogHeader>{shipment && <div className="space-y-4"><div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><strong>Destinatario protegido.</strong> La orden {shipment.orderNumber} no se modifica ahora: el cambio se aplicará únicamente cuando el remitente firme la declaración electrónica.</div><div className="grid gap-3 sm:grid-cols-2"><div className="sm:col-span-2"><Label>Nuevo nombre</Label><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre del nuevo destinatario" disabled={Boolean(result)} /></div><div><Label>Nuevo apellido</Label><Input value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Apellido" disabled={Boolean(result)} /></div><div><Label>Tipo de documento</Label><select value={documentType} onChange={(event) => setDocumentType(event.target.value as IdentityType)} disabled={Boolean(result)} className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">{Object.entries(identityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div><Label>Documento</Label><Input value={dni} onChange={(event) => setDni(event.target.value.toUpperCase())} placeholder={documentType === "dni_peru" ? "8 dígitos" : "Documento"} disabled={Boolean(result)} /></div><div><Label>Celular</Label><Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Ej. +51 999 999 999" disabled={Boolean(result)} /></div></div>{result ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><div className="flex items-start gap-2"><MailCheck className="mt-0.5 h-5 w-5" /><div><strong>Solicitud creada.</strong><p className="mt-1">{result.accountNotified ? "La cuenta Cliente recibió el aviso" : "El remitente no pudo validarse contra una cuenta Cliente; comparte el enlace manualmente"}. El enlace vence el {new Date(result.expiresAt).toLocaleString("es-PE")}.</p></div></div><div className="mt-3 flex flex-wrap gap-2"><Button type="button" size="sm" onClick={() => void copyLink()} className="bg-emerald-700 text-white hover:bg-emerald-800"><Copy className="mr-1 h-4 w-4" />Copiar enlace</Button><a className="inline-flex items-center rounded-md border border-emerald-700 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100" href={result.signatureUrl} target="_blank" rel="noreferrer">Abrir declaración</a></div></div> : <div className="flex flex-wrap justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" onClick={onClose}><X className="mr-1 h-4 w-4" />Cancelar</Button><Button type="button" disabled={mutation.isPending} onClick={() => void submit()} className="bg-[#0B2B5E] text-white hover:bg-[#123d78]"><Send className="mr-1 h-4 w-4" />{mutation.isPending ? "Generando…" : "Generar solicitud"}</Button></div>}</div>}</DialogContent></Dialog>;
}
