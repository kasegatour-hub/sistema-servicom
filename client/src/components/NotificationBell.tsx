import React, { useState } from "react";
import { Bell, Check, CheckCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

function formatNotificationDate(value: Date | string | null | undefined) {
  if (!value) return "Ahora";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" }) : "Ahora";
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const notificationsQuery = trpc.notifications.list.useQuery(undefined, { refetchInterval: 30_000, retry: false });
  const markReadMutation = trpc.notifications.markRead.useMutation({ onSuccess: () => { void notificationsQuery.refetch(); } });
  const markAllReadMutation = trpc.notifications.markAllRead.useMutation({ onSuccess: () => { void notificationsQuery.refetch(); } });
  const items = notificationsQuery.data?.items || [];
  const unreadCount = notificationsQuery.data?.unreadCount || 0;

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        aria-label={`Notificaciones${unreadCount ? `, ${unreadCount} sin leer` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
        className="relative min-h-12 min-w-12 rounded-xl border-white/70 bg-white/10 px-3 text-white hover:bg-white/20"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 && <span aria-label={`${unreadCount} notificaciones sin leer`} className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-black text-white ring-2 ring-[#0B2B5E]">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </Button>
      {open && <div role="dialog" aria-label="Notificaciones" className="absolute right-0 z-50 mt-2 w-[min(92vw,24rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div><h2 className="text-base font-extrabold text-[#0B2B5E]">Notificaciones</h2><p className="text-xs text-slate-500">Avisos de actividad de tu cuenta</p></div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && <Button type="button" variant="ghost" size="sm" aria-label="Marcar todas como leídas" onClick={() => markAllReadMutation.mutate()} disabled={markAllReadMutation.isPending} className="h-9 px-2 text-xs text-[#0B2B5E]"><CheckCheck className="mr-1 h-4 w-4" />Leer todo</Button>}
            <Button type="button" variant="ghost" size="icon" aria-label="Cerrar notificaciones" onClick={() => setOpen(false)} className="h-9 w-9 text-slate-500"><X className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="max-h-[min(65vh,28rem)] overflow-y-auto p-2">
          {notificationsQuery.isLoading ? <p className="px-3 py-6 text-center text-sm text-slate-500">Cargando avisos…</p> : items.length === 0 ? <div className="px-3 py-8 text-center"><Bell className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-2 text-sm font-semibold text-slate-600">No tienes notificaciones nuevas.</p><p className="mt-1 text-xs text-slate-500">Aquí verás las creaciones y modificaciones relevantes.</p></div> : items.map(item => <button key={item.id} type="button" onClick={() => { if (!item.isRead) markReadMutation.mutate({ id: item.id }); }} className={`w-full rounded-xl p-3 text-left transition hover:bg-blue-50 ${item.isRead ? "bg-white" : "bg-blue-50/70"}`}><div className="flex items-start gap-3"><span className={`mt-0.5 rounded-full p-1.5 ${item.isRead ? "bg-slate-100 text-slate-500" : "bg-[#0B2B5E] text-white"}`}>{item.isRead ? <Check className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}</span><span className="min-w-0 flex-1"><span className="block text-sm font-bold text-[#0B2B5E]">{item.title}</span><span className="mt-1 block text-xs leading-5 text-slate-600">{item.message}</span><span className="mt-1 block text-[11px] text-slate-400">{formatNotificationDate(item.createdAt)}</span></span></div></button>)}
        </div>
      </div>}
    </div>
  );
}
