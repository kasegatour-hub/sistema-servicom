import { useState, useRef } from "react";
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

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Contraseña requerida"),
});

const createShipmentSchema = z.object({
  orderNumber: z.string().min(1, "Número de orden requerido"),
  code: z.string().min(1, "Código requerido"),
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
      orderNumber: '',
      code: '',
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
      if (result.trackingUrl) {
        setQrCode(result.trackingUrl);
        setShowQRModal(true);
        
        // Generar QR después de que el modal esté renderizado
        setTimeout(() => {
          if (qrCanvasRef.current) {
            QRCode.toCanvas(qrCanvasRef.current, result.trackingUrl, { width: 300 });
          }
        }, 100);
      }
      
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
        const trackingUrl = `/?order=${encodeURIComponent(shipment.orderNumber)}&code=${encodeURIComponent(shipment.code)}`;
        QRCode.toCanvas(printQrRef.current, trackingUrl, { width: 200 });
      }
    }, 100);
  };

  const printReceipt = () => {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow && printShipment) {
      const trackingUrl = `/?order=${encodeURIComponent(printShipment.orderNumber)}&code=${encodeURIComponent(printShipment.code)}`;
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Recibo de Encomienda</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #0052CC; padding-bottom: 10px; }
            .company { font-size: 24px; font-weight: bold; color: #0052CC; }
            .subtitle { font-size: 12px; color: #666; margin-top: 5px; }
            .ruc { font-size: 11px; color: #999; }
            .section { margin: 15px 0; }
            .section-title { font-weight: bold; background-color: #f0f0f0; padding: 5px; margin-bottom: 10px; }
            .row { display: flex; margin: 5px 0; }
            .label { width: 150px; font-weight: bold; }
            .value { flex: 1; }
            .qr-section { text-align: center; margin: 20px 0; }
            .qr-section canvas { max-width: 200px; }
            .policies { font-size: 10px; margin-top: 20px; border-top: 1px solid #ccc; padding-top: 10px; line-height: 1.4; }
            .policy-title { font-weight: bold; margin-bottom: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company">KASEGA TOURS</div>
            <div class="subtitle">En colaboración con Servicom Internacional</div>
            <div class="ruc">RUC: 20615004708</div>
          </div>

          <div class="section">
            <div class="section-title">INFORMACIÓN DE ENCOMIENDA</div>
            <div class="row">
              <div class="label">Número de Orden:</div>
              <div class="value">${printShipment.orderNumber}</div>
            </div>
            <div class="row">
              <div class="label">Código:</div>
              <div class="value">${printShipment.code}</div>
            </div>
            <div class="row">
              <div class="label">Estado:</div>
              <div class="value">${printShipment.status}</div>
            </div>
            <div class="row">
              <div class="label">Fecha de Registro:</div>
              <div class="value">${new Date(printShipment.createdAt).toLocaleDateString()}</div>
            </div>
          </div>

          ${printShipment.senderName ? `
          <div class="section">
            <div class="section-title">REMITENTE</div>
            <div class="row">
              <div class="label">Nombre:</div>
              <div class="value">${printShipment.senderName} ${printShipment.senderLastName || ''}</div>
            </div>
            ${printShipment.senderDni ? `
            <div class="row">
              <div class="label">DNI:</div>
              <div class="value">${printShipment.senderDni}</div>
            </div>
            ` : ''}
            ${printShipment.senderPhone ? `
            <div class="row">
              <div class="label">Teléfono:</div>
              <div class="value">${printShipment.senderPhone}</div>
            </div>
            ` : ''}
          </div>
          ` : ''}

          ${printShipment.recipientName ? `
          <div class="section">
            <div class="section-title">DESTINATARIO</div>
            <div class="row">
              <div class="label">Nombre:</div>
              <div class="value">${printShipment.recipientName} ${printShipment.recipientLastName || ''}</div>
            </div>
            ${printShipment.recipientDni ? `
            <div class="row">
              <div class="label">DNI:</div>
              <div class="value">${printShipment.recipientDni}</div>
            </div>
            ` : ''}
            ${printShipment.recipientPhone ? `
            <div class="row">
              <div class="label">Teléfono:</div>
              <div class="value">${printShipment.recipientPhone}</div>
            </div>
            ` : ''}
          </div>
          ` : ''}

          ${printShipment.notes ? `
          <div class="section">
            <div class="section-title">NOTAS</div>
            <div class="row">
              <div class="value">${printShipment.notes}</div>
            </div>
          </div>
          ` : ''}

          <div class="qr-section">
            <canvas id="printQR"></canvas>
            <p style="font-size: 11px; margin-top: 10px;">Escanea el QR para rastrear tu encomienda</p>
          </div>

          <div class="policies">
            <div class="policy-title">POLÍTICAS DE ENTREGA Y ALMACENAJE</div>
            <p><strong>Plazo de retiro:</strong> Hasta 48 horas posterior a su llegada (se le informará). Superado esta fecha se realizará el cobro de almacenaje por día por paquete.</p>
            <p><strong>Peso adicional:</strong> En caso supere los 10kg, se aplicará tarifa correspondiente.</p>
            <p><strong>Abandono del envío:</strong> Después de los 30 días será desechado, destruido o eliminado, sin reclamos posteriores.</p>
            <p><strong>Envíos prohibidos:</strong> Todo envío de productos ilegales o prohibidos será puesto a disposición de las autoridades competentes, con los datos del servicio.</p>
          </div>
        </body>
        </html>
      `;
      printWindow.document.write(html);
      printWindow.document.close();
      
      // Generar QR en el documento impreso
      setTimeout(() => {
        const canvas = printWindow.document.getElementById('printQR') as HTMLCanvasElement;
        if (canvas) {
          QRCode.toCanvas(canvas, trackingUrl, { width: 200 });
        }
        printWindow.print();
      }, 500);
    }
  };

  const sortedShipments = shipments ? [...shipments].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
  }) : [];

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
            <h1 className="text-2xl font-bold text-primary">Admin Kasega Tours</h1>
          </div>

          <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <Input
                type="email"
                placeholder="yeslygian2030@gmail.com"
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
            <p className="text-sm opacity-90">Kasega Tours - Gestión de Encomiendas</p>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Número de Orden</label>
                  <Input
                    placeholder="Ej: 3520992723"
                    {...createForm.register("orderNumber")}
                    className="border-2 focus:border-primary"
                  />
                  {createForm.formState.errors.orderNumber?.message && (
                    <p className="text-red-600 text-sm mt-1">{(createForm.formState.errors.orderNumber as any)?.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Código</label>
                  <Input
                    placeholder="Ej: CA06721WB"
                    {...createForm.register("code")}
                    className="border-2 focus:border-primary"
                  />
                  {createForm.formState.errors.code?.message && (
                    <p className="text-red-600 text-sm mt-1">{(createForm.formState.errors.code as any)?.message}</p>
                  )}
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
                    <Input
                      placeholder="Teléfono"
                      {...createForm.register("senderPhone")}
                      className="border-2 focus:border-primary"
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
                    <Input
                      placeholder="Teléfono"
                      {...createForm.register("recipientPhone")}
                      className="border-2 focus:border-primary"
                    />
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
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Encomiendas Registradas</h2>
            <div className="flex gap-2">
              <Button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                variant="outline"
                size="sm"
              >
                {sortOrder === 'asc' ? '↑ Ascendente' : '↓ Descendente'}
              </Button>
              <Button
                onClick={() => refetchShipments()}
                variant="outline"
                disabled={loadingShipments}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
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
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          shipment.status === 'En agencia' ? 'bg-blue-100 text-blue-800' :
                          shipment.status === 'En tránsito' ? 'bg-yellow-100 text-yellow-800' :
                          shipment.status === 'En destino' ? 'bg-orange-100 text-orange-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {shipment.status}
                        </span>
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
                  <div className="font-bold text-lg text-primary">KASEGA TOURS</div>
                  <div className="text-xs text-gray-600">En colaboración con Servicom Internacional</div>
                  <div className="text-xs text-gray-600">RUC: 20615004708</div>
                </div>

                <div className="mb-3">
                  <div className="font-bold text-xs bg-gray-100 p-1 mb-2">INFORMACIÓN DE ENCOMIENDA</div>
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
