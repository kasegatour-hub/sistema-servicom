import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Package, QrCode, AlertCircle, MapPin, Clock3, Phone, ExternalLink, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { ShipmentTimeline } from "@/components/ShipmentTimeline";
import { QRScanner } from "@/components/QRScanner";
import QRCode from "qrcode";
import { buildTrackingPath, buildTrackingUrl, TRACKING_QR_OPTIONS, normalizeTrackingValue } from "@/lib/tracking";
import { getPaymentStatusUi } from "@/lib/paymentStatus";
import { formatPhoneNumber } from "@/lib/phoneFormatting";
import { getRoutePresentation } from "@/lib/routeDetails";

const searchSchema = z.object({
  orderNumber: z.string().min(1, "Número de orden requerido"),
  code: z.string().min(1, "Código requerido"),
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
  route?: string | null;
  destinationAddress?: string | null;
  requiresApostilleService?: number | boolean | null;
}

export function LocationsSection() {
  return (
    <section aria-labelledby="locations-title" className="mt-4 md:mt-8">
      <div className="mb-5 text-center md:text-left">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F28C00]">Atención presencial</p>
        <h2 id="locations-title" className="mt-1 text-2xl font-bold text-[#0B2B5E]">Ubícanos</h2>
        <p className="mt-2 text-sm text-slate-600">Visítanos en nuestras sedes de Lima y Torino.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="overflow-hidden border-0 bg-white shadow-lg ring-1 ring-slate-200">
          <div className="h-2 bg-[#F28C00]" />
          <div className="p-5 md:p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#F28C00]">Sede Lima</p>
                <h3 className="mt-1 text-xl font-bold text-[#0B2B5E]">{LOCATION_DETAILS.lima.label}</h3>
              </div>
              <div className="rounded-full bg-orange-50 p-2 text-[#F28C00]" aria-hidden="true"><MapPin className="h-5 w-5" /></div>
            </div>
            <div className="space-y-3 text-sm text-slate-700">
              <p className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#F28C00]" aria-hidden="true" /><span>{LOCATION_DETAILS.lima.address}</span></p>
              <p className="flex gap-2"><span className="mt-0.5 h-4 w-4 shrink-0 text-center text-xs font-bold text-[#F28C00]" aria-hidden="true">R</span><span>{LOCATION_DETAILS.lima.reference}</span></p>
              <p className="flex gap-2"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[#F28C00]" aria-hidden="true" /><span>{LOCATION_DETAILS.lima.hours}</span></p>
              <p className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-[#F28C00]" aria-hidden="true" /><span className="space-y-1"><a className="block font-semibold text-[#0B2B5E] hover:underline" href={LOCATION_DETAILS.lima.phoneHref} aria-label={`Teléfono fijo ${LOCATION_DETAILS.lima.phone}`}>Teléfono fijo: {LOCATION_DETAILS.lima.phone}</a><span className="block"><span className="font-medium">Celular / WhatsApp: </span><a className="font-semibold text-[#0B2B5E] hover:underline" href={LOCATION_DETAILS.lima.whatsappHref} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp +51 970 188 447">+51 970 188 447</a><span> / </span><a className="font-semibold text-[#0B2B5E] hover:underline" href={LOCATION_DETAILS.lima.whatsappSecondHref} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp +51 908 722 617">+51 908 722 617</a></span></span></p>
            </div>
            <a href={LOCATION_DETAILS.lima.mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#0B2B5E] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#123b78] focus:outline-none focus:ring-2 focus:ring-[#F28C00] focus:ring-offset-2">
              Abrir Lima en Google Maps <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </Card>

        <Card className="overflow-hidden border-0 bg-white shadow-lg ring-1 ring-slate-200">
          <div className="h-2 bg-[#0B2B5E]" />
          <div className="p-5 md:p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#0B2B5E]">Sede Torino</p>
                <h3 className="mt-1 text-xl font-bold text-[#0B2B5E]">{LOCATION_DETAILS.torino.label}</h3>
              </div>
              <div className="rounded-full bg-blue-50 p-2 text-[#0B2B5E]" aria-hidden="true"><MapPin className="h-5 w-5" /></div>
            </div>
            <div className="space-y-3 text-sm text-slate-700">
              <p className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#0B2B5E]" aria-hidden="true" /><span>{LOCATION_DETAILS.torino.address}</span></p>
              <p className="flex gap-2"><span className="mt-0.5 h-4 w-4 shrink-0 text-center text-xs font-bold text-[#0B2B5E]" aria-hidden="true">R</span><span>{LOCATION_DETAILS.torino.reference}</span></p>
              <p className="flex gap-2"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[#0B2B5E]" aria-hidden="true" /><span>{LOCATION_DETAILS.torino.hours}</span></p>
              <p className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-[#0B2B5E]" aria-hidden="true" /><span className="space-y-1"><span className="block font-medium">WhatsApp Torino:</span><span className="block"><a className="font-semibold text-[#0B2B5E] hover:underline" href={LOCATION_DETAILS.torino.whatsappPrimaryHref} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp Torino +39 351 278 7962">+39 351 278 7962</a><span> / </span><a className="font-semibold text-[#0B2B5E] hover:underline" href={LOCATION_DETAILS.torino.whatsappSecondaryHref} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp Torino +39 350 902 5271">+39 350 902 5271</a><span> / </span><a className="font-semibold text-[#0B2B5E] hover:underline" href={LOCATION_DETAILS.torino.whatsappTertiaryHref} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp Torino +39 389 766 3723">+39 389 766 3723</a></span></span></p>
            </div>
            <a href={LOCATION_DETAILS.torino.mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#0B2B5E] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#123b78] focus:outline-none focus:ring-2 focus:ring-[#F28C00] focus:ring-offset-2">
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
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useState<SearchFormData | null>(null);
  const pickupRoute = shipmentData ? getRoutePresentation(shipmentData.route, shipmentData.destinationAddress) : null;

  // Load search params from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const order = params.get('order');
    const code = params.get('code');
    if (order && code) {
      // Normalizar: remover espacios y convertir a mayúsculas
      const normalizedOrder = normalizeTrackingValue(order);
      const normalizedCode = normalizeTrackingValue(code);
      setSearchParams({ orderNumber: normalizedOrder, code: normalizedCode });
      reset({ orderNumber: normalizedOrder, code: normalizedCode });
    }
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
  });

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
        const normalizedOrder = normalizeTrackingValue(order);
        const normalizedCode = normalizeTrackingValue(code);
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="bg-primary text-white shadow-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 md:py-6">
          <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <img src="/manus-storage/servicom_logo_final_e7ce35aa.png" alt="Servicom Internacional" className="h-16 md:h-20 w-auto object-contain bg-white rounded-md p-1" />
            </div>
            <div className="flex flex-wrap items-center gap-1 self-start sm:self-auto">
              <button onClick={() => window.location.href = '/movil'} className="rounded px-2 py-2 text-xs font-medium text-white transition active:scale-[0.97] hover:bg-white/20 sm:px-3 sm:text-sm">
                App móvil
              </button>
              <button onClick={() => window.location.href = '/cuenta'} className="rounded px-2 py-2 text-xs font-medium text-white transition active:scale-[0.97] hover:bg-white/20 sm:px-3 sm:text-sm">
                Mi cuenta
              </button>
              <button onClick={() => window.location.href = '/admin'} className="rounded px-2 py-2 text-xs font-medium text-white transition active:scale-[0.97] hover:bg-white/20 sm:px-3 sm:text-sm">
                Admin
              </button>
            </div>
          </div>
            <p className="text-primary-foreground opacity-90 text-sm md:text-base font-bold">
            Rastreo de envíos de documentos en tiempo real
            </p>
            <p className="text-primary-foreground/80 text-xs md:text-sm mt-1">
              Servicom Internacional · RUC 20615004708
            </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 md:py-8">
        {/* Search Form */}
        <Card className="p-4 md:p-6 mb-6 md:mb-8 shadow-lg border-0">
          <h2 className="text-lg md:text-xl font-semibold mb-4 md:mb-6 text-gray-900">
            Rastrear tu envío de documento
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                  Número de Orden
                </label>
                <div className="h-4 mb-1">
                  <p className="text-[10px] text-gray-500 italic">El número de orden tiene 10 dígitos</p>
                </div>
                <Input
                  placeholder="Ej: 3520992723"
                  {...register("orderNumber")}
                  className="border-2 focus:border-primary text-sm"
                />
                {errors.orderNumber && (
                  <p className="text-red-600 text-xs md:text-sm mt-1">
                    {errors.orderNumber.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                  Código de Envío
                </label>
                <div className="h-4 mb-1">
                  <span className="text-[10px] text-transparent select-none">&nbsp;</span>
                </div>
                <Input
                  placeholder="Ej: CA06721WB"
                  {...register("code")}
                  className="border-2 focus:border-primary text-sm"
                />
                {errors.code && (
                  <p className="text-red-600 text-xs md:text-sm mt-1">
                    {errors.code.message}
                  </p>
                )}
              </div>
            </div>

            {searchError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 md:p-4 flex gap-2 md:gap-3">
                <AlertCircle className="w-4 md:w-5 h-4 md:h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-xs md:text-sm">{searchError}</p>
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-2 md:gap-3 pt-2">
              <Button
                type="submit"
                disabled={isSearching}
                className="flex-1 bg-primary hover:bg-primary/90 text-white font-semibold py-2 text-sm md:text-base"
              >
                {isSearching ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2" />
                    Buscando...
                  </>
                ) : (
                  "Rastrear Envío"
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setScannerOpen(true)}
                className="border-2 border-primary text-primary hover:bg-primary/5 text-sm md:text-base"
              >
                <QrCode className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Escanear QR</span>
                <span className="sm:hidden">QR</span>
              </Button>
            </div>
          </form>
        </Card>

        {/* Results */}
        {shipmentData && (
          <div className="space-y-8">
            {/* Shipment Info Card */}
            <Card className="p-4 md:p-6 shadow-lg border-0 bg-gradient-to-r from-primary/5 to-transparent">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                <div>
                  <p className="text-xs md:text-sm text-gray-600 mb-1">Número de Orden</p>
                  <p className="text-base md:text-lg font-bold text-gray-900">
                    {shipmentData.orderNumber}
                  </p>
                </div>
                <div>
                  <p className="text-xs md:text-sm text-gray-600 mb-1">Código de Envío</p>
                  <p className="text-base md:text-lg font-bold text-gray-900">
                    {shipmentData.code}
                  </p>
                </div>
                <div>
                  <p className="text-xs md:text-sm text-gray-600 mb-1">Estado Actual</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 md:w-3 h-2 md:h-3 bg-primary rounded-full" />
                    <p className="text-base md:text-lg font-bold text-primary">
                      {shipmentData.status}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs md:text-sm text-gray-600 mb-1">Estado de Pago</p>
                  <span className={`inline-flex rounded-md px-2.5 py-1 text-sm font-semibold ${getPaymentStatusUi(shipmentData.paymentStatus).badgeClass}`}>
                    {getPaymentStatusUi(shipmentData.paymentStatus).label}
                  </span>
                </div>
              </div>
            </Card>

            {pickupRoute && <Card aria-label="Ruta y sede de recojo" className="border-0 bg-gradient-to-r from-amber-50 to-white p-4 shadow-lg ring-1 ring-amber-200 md:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex gap-3">
                  <div className="rounded-full bg-amber-100 p-2 text-[#F28C00]" aria-hidden="true"><MapPin className="h-5 w-5" /></div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#A85F00]">Ruta del envío</p>
                    <h3 className="mt-1 text-xl font-bold text-[#0B2B5E]">{pickupRoute.route}</h3>
                    <p className="mt-1 text-sm text-slate-700">Origen: <strong>{pickupRoute.originLabel}</strong> · Destino: <strong>{pickupRoute.destinationLabel}</strong></p>
                  </div>
                </div>
                <div className="rounded-lg border border-amber-200 bg-white p-4 md:max-w-md">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#A85F00]">Sede de recojo</p>
                  <h4 className="mt-1 text-lg font-bold text-[#0B2B5E]">Recojo en {pickupRoute.destinationLabel}</h4>
                  <p className="mt-2 text-sm font-semibold text-slate-800">{pickupRoute.destination.officeLabel}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{pickupRoute.destination.address}</p>
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
              <Card className="p-4 md:p-6 shadow-lg border-0">
                <h3 className="text-lg md:text-xl font-semibold mb-4 text-gray-900">Información de las personas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {shipmentData.senderName && (
                    <div className="rounded-lg bg-blue-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-2">Remitente</p>
                      <p className="font-semibold text-gray-900">{shipmentData.senderName} {shipmentData.senderLastName || ""}</p>
                      {shipmentData.senderDni && <p className="text-sm text-gray-600 mt-1">DNI: {shipmentData.senderDni}</p>}
                      {shipmentData.senderPhone && <p className="text-sm text-gray-600">Celular: {formatPhoneNumber(shipmentData.senderPhone)}</p>}
                    </div>
                  )}
                  {shipmentData.recipientName && (
                    <div className="rounded-lg bg-orange-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-orange-700 mb-2">Destinatario</p>
                      <p className="font-semibold text-gray-900">{shipmentData.recipientName} {shipmentData.recipientLastName || ""}</p>
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
            <Card className="p-4 md:p-6 shadow-lg border-0">
              <h3 className="text-lg md:text-xl font-semibold mb-4 md:mb-6 text-gray-900">
                Historial de Seguimiento
              </h3>
              <ShipmentTimeline
                events={shipmentData.events}
                currentStatus={shipmentData.status}
              />
            </Card>

            {/* QR Code */}
            {qrCodeUrl && (
              <Card className="p-4 md:p-6 shadow-lg border-0">
                <h3 className="text-lg md:text-xl font-semibold mb-4 text-gray-900">
                  Código QR de Rastreo
                </h3>
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
            <div className="flex justify-center">
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

        {/* Empty State */}
        {!shipmentData && !isSearching && (
          <div className="text-center py-12 md:py-16">
            <Package className="w-12 md:w-16 h-12 md:h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-base md:text-lg">
              Ingresa los datos de tu envío para comenzar el rastreo
            </p>
          </div>
        )}

        <LocationsSection />
      </main>

      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleQRScan}
      />

      {/* Footer */}
      <footer className="bg-[#0B2B5E] text-white mt-12 py-8">
        <div className="max-w-4xl mx-auto px-4">
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
    </div>
  );
}
