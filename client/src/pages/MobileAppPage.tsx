import React, { useMemo, useState } from "react";
import { Building2, Download, FileText, House, MapPin, PackageSearch, QrCode, ReceiptText, ScanLine, ShieldCheck, UserRound } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { QRScanner } from "@/components/QRScanner";
import { getPaymentStatusUi } from "@/lib/paymentStatus";
import { getRoutePresentation } from "@/lib/routeDetails";
import { trpc } from "@/lib/trpc";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

function parseTrackingValue(rawValue: string) {
  try {
    const url = new URL(rawValue, window.location.origin);
    return { orderNumber: url.searchParams.get("order")?.trim() || "", code: url.searchParams.get("code")?.trim().toUpperCase() || "" };
  } catch {
    return { orderNumber: "", code: "" };
  }
}

export default function MobileAppPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [code, setCode] = useState("");
  const [tracking, setTracking] = useState<{ orderNumber: string; code: string } | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [message, setMessage] = useState("");
  const query = tracking || { orderNumber: "", code: "" };
  const shipmentQuery = trpc.shipment.search.useQuery(query, { enabled: Boolean(tracking?.orderNumber && tracking?.code) });
  const shipment = shipmentQuery.data;
  const route = useMemo(() => shipment ? getRoutePresentation(shipment.route, shipment.destinationAddress) : null, [shipment]);

  React.useEffect(() => {
    const listenForInstall = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent); };
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
    setOrderNumber(parsed.orderNumber); setCode(parsed.code); setTracking(parsed); setScannerOpen(false); setMessage("");
  };
  const install = async () => {
    if (!installPrompt) { setMessage("En el navegador, abre el menú y selecciona «Instalar aplicación» o «Añadir a pantalla de inicio»."); return; }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setMessage(choice.outcome === "accepted" ? "La instalación fue iniciada." : "Puedes instalar la aplicación cuando lo necesites.");
    setInstallPrompt(null);
  };

  return <main className="min-h-screen bg-slate-100 pb-24 text-slate-900">
    <header className="bg-[#0B2B5E] px-5 pb-8 pt-8 text-white shadow-lg"><div className="mx-auto max-w-md"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><img src="/manus-storage/servicom_logo_final_e7ce35aa.png" alt="Servicom Internacional" className="h-12 w-12 rounded-xl bg-white p-1" /><div><p className="text-xs font-semibold tracking-widest text-orange-200">SERVICOM INTERNACIONAL</p><h1 className="text-xl font-bold">App móvil</h1></div></div><Button type="button" size="sm" onClick={install} className="bg-white text-[#0B2B5E] hover:bg-blue-50"><Download className="mr-1 h-4 w-4" />Instalar</Button></div><p className="mt-5 text-sm leading-6 text-blue-100">Rastrea, registra y gestiona documentos y encomiendas desde tu teléfono.</p></div></header>
    <div className="mx-auto -mt-4 max-w-md space-y-4 px-4">
      <Card className="border-0 bg-white p-4 shadow-md"><div className="mb-3 flex items-center gap-2"><PackageSearch className="h-5 w-5 text-[#F28C00]" /><h2 className="font-bold text-[#0B2B5E]">Rastrear envío</h2></div><div className="space-y-2"><Input aria-label="Número de orden móvil" value={orderNumber} onChange={event => setOrderNumber(event.target.value.replace(/\s/g, ""))} placeholder="Número de orden" inputMode="numeric" className="h-11" /><Input aria-label="Código de envío móvil" value={code} onChange={event => setCode(event.target.value.toUpperCase())} placeholder="Código de envío" autoCapitalize="characters" className="h-11" /></div><div className="mt-3 grid grid-cols-2 gap-2"><Button type="button" onClick={search} className="bg-[#0B2B5E] text-white hover:bg-[#123d78]"><PackageSearch className="mr-2 h-4 w-4" />Rastrear</Button><Button type="button" variant="outline" onClick={() => setScannerOpen(true)} className="border-[#0B2B5E] text-[#0B2B5E]"><ScanLine className="mr-2 h-4 w-4" />Escanear QR</Button></div></Card>
      {message && <p role="status" className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-[#0B2B5E]">{message}</p>}
      {shipmentQuery.isLoading && <Card className="p-4 text-sm text-slate-600">Buscando tu envío…</Card>}
      {shipmentQuery.error && <Card className="border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">No se encontró el envío. Revisa la orden y el código.</Card>}
      {shipment && route && <Card className="border border-emerald-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Envío encontrado</p><h2 className="mt-1 text-lg font-bold text-[#0B2B5E]">{shipment.orderNumber} · {shipment.code}</h2></div><span className={`rounded-full px-2 py-1 text-xs font-bold ${getPaymentStatusUi(shipment.paymentStatus).badgeClass}`}>{getPaymentStatusUi(shipment.paymentStatus).label}</span></div><div className="mt-4 space-y-2 rounded-lg bg-slate-50 p-3 text-sm"><p><strong>Estado:</strong> {shipment.status}</p><p><strong>Destinatario:</strong> {shipment.recipientName || "No especificado"} {shipment.recipientLastName || ""}</p><p className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#F28C00]" /><span><strong>Recoger en:</strong> {route.destination.address}</span></p></div><Link href={`/?order=${encodeURIComponent(String(shipment.orderNumber))}&code=${encodeURIComponent(String(shipment.code))}`} className="mt-3 flex"><Button className="w-full bg-[#0B2B5E] text-white hover:bg-[#123d78]">Ver seguimiento completo</Button></Link></Card>}
      <section><div className="mb-2 flex items-center justify-between"><h2 className="font-bold text-[#0B2B5E]">Operaciones</h2><span className="text-xs text-slate-500">Misma información de la web</span></div><div className="grid grid-cols-2 gap-3"><Link href="/cuenta" className="flex"><Card className="flex min-h-32 flex-1 flex-col justify-between border-0 p-4 shadow-sm"><UserRound className="h-6 w-6 text-[#0B2B5E]" /><div><h3 className="font-bold text-[#0B2B5E]">Mi cuenta</h3><p className="mt-1 text-xs text-slate-600">Mis envíos, recibos y firma</p></div></Card></Link><Link href="/admin" className="flex"><Card className="flex min-h-32 flex-1 flex-col justify-between border-0 p-4 shadow-sm"><Building2 className="h-6 w-6 text-[#F28C00]" /><div><h3 className="font-bold text-[#0B2B5E]">Operador</h3><p className="mt-1 text-xs text-slate-600">Documentos, encomiendas y estados</p></div></Card></Link><Link href="/admin" className="flex"><Card className="flex min-h-32 flex-1 flex-col justify-between border-0 p-4 shadow-sm"><FileText className="h-6 w-6 text-[#0B2B5E]" /><div><h3 className="font-bold text-[#0B2B5E]">Cartas</h3><p className="mt-1 text-xs text-slate-600">Crear, firmar y enviar invitaciones</p></div></Card></Link><Link href="/admin" className="flex"><Card className="flex min-h-32 flex-1 flex-col justify-between border-0 p-4 shadow-sm"><ReceiptText className="h-6 w-6 text-[#F28C00]" /><div><h3 className="font-bold text-[#0B2B5E]">Gestión</h3><p className="mt-1 text-xs text-slate-600">Recibos, agencias y reportes</p></div></Card></Link></div></section>
      <Card className="border border-blue-100 bg-blue-50 p-4"><div className="flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-[#0B2B5E]" /><p className="text-sm leading-5 text-slate-700">La aplicación usa las mismas cuentas, envíos y permisos del sistema Servicom. Los Administradores y Registradores pueden gestionar los registros; los Clientes solo ven sus propios envíos.</p></div></Card>
    </div>
    <nav aria-label="Navegación móvil" className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white px-6 py-3 shadow-[0_-4px_18px_rgba(15,23,42,0.08)]"><div className="mx-auto flex max-w-md justify-around text-xs font-medium text-[#0B2B5E]"><Link href="/movil" className="flex flex-col items-center gap-1"><House className="h-5 w-5" />Inicio</Link><button type="button" onClick={() => setScannerOpen(true)} className="flex flex-col items-center gap-1 text-[#0B2B5E]"><QrCode className="h-5 w-5" />Escanear</button><Link href="/cuenta" className="flex flex-col items-center gap-1"><UserRound className="h-5 w-5" />Cuenta</Link></div></nav>
    <QRScanner isOpen={scannerOpen} onClose={() => setScannerOpen(false)} onScan={scan} />
  </main>;
}
