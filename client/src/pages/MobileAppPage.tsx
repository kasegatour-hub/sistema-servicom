import React, { useEffect, useMemo, useState } from "react";
import { Download, House, MapPin, PackageSearch, QrCode, ScanLine, ShieldCheck, UserRound } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { QRScanner } from "@/components/QRScanner";
import { getPaymentStatusUi } from "@/lib/paymentStatus";
import { getRoutePresentation } from "@/lib/routeDetails";
import { trpc } from "@/lib/trpc";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
const INSTALL_NOTICE_KEY = "servicom-mobile-install-offered-v1";
const pressClass = "transition duration-150 active:scale-[0.97] active:opacity-90 motion-reduce:transition-none";

function parseTrackingValue(rawValue: string) {
  try {
    const url = new URL(rawValue, window.location.origin);
    return { orderNumber: url.searchParams.get("order")?.trim() || "", code: url.searchParams.get("code")?.trim().toUpperCase() || "" };
  } catch { return { orderNumber: "", code: "" }; }
}

export default function MobileAppPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [code, setCode] = useState("");
  const [tracking, setTracking] = useState<{ orderNumber: string; code: string } | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [message, setMessage] = useState("");
  const shipmentQuery = trpc.shipment.search.useQuery(tracking || { orderNumber: "", code: "" }, { enabled: Boolean(tracking?.orderNumber && tracking?.code) });
  const shipment = shipmentQuery.data;
  const route = useMemo(() => shipment ? getRoutePresentation(shipment.route, shipment.destinationAddress) : null, [shipment]);

  useEffect(() => {
    const standalone = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
    const alreadyOffered = localStorage.getItem(INSTALL_NOTICE_KEY) === "1";
    const listenForInstall = (event: Event) => {
      event.preventDefault();
      if (standalone || alreadyOffered) return;
      localStorage.setItem(INSTALL_NOTICE_KEY, "1");
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", listenForInstall);
    return () => window.removeEventListener("beforeinstallprompt", listenForInstall);
  }, []);

  const search = () => {
    if (!orderNumber.trim() || !code.trim()) { setMessage("Ingresa el número de orden y el código para rastrear."); return; }
    setMessage(""); setTracking({ orderNumber: orderNumber.trim(), code: code.trim().toUpperCase() });
  };
  const scan = (value: string) => {
    const parsed = parseTrackingValue(value);
    if (!parsed.orderNumber || !parsed.code) { setMessage("El QR no contiene una orden y código de rastreo válidos."); return; }
    setOrderNumber(parsed.orderNumber); setCode(parsed.code); setTracking(parsed); setScannerOpen(false); setMessage("");
  };
  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setMessage(choice.outcome === "accepted" ? "La instalación fue iniciada." : "Puedes instalar la aplicación desde el menú del navegador cuando lo necesites.");
    setInstallPrompt(null);
  };

  return <main className="min-h-[100dvh] max-w-full overflow-x-hidden bg-slate-100 pb-[calc(5.4rem+env(safe-area-inset-bottom))] text-slate-900">
    <header className="bg-[#0B2B5E] pb-7 pt-[max(1.25rem,env(safe-area-inset-top))] text-white shadow-lg"><div className="mx-auto max-w-md px-4"><div className="flex min-w-0 items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><img src="/manus-storage/servicom_logo_final_e7ce35aa.png" alt="Servicom Internacional" className="h-11 w-11 shrink-0 rounded-xl bg-white p-1" /><div className="min-w-0"><p className="truncate text-[10px] font-semibold tracking-[0.16em] text-orange-200">SERVICOM INTERNACIONAL</p><h1 className="text-lg font-bold leading-tight">App móvil</h1></div></div><nav aria-label="Accesos de cuenta" className="flex shrink-0 gap-1"><Link href="/cuenta" className={`rounded-md px-2 py-2 text-xs font-semibold text-white hover:bg-white/15 ${pressClass}`}>Mi cuenta</Link><Link href="/admin" className={`rounded-md px-2 py-2 text-xs font-semibold text-white hover:bg-white/15 ${pressClass}`}>Admin</Link></nav></div><p className="mt-4 max-w-sm text-sm leading-5 text-blue-100">Rastrea tus envíos desde el teléfono. Las operaciones administrativas están disponibles únicamente desde el acceso Admin.</p>{installPrompt && <Button type="button" size="sm" onClick={install} className={`mt-4 bg-white text-[#0B2B5E] hover:bg-blue-50 ${pressClass}`}><Download className="mr-2 h-4 w-4" />Instalar aplicación</Button>}</div></header>
    <div className="mx-auto -mt-3 max-w-md space-y-4 px-3"><Card className="min-w-0 border-0 bg-white p-4 shadow-md"><div className="mb-3 flex items-center gap-2"><PackageSearch className="h-5 w-5 shrink-0 text-[#F28C00]" /><h2 className="font-bold text-[#0B2B5E]">Rastrear envío</h2></div><div className="space-y-2"><Input aria-label="Número de orden móvil" value={orderNumber} onChange={event => setOrderNumber(event.target.value.replace(/\s/g, ""))} placeholder="Número de orden" inputMode="numeric" className="h-11 min-w-0" /><Input aria-label="Código de envío móvil" value={code} onChange={event => setCode(event.target.value.toUpperCase())} placeholder="Código de envío" autoCapitalize="characters" className="h-11 min-w-0" /></div><div className="mt-3 grid grid-cols-1 gap-2 min-[380px]:grid-cols-2"><Button type="button" onClick={search} className={`min-w-0 bg-[#0B2B5E] text-white hover:bg-[#123d78] ${pressClass}`}><PackageSearch className="mr-2 h-4 w-4 shrink-0" />Rastrear envío</Button><Button type="button" variant="outline" onClick={() => setScannerOpen(true)} className={`min-w-0 border-[#0B2B5E] text-[#0B2B5E] ${pressClass}`}><ScanLine className="mr-2 h-4 w-4 shrink-0" />Escanear QR</Button></div></Card>
      {message && <p role="status" className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-[#0B2B5E]">{message}</p>}
      {shipmentQuery.isLoading && <Card className="p-4 text-sm text-slate-600">Buscando tu envío…</Card>}
      {shipmentQuery.error && <Card className="border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">No se encontró el envío. Revisa la orden y el código.</Card>}
      {shipment && route && <Card className="min-w-0 border border-emerald-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Envío encontrado</p><h2 className="mt-1 break-words text-base font-bold text-[#0B2B5E]">{shipment.orderNumber} · {shipment.code}</h2></div><span className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${getPaymentStatusUi(shipment.paymentStatus).badgeClass}`}>{getPaymentStatusUi(shipment.paymentStatus).label}</span></div><div className="mt-4 space-y-2 rounded-lg bg-slate-50 p-3 text-sm"><p><strong>Estado:</strong> {shipment.status}</p><p><strong>Destinatario:</strong> {shipment.recipientName || "No especificado"} {shipment.recipientLastName || ""}</p><p className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#F28C00]" /><span className="min-w-0 break-words"><strong>Recoger en:</strong> {route.destination.address}</span></p></div><Link href={`/?order=${encodeURIComponent(String(shipment.orderNumber))}&code=${encodeURIComponent(String(shipment.code))}`} className="mt-3 flex"><Button className={`w-full bg-[#0B2B5E] text-white hover:bg-[#123d78] ${pressClass}`}>Ver seguimiento completo</Button></Link></Card>}
      <Link href="/cuenta" className={`flex min-w-0 ${pressClass}`}><Card className="flex min-h-28 flex-1 items-center gap-4 border-0 p-4 shadow-sm"><span className="rounded-xl bg-blue-50 p-3 text-[#0B2B5E]"><UserRound className="h-6 w-6" /></span><span className="min-w-0"><span className="block font-bold text-[#0B2B5E]">Mi cuenta</span><span className="mt-1 block text-xs leading-5 text-slate-600">Mis envíos, recibos, firma electrónica y perfil.</span></span></Card></Link>
      <Card className="border border-blue-100 bg-blue-50 p-4"><div className="flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-[#0B2B5E]" /><p className="text-sm leading-5 text-slate-700">Para registrar documentos, encomiendas, Cartas o gestionar agencias, usa el acceso <strong>Admin</strong> superior con una cuenta autorizada.</p></div></Card>
    </div>
    <nav aria-label="Navegación móvil" className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white px-4 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_18px_rgba(15,23,42,0.08)]"><div className="mx-auto flex max-w-md justify-around text-xs font-medium text-[#0B2B5E]"><Link href="/movil" className={`flex min-w-16 flex-col items-center gap-1 rounded px-2 py-1 ${pressClass}`}><House className="h-5 w-5" />Inicio</Link><button type="button" onClick={() => setScannerOpen(true)} className={`flex min-w-16 flex-col items-center gap-1 rounded px-2 py-1 text-[#0B2B5E] ${pressClass}`}><QrCode className="h-5 w-5" />Escanear</button><Link href="/cuenta" className={`flex min-w-16 flex-col items-center gap-1 rounded px-2 py-1 ${pressClass}`}><UserRound className="h-5 w-5" />Cuenta</Link></div></nav>
    <QRScanner isOpen={scannerOpen} onClose={() => setScannerOpen(false)} onScan={scan} />
  </main>;
}
