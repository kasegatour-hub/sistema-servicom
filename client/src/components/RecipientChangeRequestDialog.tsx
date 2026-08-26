import React, { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, FileSignature, MailCheck, Send, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type IdentityType = "dni_peru" | "pasaporte" | "carta_identita_italia";
type DeliveryMode = "automatic" | "manual";

type RecipientChangeResult = {
  requestId: number;
  signatureUrl: string;
  expiresAt: string | Date;
  accountNotified: boolean;
  emailSent: boolean;
  requiresManualDelivery: boolean;
  deliveryMode: DeliveryMode;
  accountMatched: boolean;
};

const identityLabels: Record<IdentityType, string> = {
  dni_peru: "DNI peruano",
  pasaporte: "Pasaporte",
  carta_identita_italia: "Carta d’identità italiana",
};

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("No se pudo copiar el enlace.");
}

export function RecipientChangeRequestDialog({ shipment, onClose }: { shipment: any | null; onClose: () => void }) {
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dni, setDni] = useState("");
  const [documentType, setDocumentType] = useState<IdentityType>("dni_peru");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<RecipientChangeResult | null>(null);
  const [copied, setCopied] = useState(false);
  const mutation = trpc.admin.requestRecipientChange.useMutation();

  useEffect(() => {
    if (!shipment) return;
    setName("");
    setLastName("");
    setDni("");
    setDocumentType("dni_peru");
    setPhone("");
    setResult(null);
    setCopied(false);
  }, [shipment?.id]);

  const submit = async () => {
    if (!shipment) return;
    try {
      const response = await mutation.mutateAsync({
        shipmentId: shipment.id,
        recipientName: name.trim(),
        recipientLastName: lastName.trim(),
        recipientDni: dni.trim(),
        recipientDocumentType: documentType,
        recipientPhone: phone.trim(),
      });
      setResult(response);
      toast.success(response.deliveryMode === "automatic" ? "Solicitud enviada a la cuenta Cliente." : "Enlace generado. Debes compartirlo manualmente con el remitente.");
    } catch (error: any) {
      toast.error(error?.message || "No se pudo crear la solicitud.");
    }
  };

  const handleCopy = async () => {
    if (!result?.signatureUrl) return;
    try {
      await copyText(result.signatureUrl);
      setCopied(true);
      toast.success("Enlace de firma copiado.");
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      toast.error("No se pudo copiar automáticamente. Selecciona y copia el enlace.");
    }
  };

  const handleShare = async () => {
    if (!result?.signatureUrl || !navigator.share) return;
    try {
      await navigator.share({ title: "Firma requerida: cambio de destinatario", text: "Abre este enlace para revisar y firmar la declaración.", url: result.signatureUrl });
    } catch {
      // Cancelar el selector nativo no es un error de la solicitud.
    }
  };

  const manual = result?.deliveryMode === "manual";

  return (
    <Dialog open={Boolean(shipment)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92dvh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#0B2B5E]"><FileSignature className="h-5 w-5" />Solicitud firmada de cambio de destinatario</DialogTitle>
        </DialogHeader>
        {shipment && (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <strong>Destinatario protegido.</strong> La orden {shipment.orderNumber} no se modifica ahora: el cambio se aplicará únicamente después de una firma electrónica válida.
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label>Nuevo nombre</Label><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre del nuevo destinatario" disabled={Boolean(result)} /></div>
              <div><Label>Nuevo apellido</Label><Input value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Apellido" disabled={Boolean(result)} /></div>
              <div><Label>Tipo de documento</Label><select value={documentType} onChange={(event) => setDocumentType(event.target.value as IdentityType)} disabled={Boolean(result)} className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">{Object.entries(identityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
              <div><Label>Documento</Label><Input value={dni} onChange={(event) => setDni(event.target.value.toUpperCase())} placeholder={documentType === "dni_peru" ? "8 dígitos" : "Documento"} disabled={Boolean(result)} /></div>
              <div><Label>Celular</Label><Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Ej. +51 999 999 999" disabled={Boolean(result)} /></div>
            </div>

            {result ? (
              <div className={`rounded-xl border p-4 text-sm ${manual ? "border-orange-300 bg-orange-50 text-orange-950" : "border-emerald-200 bg-emerald-50 text-emerald-950"}`}>
                <div className="flex items-start gap-2">
                  {manual ? <Share2 className="mt-0.5 h-5 w-5 shrink-0" /> : <MailCheck className="mt-0.5 h-5 w-5 shrink-0" />}
                  <div className="min-w-0">
                    <strong>{manual ? "Entrega manual requerida" : "Solicitud enviada automáticamente"}</strong>
                    <p className="mt-1">
                      {manual
                        ? "No se encontró una cuenta Cliente que coincida con los datos del remitente. Copia este enlace y envíalo por el canal acordado; no se ha enviado ninguna notificación automática."
                        : "La cuenta Cliente coincide con el remitente y recibió una notificación. También se intentó enviar el enlace por correo cuando estaba disponible."}
                    </p>
                    <p className="mt-1 text-xs opacity-80">El enlace vence el {new Date(result.expiresAt).toLocaleString("es-PE")}.</p>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-slate-300 bg-white p-3">
                  <Label htmlFor="recipient-change-signature-url" className="text-xs font-bold uppercase tracking-wide text-slate-600">Enlace seguro de firma</Label>
                  <Input id="recipient-change-signature-url" readOnly value={result.signatureUrl} className="mt-2 bg-slate-50 text-xs" onFocus={(event) => event.currentTarget.select()} />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" size="sm" onClick={() => void handleCopy()} className={manual ? "bg-orange-600 text-white hover:bg-orange-700" : "bg-emerald-700 text-white hover:bg-emerald-800"}>
                      {copied ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}{copied ? "Copiado" : "Copiar enlace"}
                    </Button>
                    {typeof navigator !== "undefined" && "share" in navigator && <Button type="button" size="sm" variant="outline" onClick={() => void handleShare()}><Share2 className="mr-1 h-4 w-4" />Compartir</Button>}
                    <a className="inline-flex items-center rounded-md border border-slate-400 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" href={result.signatureUrl} target="_blank" rel="noreferrer"><ExternalLink className="mr-1 h-4 w-4" />Abrir declaración</a>
                  </div>
                </div>

                {manual && <p className="mt-3 text-xs font-medium text-orange-900">Al firmar, el remitente no necesita iniciar sesión. El token del enlace es de un solo uso, vence en siete días y el destinatario seguirá protegido hasta completar la firma.</p>}
              </div>
            ) : (
              <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={onClose}><X className="mr-1 h-4 w-4" />Cancelar</Button>
                <Button type="button" disabled={mutation.isPending} onClick={() => void submit()} className="bg-[#0B2B5E] text-white hover:bg-[#123d78]"><Send className="mr-1 h-4 w-4" />{mutation.isPending ? "Generando…" : "Generar solicitud"}</Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
