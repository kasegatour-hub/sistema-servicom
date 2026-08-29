import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { QrCode, AlertCircle, MapPin, Clock3, Phone, ExternalLink, Search, ArrowRight, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { ShipmentTimeline } from "@/components/ShipmentTimeline";
import { TrackingJourneyAnimation } from "@/components/TrackingJourneyAnimation";
import { QRScanner } from "@/components/QRScanner";
import QRCode from "qrcode";
import { buildTrackingPath, buildTrackingUrl, TRACKING_QR_OPTIONS, normalizeTrackingValue } from "@/lib/tracking";
import { getPaymentStatusUi } from "@/lib/paymentStatus";
import { formatPhoneNumber } from "@/lib/phoneFormatting";
import { getRoutePresentation } from "@/lib/routeDetails";
import { SHIPMENT_CODE_EXAMPLE, TRACKING_CODE_MAX_LENGTH, TRACKING_ORDER_MAX_INPUT_LENGTH, formatTrackingCodeInput, formatTrackingOrderInput, getTrackingCodeError, getTrackingOrderError } from "@/../../shared/shipmentIdentifiers";
export { formatTrackingOrderInput, getTrackingCodeError, getTrackingOrderError } from "@/../../shared/shipmentIdentifiers";

const searchSchema = z.object({
  orderNumber: z.string().trim().min(1, "Escribe tu número de orden."),
  code: z.string().trim().min(1, "Escribe tu código de envío."),
}).superRefine((values, context) => {
  const orderError = getTrackingOrderError(values.orderNumber);
  if (orderError) context.addIssue({ code: z.ZodIssueCode.custom, path: ["orderNumber"], message: orderError });
  const codeError = getTrackingCodeError(values.code);
  if (codeError) context.addIssue({ code: z.ZodIssueCode.custom, path: ["code"], message: codeError });
});

type SearchFormData = z.infer<typeof searchSchema>;

export const LOCATION_DETAILS = {
  lima: {
    label: "Jr. de la Unión 518",
    address: "Jr. de la Unión Nro. 518 Int. S101, Cercado de Lima, Lima-Lima-Lima",
    reference: "Referencia: es una galería y está en el sótano - Frente a Saga Falabella",
    hours: "Lunes a sábado, de 10:00 a. m. a 8:30 p. m.",
    phone: "01 390 7269",
    phoneHref: "tel:+51013907269",
    whatsapp: "+51 970 188 447 / +51 908 722 617",
    whatsappHref: "https://wa.me/51970188447",
    whatsappSecondHref: "https://wa.me/51908722617",
    mapsUrl: "https://share.google/F5wrStU2oICvKgIWx",
    image: "/manus-storage/lima-jr-union_35c786ca.webp",
    imageAlt: "Entrada de la sede Servicom Internacional en Jr. de la Unión 518, Lima",
  },
  torino: {
    label: "Corso Peschiera",
    address: "Corso Peschiera, 162A, Zona Piazza Sabotino, Torino, Italia",
    reference: "Referencia: Corso Peschiera",
    hours: "Lunes a sábado, de 9:00 a. m. a 8:30 p. m.",
    whatsapp: "+39 351 278 7962 / +39 350 902 5271 / +39 389 766 3723",
    whatsappPrimaryHref: "https://wa.me/393512787962",
    whatsappSecondaryHref: "https://wa.me/393509025271",
    whatsappTertiaryHref: "https://wa.me/393897663723",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Corso+Peschiera+162A%2C+Zona+Piazza+Sabotino%2C+Torino%2C+Italia",
    image: "/manus-storage/torino-corso-peschiera_d5f689f8.png",
    imageAlt: "Fachada de la sede de servicios de envío en Corso Peschiera, Torino",
  },
} as const;

interface ShipmentData {
  id: number;
  orderNumber: string;
  code: string;
  status: string;
  events: Array<{
    stage: string;
    date: string;
    description: string;
  }>;
  senderName?: string | null;
  senderLastName?: string | null;
  senderDni?: string | null;
  senderPhone?: string | null;
  recipientName?: string | null;
  recipientLastName?: string | null;
  recipientDni?: string | null;
  recipientPhone?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  paymentStatus?: string | null;
  finalPriceEur?: string | number | null;
  basePriceEur?: string | number | null;
  manualPriceEur?: string | number | null;
  route?: string | null;
  destinationAddress?: string | null;
  requiresApostilleService?: number | boolean | null;
}

function getTrackedShipmentPriceEur(shipment: ShipmentData): number | null {
  for (const candidate of [shipment.finalPriceEur, shipment.basePriceEur, shipment.manualPriceEur]) {
    if (candidate === null || candidate === undefined || String(candidate).trim() === "") continue;
    const price = Number(candidate);
    if (Number.isFinite(price) && price >= 0) return price;
  }
  return null;
}

export function LocationsSection() {
  return (
    <section id="sedes" aria-labelledby="locations-title" className="mt-12 scroll-mt-28 md:mt-20">
      <div className="mb-7 flex flex-col gap-3 md:mb-9 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#F28C00]">Atención presencial</p>
          <h2 id="locations-title" className="mt-2 text-3xl font-extrabold tracking-tight text-[#0B2B5E] md:text-4xl">Ubícanos</h2>
        </div>
        <p className="max-w-md text-base leading-7 text-slate-600 md:text-right">Encuentra la sede que necesitas y abre la ruta directamente en Google Maps.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="overflow-hidden rounded-3xl border-0 bg-white shadow-[0_18px_50px_-24px_rgba(11,43,94,0.45)] ring-1 ring-slate-200 transition duration-200 hover:-translate-y-1 hover:shadow-[0_24px_55px_-24px_rgba(11,43,94,0.5)]">
          <div className="h-2.5 bg-[#F28C00]" />
          <img src={LOCATION_DETAILS.lima.image} alt={LOCATION_DETAILS.lima.imageAlt} className="h-56 w-full object-cover object-center sm:h-64" loading="lazy" />
          <div className="p-6 md:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-[#F28C00]">Sede Lima</p>
                <h3 className="mt-2 text-2xl font-extrabold text-[#0B2B5E]">{LOCATION_DETAILS.lima.label}</h3>
              </div>
              <div className="rounded-2xl bg-orange-50 p-3 text-[#F28C00]" aria-hidden="true"><MapPin className="h-6 w-6" /></div>
            </div>
            <div className="space-y-5 text-base leading-7 text-slate-700">
              <p className="flex gap-3"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#F28C00]" aria-hidden="true" /><span>{LOCATION_DETAILS.lima.address}</span></p>
              <p className="flex gap-3"><span className="mt-0.5 h-5 w-5 shrink-0 text-center text-sm font-bold text-[#F28C00]" aria-hidden="true">R</span><span>{LOCATION_DETAILS.lima.reference}</span></p>
              <p className="flex gap-3"><Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-[#F28C00]" aria-hidden="true" /><span>{LOCATION_DETAILS.lima.hours}</span></p>
              <p className="flex gap-3"><Phone className="mt-0.5 h-5 w-5 shrink-0 text-[#F28C00]" aria-hidden="true" /><span className="space-y-1"><a className="block font-semibold text-[#0B2B5E] hover:underline" href={LOCATION_DETAILS.lima.phoneHref} aria-label={`Teléfono fijo ${LOCATION_DETAILS.lima.phone}`}>Teléfono fijo: {LOCATION_DETAILS.lima.phone}</a><span className="block"><span className="font-medium">Celular / WhatsApp: </span><a className="font-semibold text-[#0B2B5E] hover:underline" href={LOCATION_DETAILS.lima.whatsappHref} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp +51 970 188 447">+51 970 188 447</a><span> / </span><a className="font-semibold text-[#0B2B5E] hover:underline" href={LOCATION_DETAILS.lima.whatsappSecondHref} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp +51 908 722 617">+51 908 722 617</a></span></span></p>
            </div>
            <a href={LOCATION_DETAILS.lima.mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0B2B5E] px-5 py-3 text-base font-bold text-white transition hover:bg-[#123b78] focus:outline-none focus:ring-2 focus:ring-[#F28C00] focus:ring-offset-2">
              Abrir Lima en Google Maps <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </Card>

        <Card className="overflow-hidden rounded-3xl border-0 bg-white shadow-[0_18px_50px_-24px_rgba(11,43,94,0.45)] ring-1 ring-slate-200 transition duration-200 hover:-translate-y-1 hover:shadow-[0_24px_55px_-24px_rgba(11,43,94,0.5)]">
          <div className="h-2.5 bg-[#0B2B5E]" />
          <img src={LOCATION_DETAILS.torino.image} alt={LOCATION_DETAILS.torino.imageAlt} className="h-56 w-full object-cover object-center sm:h-64" loading="lazy" />
          <div className="p-6 md:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-[#0B2B5E]">Sede Torino</p>
                <h3 className="mt-2 text-2xl font-extrabold text-[#0B2B5E]">{LOCATION_DETAILS.torino.label}</h3>
              </div>
              <div className="rounded-2xl bg-blue-50 p-3 text-[#0B2B5E]" aria-hidden="true"><MapPin className="h-6 w-6" /></div>
            </div>
            <div className="space-y-5 text-base leading-7 text-slate-700">
              <p className="flex gap-3"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#0B2B5E]" aria-hidden="true" /><span>{LOCATION_DETAILS.torino.address}</span></p>
              <p className="flex gap-3"><span className="mt-0.5 h-5 w-5 shrink-0 text-center text-sm font-bold text-[#0B2B5E]" aria-hidden="true">R</span><span>{LOCATION_DETAILS.torino.reference}</span></p>
              <p className="flex gap-3"><Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-[#0B2B5E]" aria-hidden="true" /><span>{LOCATION_DETAILS.torino.hours}</span></p>
              <p className="flex gap-3"><Phone className="mt-0.5 h-5 w-5 shrink-0 text-[#0B2B5E]" aria-hidden="true" /><span className="space-y-1"><span className="block font-medium">WhatsApp Torino:</span><span className="block"><a className="font-semibold text-[#0B2B5E] hover:underline" href={LOCATION_DETAILS.torino.whatsappPrimaryHref} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp Torino +39 351 278 7962">+39 351 278 7962</a><span> / </span><a className="font-semibold text-[#0B2B5E] hover:underline" href={LOCATION_DETAILS.torino.whatsappSecondaryHref} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp Torino +39 350 902 5271">+39 350 902 5271</a><span> / </span><a className="font-semibold text-[#0B2B5E] hover:underline" href={LOCATION_DETAILS.torino.whatsappTertiaryHref} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp Torino +39 389 766 3723">+39 389 766 3723</a></span></span></p>
            </div>
            <a href={LOCATION_DETAILS.torino.mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0B2B5E] px-5 py-3 text-base font-bold text-white transition hover:bg-[#123b78] focus:outline-none focus:ring-2 focus:ring-[#F28C00] focus:ring-offset-2">
              Abrir Torino en Google Maps <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </Card>
      </div>
    </section>
  );
}

export default function Home() {
  const [shipmentData, setShipmentData] = useState<ShipmentData | null>(null);
  const [showLocations, setShowLocations] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const trackedPriceEur = shipmentData ? getTrackedShipmentPriceEur(shipmentData) : null;
  const [searchParams, setSearchParams] = useState<SearchFormData | null>(null);
  const pickupRoute = shipmentData ? getRoutePresentation(shipmentData.route, shipmentData.destinationAddress) : null;

  // Load search params from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const order = params.get('order');
    const code = params.get('code');
    if (order && code) {
      // Normalizar: remover espacios y convertir a mayúsculas
      const normalizedOrder = formatTrackingOrderInput(normalizeTrackingValue(order));
      const normalizedCode = formatTrackingCodeInput(normalizeTrackingValue(code));
      setSearchParams({ orderNumber: normalizedOrder, code: normalizedCode });
      reset({ orderNumber: normalizedOrder, code: normalizedCode });
    }
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
  });

  const orderInputValue = watch("orderNumber", "");
  const codeInputValue = watch("code", "");
  const orderInputError = orderInputValue ? getTrackingOrderError(orderInputValue) : null;
  const codeInputError = codeInputValue ? getTrackingCodeError(codeInputValue) : null;

  const { data: searchResult, isLoading: isSearching, error: searchQueryError } = trpc.shipment.search.useQuery(
    searchParams || { orderNumber: "", code: "" },
    { enabled: !!searchParams }
  );

  // Handle search results
  useEffect(() => {
    if (searchResult) {
      setShipmentData(searchResult);
      setSearchError(null);

      // Generate QR code for this shipment
      (async () => {
        try {
          const trackingUrl = buildTrackingUrl(searchResult.orderNumber, searchResult.code);
          const qrUrl = await QRCode.toDataURL(trackingUrl, {
            ...TRACKING_QR_OPTIONS,
            width: 300,
          });
          setQrCodeUrl(qrUrl);
        } catch (err) {
          console.error("Error generating QR code:", err);
        }
      })();
    }
  }, [searchResult]);

  // Handle search errors
  useEffect(() => {
    if (searchQueryError) {
      setSearchError(searchQueryError.message || "Envío no encontrado. Verifica los datos.");
      setShipmentData(null);
      setQrCodeUrl(null);
    }
  }, [searchQueryError]);

  const handleClearTracking = () => {
    reset({ orderNumber: "", code: "" });
    setValue("orderNumber", "");
    setValue("code", "");
    setSearchParams(null);
    setShipmentData(null);
    setQrCodeUrl(null);
    setSearchError(null);
    window.history.replaceState({}, "", window.location.pathname);
  };

  const onSubmit = (data: SearchFormData) => {
    // Normalizar: remover espacios y convertir a mayúsculas
    const normalizedOrder = normalizeTrackingValue(data.orderNumber);
    const normalizedCode = normalizeTrackingValue(data.code);
    setSearchParams({ orderNumber: normalizedOrder, code: normalizedCode });
    // Update URL with search params
    const newUrl = buildTrackingPath(normalizedOrder, normalizedCode);
    window.history.replaceState({}, '', newUrl);
  };

  const handleQRScan = (scannedData: string) => {
    // Parse QR data (format: order=XXX&code=YYY)
    try {
      const url = new URL(scannedData, window.location.origin);
      const order = url.searchParams.get("order");
      const code = url.searchParams.get("code");

      if (order && code) {
        const normalizedOrder = formatTrackingOrderInput(normalizeTrackingValue(order));
        const normalizedCode = formatTrackingCodeInput(normalizeTrackingValue(code));
        setShipmentData(null);
        setQrCodeUrl(null);
        setSearchError(null);
        reset({ orderNumber: normalizedOrder, code: normalizedCode });
        setSearchParams({ orderNumber: normalizedOrder, code: normalizedCode });
        window.history.replaceState({}, "", buildTrackingPath(normalizedOrder, normalizedCode));
        setScannerOpen(false);
      }
    } catch (err) {
      console.error("Error parsing QR data:", err);
      setSearchError("El QR no contiene un enlace de rastreo válido.");
    }
  };

  return (
    <div className="public-surface min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b-4 border-[#F28C00] bg-[#0B2B5E] text-white shadow-xl">
        <div className="mx-auto w-[min(96vw,1560px)] px-5 sm:px-7 lg:px-10">
          <div className="flex min-h-[76px] items-center justify-between gap-4 py-3 sm:min-h-[88px] sm:py-4">
            <a href="/" className="flex items-center gap-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F28C00] focus:ring-offset-2 focus:ring-offset-[#0B2B5E]">
              <img src="/manus-storage/servicom_logo_final_e7ce35aa.png" alt="Servicom Internacional" className="h-16 w-16 rounded-xl bg-white p-1.5 object-contain shadow-md sm:h-20 sm:w-20" />
              <span>
                <span className="block text-xl font-extrabold tracking-tight sm:text-2xl lg:text-3xl">Servicom Internacional</span>
                <span className="mt-1 hidden text-sm font-semibold text-blue-100 sm:block sm:text-base">Rastreo seguro de tus envíos</span>
                <span className="mt-1 hidden text-xs text-blue-200 sm:block sm:text-sm">Documentos y encomiendas · RUC 20615004708</span>
              </span>
            </a>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" aria-label="Abrir menú principal" className="h-12 w-12 rounded-xl border border-white/25 p-0 text-white hover:bg-white/15 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#F28C00] focus:ring-offset-2 focus:ring-offset-[#0B2B5E]"><MoreVertical className="h-7 w-7" aria-hidden="true" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl border-slate-200 p-2 shadow-xl">
                <DropdownMenuItem onSelect={() => setShowLocations(false)} className="cursor-pointer rounded-lg px-3 py-2.5 text-base font-semibold">Rastreo</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setShowLocations(true)} className="cursor-pointer rounded-lg px-3 py-2.5 text-base font-semibold">Ubicación presencial</DropdownMenuItem>
                <DropdownMenuItem asChild><a href="/movil" className="cursor-pointer rounded-lg px-3 py-2.5 text-base font-semibold">App móvil</a></DropdownMenuItem>
                <DropdownMenuItem asChild><a href="/cuenta" className="cursor-pointer rounded-lg px-3 py-2.5 text-base font-semibold">Cliente</a></DropdownMenuItem>
                <DropdownMenuItem asChild><a href="/admin" className="cursor-pointer rounded-lg px-3 py-2.5 text-base font-semibold text-[#0B2B5E]">Admin</a></DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

            <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-8 md:py-12 lg:px-10">
        {showLocations ? (
          <LocationsSection />
        ) : (
          <>
        {/* Search Form */}
            <section id="rastreo" className="scroll-mt-28 rounded-[2rem] bg-white p-1 shadow-[0_20px_60px_-32px_rgba(11,43,94,0.38)] ring-1 ring-slate-200">
              <Card className="rounded-[1.75rem] border-0 bg-white p-4 shadow-none sm:p-9 lg:p-12">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="mb-7">
                <h1 className="text-3xl font-extrabold tracking-tight text-[#0B2B5E] sm:text-4xl">Rastreo de envíos Servicom Internacional</h1>
                <h2 className="mt-2 text-lg font-semibold text-slate-600 sm:text-xl">Consulta el estado de tu envío</h2>
              </div>
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <div>
                  <label className="mb-2 block text-base font-bold text-slate-800" htmlFor="orderNumber">Número de orden</label>
                  <Input id="orderNumber" inputMode="numeric" autoComplete="off" maxLength={TRACKING_ORDER_MAX_INPUT_LENGTH} aria-invalid={Boolean(orderInputError || errors.orderNumber)} aria-describedby={orderInputError || errors.orderNumber ? "orderNumber-error" : undefined} placeholder="Ej.: 0826-0019" {...register("orderNumber", { onChange: (event) => setValue("orderNumber", formatTrackingOrderInput(event.target.value), { shouldValidate: false }) })} className={`h-14 rounded-xl border-2 px-4 text-base shadow-sm focus:border-[#0B2B5E] focus:ring-4 focus:ring-[#0B2B5E]/10 sm:text-lg ${orderInputError || errors.orderNumber ? "border-red-600 bg-red-50/40" : "border-slate-200"}`} />
                  {(orderInputError || errors.orderNumber) && <p id="orderNumber-error" className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold leading-6 text-red-700" role="alert">{orderInputError || errors.orderNumber?.message}</p>}
                </div>

                <div>
                  <label className="mb-2 block text-base font-bold text-slate-800" htmlFor="code">Código de envío</label>
                  <Input id="code" maxLength={TRACKING_CODE_MAX_LENGTH} aria-invalid={Boolean(codeInputError || errors.code)} aria-describedby={codeInputError || errors.code ? "code-error" : undefined} placeholder={`Ej.: ${SHIPMENT_CODE_EXAMPLE}`} {...register("code", { onChange: (event) => setValue("code", formatTrackingCodeInput(event.target.value), { shouldValidate: false }) })} className={`h-14 rounded-xl border-2 px-4 text-base uppercase shadow-sm focus:border-[#0B2B5E] focus:ring-4 focus:ring-[#0B2B5E]/10 sm:text-lg ${codeInputError || errors.code ? "border-red-600 bg-red-50/40" : "border-slate-200"}`} />
                  {(codeInputError || errors.code) && <p id="code-error" className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold leading-6 text-red-700" role="alert">{codeInputError || errors.code?.message}</p>}
                </div>
              </div>

              {(searchError || errors.orderNumber || errors.code) && (
                <div className="flex gap-3 rounded-xl border-2 border-red-300 bg-red-50 p-4 shadow-sm" role="alert" aria-live="assertive">
                  <AlertCircle className="mt-0.5 h-6 w-6 shrink-0 text-red-700" />
                  <div>
                    <p className="text-base font-extrabold text-red-800">Revisa los datos marcados en rojo</p>
                    {searchError && <p className="mt-1 text-sm font-semibold leading-6 text-red-700">{searchError}</p>}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <Button type="submit" disabled={isSearching} className="min-h-14 flex-1 rounded-xl bg-[#F28C00] px-6 text-base font-extrabold text-white shadow-lg shadow-[#F28C00]/25 transition hover:bg-[#d97700] sm:text-lg">
                  {isSearching ? <><Spinner className="mr-2 h-5 w-5" /> Buscando envío...</> : <><Search className="mr-2 h-5 w-5" /> Rastrear envío <ArrowRight className="ml-2 h-5 w-5" /></>}
                </Button>
                <Button type="button" variant="outline" onClick={() => setScannerOpen(true)} className="min-h-14 rounded-xl border-2 border-[#F28C00] bg-white px-6 text-base font-extrabold text-[#A85F00] transition hover:bg-orange-50 sm:text-lg">
                  <QrCode className="mr-2 h-5 w-5" /> <span>Escanear QR</span>
                </Button>
                <Button type="button" variant="outline" onClick={handleClearTracking} className="min-h-14 rounded-xl border-2 border-slate-300 bg-white px-6 text-base font-extrabold text-slate-700 transition hover:bg-slate-50 sm:text-lg">
                  Limpiar
                </Button>
              </div>
              <TrackingJourneyAnimation status={shipmentData?.status} className="mt-6" />
            </form>
          </Card>
        </section>

        {/* Results */}
        {shipmentData && (
          <div className="space-y-8">
            {/* Shipment Info Card */}
            <Card className="rounded-3xl border-0 bg-gradient-to-br from-[#0B2B5E]/8 via-white to-white p-5 shadow-[0_18px_50px_-24px_rgba(11,43,94,0.45)] ring-1 ring-[#0B2B5E]/10 sm:p-7 lg:p-8">
              <div className={`grid grid-cols-1 gap-5 sm:grid-cols-2 ${trackedPriceEur !== null ? "md:grid-cols-5" : "md:grid-cols-4"} md:gap-6`}>
                <div>
                  <p className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Número de orden</p>
                  <p className="break-all text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl">
                    {shipmentData.orderNumber}
                  </p>
                </div>
                <div>
                  <p className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Código de envío</p>
                  <p className="break-all text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl">
                    {shipmentData.code}
                  </p>
                </div>
                <div>
                  <p className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Estado actual</p>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-[#F28C00] shadow-[0_0_0_5px_rgba(242,140,0,0.15)]" />
                    <p className="text-xl font-extrabold text-[#0B2B5E] sm:text-2xl">
                      {shipmentData.status}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Estado de pago</p>
                  <span className={`inline-flex rounded-md px-2.5 py-1 text-sm font-semibold ${getPaymentStatusUi(shipmentData.paymentStatus).badgeClass}`}>
                    {getPaymentStatusUi(shipmentData.paymentStatus).label}
                  </span>
                </div>
                {trackedPriceEur !== null && <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 px-4 py-3 shadow-sm">
                  <p className="text-xs font-extrabold uppercase tracking-wide text-blue-700">{shipmentData.paymentStatus === "Pagado" ? "Precio pagado" : "Monto total"}</p>
                  <p className="mt-1 text-3xl font-black tracking-tight text-blue-700 sm:text-4xl">{trackedPriceEur.toFixed(2)} <span className="text-lg font-extrabold">EUR</span></p>
                </div>}
              </div>
            </Card>

            {pickupRoute && <Card aria-label="Ruta y sede de recojo" className="rounded-3xl border-0 bg-gradient-to-r from-amber-50 to-white p-5 shadow-[0_18px_50px_-24px_rgba(180,83,9,0.35)] ring-1 ring-amber-200 sm:p-7 lg:p-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex gap-4">
                  <div className="rounded-2xl bg-amber-100 p-3 text-[#F28C00]" aria-hidden="true"><MapPin className="h-6 w-6" /></div>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wide text-[#A85F00]">Ruta del envío</p>
                    <h3 className="mt-2 text-2xl font-extrabold text-[#0B2B5E] sm:text-3xl">{pickupRoute.route}</h3>
                    <p className="mt-2 text-base leading-7 text-slate-700">Origen: <strong>{pickupRoute.originLabel}</strong> · Destino: <strong>{pickupRoute.destinationLabel}</strong></p>
                  </div>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-white p-5 md:max-w-md">
                  <p className="text-sm font-bold uppercase tracking-wide text-[#A85F00]">Sede de recojo</p>
                  <h4 className="mt-2 text-xl font-extrabold text-[#0B2B5E]">Recojo en {pickupRoute.destinationLabel}</h4>
                  <p className="mt-2 text-sm font-semibold text-slate-800">{pickupRoute.destination.officeLabel}</p>
                  <p className="mt-2 text-base leading-7 text-slate-700">{pickupRoute.destination.address}</p>
                  <p className="mt-2 text-xs text-slate-600">Contacto: {pickupRoute.destination.phone}</p>
                </div>
              </div>
            </Card>}

            {(shipmentData.requiresApostilleService === true || Number(shipmentData.requiresApostilleService) === 1) && (
              <Card aria-label="Servicio solicitado" className="border-0 bg-gradient-to-r from-blue-50 to-white p-4 shadow-lg ring-1 ring-[#0B2B5E]/20 md:p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#0B2B5E]">Servicio solicitado</p>
                <p className="mt-1 text-lg font-bold text-[#0B2B5E]">Documentos para apostillar</p>
                <p className="mt-1 text-sm text-slate-700">Registro confirmado para la ruta Torino – Lima.</p>
              </Card>
            )}

            {/* Sender and recipient */}
            {(shipmentData.senderName || shipmentData.recipientName) && (
              <Card className="rounded-3xl border-0 p-5 shadow-[0_18px_50px_-24px_rgba(11,43,94,0.35)] sm:p-7 lg:p-8">
                <h3 className="mb-5 text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">Información de las personas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {shipmentData.senderName && (
                    <div className="rounded-lg bg-blue-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-2">Remitente</p>
                      <p className="text-lg font-extrabold text-gray-900">{shipmentData.senderName} {shipmentData.senderLastName || ""}</p>
                      {shipmentData.senderDni && <p className="text-sm text-gray-600 mt-1">DNI: {shipmentData.senderDni}</p>}
                      {shipmentData.senderPhone && <p className="text-sm text-gray-600">Celular: {formatPhoneNumber(shipmentData.senderPhone)}</p>}
                    </div>
                  )}
                  {shipmentData.recipientName && (
                    <div className="rounded-lg bg-orange-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-orange-700 mb-2">Destinatario</p>
                      <p className="text-lg font-extrabold text-gray-900">{shipmentData.recipientName} {shipmentData.recipientLastName || ""}</p>
                      {shipmentData.recipientDni && <p className="text-sm text-gray-600 mt-1">DNI: {shipmentData.recipientDni}</p>}
                      {shipmentData.recipientPhone && <p className="text-sm text-gray-600">Celular: {formatPhoneNumber(shipmentData.recipientPhone)}</p>}
                    </div>
                  )}
                </div>
                {shipmentData.notes && (
                  <div className="mt-4 rounded-lg bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1">Notas</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{shipmentData.notes}</p>
                  </div>
                )}
              </Card>
            )}

            {/* Timeline */}
            <Card className="rounded-3xl border-0 p-5 shadow-[0_18px_50px_-24px_rgba(11,43,94,0.35)] sm:p-7 lg:p-8">
              <h3 className="mb-2 text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">Historial de seguimiento</h3>
              <p className="mb-3 text-base text-slate-600">Consulta cada etapa de tu envío de origen a destino.</p>
              <ShipmentTimeline
                events={shipmentData.events}
                currentStatus={shipmentData.status}
              />
            </Card>

            {/* QR Code */}
            {qrCodeUrl && (
              <Card className="rounded-3xl border-0 p-5 shadow-[0_18px_50px_-24px_rgba(11,43,94,0.35)] sm:p-7 lg:p-8">
                <h3 className="mb-5 text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">Código QR de rastreo</h3>
                <div className="flex flex-col items-center gap-4">
                  <img
                    src={qrCodeUrl}
                    alt="QR Code"
                    className="w-48 md:w-64 h-48 md:h-64 border-4 border-primary rounded-lg p-2 bg-white"
                  />
                  <p className="text-xs md:text-sm text-gray-600 text-center">
                    Escanea este código QR para compartir el rastreo de tu envío
                  </p>
                  <Button
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = qrCodeUrl;
                      link.download = `qr-${shipmentData.orderNumber}.png`;
                      link.click();
                    }}
                    className="bg-primary hover:bg-primary/90 text-white"
                  >
                    Descargar QR
                  </Button>
                </div>
              </Card>
            )}

            {/* New Search Button */}
            <div className="flex justify-center py-2">
              <Button
                onClick={() => {
                  reset();
                  setSearchParams(null);
                  setShipmentData(null);
                  setQrCodeUrl(null);
                  setSearchError(null);
                  window.history.replaceState({}, "", window.location.pathname);
                }}
                variant="outline"
                className="border-2 border-primary text-primary hover:bg-primary/5"
              >
                Buscar otro envío
              </Button>
            </div>
          </div>
        )}

          </>
        )}
      </main>

      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleQRScan}
      />

      {showLocations && (
      <>
      {/* Footer */}
      <footer className="mt-16 bg-[#0B2B5E] py-12 text-white">
        <div className="mx-auto w-[min(96vw,1560px)] px-5 sm:px-7 lg:px-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-bold mb-2">Servicom Internacional</h3>
              <p className="text-gray-400 text-sm mb-4">
                Servicom Internacional (RUC 20615004708), tu aliado estratégico para el envío seguro de documentos a nivel internacional.
              </p>
              <p className="text-gray-400 text-sm">
                Tu mejor opción en el mundo.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4">Información de Contacto</h3>
              <div className="space-y-2 text-sm text-gray-400">
                <p><strong>Email:</strong> peruservicom@gmail.com</p>
                <p><strong>Lima — Celular / WhatsApp:</strong> <a className="hover:text-white hover:underline" href={LOCATION_DETAILS.lima.whatsappHref} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp +51 970 188 447">+51 970 188 447</a> / <a className="hover:text-white hover:underline" href={LOCATION_DETAILS.lima.whatsappSecondHref} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp +51 908 722 617">+51 908 722 617</a></p>
                <p><strong>Lima — Teléfono fijo:</strong> <a className="hover:text-white hover:underline" href={LOCATION_DETAILS.lima.phoneHref}>01 390 7269</a></p>
                <p><strong>Torino — WhatsApp:</strong> <a className="hover:text-white hover:underline" href={LOCATION_DETAILS.torino.whatsappPrimaryHref} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp Torino +39 351 278 7962">+39 351 278 7962</a> / <a className="hover:text-white hover:underline" href={LOCATION_DETAILS.torino.whatsappSecondaryHref} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp Torino +39 350 902 5271">+39 350 902 5271</a> / <a className="hover:text-white hover:underline" href={LOCATION_DETAILS.torino.whatsappTertiaryHref} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp Torino +39 389 766 3723">+39 389 766 3723</a></p>
                <p><strong>Servicio:</strong> Envío de documentos internacionales</p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-6 text-center text-sm text-gray-400">
            <p><strong>Servicom Internacional</strong></p>
            <p className="mt-2">© 2026 Servicom Internacional. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
      </>
      )}
    </div>
  );
}
