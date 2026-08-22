import React, { useEffect, useMemo, useState } from "react";
import { Download, LoaderCircle, LogIn, MapPin, PackageSearch, ScanLine, ShieldCheck, Smartphone, UserPlus, UserRound } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { QRScanner } from "@/components/QRScanner";
import { getPaymentStatusUi } from "@/lib/paymentStatus";
import { getRoutePresentation } from "@/lib/routeDetails";
import { trpc } from "@/lib/trpc";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const pressClass = "transition duration-150 active:scale-[0.98] active:opacity-90 motion-reduce:transition-none";
const mobileSignInPath = "/cuenta?returnTo=%2Fmovil";

function parseTrackingValue(rawValue: string) {
  try {
    const url = new URL(rawValue, window.location.origin);
    return { orderNumber: url.searchParams.get("order")?.trim() || "", code: url.searchParams.get("code")?.trim().toUpperCase() || "" };
  } catch { return { orderNumber: "", code: "" }; }
}

function MobileInstallCard({ installPrompt, isStandalone, onInstall, showInstallHelp }: { installPrompt: InstallPromptEvent | null; isStandalone: boolean; onInstall: () => void; showInstallHelp: boolean }) {
  return <Card className="rounded-3xl border-0 bg-white p-5 shadow-xl">
    <div className="flex items-start gap-3">
      <span className="rounded-2xl bg-orange-50 p-3 text-[#F28C00]"><Smartphone className="h-6 w-6" /></span>
      <div className="min-w-0"><h2 className="font-bold text-[#0B2B5E]">Instala Servicom en tu celular</h2><p className="mt-1 text-sm leading-5 text-slate-600">Añade la aplicación a tu pantalla de inicio para abrirla como una app.</p></div>
    </div>
    <Button type="button" onClick={onInstall} className={`mt-5 min-h-12 w-full rounded-xl bg-[#0B2B5E] text-white hover:bg-[#123d78] ${pressClass}`}>
      <Download className="mr-2 h-4 w-4" />{isStandalone ? "Aplicación instalada" : installPrompt ? "Instalar aplicación" : "Ver cómo instalar"}
    </Button>
    {showInstallHelp && !isStandalone && <div role="status" className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-5 text-slate-700"><p className="font-semibold text-[#0B2B5E]">Instalación desde el navegador</p><p className="mt-2"><strong>Android:</strong> abre el menú del navegador y elige «Instalar aplicación» o «Añadir a pantalla de inicio».</p><p className="mt-2"><strong>iPhone/iPad:</strong> usa Compartir y selecciona «Añadir a pantalla de inicio».</p></div>}
  </Card>;
}

export default function MobileAppPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [code, setCode] = useState("");
  const [tracking, setTracking] = useState<{ orderNumber: string; code: string } | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [message, setMessage] = useState("");
  const { data: me, isLoading: meLoading } = trpc.account.me.useQuery();
  const shipmentQuery = trpc.shipment.search.useQuery(tracking || { orderNumber: "", code: "" }, { enabled: Boolean(me && !me.reauthRequired && tracking?.orderNumber && tracking?.code) });
  const shipment = shipmentQuery.data;
  const route = useMemo(() => shipment ? getRoutePresentation(shipment.route, shipment.destinationAddress) : null, [shipment]);

  useEffect(() => {
    const isRunningStandalone = () => window.matchMedia?.("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setIsStandalone(isRunningStandalone());
    const listenForInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", listenForInstall);
    return () => window.removeEventListener("beforeinstallprompt", listenForInstall);
  }, []);

  const search = () => {
    if (!orderNumber.trim() || !code.trim()) { setMessage("Ingresa el número de orden y el código para rastrear."); return; }
    setMessage("");
    setTracking({ orderNumber: orderNumber.trim(), code: code.trim().toUpperCase() });
  };
  const scan = (value: string) => {
    const parsed = parseTrackingValue(value);
    if (!parsed.orderNumber || !parsed.code) { setMessage("El QR no contiene una orden y código de rastreo válidos."); return; }
    setOrderNumber(parsed.orderNumber);
    setCode(parsed.code);
    setTracking(parsed);
    setScannerOpen(false);
    setMessage("");
  };
  const install = async () => {
    if (isStandalone) { setMessage("La aplicación ya está instalada en este dispositivo."); return; }
    if (!installPrompt) { setShowInstallHelp(true); return; }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setMessage(choice.outcome === "accepted" ? "La instalación fue iniciada." : "Puedes instalar la aplicación desde el menú del navegador cuando lo necesites.");
    setInstallPrompt(null);
  };

  if (meLoading) return <main className="flex min-h-[100dvh] items-center justify-center bg-[#f8fbfc] px-4 text-[#0B2B5E]" role="status"><LoaderCircle className="mr-2 h-5 w-5 animate-spin" />Verificando tu sesión…</main>;

  if (!me || me.reauthRequired) {
    return <main className="min-h-[100dvh] max-w-full overflow-x-hidden bg-[linear-gradient(180deg,#dff3f7_0%,#f8fbfc_58%,#edf4f7_100%)] pb-[max(2rem,env(safe-area-inset-bottom))] text-slate-900">
      <header className="bg-[#0B2B5E] px-4 pb-24 pt-[max(1rem,env(safe-area-inset-top))] text-white shadow-lg"><div className="mx-auto max-w-md"><div className="flex items-center gap-2"><img src="/manus-storage/servicom_logo_final_e7ce35aa.png" alt="Servicom Internacional" className="h-10 w-10 rounded-xl bg-white p-1" /><p className="text-sm font-bold">SERVICOM</p></div><h1 className="mt-7 text-3xl font-extrabold leading-tight">App móvil Servicom</h1><p className="mt-2 text-sm leading-5 text-blue-100">Instala la aplicación y luego inicia sesión para consultar tus envíos de forma segura.</p></div></header>
      <div className="mx-auto -mt-16 max-w-md space-y-4 px-4"><MobileInstallCard installPrompt={installPrompt} isStandalone={isStandalone} onInstall={() => void install()} showInstallHelp={showInstallHelp} />
        <Card className="rounded-3xl border-0 bg-white p-5 shadow-lg"><div className="flex items-start gap-3"><span className="rounded-2xl bg-blue-50 p-3 text-[#0B2B5E]"><ShieldCheck className="h-6 w-6" /></span><div><h2 className="font-bold text-[#0B2B5E]">Acceso protegido</h2><p className="mt-1 text-sm leading-5 text-slate-600">{me?.reauthRequired ? "Confirma tu contraseña para continuar en la aplicación móvil." : "Debes iniciar sesión antes de ver el rastreo y las funciones de la aplicación."}</p></div></div><div className="mt-5 grid gap-2"><Link href={mobileSignInPath} className={`flex ${pressClass}`}><Button className="min-h-12 w-full rounded-xl bg-[#0B2B5E] text-white hover:bg-[#123d78]"><LogIn className="mr-2 h-4 w-4" />Iniciar sesión</Button></Link><Link href={mobileSignInPath} className={`flex ${pressClass}`}><Button variant="outline" className="min-h-12 w-full rounded-xl border-[#0B2B5E] text-[#0B2B5E]"><UserPlus className="mr-2 h-4 w-4" />Crear cuenta</Button></Link></div></Card>
        {message && <p role="status" aria-live="polite" className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-[#0B2B5E]">{message}</p>}
      </div>
    </main>;
  }

  return <main className="min-h-[100dvh] max-w-full overflow-x-hidden bg-[linear-gradient(180deg,#dff3f7_0%,#f8fbfc_58%,#edf4f7_100%)] pb-[max(2rem,env(safe-area-inset-bottom))] text-slate-900">
    <header className="bg-[#0B2B5E] px-4 pb-24 pt-[max(1rem,env(safe-area-inset-top))] text-white shadow-lg"><div className="mx-auto max-w-md"><div className="flex min-w-0 items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><img src="/manus-storage/servicom_logo_final_e7ce35aa.png" alt="Servicom Internacional" className="h-10 w-10 shrink-0 rounded-xl bg-white p-1" /><p className="truncate text-sm font-bold">SERVICOM</p></div><nav aria-label="Accesos principales" className="flex shrink-0 items-center gap-1 text-xs font-semibold"><Link href="/cuenta" className={`rounded-md px-2 py-2 hover:bg-white/15 ${pressClass}`}>Mi cuenta</Link><Link href="/admin" className={`rounded-md px-2 py-2 hover:bg-white/15 ${pressClass}`}>Admin</Link></nav></div><h1 className="mt-7 text-3xl font-extrabold leading-tight">Rastrea tu envío</h1><p className="mt-1 text-sm text-blue-100">Orden y código en pocos toques.</p></div></header>
    <div className="mx-auto -mt-16 max-w-md space-y-4 px-4"><Card className="min-w-0 rounded-3xl border-0 bg-white p-5 shadow-xl"><div className="mb-4 flex items-center gap-2"><span className="rounded-xl bg-orange-50 p-2 text-[#F28C00]"><PackageSearch className="h-5 w-5" /></span><div><h2 className="font-bold text-[#0B2B5E]">Rastrear envío</h2><p className="text-xs text-slate-500">Ingresa los datos de tu comprobante.</p></div></div><div className="space-y-3"><div><label className="mb-1 block text-xs font-semibold text-slate-600">Número de orden</label><Input aria-label="Número de orden móvil" value={orderNumber} onChange={event => setOrderNumber(event.target.value.replace(/\s/g, ""))} placeholder="Ej. 3520992723" inputMode="numeric" className="h-12 min-w-0 rounded-xl" /></div><div><label className="mb-1 block text-xs font-semibold text-slate-600">Código de envío</label><Input aria-label="Código de envío móvil" value={code} onChange={event => setCode(event.target.value.toUpperCase())} placeholder="Ej. CA06721WB" autoCapitalize="characters" className="h-12 min-w-0 rounded-xl" /></div></div><div className="mt-4 grid grid-cols-1 gap-2 min-[380px]:grid-cols-2"><Button type="button" onClick={search} className={`min-h-12 min-w-0 rounded-xl bg-[#0B2B5E] text-white hover:bg-[#123d78] ${pressClass}`}><PackageSearch className="mr-2 h-4 w-4 shrink-0" />Buscar</Button><Button type="button" variant="outline" onClick={() => setScannerOpen(true)} className={`min-h-12 min-w-0 rounded-xl border-[#0B2B5E] text-[#0B2B5E] ${pressClass}`}><ScanLine className="mr-2 h-4 w-4 shrink-0" />Escanear QR</Button></div></Card>
      {message && <p role="status" aria-live="polite" className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-[#0B2B5E]">{message}</p>}
      {shipmentQuery.isLoading && <Card role="status" aria-live="polite" className="flex items-center gap-3 rounded-2xl border-0 p-4 text-sm text-slate-700 shadow-sm"><LoaderCircle className="h-5 w-5 animate-spin text-[#0B2B5E]" />Buscando tu envío…</Card>}
      {shipmentQuery.error && <Card role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">No se encontró el envío. Revisa la orden y el código.</Card>}
      {shipment && route && <Card className="min-w-0 rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Envío encontrado</p><h2 className="mt-1 break-words text-base font-bold text-[#0B2B5E]">{shipment.orderNumber} · {shipment.code}</h2></div><span className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${getPaymentStatusUi(shipment.paymentStatus).badgeClass}`}>{getPaymentStatusUi(shipment.paymentStatus).label}</span></div><div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3 text-sm"><p><strong>Estado:</strong> {shipment.status}</p><p><strong>Destinatario:</strong> {shipment.recipientName || "No especificado"} {shipment.recipientLastName || ""}</p><p className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#F28C00]" /><span className="min-w-0 break-words"><strong>Recoger en:</strong> {route.destination.address}</span></p></div><Link href={`/?order=${encodeURIComponent(String(shipment.orderNumber))}&code=${encodeURIComponent(String(shipment.code))}`} className="mt-3 flex"><Button className={`min-h-11 w-full rounded-xl bg-[#0B2B5E] text-white hover:bg-[#123d78] ${pressClass}`}>Ver seguimiento completo</Button></Link></Card>}
      <Link href="/cuenta" className={`flex min-w-0 ${pressClass}`}><Card className="flex min-h-24 flex-1 items-center gap-4 rounded-2xl border-0 p-4 shadow-sm"><span className="rounded-xl bg-blue-50 p-3 text-[#0B2B5E]"><UserRound className="h-6 w-6" /></span><span className="min-w-0"><span className="block font-bold text-[#0B2B5E]">Mi cuenta</span><span className="mt-1 block text-xs leading-5 text-slate-600">Mis envíos, recibos, perfil y solicitudes de firma.</span></span></Card></Link>
      <Card className="rounded-2xl border border-blue-100 bg-blue-50 p-4"><div className="flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-[#0B2B5E]" /><p className="text-sm leading-5 text-slate-700">¿Eres operador? Entra por <strong>Admin</strong> para registrar, gestionar y enviar solicitudes de firma.</p></div></Card>
    </div>
    <QRScanner isOpen={scannerOpen} onClose={() => setScannerOpen(false)} onScan={scan} />
  </main>;
}
