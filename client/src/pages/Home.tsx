import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Package, QrCode, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { ShipmentTimeline } from "@/components/ShipmentTimeline";
import { QRScanner } from "@/components/QRScanner";
import QRCode from "qrcode";
import { buildTrackingPath, buildTrackingUrl, TRACKING_QR_OPTIONS, normalizeTrackingValue } from "@/lib/tracking";

const searchSchema = z.object({
  orderNumber: z.string().min(1, "Número de orden requerido"),
  code: z.string().min(1, "Código requerido"),
});

type SearchFormData = z.infer<typeof searchSchema>;

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
}

export default function Home() {
  const [shipmentData, setShipmentData] = useState<ShipmentData | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useState<SearchFormData | null>(null);

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
    window.history.pushState({}, '', newUrl);
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
        reset({ orderNumber: normalizedOrder, code: normalizedCode });
        setSearchParams({ orderNumber: normalizedOrder, code: normalizedCode });
        window.history.pushState({}, "", buildTrackingPath(normalizedOrder, normalizedCode));
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
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2 md:gap-3">
              <img src="/manus-storage/servicom_logo_final_e7ce35aa.png" alt="Servicom Internacional" className="h-16 md:h-20 w-auto object-contain bg-white rounded-md p-1" />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => window.location.href = '/cuenta'} className="text-white hover:bg-white/20 px-3 py-1 rounded text-sm font-medium transition">
                Mi cuenta
              </button>
              <button onClick={() => window.location.href = '/admin'} className="text-white hover:bg-white/20 px-3 py-1 rounded text-sm font-medium transition">
                Admin
              </button>
            </div>
          </div>
            <p className="text-primary-foreground opacity-90 text-sm md:text-base">
            Rastreo de encomiendas en tiempo real
            </p>
            <p className="text-primary-foreground/80 text-xs md:text-sm mt-1">
              Servicom Internacional en colaboración con Kasega Tour EIRL · RUC 20615004708
            </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 md:py-8">
        {/* Search Form */}
        <Card className="p-4 md:p-6 mb-6 md:mb-8 shadow-lg border-0">
          <h2 className="text-lg md:text-xl font-semibold mb-4 md:mb-6 text-gray-900">
            Rastrear tu encomienda
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                  Número de Orden
                </label>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
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
              </div>
            </Card>

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
                      {shipmentData.senderPhone && <p className="text-sm text-gray-600">Celular: {shipmentData.senderPhone}</p>}
                    </div>
                  )}
                  {shipmentData.recipientName && (
                    <div className="rounded-lg bg-orange-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-orange-700 mb-2">Destinatario</p>
                      <p className="font-semibold text-gray-900">{shipmentData.recipientName} {shipmentData.recipientLastName || ""}</p>
                      {shipmentData.recipientDni && <p className="text-sm text-gray-600 mt-1">DNI: {shipmentData.recipientDni}</p>}
                      {shipmentData.recipientPhone && <p className="text-sm text-gray-600">Celular: {shipmentData.recipientPhone}</p>}
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
                Servicom Internacional en colaboración con Kasega Tour EIRL (RUC 20615004708), tu aliado para servicios documentarios, financieros y de encomiendas.
              </p>
              <p className="text-gray-400 text-sm">
                Soluciones confiables, ágiles y pensadas para ti.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4">Información de Contacto</h3>
              <div className="space-y-2 text-sm text-gray-400">
                <p><strong>Email:</strong> peruservicom@gmail.com</p>
                <p><strong>Celular / WhatsApp:</strong> +51 970 188 447 / +51 908 722 617</p>
                <p><strong>Teléfono fijo:</strong> 01 390 7269</p>
                <p><strong>Servicio:</strong> Rastreo de encomiendas</p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-6 text-center text-sm text-gray-400">
            <p><strong>Servicom Internacional</strong> en colaboración con Kasega Tour EIRL</p>
            <p className="mt-2">© 2026 Servicom Internacional. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
