import React, { useState } from "react";
import { CheckCircle2, FileSignature, Loader2, ShieldCheck } from "lucide-react";
import ElectronicSignatureDialog from "@/components/ElectronicSignatureDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

function getSignatureQuery() {
  const params = new URLSearchParams(window.location.search);
  return { letterId: Number(params.get("letter")), token: params.get("token")?.trim() || "" };
}

export default function InvitationLetterSignaturePage() {
  const query = getSignatureQuery();
  const enabled = Number.isInteger(query.letterId) && query.letterId > 0 && query.token.length >= 20;
  const letterQuery = trpc.invitationSignature.get.useQuery(query, { enabled });
  const completeMutation = trpc.invitationSignature.complete.useMutation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState("");
  const letter = letterQuery.data;

  const sign = async (input: { signatureStrokes: string }) => {
    setError("");
    try {
      await completeMutation.mutateAsync({ ...query, signatureStrokes: input.signatureStrokes });
      setDialogOpen(false);
      await letterQuery.refetch();
    } catch (issue: any) {
      setError(issue?.message || "No se pudo registrar la firma.");
    }
  };

  if (!enabled) return <main className="min-h-screen bg-slate-50 p-6"><Card className="mx-auto max-w-xl p-6 text-center"><h1 className="text-xl font-bold text-[#0B2B5E]">Enlace de firma no válido</h1><p className="mt-2 text-slate-600">Solicita a Servicom Internacional un nuevo enlace de firma.</p></Card></main>;
  if (letterQuery.isLoading) return <main className="min-h-screen bg-slate-50 p-6"><Card className="mx-auto flex max-w-xl items-center justify-center gap-3 p-8 text-[#0B2B5E]"><Loader2 className="h-5 w-5 animate-spin" />Preparando la Carta…</Card></main>;
  if (!letter) return <main className="min-h-screen bg-slate-50 p-6"><Card className="mx-auto max-w-xl p-6 text-center"><h1 className="text-xl font-bold text-rose-700">No se pudo abrir la Carta</h1><p className="mt-2 text-slate-600">El enlace pudo haber vencido. Solicita uno nuevo al equipo de Servicom Internacional.</p></Card></main>;
  const signed = letter.status === "signed";

  return <main className="min-h-screen bg-slate-50 p-4 sm:p-8"><Card className="mx-auto max-w-2xl overflow-hidden border-0 shadow-xl"><header className="bg-[#0B2B5E] px-6 py-5 text-white"><p className="text-sm font-semibold text-orange-300">SERVICOM INTERNACIONAL</p><h1 className="mt-1 text-2xl font-bold">Firma de Carta de invitación</h1><p className="mt-1 text-sm text-blue-100">Revisa el estado y firma con tu dedo o mouse.</p></header><div className="space-y-5 p-6"><section className={`rounded-xl border p-4 ${signed ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}><div className="flex gap-3"><div className={`mt-0.5 rounded-full p-2 ${signed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{signed ? <CheckCircle2 className="h-5 w-5" /> : <FileSignature className="h-5 w-5" />}</div><div><h2 className="font-bold text-slate-900">{signed ? "Después: Carta firmada" : "Antes: Carta pendiente de firma"}</h2><p className="mt-1 text-sm text-slate-700">Invitante: <strong>{letter.inviterName}</strong><br />Invitado: <strong>{letter.inviteeName}</strong></p>{signed && <p className="mt-2 text-sm text-emerald-800">Firma registrada el {letter.signedAt ? new Date(letter.signedAt).toLocaleString("es-PE") : "momento indicado"}.</p>}</div></div></section><section className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#0B2B5E]" /><p className="text-sm text-slate-600">Al firmar, confirmas que revisaste la Carta de invitación. El trazo, el consentimiento y la fecha quedan asociados a esta solicitud.</p></div></section>{error && <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}{!signed && <Button type="button" className="w-full bg-[#0B2B5E] text-white hover:bg-[#123d78]" onClick={() => setDialogOpen(true)} disabled={completeMutation.isPending}><FileSignature className="mr-2 h-4 w-4" />Firmar ahora</Button>}</div></Card><ElectronicSignatureDialog open={dialogOpen} orderNumber={`Carta ${letter.id}`} code="INVITACIÓN" isSubmitting={completeMutation.isPending} errorMessage={error} onClose={() => { setDialogOpen(false); setError(""); }} onSubmit={(input) => void sign(input)} /></main>;
}
