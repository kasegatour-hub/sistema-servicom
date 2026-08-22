import React, { useEffect, useRef, useState } from "react";
import { Eraser, PenLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/PhoneInput";
import { parseSignatureStrokes, serializeSignatureStrokes, signatureViewBox, type SignaturePoint, type SignatureStroke } from "../../../shared/signature";

type ElectronicSignatureDialogProps = {
  open: boolean;
  orderNumber: string;
  code: string;
  expiresAt?: string | Date;
  isSubmitting: boolean;
  errorMessage?: string;
  onClose: () => void;
  onSubmit: (input: { signerName: string; signerDni?: string; signerEmail?: string; signerPhone?: string; signatureStrokes: string }) => void;
};

function getCanvasPoint(event: React.PointerEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement): SignaturePoint {
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(signatureViewBox.width, ((event.clientX - rect.left) / rect.width) * signatureViewBox.width)),
    y: Math.max(0, Math.min(signatureViewBox.height, ((event.clientY - rect.top) / rect.height) * signatureViewBox.height)),
  };
}

export default function ElectronicSignatureDialog({
  open,
  orderNumber,
  code,
  expiresAt,
  isSubmitting,
  errorMessage,
  onClose,
  onSubmit,
}: ElectronicSignatureDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<SignatureStroke[]>([]);
  const [strokes, setStrokes] = useState<SignatureStroke[]>([]);
  const [activeStroke, setActiveStroke] = useState<SignatureStroke | null>(null);
  const [signerName, setSignerName] = useState("");
  const [signerDni, setSignerDni] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [signerPhone, setSignerPhone] = useState("");
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    strokesRef.current = strokes;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "#0B2B5E";
    context.lineWidth = 4;
    context.lineCap = "round";
    context.lineJoin = "round";
    for (const stroke of [...strokes, ...(activeStroke ? [activeStroke] : [])]) {
      if (stroke.length < 2) continue;
      context.beginPath();
      context.moveTo(stroke[0].x, stroke[0].y);
      for (const point of stroke.slice(1)) context.lineTo(point.x, point.y);
      context.stroke();
    }
  }, [strokes, activeStroke]);

  useEffect(() => {
    if (!open) return;
    setStrokes([]);
    strokesRef.current = [];
    setActiveStroke(null);
    setSignerName("");
    setSignerDni("");
    setSignerEmail("");
    setSignerPhone("");
    setAccepted(false);
  }, [open]);

  if (!open) return null;

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (isSubmitting) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setActiveStroke([getCanvasPoint(event, event.currentTarget)]);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!activeStroke || isSubmitting) return;
    setActiveStroke([...activeStroke, getCanvasPoint(event, event.currentTarget)]);
  };

  const finishStroke = () => {
    if (!activeStroke || activeStroke.length < 2) {
      setActiveStroke(null);
      return;
    }
    const nextStrokes = [...strokesRef.current, activeStroke];
    strokesRef.current = nextStrokes;
    setStrokes(nextStrokes);
    setActiveStroke(null);
  };

  const clearSignature = () => {
    strokesRef.current = [];
    setStrokes([]);
    setActiveStroke(null);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!signerName.trim() || !accepted || strokesRef.current.length === 0) return;
    const signatureStrokes = serializeSignatureStrokes(strokesRef.current);
    try {
      parseSignatureStrokes(signatureStrokes);
    } catch {
      return;
    }
    onSubmit({ signerName: signerName.trim(), signerDni: signerDni.trim() || undefined, signerEmail: signerEmail.trim() || undefined, signerPhone: signerPhone.trim() || undefined, signatureStrokes });
  };

  const expiryLabel = expiresAt ? new Date(expiresAt).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }) : "30 minutos";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="presentation">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl md:p-7" role="dialog" aria-modal="true" aria-labelledby="electronic-signature-title">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0B2B5E]">Firma remota</p>
            <h2 id="electronic-signature-title" className="mt-1 text-xl font-bold text-[#0B2B5E]">Firma electrónica del cliente</h2>
            <p className="mt-1 text-sm text-slate-600">Orden {orderNumber} · Código {code}</p>
          </div>
          <Button type="button" variant="outline" onClick={onClose} aria-label="Cerrar firma electrónica"><X className="h-4 w-4" /></Button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="signature-signer-name" className="mb-2 block text-sm font-semibold text-slate-700">Nombre completo del firmante</label>
              <Input id="signature-signer-name" value={signerName} onChange={event => setSignerName(event.target.value.replace(/[0-9]/g, ""))} placeholder="Escribe tus nombres y apellidos" autoComplete="name" required />
            </div>
            <div>
              <label htmlFor="signature-signer-dni" className="mb-2 block text-sm font-semibold text-slate-700">DNI o documento (opcional)</label>
              <Input id="signature-signer-dni" value={signerDni} onChange={event => setSignerDni(event.target.value.replace(/[^0-9A-Za-z-]/g, ""))} placeholder="Documento de identidad" autoComplete="off" />
            </div>
            <div>
              <label htmlFor="signature-signer-email" className="mb-2 block text-sm font-semibold text-slate-700">Correo del firmante (opcional)</label>
              <Input id="signature-signer-email" type="email" value={signerEmail} onChange={event => setSignerEmail(event.target.value)} placeholder="correo@ejemplo.com" autoComplete="email" />
            </div>
            <div>
              <label htmlFor="signature-signer-phone" className="mb-2 block text-sm font-semibold text-slate-700">Teléfono del firmante (opcional)</label>
              <PhoneInput id="signature-signer-phone" value={signerPhone} onChange={setSignerPhone} placeholder="970 188 447" />
            </div>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="signature-canvas" className="text-sm font-semibold text-slate-700">Dibuja tu firma con el dedo o el mouse</label>
              <Button type="button" variant="outline" size="sm" onClick={clearSignature} disabled={isSubmitting}><Eraser className="mr-2 h-4 w-4" /> Limpiar</Button>
            </div>
            <div className="overflow-hidden rounded-xl border-2 border-[#0B2B5E] bg-white shadow-inner">
              <canvas
                id="signature-canvas"
                ref={canvasRef}
                width={signatureViewBox.width}
                height={signatureViewBox.height}
                className="block h-44 w-full touch-none"
                style={{ cursor: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'%3E%3Cpath d='M5 23 19 9l3 3L8 26 4 27z' fill='%230B2B5E' stroke='white' stroke-width='1.5'/%3E%3C/svg%3E\") 4 24, crosshair" }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={finishStroke}
                onPointerCancel={finishStroke}
                onPointerLeave={finishStroke}
                aria-label="Área para dibujar la firma electrónica"
              />
            </div>
            <p className="mt-2 flex items-center gap-2 text-xs text-slate-500"><PenLine className="h-3.5 w-3.5 text-[#0B2B5E]" /> La firma se registra en azul y queda asociada únicamente a esta orden y código.</p>
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-slate-700">
            <input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} className="mt-1 h-4 w-4 accent-[#0B2B5E]" />
            <span>Confirmo que soy la persona que firma este envío y autorizo incorporar la firma al recibo de la orden indicada. Se conservarán la versión del consentimiento, la fecha, el token de sesión y una huella criptográfica de la evidencia para su verificación posterior.</span>
          </label>

          {errorMessage && <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">{errorMessage}</p>}
          <p className="text-xs text-slate-500">La sesión de firma estará disponible hasta las {expiryLabel}. Si expira, puedes solicitar una nueva sesión.</p>

          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting || !signerName.trim() || !accepted || strokesRef.current.length === 0} className="bg-[#0B2B5E] text-white hover:bg-[#123d78]">
              <PenLine className="mr-2 h-4 w-4" /> {isSubmitting ? "Guardando firma…" : "Firmar electrónicamente"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
