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
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Lock, LogOut, Plus, RefreshCw, Download } from "lucide-react";
import QRCode from "qrcode";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Contraseña requerida"),
});

const createShipmentSchema = z.object({
  orderNumber: z.string().min(1, "Número de orden requerido"),
  code: z.string().min(1, "Código requerido"),
  status: z.enum(["En agencia", "En tránsito", "En destino"]),
});

const updateStatusSchema = z.object({
  shipmentId: z.number(),
  newStatus: z.enum(["En agencia", "En tránsito", "En destino"]),
  description: z.string().optional(),
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
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  // Queries
  const { data: shipments, isLoading: loadingShipments, refetch: refetchShipments } = trpc.admin.getAllShipments.useQuery(undefined, { enabled: isLoggedIn });

  // Mutations
  const loginMutation = trpc.admin.login.useMutation();
  const createMutation = trpc.admin.createShipment.useMutation();
  const updateMutation = trpc.admin.updateStatus.useMutation();

  // Forms
  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const createForm = useForm<any>({
    resolver: zodResolver(createShipmentSchema),
    defaultValues: {
      orderNumber: '',
      code: '',
      status: 'En agencia',
    },
  });
  const updateForm = useForm<UpdateStatusForm>({
    resolver: zodResolver(updateStatusSchema),
    defaultValues: {
      shipmentId: 0,
      newStatus: 'En agencia',
      description: '',
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
                placeholder="justina@kasegatours.com"
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

          <p className="text-xs text-gray-500 text-center mt-4">
            Demo: yeslygian2030@gmail.com / Y3sl1G1an2035
          </p>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Número de Orden</label>
                  <Input
                    placeholder="Ej: 352 099 2723"
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
                    </SelectContent>
                  </Select>
                </div>
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
            <Button
              onClick={() => refetchShipments()}
              variant="outline"
              disabled={loadingShipments}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
          </div>

          {loadingShipments ? (
            <div className="flex justify-center py-8">
              <Spinner className="w-6 h-6" />
            </div>
          ) : shipments && shipments.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número de Orden</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha Creación</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shipments.map((shipment: any) => (
                    <TableRow key={shipment.id}>
                      <TableCell className="font-medium">{shipment.orderNumber}</TableCell>
                      <TableCell>{shipment.code}</TableCell>
                      <TableCell>
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          {shipment.status}
                        </span>
                      </TableCell>
                      <TableCell>{new Date(shipment.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button
                          onClick={() => {
                            setSelectedShipmentId(shipment.id);
                            updateForm.reset({ shipmentId: shipment.id, newStatus: shipment.status, description: "" });
                            setShowUpdateForm(true);
                          }}
                          size="sm"
                          variant="outline"
                          className="text-primary border-primary hover:bg-primary/5"
                        >
                          Actualizar Estado
                        </Button>
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
      </main>
    </div>
  );
}
