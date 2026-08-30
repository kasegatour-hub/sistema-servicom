import React, { useEffect, useMemo, useState } from "react";
import { CircleUserRound, Download, FilePlus2, Home, LoaderCircle, LogIn, MapPin, PackageCheck, PackageSearch, QrCode, ScanLine, ShieldCheck, Smartphone, UserPlus, UserRound } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { QRScanner } from "@/components/QRScanner";
import { NotificationBell } from "@/components/NotificationBell";
import { getPaymentStatusUi } from "@/lib/paymentStatus";
import { getRoutePresentation } from "@/lib/routeDetails";
import { trpc } from "@/lib/trpc";
import { TRACKING_CODE_MAX_LENGTH, TRACKING_ORDER_MAX_INPUT_LENGTH, formatTrackingCodeInput, formatTrackingOrderInput, getTrackingCodeError, getTrackingOrderError } from "@/../../shared/shipmentIdentifiers";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type MobileTab = "inicio" | "rastrear" | "cuenta";

const pressClass = "touch-manipulation transition duration-150 active:scale-[0.96] active:brightness-90 active:opacity-90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F28C00]/40 motion-reduce:transition-none";
const mobileSignInPath = "/cuenta?returnTo=%2Fmovil";

function parseTrackingValue(rawValue: string) {
  try {
    const url = new URL(rawValue, window.location.origin);
    return { orderNumber: url.searchParams.get("order")?.trim() || "", code: url.searchParams.get("code")?.trim().toUpperCase() || "" };
  } catch { return { orderNumber: "", code: "" }; }
}

function MobileInstallCard({ installPrompt, isStandalone, onInstall, showInstallHelp }: { installPrompt: InstallPromptEvent | null; isStandalone: boolean; onInstall: () => void; showInstallHelp: boolean }) {
  return <Card className="rounded-[1.75rem] border-0 bg-white p-5 shadow-[0_16px_36px_rgba(11,43,94,0.12)]">
    <div className="flex items-start gap-3"><span className="rounded-2xl bg-white p-2 shadow-sm ring-1 ring-orange-100"><img src="/manus-storage/servicom_logo_final_e7ce35aa.png" alt="" className="h-14 w-14 rounded-xl object-contain" /></span><div className="min-w-0"><h2 className="font-bold text-[#0B2B5E]">Instala Servicom en tu celular</h2><p className="mt-1 text-sm leading-5 text-slate-600">Añade la aplicación a tu pantalla de inicio para abrirla como una app.</p></div></div>
    <Button type="button" onClick={onInstall} className={`mt-5 min-h-14 w-full rounded-2xl bg-[#0B2B5E] text-base font-bold text-white hover:bg-[#123d78] ${pressClass}`}><Download className="mr-2 h-5 w-5" />{isStandalone ? "Aplicación instalada" : "Instalar aplicación"}</Button>
    {showInstallHelp && !isStandalone && <div role="status" className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-5 text-slate-700"><p className="font-bold text-[#0B2B5E]">Instalación desde el navegador</p><p className="mt-2"><strong>Android:</strong> abre el menú y elige «Instalar aplicación» o «Añadir a pantalla de inicio».</p><p className="mt-2"><strong>iPhone/iPad:</strong> usa Compartir y selecciona «Añadir a pantalla de inicio».</p></div>}
  </Card>;
}

function BottomNavigation({ activeTab, onChange }: { activeTab: MobileTab; onChange: (tab: MobileTab) => void }) {
  const items: Array<{ tab: MobileTab; label: string; icon: typeof Home }> = [{ tab: "inicio", label: "Inicio", icon: Home }, { tab: "rastrear", label: "Rastrear", icon: QrCode }, { tab: "cuenta", label: "Mi cuenta", icon: CircleUserRound }];
  return <nav aria-label="Navegación de aplicación móvil" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/90 bg-white/95 px-4 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur"><div className="mx-auto grid max-w-md grid-cols-3 gap-1">{items.map(({ tab, label, icon: Icon }) => { const isActive = activeTab === tab; return <button key={tab} type="button" aria-label={label} aria-current={isActive ? "page" : undefined} onClick={() => onChange(tab)} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-bold ${pressClass} ${isActive ? "bg-[#0B2B5E] text-white shadow-md" : "text-slate-500 hover:bg-slate-100 hover:text-[#0B2B5E]"}`}><Icon className="h-5 w-5" /><span>{label}</span></button>; })}</div></nav>;
}

export default function MobileAppPage() {
  const [activeTab, setActiveTab] = useState<MobileTab>("inicio");
  const [orderNumber, setOrderNumber] = useState("");
  const [code, setCode] = useState("");
  const [tracking, setTracking] = useState<{ orderNumber: string; code: string } | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [message, setMessage] = useState("");
  const { data: me, isLoading: meLoading } = trpc.account.me.useQuery();
  const { data: adminSession } = trpc.admin.me.useQuery();
  const isAdminViewer = Boolean(!me && adminSession && !adminSession.reauthRequired && (adminSession.role === "superadmin" || adminSession.role === "registrador"));
  const viewer = me || (isAdminViewer ? adminSession : null);
  const viewerProfilePhoto = me?.profilePhotos?.at(-1) || adminSession?.profilePhoto || null;
  const canAccessAdmin = Boolean(isAdminViewer && (adminSession?.role === "superadmin" || adminSession?.role === "registrador"));
  const shipmentQuery = trpc.shipment.search.useQuery(tracking || { orderNumber: "", code: "" }, { enabled: Boolean(viewer && !viewer.reauthRequired && tracking?.orderNumber && tracking?.code) });
  const shipment = shipmentQuery.data;
  const route = useMemo(() => shipment ? getRoutePresentation(shipment.route, shipment.destinationAddress) : null, [shipment]);

  useEffect(() => {
    const isRunningStandalone = () => window.matchMedia?.("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setIsStandalone(isRunningStandalone());
    const listenForInstall = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent); };
    window.addEventListener("beforeinstallprompt", listenForInstall);
    return () => window.removeEventListener("beforeinstallprompt", listenForInstall);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlOrderNumber = params.get("order")?.trim() || "";
    const urlCode = params.get("code")?.trim().toUpperCase() || "";
    if (!urlOrderNumber || !urlCode) return;
    setOrderNumber(formatTrackingOrderInput(urlOrderNumber));
    setCode(urlCode);
    setTracking({ orderNumber: urlOrderNumber, code: urlCode });
    setActiveTab("rastrear");
  }, []);

  const orderInputError = orderNumber ? getTrackingOrderError(orderNumber) : null;
  const codeInputError = code ? getTrackingCodeError(code) : null;
  const search = () => {
    if (!orderNumber.trim() || !code.trim()) { setMessage("Ingresa el número de orden y el código para rastrear."); return; }
    if (orderInputError || codeInputError) { setMessage("Corrige los datos marcados en rojo antes de rastrear."); return; }
    setMessage("");
    setTracking({ orderNumber: orderNumber.trim(), code: code.trim().toUpperCase() });
  };
  const scan = (value: string) => {
    const parsed = parseTrackingValue(value);
    if (!parsed.orderNumber || !parsed.code) { setMessage("El QR no contiene una orden y código de rastreo válidos."); return; }
    setOrderNumber(formatTrackingOrderInput(parsed.orderNumber));
    setCode(parsed.code);
    setTracking(parsed);
    setScannerOpen(false);
    setActiveTab("rastrear");
    setMessage("");
  };
  const clearTracking = () => {
    setOrderNumber("");
    setCode("");
    setTracking(null);
    setMessage("");
    window.history.replaceState({}, "", window.location.pathname);
  };
  const install = async () => {
    if (isStandalone) { setMessage("La aplicación ya está instalada en este dispositivo."); return; }
    if (!installPrompt) { setShowInstallHelp(true); return; }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setMessage(choice.outcome === "accepted" ? "La instalación fue iniciada." : "Puedes instalar la aplicación desde el menú del navegador cuando lo necesites.");
    setInstallPrompt(null);
  };

  if (meLoading) return <main className="flex min-h-[100dvh] items-center justify-center bg-[#f4f7fb] px-4 text-[#0B2B5E]" role="status"><LoaderCircle className="mr-2 h-5 w-5 animate-spin" />Verificando tu sesión…</main>;

  if (!viewer || viewer.reauthRequired) return <main className="min-h-[100dvh] max-w-full overflow-x-hidden bg-[#f4f7fb] pb-[max(2rem,env(safe-area-inset-bottom))] text-slate-900"><header className="bg-[#0B2B5E] px-5 pb-28 pt-[max(1.2rem,env(safe-area-inset-top))] text-white"><div className="mx-auto max-w-md"><div className="flex items-center gap-2"><img src="/manus-storage/servicom_logo_final_e7ce35aa.png" alt="Servicom Internacional" className="h-16 w-16 rounded-2xl bg-white p-1.5 shadow-lg" /><p className="text-sm font-bold tracking-wide">SERVICOM</p></div><p className="mt-10 text-sm font-bold uppercase tracking-[0.16em] text-orange-200">Todo en un solo lugar</p><h1 className="mt-2 text-4xl font-extrabold leading-[1.05]">Tu oficina de envíos, en el bolsillo.</h1><p className="mt-4 max-w-sm text-sm leading-6 text-blue-100">Instala la aplicación y entra con tu cuenta para ver envíos, recibos y rastreo seguro.</p></div></header><div className="mx-auto -mt-20 max-w-md space-y-4 px-4"><MobileInstallCard installPrompt={installPrompt} isStandalone={isStandalone} onInstall={() => void install()} showInstallHelp={showInstallHelp} /><Card className="rounded-[1.75rem] border-0 bg-white p-5 shadow-[0_12px_32px_rgba(11,43,94,0.09)]"><div className="flex items-start gap-3"><span className="rounded-2xl bg-blue-50 p-3 text-[#0B2B5E]"><ShieldCheck className="h-6 w-6" /></span><div><h2 className="font-bold text-[#0B2B5E]">Acceso protegido</h2><p className="mt-1 text-sm leading-5 text-slate-600">{me?.reauthRequired ? "Confirma tu contraseña para continuar." : "Inicia sesión antes de abrir el rastreo y las funciones de la aplicación."}</p></div></div><div className="mt-5 grid gap-2"><Link href="/admin?from=movil" className={`flex ${pressClass}`}><Button variant="outline" className="min-h-14 w-full rounded-2xl border-[#F28C00] text-base font-bold text-[#A65A00] hover:bg-orange-50"><ShieldCheck className="mr-2 h-5 w-5" />Iniciar sesión como Admin</Button></Link><Link href={mobileSignInPath} className={`flex ${pressClass}`}><Button className="min-h-14 w-full rounded-2xl bg-[#0B2B5E] text-base font-bold text-white hover:bg-[#123d78]"><LogIn className="mr-2 h-5 w-5" />Iniciar sesión como Cliente</Button></Link><Link href={mobileSignInPath} className={`flex ${pressClass}`}><Button variant="outline" className="min-h-14 w-full rounded-2xl border-[#0B2B5E] text-base font-bold text-[#0B2B5E]"><UserPlus className="mr-2 h-5 w-5" />Crear cuenta de Cliente</Button></Link></div></Card>{message && <p role="status" aria-live="polite" className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-[#0B2B5E]">{message}</p>}</div></main>;

  const name = String(viewer?.name || "").trim().split(/\s+/)[0] || (isAdminViewer ? "Administrador" : "Cliente");
  const viewerLastName = me?.lastName || "";
  const fullName = [viewer?.name, viewerLastName].filter(Boolean).join(" ") || name;
  return <main className="min-h-[100dvh] max-w-full overflow-x-hidden bg-[#f4f7fb] pb-[calc(6.4rem+env(safe-area-inset-bottom))] text-slate-900"><header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/95 px-4 pb-3 pt-[max(0.85rem,env(safe-area-inset-top))] backdrop-blur"><div className="mx-auto flex max-w-md items-center justify-between"><div className="flex min-w-0 items-center gap-3">{viewerProfilePhoto?.url ? <img src={viewerProfilePhoto.url} alt={`Foto de perfil de ${fullName}`} className="h-16 w-16 shrink-0 rounded-2xl object-cover shadow-md ring-2 ring-blue-100" /> : <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#0B2B5E] shadow-sm ring-1 ring-blue-100"><UserRound className="h-8 w-8" aria-hidden="true" /></span>}<div className="min-w-0 max-w-[12rem]"><p className="break-words text-[10px] font-bold uppercase tracking-[0.14em] text-[#F28C00]">{isAdminViewer ? "Perfil administrativo móvil" : "Servicom móvil"}</p><p className="break-words text-sm font-extrabold leading-5 text-[#0B2B5E] [overflow-wrap:anywhere]">Hola, {fullName}</p><p className="break-words text-[11px] leading-4 text-slate-500 [overflow-wrap:anywhere]">{viewer?.email}</p></div></div><div className="flex items-center gap-2"><NotificationBell buttonClassName="border-[#0B2B5E] bg-white text-[#0B2B5E] hover:bg-blue-50" />{canAccessAdmin && <Link href="/admin?from=movil" aria-label="Acceso administrativo" className={`flex ${pressClass}`}><Button type="button" variant="outline" aria-label="Acceso Admin" className="h-11 rounded-2xl border-[#F28C00] px-3 text-xs font-bold text-[#A65A00] hover:bg-orange-50">Admin</Button></Link>}</div></div></header>
    <div className="mx-auto max-w-md px-4 pt-5">
      {activeTab === "inicio" && <section className="space-y-4" aria-label="Inicio móvil"><Card className="overflow-hidden rounded-[1.75rem] border-0 bg-[#0B2B5E] p-5 text-white shadow-[0_18px_38px_rgba(11,43,94,0.26)]"><p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-200">Seguimiento rápido</p><h1 className="mt-2 text-3xl font-extrabold leading-tight">¿Dónde está tu envío?</h1><p className="mt-2 max-w-xs text-sm leading-5 text-blue-100">Escanea el QR de tu comprobante o busca con orden y código.</p><div className="mt-6 grid gap-3"><Button type="button" onClick={() => setActiveTab("rastrear")} className={`min-h-16 w-full rounded-2xl bg-white px-5 text-base font-extrabold text-[#0B2B5E] shadow-md hover:bg-blue-50 ${pressClass}`}><PackageSearch className="mr-3 h-6 w-6" />Rastrear envío</Button><Link href={isAdminViewer ? "/admin?from=movil&workspace=crear&mobile=1" : "/cuenta?mobile=1&workspace=registrar"} className={`flex ${pressClass}`}><Button type="button" className={`min-h-16 w-full rounded-2xl bg-[#F28C00] px-5 text-base font-extrabold text-white shadow-md hover:bg-[#d97800] ${pressClass}`}><FilePlus2 className="mr-3 h-6 w-6" />Registrar nuevo envío</Button></Link></div></Card><Card className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start gap-3"><span className="rounded-xl bg-blue-50 p-2 text-[#0B2B5E]"><ShieldCheck className="h-5 w-5" /></span><p className="text-sm leading-5 text-slate-600"><strong className="text-[#0B2B5E]">Acciones rápidas.</strong> Desde Inicio puedes rastrear un envío o registrar uno nuevo sin buscarlo en otros menús.</p></div></Card><Card className="rounded-[1.5rem] border border-orange-100 bg-orange-50/70 p-4 shadow-sm" aria-label="Pasos para registrar un envío"><div className="flex items-start gap-3"><span className="rounded-xl bg-white p-2 text-[#A65A00]"><PackageCheck className="h-5 w-5" /></span><div><p className="font-extrabold text-[#0B2B5E]">Registro sencillo en 3 pasos</p><p className="mt-1 text-sm leading-5 text-slate-700">1. Sede y pago · 2. Personas · 3. Contenido y confirmación. Tus datos se conservan mientras avanzas.</p></div></div></Card><Card className="rounded-[1.5rem] border border-blue-100 bg-blue-50 p-4"><div className="flex items-start gap-3"><span className="rounded-xl bg-white p-2 text-[#0B2B5E]"><ShieldCheck className="h-5 w-5" /></span><p className="text-sm leading-5 text-slate-700"><strong className="text-[#0B2B5E]">Operación segura.</strong> Tu sesión protege la información de envíos y recibos.</p></div></Card></section>}
      {activeTab === "rastrear" && <section className="space-y-4" aria-label="Rastrear desde móvil"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#F28C00]">Rastreo</p><h1 className="mt-1 text-3xl font-extrabold text-[#0B2B5E]">Encuentra tu envío</h1><p className="mt-1 text-sm leading-5 text-slate-600">Escanea primero. Si no tienes QR, escribe los datos del comprobante.</p></div><Button type="button" onClick={() => setScannerOpen(true)} className={`min-h-16 w-full rounded-[1.4rem] bg-[#0B2B5E] text-base font-bold text-white shadow-lg hover:bg-[#123d78] ${pressClass}`}><ScanLine className="mr-2 h-6 w-6" />Escanear QR de envío</Button><Card className="rounded-[1.75rem] border-0 bg-white p-5 shadow-sm"><div className="space-y-4"><div><label className="mb-2 block text-sm font-bold text-[#0B2B5E]">Número de orden</label><Input aria-label="Número de orden móvil" value={orderNumber} maxLength={TRACKING_ORDER_MAX_INPUT_LENGTH} aria-invalid={Boolean(orderInputError)} aria-describedby={orderInputError ? "mobile-order-error" : undefined} onChange={event => setOrderNumber(formatTrackingOrderInput(event.target.value))} placeholder="Ej. 0826-0019" inputMode="numeric" className={`h-14 rounded-2xl px-4 text-base ${orderInputError ? "border-2 border-red-600 bg-red-50/40" : "border-slate-200"}`} />{orderInputError ? <p id="mobile-order-error" role="alert" className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold leading-5 text-red-700">{orderInputError}</p> : <p className="mt-1 text-xs text-slate-500">Encomiendas: MMAA-XXXX. También se aceptan órdenes históricas.</p>}</div><div><label className="mb-2 block text-sm font-bold text-[#0B2B5E]">Código de envío</label><Input aria-label="Código de envío móvil" value={code} maxLength={TRACKING_CODE_MAX_LENGTH} aria-invalid={Boolean(codeInputError)} aria-describedby={codeInputError ? "mobile-code-error" : undefined} onChange={event => setCode(formatTrackingCodeInput(event.target.value))} placeholder="Ej. 7ABC" autoCapitalize="characters" className={`h-14 rounded-2xl px-4 text-base uppercase ${codeInputError ? "border-2 border-red-600 bg-red-50/40" : "border-slate-200"}`} />{codeInputError && <p id="mobile-code-error" role="alert" className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold leading-5 text-red-700">{codeInputError}</p>}</div><div className="grid gap-3 sm:grid-cols-2"><Button type="button" onClick={search} className={`min-h-14 w-full rounded-2xl bg-[#F28C00] text-base font-bold text-white hover:bg-[#d97800] ${pressClass}`}><PackageSearch className="mr-2 h-5 w-5" />Buscar envío</Button><Button type="button" variant="outline" onClick={clearTracking} className={`min-h-14 w-full rounded-2xl border-2 border-slate-300 bg-white text-base font-bold text-slate-700 hover:bg-slate-50 ${pressClass}`}>Limpiar</Button></div></div></Card>{message && <p role="status" aria-live="polite" className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-[#0B2B5E]">{message}</p>}{shipmentQuery.isLoading && <Card role="status" aria-live="polite" className="flex items-center gap-3 rounded-2xl border-0 p-4 text-sm text-slate-700 shadow-sm"><LoaderCircle className="h-5 w-5 animate-spin text-[#0B2B5E]" />Buscando tu envío…</Card>}{shipmentQuery.error && <Card role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">No se encontró el envío. Revisa la orden y el código.</Card>}{shipment && route && <Card className="rounded-[1.75rem] border border-emerald-100 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Envío encontrado</p><div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center"><div className="grid grid-cols-2 gap-2"><div className="rounded-2xl border border-blue-100 bg-blue-50 px-3 py-3"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-600">Número de orden</p><p className="mt-1 break-all text-xl font-extrabold tracking-wide text-[#0B2B5E]">{shipment.orderNumber}</p></div><div className="rounded-2xl border border-orange-100 bg-orange-50 px-3 py-3"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-600">Código de envío</p><p className="mt-1 break-all text-xl font-extrabold tracking-wide text-[#0B2B5E]">{shipment.code}</p></div></div><span className={`justify-self-start rounded-full px-3 py-2 text-sm font-bold sm:justify-self-end ${getPaymentStatusUi(shipment.paymentStatus).badgeClass}`}>{getPaymentStatusUi(shipment.paymentStatus).label}</span></div><div className="mt-4 space-y-2 rounded-2xl bg-slate-50 p-4 text-sm"><p><strong>Estado:</strong> {shipment.status}</p><p><strong>Destinatario:</strong> {shipment.recipientName || "No especificado"} {shipment.recipientLastName || ""}</p><p className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#F28C00]" /><span><strong>Recoger en:</strong> {route.destination.address}</span></p></div><p className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-center text-sm font-semibold text-[#0B2B5E]">Este es el centro de rastreo de tu app. Puedes consultar otro envío desde aquí.</p></Card>}</section>}
      {activeTab === "cuenta" && <section className="space-y-4" aria-label="Cuenta móvil"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#F28C00]">Mi cuenta</p><h1 className="mt-1 text-3xl font-extrabold text-[#0B2B5E]">{isAdminViewer ? "Perfil administrativo" : "Tus datos personales"}</h1><p className="mt-1 text-sm leading-5 text-slate-600">{isAdminViewer ? "Identifica tu sesión administrativa y abre sus controles de seguridad." : "Administra únicamente tu perfil, tus fotos personales, tu biografía y tu contraseña."}</p></div><Card className="rounded-[1.75rem] border-0 bg-white p-5 shadow-sm"><div className="flex flex-col items-center gap-4 rounded-2xl border border-blue-100 bg-blue-50 p-5 sm:flex-row"><div className="shrink-0">{viewerProfilePhoto?.url ? <img src={viewerProfilePhoto.url} alt={`Foto de perfil de ${fullName}`} className="h-32 w-32 rounded-[1.75rem] object-cover shadow-lg ring-4 ring-white" /> : <span className="flex h-32 w-32 items-center justify-center rounded-[1.75rem] bg-white text-[#0B2B5E] shadow-lg ring-4 ring-blue-100"><UserRound className="h-16 w-16" aria-hidden="true" /></span>}</div><div className="min-w-0 text-center sm:text-left"><p className="truncate text-xl font-extrabold text-[#0B2B5E]">{fullName}</p><p className="break-words text-sm text-slate-500">{viewer?.email || "Cuenta Servicom"}</p><p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#F28C00]">{isAdminViewer ? "Administrador" : "Cliente"}</p></div></div><div className="mt-5 grid gap-3">{isAdminViewer ? <Link href="/admin?from=movil&profile=1" aria-label="Mi perfil" className={`flex ${pressClass}`}><Button className={`min-h-16 w-full rounded-2xl bg-[#0B2B5E] text-base font-extrabold text-white hover:bg-[#123d78] ${pressClass}`}><UserRound className="mr-3 h-6 w-6" />Mi perfil</Button></Link> : <><Link href="/cuenta?mobile=1&workspace=perfil" className={`flex ${pressClass}`}><Button className={`min-h-16 w-full rounded-2xl bg-[#0B2B5E] text-base font-extrabold text-white hover:bg-[#123d78] ${pressClass}`}><UserRound className="mr-3 h-6 w-6" />Perfil, fotos y biografía</Button></Link><Link href="/cuenta?mobile=1&workspace=seguridad" className={`flex ${pressClass}`}><Button variant="outline" className={`min-h-16 w-full rounded-2xl border-2 border-[#F28C00] text-base font-extrabold text-[#A65A00] hover:bg-orange-50 ${pressClass}`}><ShieldCheck className="mr-3 h-6 w-6" />Cambiar contraseña</Button></Link></>}</div></Card><Card className="rounded-[1.5rem] border border-blue-100 bg-blue-50 p-4"><p className="text-sm leading-5 text-slate-700"><strong className="text-[#0B2B5E]">{isAdminViewer ? "Perfil protegido." : "Solo gestión personal."}</strong> Para rastrear o registrar un envío, vuelve a Inicio y usa sus botones grandes.</p></Card></section>}
    </div><BottomNavigation activeTab={activeTab} onChange={setActiveTab} /><QRScanner isOpen={scannerOpen} onClose={() => setScannerOpen(false)} onScan={scan} /></main>;
}
