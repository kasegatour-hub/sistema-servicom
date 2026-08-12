import { useState, useRef, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Lock, LogOut, Plus, RefreshCw, Download, Printer } from "lucide-react";
import QRCode from "qrcode";
import { buildTrackingUrl, TRACKING_QR_OPTIONS } from "@/lib/tracking";
import { PhoneInput } from "@/components/PhoneInput";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Contraseña requerida"),
});

const createShipmentSchema = z.object({
  status: z.enum(["En agencia", "En tránsito", "En destino", "Entregado"]),
  senderName: z.string().optional(),
  senderLastName: z.string().optional(),
  senderDni: z.string().optional(),
  senderPhone: z.string().optional(),
  recipientName: z.string().optional(),
  recipientLastName: z.string().optional(),
  recipientDni: z.string().optional(),
  recipientPhone: z.string().optional(),
  notes: z.string().optional(),
  documentCount: z.number().min(1).default(1),
  docType: z.enum(["simple", "apostillado"]).optional(),
  sheetCount: z.number().optional(),
  paymentCondition: z.string().optional(),
});

const updateStatusSchema = z.object({
  shipmentId: z.number(),
  newStatus: z.enum(["En agencia", "En tránsito", "En destino", "Entregado"]),
  description: z.string().optional(),
  senderName: z.string().optional(),
  senderLastName: z.string().optional(),
  senderDni: z.string().optional(),
  senderPhone: z.string().optional(),
  recipientName: z.string().optional(),
  recipientLastName: z.string().optional(),
  recipientDni: z.string().optional(),
  recipientPhone: z.string().optional(),
  notes: z.string().optional(),
  paymentCondition: z.string().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;
type CreateShipmentForm = z.infer<typeof createShipmentSchema>;
type UpdateStatusForm = z.infer<typeof updateStatusSchema>;

export default function AdminDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [admin, setAdmin] = useState<any>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedShipmentId, setSelectedShipmentId] = useState<number | null>(null);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [printShipment, setPrintShipment] = useState<any>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const printQrRef = useRef<HTMLCanvasElement>(null);

  // Queries
  const { data: shipments, isLoading: loadingShipments, refetch: refetchShipments } = trpc.admin.getAllShipments.useQuery(undefined, { enabled: isLoggedIn });

  // Mutations
  const loginMutation = trpc.admin.login.useMutation();
  const createMutation = trpc.admin.createShipment.useMutation();
  const updateMutation = trpc.admin.updateStatus.useMutation();
  const deleteMutation = trpc.admin.deleteShipment.useMutation();

  // Forms
  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const createForm = useForm<any>({
    resolver: zodResolver(createShipmentSchema),
    defaultValues: {
      status: 'En agencia',
      senderName: '',
      senderLastName: '',
      senderDni: '',
      senderPhone: '',
      recipientName: '',
      recipientLastName: '',
      recipientDni: '',
      recipientPhone: '',
      notes: '',
      documentCount: 1,
    },
  });
  const updateForm = useForm<UpdateStatusForm>({
    resolver: zodResolver(updateStatusSchema),
    defaultValues: {
      shipmentId: 0,
      newStatus: 'En agencia',
      description: '',
      senderName: '',
      senderLastName: '',
      senderDni: '',
      senderPhone: '',
      recipientName: '',
      recipientLastName: '',
      recipientDni: '',
      recipientPhone: '',
      notes: '',
    },
  });

  const handleLogin = async (data: LoginForm) => {
    try {
      const result = await loginMutation.mutateAsync(data);
      setAdmin(result);
      setIsLoggedIn(true);
      toast.success("Sesión iniciada correctamente");
    } catch (error: any) {
      toast.error(error.message || "Error al iniciar sesión");
    }
  };

  const handleCreateShipment = async (data: any) => {
    try {
      const result = await createMutation.mutateAsync(data);
      toast.success("Encomienda creada exitosamente");
      
      // Mostrar modal y generar QR
      const trackingUrl = buildTrackingUrl(data.orderNumber, data.code);
      setQrCode(trackingUrl);
      setShowQRModal(true);

      // Generar el mismo payload y color que usa la vista pública y el recibo.
      setTimeout(() => {
        if (qrCanvasRef.current) {
          QRCode.toCanvas(qrCanvasRef.current, trackingUrl, {
            ...TRACKING_QR_OPTIONS,
            width: 300,
          });
        }
      }, 100);
      
      createForm.reset();
      setShowCreateForm(false);
      refetchShipments();
    } catch (error: any) {
      toast.error(error.message || "Error al crear encomienda");
    }
  };

  const downloadQR = () => {
    if (qrCanvasRef.current) {
      const link = document.createElement('a');
      link.href = qrCanvasRef.current.toDataURL();
      link.download = `QR-${Date.now()}.png`;
      link.click();
    }
  };

  const handleUpdateStatus = async (data: UpdateStatusForm) => {
    try {
      await updateMutation.mutateAsync(data);
      toast.success("Estado actualizado correctamente");
      updateForm.reset();
      setShowUpdateForm(false);
      setSelectedShipmentId(null);
      refetchShipments();
    } catch (error: any) {
      toast.error(error.message || "Error al actualizar estado");
    }
  };

  const handleDeleteShipment = async (id: number) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta encomienda?')) {
      try {
        await deleteMutation.mutateAsync({ id });
        toast.success('Encomienda eliminada exitosamente');
        refetchShipments();
      } catch (error: any) {
        toast.error(error.message || 'Error al eliminar encomienda');
      }
    }
  };

  const handlePrintReceipt = (shipment: any) => {
    setPrintShipment(shipment);
    setTimeout(() => {
      if (printQrRef.current) {
        const trackingUrl = buildTrackingUrl(shipment.orderNumber, shipment.code);
        QRCode.toCanvas(printQrRef.current, trackingUrl, {
          ...TRACKING_QR_OPTIONS,
          width: 200,
        });
      }
    }, 100);
  };

  const printReceipt = async () => {
    if (!printShipment) return;
    const receiptUrl = new URL('/recibo', window.location.origin);
    receiptUrl.searchParams.set('order', String(printShipment.orderNumber));
    receiptUrl.searchParams.set('code', String(printShipment.code));
    const printWindow = window.open(receiptUrl.href, '_blank', 'width=800,height=900');
    if (printWindow) {
      const trackingUrl = buildTrackingUrl(printShipment.orderNumber, printShipment.code);
      const brandLogo = new URL('/manus-storage/servicom_logo_final_e7ce35aa.png', window.location.origin).href;
      const today = new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>INFORMACIÓN DE ENVÍO DE DOCUMENTO - Servicom Internacional</title>
          <style>
            @media print { .page-break { page-break-before: always; } }
            body { font-family: 'Helvetica', Arial, sans-serif; margin: 0; padding: 40px; color: #0B2B5E; line-height: 1.4; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #F28C00; padding-bottom: 10px; }
            .company-info { flex: 1; }
            .brand-logo { width: 150px; height: 76px; object-fit: contain; object-position: left center; display: block; margin-bottom: 8px; }
            .company { font-size: 26px; font-weight: bold; color: #0B2B5E; margin: 0; }
            .subtitle { font-size: 14px; color: #F28C00; font-weight: bold; margin-top: 2px; }
            .ruc-contact { font-size: 11px; color: #666; margin-top: 5px; }
            .digital-seal { border: 2px solid #0B2B5E; border-radius: 8px; padding: 10px; text-align: center; min-width: 200px; }
            .seal-title { font-weight: bold; font-size: 12px; color: #0B2B5E; border-bottom: 1px solid #0B2B5E; margin-bottom: 5px; padding-bottom: 3px; }
            .seal-details { font-size: 10px; text-align: left; }
            
            .main-title { text-align: center; font-size: 20px; font-weight: bold; margin: 20px 0; background: #f4f4f4; padding: 8px; border-radius: 4px; }
            
            .section { margin: 15px 0; }
            .section-title { font-weight: bold; font-size: 14px; border-left: 4px solid #F28C00; padding-left: 8px; margin-bottom: 10px; text-transform: uppercase; }
            .row { display: flex; margin: 4px 0; font-size: 13px; }
            .label { width: 160px; font-weight: bold; color: #444; }
            .value { flex: 1; border-bottom: 1px dotted #ccc; }
            
            .qr-container { display: flex; justify-content: space-around; align-items: center; margin: 30px 0; padding: 15px; background: #f9f9f9; border-radius: 10px; }
            .qr-box { text-align: center; }
            .qr-box canvas { width: 140px !important; height: 140px !important; }
            .qr-hint { font-size: 10px; margin-top: 5px; color: #666; }
            
            .cut-ticket { margin-top: 40px; border: 2px dashed #0B2B5E; padding: 15px; border-radius: 4px; position: relative; }
            .cut-icon { position: absolute; top: -12px; left: 20px; background: white; padding: 0 5px; font-size: 18px; }
            .ticket-header { font-weight: bold; font-size: 14px; margin-bottom: 10px; text-align: center; }
            
            .dj-title { text-align: center; margin-bottom: 30px; }
            .dj-content { font-size: 13px; text-align: justify; line-height: 1.6; }
            .dj-signature-area { display: flex; justify-content: space-between; margin-top: 60px; }
            .signature-box { width: 45%; text-align: center; border-top: 1px dashed #000; padding-top: 10px; }
            .fingerprint-box { width: 100px; height: 120px; border: 1px solid #000; margin: 0 auto 10px; }
            .dj-footer { text-align: center; font-size: 9px; color: #999; margin-top: 40px; }
          </style>
        </head>
        <body>
          <!-- PÁGINA 1: RECIBO E INFORMACIÓN -->
          <div class="header">
            <div class="company-info">
              <img class="brand-logo" src="${brandLogo}" alt="Servicom Internacional">
              <h1 class="company">SERVICOM INTERNACIONAL</h1>
              <div class="subtitle">SERVICOM INTERNACIONAL</div>
              <div class="ruc-contact">
                RUC: 20615004708 | Cel: +51 970188 447<br>
                Jr de la Unión 518 INT SOT101, Lima
              </div>
            </div>
            <div class="digital-seal">
              <div class="seal-title">FIRMADO DIGITALMENTE</div>
              <div class="seal-details">
                <strong>Titular:</strong> Servicom Internacional<br>
                <strong>RUC:</strong> 20615004708<br>
                <strong>Autenticidad:</strong> PIN 6341-1879
              </div>
            </div>
          </div>

          <div class="main-title">INFORMACIÓN DE ENVÍO DE DOCUMENTO</div>

          <div class="section">
            <div class="row"><div class="label">Orden:</div><div class="value">${printShipment.orderNumber}</div><div class="label" style="margin-left:20px">Cód. Envío:</div><div class="value">${printShipment.code}</div></div>
            <div class="row"><div class="label">Fecha:</div><div class="value">${new Date(printShipment.createdAt).toLocaleString()}</div></div>
          </div>

          <div class="section">
            <div class="section-title">Datos del Remitente</div>
            <div class="row"><div class="label">Remitente:</div><div class="value">${printShipment.senderName || ''} ${printShipment.senderLastName || ''}</div></div>
            <div class="row"><div class="label">Celular:</div><div class="value">${printShipment.senderPhone || ''}</div><div class="label" style="margin-left:20px">DNI/RUC:</div><div class="value">${printShipment.senderDni || ''}</div></div>
          </div>

          <div class="section">
            <div class="section-title">Datos del Destinatario</div>
            <div class="row"><div class="label">Destinatario:</div><div class="value">${printShipment.recipientName || ''} ${printShipment.recipientLastName || ''}</div></div>
            <div class="row"><div class="label">Celular:</div><div class="value">${printShipment.recipientPhone || ''}</div><div class="label" style="margin-left:20px">DNI/C.I.:</div><div class="value">${printShipment.recipientDni || ''}</div></div>
          </div>

          <div class="section">
            <div class="section-title">Condición de Pago y Descripción</div>
            <div style="font-size: 12px; border: 1px solid #eee; padding: 8px; background: #fafafa;">
              <strong>Condición de Pago:</strong> [${(printShipment.paymentCondition || '').includes('Lima') ? 'X' : ' '}] Pagado en Lima (Jr. de la Unión 518) &nbsp;&nbsp;&nbsp; [${!(printShipment.paymentCondition || '').includes('Lima') ? 'X' : ' '}] Pagará en ITALIA (Torino)<br><br>
              ${printShipment.notes || 'Documentación Lícita'}
            </div>
          </div>

            <div class="qr-container">
              <div class="qr-box">
                <canvas id="printQR"></canvas>
              <div class="qr-hint">Rastreo en Tiempo Real</div>
            </div>
            <div style="font-size: 11px; max-width: 300px;">
              <strong>POLÍTICAS:</strong><br>
              • Retiro: hasta 48h posterior a llegada.<br>
              • Almacenaje diario superado el plazo.<br>
              • Abandono: después de 30 días.<br>
              • Prohibido envío de ilícitos.
            </div>
          </div>

          <!-- TICKET RECORTABLE PARA TORINO -->
          <div class="cut-ticket">
            <div class="cut-icon">✂</div>
            <div class="ticket-header">CONTROL DE ENTREGA - TORINO, ITALIA</div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="flex: 1;">
                <div class="row"><div class="label" style="width:130px">ORDEN:</div><div class="value"><strong>${printShipment.orderNumber}</strong></div></div>
                <div class="row"><div class="label" style="width:130px">CÓDIGO:</div><div class="value"><strong>${printShipment.code}</strong></div></div>
                <div class="row"><div class="label" style="width:130px">DESTINO:</div><div class="value">TORINO, ITALIA</div></div>
                <div class="row"><div class="label" style="width:130px">RECEPTOR:</div><div class="value">${printShipment.recipientName} ${printShipment.recipientLastName}</div></div>
                <div class="row"><div class="label" style="width:130px">CEL. DESTINATARIA:</div><div class="value">${printShipment.recipientPhone || 'No especificado'}</div></div>
              </div>
              <div style="text-align: right; min-width: 140px;">
                <div style="font-size: 15px; font-weight: bold; border: 2px solid #0B2B5E; padding: 8px; background: #fff; text-align: center;">${printShipment.code}</div>
                <div style="font-size: 9px; margin-top: 5px; font-weight: bold;">ADJUNTAR A FOLDER MANILA</div>
              </div>
            </div>
          </div>

          <!-- PÁGINA 2: DECLARACIÓN JURADA -->
          <div class="page-break"></div>
          <div class="dj-title">
            <h2 style="margin:0">DECLARACIÓN JURADA DE CONTENIDO</h2>
            <h3 style="margin:0">Y EXENCIÓN DE RESPONSABILIDAD LEGAL</h3>
          </div>

          <div class="dj-content">
            <p>Yo, <strong>${printShipment.senderName || '____________________'} ${printShipment.senderLastName || ''}</strong>, identificado(a) con documento de identidad N° <strong>${printShipment.senderDni || '__________'}</strong>, en pleno uso de mis facultades, declaro bajo juramento que el envío amparado bajo la Orden N° <strong>${printShipment.orderNumber}</strong> (Token de seguridad: ${Math.random().toString(36).substring(2, 10).toUpperCase()}) contiene <strong>ÚNICA Y ESTRICTAMENTE DOCUMENTACIÓN LÍCITA</strong>.</p>

            <p>Garantizo formalmente que los documentos entregados a la agencia no ocultan, no camuflan, ni se encuentran impregnados de sustancias estupefacientes, alcaloides, dinero en efectivo no declarado, ni ningún material prohibido por la legislación penal de la República del Perú (incluyendo de forma explícita la Ley N° 28002 - Ley que penaliza el Tráfico Ilícito de Drogas) y los convenios aduaneros internacionales vigentes.</p>

            <p>Mediante mi firma y huella dactilar estampada en el presente documento, asumo la <strong>responsabilidad penal, civil y administrativa absoluta e indelegable</strong> ante la Policía Nacional del Perú (DIRANDRO), SUNAT/Aduanas, Ministerio Público y cualquier autoridad judicial nacional o extranjera en caso de detectarse alteraciones, camuflajes o sustancias ilícitas en mi envío.</p>

            <p>En consecuencia, eximo expresa, legal y totalmente de cualquier implicancia, investigación, responsabilidad operativa o financiera a la empresa <strong>Servicom Internacional</strong> (RUC: 20615004708). Asimismo, autorizo de manera irrevocable la apertura, revisión física detallada y escaneo del presente envío por parte de la agencia o las autoridades competentes sin necesidad de mi presencia ni notificación previa.</p>

            <p>Suscrito en la ciudad de Lima, el ${today}.</p>
          </div>

          <div class="dj-signature-area">
            <div class="signature-box">
              <div style="height: 100px;"></div>
              <strong>Firma del Remitente</strong><br>
              DNI/Pasaporte N° ${printShipment.senderDni || '__________'}<br>
              <span style="font-size: 8px;">(Firmar sobre la línea de microimpresión)</span>
            </div>
            <div style="width: 30%; text-align: center;">
              <div class="fingerprint-box"></div>
              <strong>Huella Dactilar</strong><br>
              <span style="font-size: 10px;">(Índice Derecho)</span>
            </div>
          </div>

          <div class="dj-footer">
            Este anexo forma parte integral e indivisible de la Orden de Envío N° ${printShipment.orderNumber}. Propiedad legal de Servicom Internacional.
          </div>
        </body>
        </html>
      `;
      printWindow.document.write(html);
      printWindow.document.close();
      
      // Esperar el logo antes de generar el QR e imprimir.
      await Promise.all(Array.from(printWindow.document.images).map((image) => {
        if (image.complete) return Promise.resolve();
        return new Promise<void>((resolve) => {
          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener('error', () => resolve(), { once: true });
        });
      }));
      const canvas = printWindow.document.getElementById('printQR') as HTMLCanvasElement;
      if (canvas) {
        await QRCode.toCanvas(canvas, trackingUrl, {
          ...TRACKING_QR_OPTIONS,
          width: 140,
          margin: 1,
          color: { dark: '#0B2B5E', light: '#ffffff' }
        });
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
      printWindow.focus();
      printWindow.print();
    }
  };

  const [searchTerm, setSearchTerm] = useState('');

  const sortedShipments = useMemo(() => {
    if (!shipments) return [];
    let list = [...shipments];
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(s => 
        (s.orderNumber && String(s.orderNumber).toLowerCase().includes(q)) ||
        (s.code && String(s.code).toLowerCase().includes(q)) ||
        (s.senderDni && String(s.senderDni).toLowerCase().includes(q)) ||
        (s.recipientDni && String(s.recipientDni).toLowerCase().includes(q)) ||
        (s.senderName && String(s.senderName).toLowerCase().includes(q)) ||
        (s.recipientName && String(s.recipientName).toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [shipments, sortOrder, searchTerm]);

  const handleLogout = () => {
    setIsLoggedIn(false);
    setAdmin(null);
    loginForm.reset();
    toast.success("Sesión cerrada");
    // Redirigir a la página principal
    setTimeout(() => {
      window.location.href = '/';
    }, 500);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 shadow-lg border-0">
          <div className="flex items-center justify-center mb-6">
            <Lock className="w-8 h-8 text-primary mr-3" />
            <h1 className="text-2xl font-bold text-primary">Admin Servicom Internacional</h1>
          </div>

          <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <Input
                type="email"
                placeholder="Ingresa tu correo administrativo"
                {...loginForm.register("email")}
                className="border-2 focus:border-primary"
              />
              {loginForm.formState.errors.email && (
                <p className="text-red-600 text-sm mt-1">{loginForm.formState.errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
              <Input
                type="password"
                placeholder="Contraseña"
                {...loginForm.register("password")}
                className="border-2 focus:border-primary"
              />
              {loginForm.formState.errors.password && (
                <p className="text-red-600 text-sm mt-1">{loginForm.formState.errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-2"
            >
              {loginMutation.isPending ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  Iniciando sesión...
                </>
              ) : (
                "Iniciar Sesión"
              )}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="bg-primary text-white shadow-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Panel de Administración</h1>
            <p className="text-sm opacity-90">Servicom Internacional - Gestión de Encomiendas</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm">{admin?.name}</span>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-white text-white hover:bg-white/20"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Create Shipment Section */}
        <Card className="p-6 mb-8 shadow-lg border-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Crear Nueva Encomienda</h2>
            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva Encomienda
            </Button>
          </div>

          {showCreateForm && (
            <form onSubmit={createForm.handleSubmit(handleCreateShipment)} className="space-y-4">
              {/* Información básica */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Documento</label>
                  <select
                    {...createForm.register("docType")}
                    defaultValue="apostillado"
                    className="w-full p-2.5 bg-white border-2 border-slate-200 rounded-md text-sm font-medium focus:border-primary"
                  >
                    <option value="simple">Documentos Simples (45 € hasta 4 hojas, +2 € por hoja)</option>
                    <option value="apostillado">Documentos Apostillados (50 € base hasta 5 hojas, +10 € adicionales)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cantidad de Hojas</label>
                  <Input
                    type="number"
                    min="1"
                    max={createForm.watch("docType") === 'simple' ? 8 : 10}
                    {...createForm.register("sheetCount", { valueAsNumber: true })}
                    className="border-2 focus:border-primary"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {createForm.watch("docType") === 'simple' 
                      ? 'Simples: máx. 8 hojas (+2€ por hoja adicional desde la 5ª)' 
                      : 'Apostillados: máx. 10 hojas (+10€ adicionales desde la 6ª)'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Estado Inicial</label>
                  <Select defaultValue="En agencia" onValueChange={(value) => createForm.setValue("status", value as any)}>
                    <SelectTrigger className="border-2 focus:border-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="En agencia">En agencia</SelectItem>
                      <SelectItem value="En tránsito">En tránsito</SelectItem>
                      <SelectItem value="En destino">En destino</SelectItem>
                      <SelectItem value="Entregado">Entregado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Información del remitente */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-3">Información del Remitente</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nombre</label>
                    <Input
                      placeholder="Nombre"
                      {...createForm.register("senderName")}
                      className="border-2 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Apellido</label>
                    <Input
                      placeholder="Apellido"
                      {...createForm.register("senderLastName")}
                      className="border-2 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">DNI</label>
                    <Input
                      placeholder="DNI"
                      {...createForm.register("senderDni")}
                      className="border-2 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
                    <PhoneInput
                      value={createForm.watch("senderPhone") || "+51 "}
                      onChange={(val) => createForm.setValue("senderPhone", val)}
                      placeholder="970188447"
                    />
                  </div>
                </div>
              </div>

              {/* Información del destinatario */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-3">Información del Destinatario</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nombre</label>
                    <Input
                      placeholder="Nombre"
                      {...createForm.register("recipientName")}
                      className="border-2 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Apellido</label>
                    <Input
                      placeholder="Apellido"
                      {...createForm.register("recipientLastName")}
                      className="border-2 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">DNI</label>
                    <Input
                      placeholder="DNI"
                      {...createForm.register("recipientDni")}
                      className="border-2 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
                    <PhoneInput
                      value={createForm.watch("recipientPhone") || "+51 "}
                      onChange={(val) => createForm.setValue("recipientPhone", val)}
                      placeholder="908722617"
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Condición de Pago</label>
                    <select
                      {...createForm.register("paymentCondition")}
                      defaultValue="Pagado en Lima (Jr. de la Unión 518)"
                      className="w-full p-2.5 bg-white border-2 border-slate-200 rounded-md text-sm font-medium focus:border-primary"
                    >
                      <option value="Pagado en Lima (Jr. de la Unión 518)">Pagado en Lima (Jr. de la Unión 518)</option>
                      <option value="Pagará en ITALIA (Torino)">Pagará en ITALIA (Torino)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Notas */}
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Notas</label>
                <Textarea
                  placeholder="Notas adicionales sobre la encomienda"
                  {...createForm.register("notes")}
                  className="border-2 focus:border-primary"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  {createMutation.isPending ? (
                    <>
                      <Spinner className="w-4 h-4 mr-2" />
                      Creando...
                    </>
                  ) : (
                    "Crear Encomienda"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          )}
        </Card>

        {/* Shipments Table */}
        <Card className="p-6 shadow-lg border-0">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Encomiendas Registradas</h2>
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Input
                  placeholder="Buscar por DNI, orden o código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-white"
                />
              </div>
              <Button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                variant="outline"
                size="sm"
              >
                {sortOrder === 'asc' ? '↑ Antiguos (ascendente)' : '↓ Recientes (descendentes)'}
              </Button>
              <Button
                onClick={async () => {
                  await refetchShipments();
                  toast.success("Lista de encomiendas actualizada");
                }}
                variant="outline"
                size="sm"
                disabled={loadingShipments}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loadingShipments ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>
          </div>

          {loadingShipments ? (
            <div className="flex justify-center py-8">
              <Spinner className="w-6 h-6" />
            </div>
          ) : sortedShipments && sortedShipments.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número de Orden</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Destinatario</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha Creación</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedShipments.map((shipment: any) => (
                    <TableRow key={shipment.id}>
                      <TableCell className="font-medium">{shipment.orderNumber}</TableCell>
                      <TableCell>{shipment.code}</TableCell>
                      <TableCell>{shipment.recipientName ? `${shipment.recipientName} ${shipment.recipientLastName || ''}` : '-'}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5 items-start">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            shipment.status === 'En agencia' ? 'bg-blue-100 text-blue-800' :
                            shipment.status === 'En tránsito' ? 'bg-yellow-100 text-yellow-800' :
                            shipment.status === 'En destino' ? 'bg-orange-100 text-orange-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {shipment.status}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${String(shipment.paymentCondition || '').includes('Lima') ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                            {String(shipment.paymentCondition || '').includes('Lima') ? 'Pagado en Lima' : 'Pagará en Torino'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(shipment.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              setSelectedShipmentId(shipment.id);
                              updateForm.reset({
                                shipmentId: shipment.id,
                                newStatus: shipment.status,
                                description: "",
                                senderName: shipment.senderName || "",
                                senderLastName: shipment.senderLastName || "",
                                senderDni: shipment.senderDni || "",
                                senderPhone: shipment.senderPhone || "",
                                recipientName: shipment.recipientName || "",
                                recipientLastName: shipment.recipientLastName || "",
                                recipientDni: shipment.recipientDni || "",
                                recipientPhone: shipment.recipientPhone || "",
                                notes: shipment.notes || "",
                              });
                              setShowUpdateForm(true);
                            }}
                            size="sm"
                            variant="outline"
                            className="text-primary border-primary hover:bg-primary/5"
                          >
                            Actualizar
                          </Button>
                          <Button
                            onClick={() => handlePrintReceipt(shipment)}
                            size="sm"
                            variant="outline"
                            className="text-orange-600 border-orange-600 hover:bg-orange-50"
                          >
                            <Printer className="w-4 h-4 mr-1" />
                            Imprimir
                          </Button>
                          <Button
                            onClick={() => handleDeleteShipment(shipment.id)}
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-600 hover:bg-red-50"
                            disabled={deleteMutation.isPending}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No hay encomiendas registradas</p>
          )}
        </Card>

        {/* Update Status Modal */}
        {showUpdateForm && selectedShipmentId && (
          <Card className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md p-6 shadow-lg border-0">
              <h3 className="text-lg font-semibold mb-4">Actualizar Estado de Encomienda</h3>

              <form onSubmit={updateForm.handleSubmit(handleUpdateStatus)} className="space-y-4">
                <input type="hidden" {...updateForm.register("shipmentId", { valueAsNumber: true })} />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nuevo Estado</label>
                  <Select value={updateForm.watch("newStatus") || ""} onValueChange={(value) => updateForm.setValue("newStatus", value as any)}>
                    <SelectTrigger className="border-2 focus:border-primary">
                      <SelectValue placeholder="Selecciona un estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="En agencia">En agencia</SelectItem>
                      <SelectItem value="En tránsito">En tránsito</SelectItem>
                      <SelectItem value="En destino">En destino</SelectItem>
                      <SelectItem value="Entregado">Entregado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descripción (Opcional)</label>
                  <Input
                    placeholder="Ej: Encomienda en camino a destino"
                    {...updateForm.register("description")}
                    className="border-2 focus:border-primary"
                  />
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Remitente</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input placeholder="Nombre" {...updateForm.register("senderName")} />
                    <Input placeholder="Apellido" {...updateForm.register("senderLastName")} />
                    <Input placeholder="DNI" {...updateForm.register("senderDni")} />
                    <Input placeholder="Teléfono" {...updateForm.register("senderPhone")} />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Destinatario</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input placeholder="Nombre" {...updateForm.register("recipientName")} />
                    <Input placeholder="Apellido" {...updateForm.register("recipientLastName")} />
                    <Input placeholder="DNI" {...updateForm.register("recipientDni")} />
                    <Input placeholder="Teléfono" {...updateForm.register("recipientPhone")} />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Condición de Pago</label>
                  <select
                    {...updateForm.register("paymentCondition")}
                    className="w-full p-2.5 bg-white border-2 border-slate-200 rounded-md text-sm font-medium focus:border-primary"
                  >
                    <option value="Pagado en Lima (Jr. de la Unión 518)">Pagado en Lima (Jr. de la Unión 518)</option>
                    <option value="Pagará en ITALIA (Torino)">Pagará en ITALIA (Torino)</option>
                  </select>
                </div>

                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notas</label>
                  <Textarea
                    placeholder="Notas adicionales sobre la encomienda"
                    {...updateForm.register("notes")}
                    className="border-2 focus:border-primary"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="flex-1 bg-primary hover:bg-primary/90 text-white"
                  >
                    {updateMutation.isPending ? (
                      <>
                        <Spinner className="w-4 h-4 mr-2" />
                        Actualizando...
                      </>
                    ) : (
                      "Actualizar"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowUpdateForm(false);
                      setSelectedShipmentId(null);
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </Card>
          </Card>
        )}

        {/* QR Modal */}
        {showQRModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md p-6 shadow-lg border-0">
              <h3 className="text-lg font-semibold mb-4 text-center">Código QR Generado</h3>
              
              <div className="flex justify-center mb-6 bg-white p-4 rounded-lg">
                <canvas ref={qrCanvasRef} />
              </div>

              <p className="text-sm text-gray-600 text-center mb-4">
                Este QR enlaza a: <br />
                <code className="text-xs bg-gray-100 p-1 rounded">{qrCode}</code>
              </p>

              <div className="flex gap-2">
                <Button
                  onClick={downloadQR}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar QR
                </Button>
                <Button
                  onClick={() => {
                    setShowQRModal(false);
                    setQrCode(null);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cerrar
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Print Receipt Modal */}
        {printShipment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md p-6 shadow-lg border-0">
              <h3 className="text-lg font-semibold mb-4 text-center">Vista Previa de Recibo</h3>
              
              <div className="bg-white p-4 rounded-lg mb-4 max-h-96 overflow-y-auto text-sm">
                <div className="text-center border-b pb-3 mb-3">
                  <div className="font-bold text-lg text-primary">SERVICOM INTERNACIONAL</div>
                  <div className="text-xs text-gray-600">RUC 20615004708</div>
                  <div className="text-xs text-gray-600">RUC: 20615004708</div>
                </div>

                <div className="mb-3">
                  <div className="font-bold text-xs bg-gray-100 p-1 mb-2">INFORMACIÓN DE ENVÍO DE DOCUMENTO</div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Orden:</span>
                    <span className="font-semibold">{printShipment.orderNumber}</span>
                  </div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Código:</span>
                    <span className="font-semibold">{printShipment.code}</span>
                  </div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Estado:</span>
                    <span className="font-semibold">{printShipment.status}</span>
                  </div>
                </div>

                {printShipment.senderName && (
                  <div className="mb-3">
                    <div className="font-bold text-xs bg-gray-100 p-1 mb-2">REMITENTE</div>
                    <div className="text-xs mb-1">{printShipment.senderName} {printShipment.senderLastName || ""}</div>
                    {printShipment.senderDni && <div className="text-xs mb-1">DNI: {printShipment.senderDni}</div>}
                    {printShipment.senderPhone && <div className="text-xs">Tel: {printShipment.senderPhone}</div>}
                  </div>
                )}

                {printShipment.recipientName && (
                  <div className="mb-3">
                    <div className="font-bold text-xs bg-gray-100 p-1 mb-2">DESTINATARIO</div>
                    <div className="text-xs mb-1">{printShipment.recipientName} {printShipment.recipientLastName || ""}</div>
                    {printShipment.recipientDni && <div className="text-xs mb-1">DNI: {printShipment.recipientDni}</div>}
                    {printShipment.recipientPhone && <div className="text-xs">Tel: {printShipment.recipientPhone}</div>}
                  </div>
                )}

                {printShipment.notes && (
                  <div className="mb-3">
                    <div className="font-bold text-xs bg-gray-100 p-1 mb-2">NOTAS</div>
                    <div className="text-xs whitespace-pre-wrap">{printShipment.notes}</div>
                  </div>
                )}

                <div className="text-center py-2">
                  <canvas ref={printQrRef} className="mx-auto" />
                  <p className="text-xs text-gray-600 mt-2">Escanea el QR para rastrear tu encomienda.</p>
                </div>

                <div className="mt-3 border-t pt-3 text-[10px] leading-relaxed text-gray-600">
                  <p className="font-bold text-gray-800 mb-1">POLÍTICAS DE ENTREGA Y ALMACENAJE</p>
                  <p><strong>Retiro:</strong> Hasta 48 horas posterior a su llegada; superado ese plazo se cobra almacenaje diario por paquete.</p>
                  <p><strong>Más de 10 kg:</strong> Se aplica la tarifa correspondiente.</p>
                  <p><strong>Abandono:</strong> Después de 30 días el envío será desechado, destruido o eliminado, sin reclamos posteriores.</p>
                  <p><strong>Prohibidos:</strong> Los productos ilegales o prohibidos serán puestos a disposición de las autoridades competentes con los datos del servicio.</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={printReceipt}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir
                </Button>
                <Button
                  onClick={() => setPrintShipment(null)}
                  variant="outline"
                  className="flex-1"
                >
                  Cerrar
                </Button>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
