import React, { useMemo, useState } from "react";
import { Building2, CalendarDays, Filter, MessageSquare, Search, UserRound } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function roleLabel(role?: string | null) {
  if (role === "superadmin") return "Master Admin";
  if (role === "registrador") return "Usuario registrador";
  if (role === "admin") return "Administrador";
  return "Cliente";
}

function AttachmentPreview({ item }: { item: any }) {
  if (!item.attachmentUrl) return null;
  if (item.attachmentMimeType?.startsWith("image/")) {
    return <img src={item.attachmentUrl} alt={`Evidencia de ${item.authorLabel}`} className="mt-3 max-h-56 max-w-full rounded-xl border border-slate-200 object-contain" />;
  }
  if (item.attachmentMimeType?.startsWith("audio/")) {
    return <audio className="mt-3 w-full" controls src={item.attachmentUrl}>Tu navegador no puede reproducir este audio.</audio>;
  }
  if (item.attachmentMimeType?.startsWith("video/")) {
    return <video className="mt-3 max-h-64 w-full rounded-xl border border-slate-200" controls src={item.attachmentUrl}>Tu navegador no puede reproducir este video.</video>;
  }
  return <a className="mt-3 inline-flex break-all text-sm font-bold text-[#0B2B5E] underline" href={item.attachmentUrl} target="_blank" rel="noreferrer">Abrir evidencia: {item.attachmentName || "archivo adjunto"}</a>;
}

export function AdminFeedbackInbox() {
  const [search, setSearch] = useState("");
  const [authorType, setAuthorType] = useState<"all" | "account" | "admin">("all");
  const queryInput = useMemo(() => ({
    search: search.trim() || undefined,
    authorType: authorType === "all" ? undefined : authorType,
    limit: 300,
  }), [authorType, search]);
  const feedback = trpc.feedback.listAdmin.useQuery(queryInput, { staleTime: 15_000 });
  const items = feedback.data || [];
  const authorCount = new Set(items.map(item => `${item.authorType}:${item.authorId}`)).size;
  const workspaceCount = new Set(items.map(item => item.workspaceKey)).size;

  return <Card className="mb-8 border-0 p-5 shadow-lg sm:p-6" aria-label="Bandeja administrativa de feedback">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[#0B2B5E]"><MessageSquare className="h-6 w-6 shrink-0 text-[#F28C00]" /><h2 className="text-xl font-extrabold sm:text-2xl">Feedback recibido</h2></div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Consulta las observaciones de Clientes, Usuarios y Administradores separadas por autor y entorno. Esta vista solo muestra el espacio administrativo de la sesión actual.</p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-center sm:min-w-64">
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2"><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Observaciones</p><strong className="text-xl text-[#0B2B5E]">{items.length}</strong></div>
        <div className="rounded-xl border border-orange-100 bg-orange-50 px-3 py-2"><p className="text-xs font-semibold uppercase tracking-wide text-orange-700">Autores</p><strong className="text-xl text-[#0B2B5E]">{authorCount}</strong></div>
      </div>
    </div>

    <div className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[minmax(0,1fr)_220px]">
      <div className="relative min-w-0"><Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#0B2B5E]" aria-hidden="true" /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por persona, correo o comentario" aria-label="Buscar feedback" className="min-h-12 pl-11 text-base" /></div>
      <div className="relative min-w-0"><Filter className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" /><Select value={authorType} onValueChange={value => setAuthorType(value as typeof authorType)}><SelectTrigger className="min-h-12 pl-9" aria-label="Filtrar feedback por autor"><SelectValue placeholder="Todos los autores" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los autores</SelectItem><SelectItem value="account">Solo Clientes</SelectItem><SelectItem value="admin">Solo equipo operativo</SelectItem></SelectContent></Select></div>
    </div>

    {feedback.isLoading && <p role="status" className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold text-blue-800">Cargando observaciones…</p>}
    {feedback.error && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">No se pudo cargar el feedback. Intenta nuevamente.</p>}
    {!feedback.isLoading && !feedback.error && items.length === 0 && <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><MessageSquare className="mx-auto h-8 w-8 text-slate-400" /><p className="mt-3 font-bold text-slate-700">No hay observaciones con estos filtros.</p><p className="mt-1 text-sm text-slate-500">Cuando un Cliente o integrante del equipo envíe un comentario, aparecerá aquí con su autor y entorno.</p></div>}

    {items.length > 0 && <div className="mt-5 space-y-3">
      {items.map(item => <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><UserRound className="h-4 w-4 shrink-0 text-[#0B2B5E]" /><strong className="break-words text-sm text-[#0B2B5E]">{item.authorLabel}</strong><span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-800">{roleLabel(item.authorRole)}</span></div>{item.authorEmail && <p className="mt-1 break-all text-xs text-slate-500">{item.authorEmail} · ID {item.authorId}</p>}</div>
          <time className="flex shrink-0 items-center gap-1 text-xs text-slate-500"><CalendarDays className="h-3.5 w-3.5" />{new Date(item.createdAt).toLocaleString("es-PE")}</time>
        </div>
        <div className="p-4"><div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-600"><span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-orange-800"><Building2 className="h-3.5 w-3.5" />{item.workspaceLabel}</span><span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">Clave: {item.workspaceKey}</span><span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">Observación #{item.id}</span><span className={`rounded-full border px-2.5 py-1 ${item.source === "shipment" ? "border-blue-200 bg-blue-50 text-blue-800" : "border-slate-200 bg-slate-50 text-slate-700"}`}>{item.source === "shipment" ? "Comentario de envío" : "Comentario general"}</span></div>{item.source === "shipment" && <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-3 text-sm text-[#0B2B5E]"><strong>Envío relacionado:</strong> {item.shipmentType === "documento" ? "Documento" : "Encomienda"} · orden {item.orderNumber || "no disponible"} · código {item.code || "no disponible"}</div>}<p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{item.message}</p><AttachmentPreview item={item} /></div>
      </article>)}
    </div>}
    <p className="mt-4 text-xs text-slate-500">Entornos visibles en esta consulta: {workspaceCount}. La información de autor y fecha se conserva para trazabilidad.</p>
  </Card>;
}
