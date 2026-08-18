import React, { useState } from "react";
import { FileAudio, FileImage, FileVideo, MessageSquare, Paperclip, Send, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const CLIENT_LIMITS = { image: 5 * 1024 * 1024, audio: 15 * 1024 * 1024, video: 15 * 1024 * 1024 } as const;
const ACCEPTED_MEDIA = "image/jpeg,image/png,image/webp,audio/mpeg,audio/mp4,audio/ogg,audio/wav,audio/webm,video/mp4,video/webm,video/quicktime";

type GeneralFeedbackDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function iconForMedia(mimeType?: string | null) {
  if (mimeType?.startsWith("image/")) return <FileImage className="h-4 w-4 text-sky-700" />;
  if (mimeType?.startsWith("audio/")) return <FileAudio className="h-4 w-4 text-violet-700" />;
  return <FileVideo className="h-4 w-4 text-rose-700" />;
}

function previewAttachment(feedback: any) {
  if (!feedback.attachmentUrl) return null;
  if (feedback.attachmentMimeType?.startsWith("image/")) return <img src={feedback.attachmentUrl} alt={`Adjunto: ${feedback.attachmentName || "imagen"}`} className="mt-2 max-h-48 rounded-lg border border-slate-200 object-contain" />;
  if (feedback.attachmentMimeType?.startsWith("audio/")) return <audio className="mt-2 w-full" controls src={feedback.attachmentUrl}>Tu navegador no puede reproducir este audio.</audio>;
  if (feedback.attachmentMimeType?.startsWith("video/")) return <video className="mt-2 max-h-56 w-full rounded-lg border border-slate-200" controls src={feedback.attachmentUrl}>Tu navegador no puede reproducir este video.</video>;
  return <a className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#0B2B5E] underline" href={feedback.attachmentUrl} target="_blank" rel="noreferrer">{iconForMedia(feedback.attachmentMimeType)} Abrir adjunto</a>;
}

export function GeneralFeedbackDialog({ open, onOpenChange }: GeneralFeedbackDialogProps) {
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const feedback = trpc.feedback.list.useQuery(undefined, { enabled: open });
  const createFeedback = trpc.feedback.create.useMutation({
    onSuccess: async () => {
      setMessage("");
      setFile(null);
      await feedback.refetch();
      toast.success("Retroalimentación enviada correctamente.");
    },
    onError: error => toast.error(error.message),
  });

  const onFileChange = (selected?: File | null) => {
    if (!selected) return setFile(null);
    const category = selected.type.split("/")[0] as keyof typeof CLIENT_LIMITS;
    if (!CLIENT_LIMITS[category] || selected.size > CLIENT_LIMITS[category]) {
      toast.error("La imagen permite hasta 5 MB; el audio o video, hasta 15 MB.");
      return;
    }
    setFile(selected);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!message.trim()) return;
    let attachment: { name: string; mimeType: string; dataBase64: string } | undefined;
    if (file) {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("No se pudo leer el archivo adjunto."));
        reader.readAsDataURL(file);
      });
      attachment = { name: file.name, mimeType: file.type, dataBase64: dataUrl.split(",", 2)[1] || "" };
    }
    createFeedback.mutate({ message: message.trim(), attachment });
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-[#0B2B5E]"><MessageSquare className="h-5 w-5" /> Enviar comentarios</DialogTitle>
        <DialogDescription>Comparte una sugerencia, consulta o incidencia sobre la plataforma. Puedes adjuntar evidencia multimedia si es necesario.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3" aria-label="Historial de comentarios">
        {feedback.isLoading ? <p className="text-sm text-slate-500">Cargando comentarios…</p> : feedback.data?.length ? feedback.data.map((item: any) => <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-[#0B2B5E]">{item.authorLabel}</strong><time className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</time></div><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{item.message}</p>{previewAttachment(item)}</article>) : <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">Aún no hay comentarios en este canal.</p>}
      </div>
      <form onSubmit={submit} className="space-y-3 border-t pt-4">
        <label className="block text-sm font-semibold text-slate-700">Escribe tu comentario</label>
        <Textarea value={message} onChange={event => setMessage(event.target.value)} maxLength={2000} required placeholder="Describe una sugerencia, consulta o incidencia de la plataforma…" rows={4} />
        <div className="flex flex-wrap items-center gap-3"><label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><Paperclip className="h-4 w-4" /> Adjuntar imagen, audio o video<input aria-label="Adjuntar evidencia multimedia" type="file" accept={ACCEPTED_MEDIA} className="sr-only" onChange={event => onFileChange(event.target.files?.[0])} /></label><span className="text-xs text-slate-500">Imagen: hasta 5 MB. Audio o video: hasta 15 MB.</span>{file && <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-800">{iconForMedia(file.type)} {file.name}<button type="button" aria-label="Quitar adjunto" onClick={() => setFile(null)}><X className="h-3.5 w-3.5" /></button></span>}</div>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button><Button type="submit" disabled={createFeedback.isPending} className="bg-[#0B2B5E] text-white">{createFeedback.isPending ? "Enviando…" : <><Send className="mr-2 h-4 w-4" /> Enviar comentario</>}</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}
