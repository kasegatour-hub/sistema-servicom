import { RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PWA_UPDATE_EVENT } from "@/lib/pwaUpdate";

export default function PwaUpdateBanner() {
  const [visible, setVisible] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const show = () => setVisible(true);
    window.addEventListener(PWA_UPDATE_EVENT, show);
    return () => window.removeEventListener(PWA_UPDATE_EVENT, show);
  }, []);

  const update = async () => {
    setUpdating(true);
    const registration = await navigator.serviceWorker?.getRegistration();
    if (!registration?.waiting) {
      await registration?.update().catch(() => undefined);
    }
    const waiting = registration?.waiting;
    if (!waiting) {
      setUpdating(false);
      return;
    }
    const reload = () => window.location.reload();
    navigator.serviceWorker.addEventListener("controllerchange", reload, { once: true });
    waiting.postMessage({ type: "SKIP_WAITING" });
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-4 z-[100] mx-auto max-w-lg rounded-2xl border border-blue-200 bg-white p-4 text-slate-900 shadow-2xl shadow-blue-950/20 sm:inset-x-auto sm:right-6 sm:left-auto">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-blue-100 p-2 text-blue-700" aria-hidden="true">
          <RefreshCw className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Hay una nueva versión disponible</p>
          <p className="mt-1 text-sm text-slate-600">Actualiza para recibir las últimas mejoras. Tu sesión y el rastreo actual se conservarán.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" onClick={update} disabled={updating} className="bg-blue-700 text-white hover:bg-blue-800">
              {updating ? "Actualizando…" : "Actualizar aplicación"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setVisible(false)} disabled={updating}>
              Ahora no
            </Button>
          </div>
        </div>
        <button type="button" aria-label="Cerrar aviso de nueva versión" onClick={() => setVisible(false)} disabled={updating} className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
