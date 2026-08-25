import React, { useEffect, useRef, useState } from "react";
import { Bell, Check, CheckCheck, Volume2, VolumeX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { getNotificationSoundPreference, playAscendingNotificationChime, prepareNotificationChime, setNotificationSoundPreference } from "@/lib/notificationChime";

function formatNotificationDate(value: Date | string | null | undefined) {
  if (!value) return "Ahora";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" }) : "Ahora";
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(getNotificationSoundPreference);
  const knownNotificationIds = useRef(new Set<number>());
  const hasLoadedNotifications = useRef(false);
  const notificationsQuery = trpc.notifications.list.useQuery(undefined, { refetchInterval: 30_000, retry: false });
  const markReadMutation = trpc.notifications.markRead.useMutation({ onSuccess: () => { void notificationsQuery.refetch(); } });
  const markAllReadMutation = trpc.notifications.markAllRead.useMutation({ onSuccess: () => { void notificationsQuery.refetch(); } });
  const items = notificationsQuery.data?.items || [];
  const unreadCount = notificationsQuery.data?.unreadCount || 0;

  useEffect(() => {
    if (!notificationsQuery.data) return;
    const currentIds = new Set(items.map(item => item.id));
    if (!hasLoadedNotifications.current) {
      knownNotificationIds.current = currentIds;
      hasLoadedNotifications.current = true;
      return;
    }
    const newUnreadItems = items.filter(item => !item.isRead && !knownNotificationIds.current.has(item.id));
    knownNotificationIds.current = currentIds;
    if (soundEnabled && newUnreadItems.length > 0) playAscendingNotificationChime();
  }, [items, notificationsQuery.data, soundEnabled]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setNotificationSoundPreference(next);
    if (next) playAscendingNotificationChime();
  };

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        aria-label={`Notificaciones${unreadCount ? `, ${unreadCount} sin leer` : ""}`}
        aria-expanded={open}
        onClick={() => { prepareNotificationChime(); setOpen(value => !value); }}
        className="relative min-h-12 min-w-12 rounded-xl border-white/70 bg-white/10 px-3 text-white hover:bg-white/20"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 && <span aria-label={`${unreadCount} notificaciones sin leer`} className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-black text-white ring-2 ring-[#0B2B5E]">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </Button>
      {open && <div role="dialog" aria-label="Notificaciones" className="absolute right-0 z-50 mt-2 w-[min(92vw,24rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl">
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0"><h2 className="text-base font-extrabold text-[#0B2B5E]">Notificaciones</h2><p className="text-xs text-slate-500">Avisos de actividad de tu cuenta</p></div>
            <Button type="button" variant="outline" size="icon" aria-label="Cerrar notificaciones" onClick={() => setOpen(false)} className="h-10 w-10 shrink-0 border-rose-400 bg-rose-50 text-rose-700 shadow-sm hover:bg-rose-100 hover:text-rose-800"><X className="h-5 w-5 stroke-[3]" /></Button>
          </div>
          <div className={`mt-3 grid gap-2 border-t border-slate-100 pt-3 ${unreadCount > 0 ? "grid-cols-2" : "grid-cols-1"} sm:flex sm:justify-end`}>
            <Button type="button" variant="ghost" size="sm" aria-label={soundEnabled ? "Desactivar sonido de notificaciones" : "Activar sonido de notificaciones"} aria-pressed={soundEnabled} onClick={toggleSound} className="h-10 min-w-0 justify-center px-2 text-xs font-semibold text-[#0B2B5E] sm:px-3" title={soundEnabled ? "Sonido activado" : "Sonido desactivado"}>{soundEnabled ? <Volume2 className="mr-1.5 h-4 w-4 shrink-0" /> : <VolumeX className="mr-1.5 h-4 w-4 shrink-0" />}<span>Sonido</span></Button>
            {unreadCount > 0 && <Button type="button" variant="ghost" size="sm" aria-label="Marcar todas como leídas" onClick={() => markAllReadMutation.mutate()} disabled={markAllReadMutation.isPending} className="h-10 min-w-0 justify-center px-2 text-xs font-semibold text-[#0B2B5E] sm:px-3"><CheckCheck className="mr-1.5 h-4 w-4 shrink-0" /><span>Marcar leídas</span></Button>}
          </div>
        </div>
        <div className="max-h-[min(65vh,28rem)] overflow-y-auto p-2">
          {notificationsQuery.isLoading ? <p className="px-3 py-6 text-center text-sm text-slate-500">Cargando avisos…</p> : items.length === 0 ? <div className="px-3 py-8 text-center"><Bell className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-2 text-sm font-semibold text-slate-600">No tienes notificaciones nuevas.</p><p className="mt-1 text-xs text-slate-500">Aquí verás las creaciones y modificaciones relevantes.</p></div> : items.map(item => <button key={item.id} type="button" aria-label={`${item.title}, ${item.isRead ? "leída" : "nueva"}`} onClick={() => { if (!item.isRead) markReadMutation.mutate({ id: item.id }); }} className={`w-full rounded-xl border p-3 text-left shadow-sm transition hover:shadow-md ${item.isRead ? "border-slate-300 bg-slate-100 hover:bg-slate-200" : "border-blue-200 bg-blue-50/90 hover:bg-blue-100"}`}><div className="flex items-start gap-3"><span className={`mt-0.5 rounded-full border p-1.5 ${item.isRead ? "border-slate-400 bg-white text-slate-700" : "border-[#0B2B5E] bg-[#0B2B5E] text-white"}`}>{item.isRead ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : <Bell className="h-3.5 w-3.5" />}</span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className={`block text-sm font-bold ${item.isRead ? "text-slate-800" : "text-[#0B2B5E]"}`}>{item.title}</span><span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${item.isRead ? "border-slate-400 bg-white text-slate-700" : "border-blue-300 bg-white text-[#0B2B5E]"}`}>{item.isRead ? "Leída" : "Nueva"}</span></span><span className={`mt-1 block whitespace-pre-line text-xs leading-5 ${item.isRead ? "text-slate-700" : "text-slate-700"}`}>{item.message}</span><span className={`mt-1 block text-[11px] font-medium ${item.isRead ? "text-slate-500" : "text-slate-500"}`}>{formatNotificationDate(item.createdAt)}</span></span></div></button>)}
        </div>
      </div>}
    </div>
  );
}
