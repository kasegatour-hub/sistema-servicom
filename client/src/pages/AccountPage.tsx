import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, CheckCircle2, Download, Eye, EyeOff, KeyRound, Lock, LogOut, Mail, Package, Phone, Plus, Printer, Search, User, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { buildTrackingUrl, TRACKING_QR_OPTIONS, normalizeTrackingValue } from "@/lib/tracking";
import { printUserShipmentReceipt } from "@/lib/userReceipt";
import { PhoneInput } from "@/components/PhoneInput";

const brandLogo = "/manus-storage/servicom_logo_final_e7ce35aa.png";

type AccountMode = "login" | "register" | "request" | "reset";

export default function AccountPage() {
  const [mode, setMode] = useState<AccountMode>("login");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [accountNewPassword, setAccountNewPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerLastName, setRegisterLastName] = useState("");
  const [registerDni, setRegisterDni] = useState("");
  const [code, setCode] = useState("");
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showAccountNewPassword, setShowAccountNewPassword] = useState(false);
  const [receiptShipment, setReceiptShipment] = useState<any>(null);

  // Perfil con modo de visualización y edición
  const [profileName, setProfileName] = useState("");
  const [profileLastName, setProfileLastName] = useState("");
  const [profileDni, setProfileDni] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Registro de encomienda por usuario
  const [showNewShipment, setShowNewShipment] = useState(false);
  const [documentCount, setDocumentCount] = useState(1);
  const [docType, setDocType] = useState<"simple" | "apostillado">("simple");
  const [sheetCount, setSheetCount] = useState(1);
  const [senderName, setSenderName] = useState("");
  const [senderLastName, setSenderLastName] = useState("");
  const [senderDni, setSenderDni] = useState("");
  const [senderPhone, setSenderPhone] = useState("+51 ");
  const [recipientName, setRecipientName] = useState("");
  const [recipientLastName, setRecipientLastName] = useState("");
  const [recipientDni, setRecipientDni] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("+51 ");
  const [notes, setNotes] = useState("");
  const [paymentCondition, setPaymentCondition] = useState("Pagado en Lima (Jr. de la Unión 518)");

  const utils = trpc.useUtils();
  const { data: me, isLoading: meLoading } = trpc.account.me.useQuery();

  // Sincronizar datos de perfil cuando la sesión local ya esté disponible.
  useEffect(() => {
    if (!me) return;
    setProfileName(me.name || "");
    setProfileLastName(me.lastName || "");
    setProfileDni(me.dni || "");
    setProfilePhone(me.phone || "");
  }, [me]);

  const { data: myShipments, refetch: refetchShipments } = trpc.account.myShipments.useQuery(undefined, {
    enabled: !!me,
  });

  const registerMutation = trpc.account.register.useMutation({
    onSuccess: async () => {
      toast.success("Cuenta creada correctamente. Sesión iniciada.");
      // La mutación ya estableció la cookie: forzar la consulta para mostrar el panel.
      await utils.account.me.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const loginMutation = trpc.account.login.useMutation({
    onSuccess: () => {
      toast.success("Sesión iniciada correctamente.");
      utils.account.me.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const logoutMutation = trpc.account.logout.useMutation({
    onSuccess: () => {
      toast.success("Sesión cerrada.");
      utils.account.me.invalidate();
    },
  });

  const updateProfileMutation = trpc.account.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Datos de perfil actualizados correctamente.");
      utils.account.me.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const changePasswordMutation = trpc.account.changePassword.useMutation({
    onSuccess: result => {
      toast.success(result.message);
      setCurrentPassword("");
      setAccountNewPassword("");
    },
    onError: error => toast.error(error.message),
  });

  const createShipmentMutation = trpc.account.createMyShipment.useMutation({
    onSuccess: result => {
      toast.success("Envío registrado. Tu recibo está disponible.");
      setShowNewShipment(false);
      setDocumentCount(1);
      setNotes("");
      setReceiptShipment(result.shipment);
      refetchShipments();
    },
    onError: error => toast.error(error.message),
  });

  const requestMutation = trpc.account.requestPasswordReset.useMutation({
    onSuccess: result => {
      toast.success(result.message);
      setMode("reset");
    },
    onError: error => toast.error(error.message),
  });

  const resetMutation = trpc.account.resetPassword.useMutation({
    onSuccess: result => {
      toast.success(result.message);
      setMode("login");
      setCode("");
      setNewPassword("");
    },
    onError: error => toast.error(error.message),
  });

  if (meLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#eef6fb] text-[#0B2B5E]">Cargando cuenta...</div>;
  }

  // Si ya inició sesión, mostrar su panel personal, datos de perfil y envíos
  if (me) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#eef6fb] to-white pb-12">
        <header className="bg-[#0B2B5E] text-white shadow-md">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <img src={brandLogo} alt="Servicom Internacional" className="h-12 w-auto rounded bg-white p-1" />
              <div>
                <h1 className="text-xl font-bold">Mi Cuenta — Servicom Internacional</h1>
                <p className="text-xs text-blue-200">{me.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/" className="rounded bg-white/10 px-3 py-1.5 text-sm font-medium transition hover:bg-white/20">
                Ir a Rastreo Público
              </Link>
              <Button onClick={() => logoutMutation.mutate()} variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/20">
                <LogOut className="mr-2 h-4 w-4" /> Salir
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-8 space-y-8">
          {receiptShipment && (
            <Card className="border-2 border-[#F28C00] bg-orange-50 p-5 shadow-md">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-bold text-[#0B2B5E]"><CheckCircle2 className="h-5 w-5 text-green-600" /> Recibo generado correctamente</h2>
                  <p className="mt-1 text-sm text-slate-700">Orden <strong>{receiptShipment.orderNumber}</strong> · Código <strong>{receiptShipment.code}</strong></p>
                  <p className="mt-1 text-xs text-slate-600">El recibo incluye QR de rastreo, tarifa, declaración jurada y ticket recortable.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => printUserShipmentReceipt(receiptShipment)} className="bg-[#0B2B5E] text-white hover:bg-[#123d78]"><Printer className="mr-2 h-4 w-4" /> Abrir e imprimir recibo</Button>
                  <Button type="button" variant="outline" onClick={() => setReceiptShipment(null)}>Cerrar</Button>
                </div>
              </div>
            </Card>
          )}

          {/* Datos Personales */}
          <Card className="p-6 shadow-md border-0">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-[#0B2B5E] flex items-center gap-2">
                <User className="h-5 w-5 text-[#F28C00]" /> Perfil del Usuario
              </h2>
              {!isEditingProfile && (
                <Button type="button" size="sm" onClick={() => setIsEditingProfile(true)} className="bg-[#F28C00] text-white hover:bg-[#d67900]">
                  Editar Datos
                </Button>
              )}
            </div>

            {!isEditingProfile ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase">Nombres y Apellidos</span>
                  <p className="text-base font-bold text-[#0B2B5E]">{me.name} {me.lastName}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase">Correo Electrónico</span>
                  <p className="text-base text-slate-800">{me.email}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase">DNI</span>
                  <p className="text-base text-slate-800">{me.dni || "No especificado"}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase">Teléfono / Celular</span>
                  <p className="text-base text-slate-800">{me.phone || "No especificado"}</p>
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => {
                e.preventDefault();
                updateProfileMutation.mutate({ name: profileName, lastName: profileLastName, dni: profileDni, phone: profilePhone });
                setIsEditingProfile(false);
              }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nombres</Label>
                  <Input value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="Ej: Juan" required className="mt-1" />
                </div>
                <div>
                  <Label>Apellidos</Label>
                  <Input value={profileLastName} onChange={e => setProfileLastName(e.target.value)} placeholder="Ej: Pérez Gómez" required className="mt-1" />
                </div>
                <div>
                  <Label>DNI</Label>
                  <Input value={profileDni} onChange={e => setProfileDni(e.target.value)} placeholder="Ej: 71234567" required className="mt-1" />
                </div>
                <div>
                  <Label>Teléfono Celular / WhatsApp</Label>
                  <Input value={profilePhone} onChange={e => setProfilePhone(e.target.value)} placeholder="Ej: +51 970188447" required className="mt-1" />
                </div>
                <div className="md:col-span-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditingProfile(false)}>Cancelar</Button>
                  <Button type="submit" disabled={updateProfileMutation.isPending} className="bg-[#0B2B5E] text-white hover:bg-[#123d78]">
                    {updateProfileMutation.isPending ? "Guardando..." : "Guardar Mis Datos"}
                  </Button>
                </div>
              </form>
            )}
          </Card>

          {/* Cambio de contraseña */}
          <Card className="p-6 shadow-md border-0">
            <h2 className="text-lg font-bold text-[#0B2B5E] mb-4 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-[#F28C00]" /> Seguridad de la cuenta
            </h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              changePasswordMutation.mutate({ currentPassword, newPassword: accountNewPassword });
            }} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <Label>Contraseña actual</Label>
                <div className="relative mt-1">
                  <Input type={showCurrentPassword ? "text" : "password"} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required className="pr-10" />
                  <button type="button" aria-label={showCurrentPassword ? "Ocultar contraseña actual" : "Mostrar contraseña actual"} onClick={() => setShowCurrentPassword(value => !value)} className="absolute right-2 top-2 text-slate-500 hover:text-[#0B2B5E]"><>{showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</></button>
                </div>
              </div>
              <div>
                <Label>Nueva contraseña</Label>
                <div className="relative mt-1">
                  <Input type={showAccountNewPassword ? "text" : "password"} minLength={8} value={accountNewPassword} onChange={e => setAccountNewPassword(e.target.value)} required className="pr-10" />
                  <button type="button" aria-label={showAccountNewPassword ? "Ocultar nueva contraseña" : "Mostrar nueva contraseña"} onClick={() => setShowAccountNewPassword(value => !value)} className="absolute right-2 top-2 text-slate-500 hover:text-[#0B2B5E]"><>{showAccountNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</></button>
                </div>
              </div>
              <Button type="submit" disabled={changePasswordMutation.isPending} className="bg-[#0B2B5E] text-white hover:bg-[#123d78]">
                {changePasswordMutation.isPending ? "Actualizando..." : "Cambiar contraseña"}
              </Button>
            </form>
            <p className="mt-3 text-xs text-slate-500">También puedes recuperar la contraseña desde la pantalla de inicio de sesión mediante código por correo o SMS.</p>
          </Card>

          {/* Mis Envíos y Registro */}
          <Card className="p-6 shadow-md border-0">
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#0B2B5E] flex items-center gap-2">
                  <Package className="h-5 w-5 text-[#F28C00]" /> Mis Envíos Registrados
                </h2>
                <p className="text-xs text-slate-500">Registra envíos de documentos o consulta el estado actual de tus registros.</p>
              </div>
              <Button onClick={() => setShowNewShipment(!showNewShipment)} className="bg-[#F28C00] text-white hover:bg-[#d67900]">
                <Plus className="mr-2 h-4 w-4" /> Registrar Nueva Encomienda
              </Button>
            </div>

            {showNewShipment && (
              <form onSubmit={(e) => {
                e.preventDefault();
                createShipmentMutation.mutate({
                  documentCount,
                  docType,
                  sheetCount,
                  senderName: profileName || senderName,
                  senderLastName: profileLastName || senderLastName,
                  senderDni: profileDni || senderDni,
                  senderPhone: profilePhone || senderPhone,
                  recipientName,
                  recipientLastName,
                  recipientDni,
                  recipientPhone,
                  notes,
                  paymentCondition,
                });
              }} className="bg-blue-50/50 p-4 rounded-xl mb-6 space-y-4 border border-blue-100">
                        <h3 className="font-bold text-[#0B2B5E]">Detalles del envío de documentos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo de Documento</Label>
                    <select
                      value={docType}
                      onChange={e => setDocType(e.target.value as "simple" | "apostillado")}
                      className="w-full mt-1 p-2 bg-white border border-slate-300 rounded-md text-sm font-medium"
                    >
                      <option value="simple">Documentos Simples (45 € hasta 4 hojas, +2 € por hoja adicional)</option>
                      <option value="apostillado">Documentos Apostillados (50 € base hasta 5 hojas, +10 € adicionales)</option>
                    </select>
                  </div>
                  <div>
                    <Label>Cantidad de Hojas / Documentos</Label>
                    <Input type="number" min="1" max="50" value={String(sheetCount)} onChange={e => {
                      const val = e.target.value.replace(/^0+/, '');
                      const num = val === '' ? 1 : parseInt(val, 10);
                      setSheetCount(isNaN(num) ? 1 : Math.max(1, num));
                    }} required className="mt-1 bg-white" />
                    <p className="text-[10px] text-gray-500 mt-1">
                      {docType === 'simple' 
                        ? (sheetCount <= 4 ? 'Tarifa: 45 € (Hasta 4 hojas simples)' : `Tarifa: 45 € + ${ (sheetCount - 4) * 2 } € (${sheetCount} hojas) = ${ 45 + (sheetCount - 4) * 2 } €`)
                        : (sheetCount <= 5 ? 'Tarifa: 50 € (Hasta 5 hojas apostilladas)' : 'Tarifa: 60 € (Más de 5 hojas apostilladas)')}
                    </p>
                  </div>
                  <div>
                    <Label>Destinatario - Nombres</Label>
                    <Input value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="Ej: María" required className="mt-1 bg-white" />
                  </div>
                  <div>
                    <Label>Destinatario - Apellidos</Label>
                    <Input value={recipientLastName} onChange={e => setRecipientLastName(e.target.value)} placeholder="Ej: López" required className="mt-1 bg-white" />
                  </div>
                  <div>
                    <Label>Destinatario - DNI</Label>
                    <Input value={recipientDni} onChange={e => setRecipientDni(e.target.value)} placeholder="Ej: 41234567" required className="mt-1 bg-white" />
                  </div>
                  <div>
                    <Label>Destinatario - Teléfono</Label>
                    <div className="mt-1">
                      <PhoneInput value={recipientPhone} onChange={setRecipientPhone} placeholder="987654321" required />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Condición de Pago</Label>
                    <select
                      value={paymentCondition}
                      onChange={e => setPaymentCondition(e.target.value)}
                      className="w-full mt-1 p-2 bg-white border border-slate-300 rounded-md text-sm font-medium"
                    >
                      <option value="Pagado en Lima (Jr. de la Unión 518)">Pagado en Lima (Jr. de la Unión 518)</option>
                      <option value="Pagará en ITALIA (Torino)">Pagará en ITALIA (Torino)</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Notas / Contenido</Label>
                    <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Descripción del contenido o instrucciones de entrega" className="mt-1 bg-white" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowNewShipment(false)}>Cancelar</Button>
                      <Button type="submit" disabled={createShipmentMutation.isPending} className="bg-[#0B2B5E] text-white">
                    {createShipmentMutation.isPending ? "Registrando..." : "Guardar envío"}
                  </Button>
                </div>
              </form>
            )}

            {!myShipments || myShipments.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Package className="h-12 w-12 mx-auto text-slate-300 mb-2" />
                <p>No tienes envíos registrados aún.</p>
                <p className="text-xs text-slate-400 mt-1">Usa el botón superior para registrar tu primera encomienda.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myShipments.map((shipment) => (
                  <div key={shipment.id} className="border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white shadow-sm">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#0B2B5E]">Orden: {shipment.orderNumber}</span>
                        <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-[#0B2B5E]">Código: {shipment.code}</span>
                        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${shipment.status === 'Entregado' ? 'bg-blue-600 text-white' : 'bg-orange-100 text-[#F28C00]'}`}>
                          {shipment.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">
                        <strong>Destinatario:</strong> {shipment.recipientName || "No especificado"} {shipment.recipientLastName || ""} ({shipment.recipientPhone || "Sin teléfono"})
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">Registrado el {new Date(shipment.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/?order=${encodeURIComponent(shipment.orderNumber)}&code=${encodeURIComponent(shipment.code)}`}>
                        <Button size="sm" className="bg-[#0B2B5E] text-white hover:bg-[#123d78]"><Search className="mr-2 h-3.5 w-3.5" /> Rastrear envío</Button>
                      </Link>
                      <Button size="sm" variant="outline" onClick={() => setReceiptShipment(shipment)} className="border-[#F28C00] text-[#0B2B5E] hover:bg-orange-50"><Download className="mr-2 h-3.5 w-3.5" /> Ver recibo</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </main>
      </div>
    );
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (mode === "register") {
      registerMutation.mutate({ email, phone: phone || undefined, password, name: registerName, lastName: registerLastName, dni: registerDni });
    } else if (mode === "login") {
      loginMutation.mutate({ email, password });
    } else if (mode === "request") {
      requestMutation.mutate({ email, channel });
    } else {
      resetMutation.mutate({ email, channel, code, newPassword });
    }
  };

  const title = mode === "register" ? "Crear cuenta" : mode === "request" ? "Recuperar contraseña" : mode === "reset" ? "Confirmar código" : "Iniciar sesión";

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#eef6fb] to-white px-4 py-8">
      <div className="mx-auto max-w-md">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#0B2B5E] hover:text-[#F28C00]">
          <ArrowLeft className="h-4 w-4" /> Volver al rastreo
        </Link>

        <Card className="overflow-hidden border-0 shadow-xl">
          <div className="bg-[#0B2B5E] px-6 py-6 text-white">
            <img src={brandLogo} alt="Servicom Internacional" className="mb-5 h-14 w-auto rounded bg-white p-1" />
            <div className="flex items-center gap-3">
              {mode === "register" ? <UserPlus className="h-7 w-7 text-[#F28C00]" /> : mode === "request" || mode === "reset" ? <KeyRound className="h-7 w-7 text-[#F28C00]" /> : <Lock className="h-7 w-7 text-[#F28C00]" />}
              <div>
                <h1 className="text-2xl font-bold">{title}</h1>
                <p className="mt-1 text-sm text-blue-100">Servicom Internacional</p>
              </div>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4 p-6">
            <div>
              <Label htmlFor="account-email">Correo electrónico</Label>
              <div className="relative mt-2">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input id="account-email" type="email" value={email} onChange={event => setEmail(event.target.value)} className="pl-9" required />
              </div>
            </div>

            {mode === "register" && (
              <>
                <div>
                  <Label htmlFor="register-name">Nombres</Label>
                  <Input id="register-name" value={registerName} onChange={event => setRegisterName(event.target.value)} className="mt-2" required />
                </div>
                <div>
                  <Label htmlFor="register-last-name">Apellidos</Label>
                  <Input id="register-last-name" value={registerLastName} onChange={event => setRegisterLastName(event.target.value)} className="mt-2" required />
                </div>
                <div>
                  <Label htmlFor="register-dni">DNI</Label>
                  <Input id="register-dni" value={registerDni} onChange={event => setRegisterDni(event.target.value)} className="mt-2" minLength={8} required />
                </div>
                <div>
                  <Label htmlFor="account-phone">Celular con código de país (opcional)</Label>
                  <div className="relative mt-2">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input id="account-phone" type="tel" placeholder="+51 970 188 447" value={phone} onChange={event => setPhone(event.target.value)} className="pl-9" />
                  </div>
                </div>
              </>
            )}

            {(mode === "login" || mode === "register") && (
              <div>
                <Label htmlFor="account-password">Contraseña</Label>
                <div className="relative mt-2">
                  <Input id="account-password" type={showPassword ? "text" : "password"} minLength={mode === "register" ? 8 : 1} value={password} onChange={event => setPassword(event.target.value)} className="pr-10" required />
                  <button type="button" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} onClick={() => setShowPassword(value => !value)} className="absolute right-2 top-2 text-slate-500 hover:text-[#0B2B5E]"><>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</></button>
                </div>
                {mode === "register" && <p className="mt-1 text-xs text-slate-500">Usa al menos 8 caracteres.</p>}
              </div>
            )}

            {(mode === "request" || mode === "reset") && (
              <fieldset>
                <legend className="text-sm font-medium text-slate-900">Canal de verificación</legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setChannel("email")} className={`rounded-lg border px-3 py-2 text-sm ${channel === "email" ? "border-[#F28C00] bg-orange-50 text-[#0B2B5E]" : "border-slate-200 text-slate-600"}`}>
                    Correo
                  </button>
                  <button type="button" onClick={() => setChannel("sms")} className={`rounded-lg border px-3 py-2 text-sm ${channel === "sms" ? "border-[#F28C00] bg-orange-50 text-[#0B2B5E]" : "border-slate-200 text-slate-600"}`}>
                    SMS al celular
                  </button>
                </div>
              </fieldset>
            )}

            {mode === "reset" && (
              <>
                <div>
                  <Label htmlFor="verification-code">Código de 6 dígitos</Label>
                  <Input id="verification-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value)} className="mt-2 tracking-[0.35em]" required />
                </div>
                <div>
                  <Label htmlFor="new-password">Nueva contraseña</Label>
                  <div className="relative mt-2">
                    <Input id="new-password" type={showNewPassword ? "text" : "password"} minLength={8} value={newPassword} onChange={event => setNewPassword(event.target.value)} className="pr-10" required />
                    <button type="button" aria-label={showNewPassword ? "Ocultar nueva contraseña" : "Mostrar nueva contraseña"} onClick={() => setShowNewPassword(value => !value)} className="absolute right-2 top-2 text-slate-500 hover:text-[#0B2B5E]"><>{showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</></button>
                  </div>
                </div>
              </>
            )}

            <Button type="submit" disabled={registerMutation.isPending || loginMutation.isPending || requestMutation.isPending || resetMutation.isPending} className="w-full bg-[#0B2B5E] text-white hover:bg-[#123d78]">
              {mode === "register" ? "Crear cuenta" : mode === "request" ? "Enviar código" : mode === "reset" ? "Cambiar contraseña" : "Iniciar sesión"}
            </Button>

            <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 text-sm">
              {mode !== "login" && <button type="button" onClick={() => setMode("login")} className="font-medium text-[#0B2B5E] hover:text-[#F28C00]">Iniciar sesión</button>}
              {mode !== "register" && <button type="button" onClick={() => setMode("register")} className="font-medium text-[#0B2B5E] hover:text-[#F28C00]">Crear cuenta</button>}
              {(mode === "login" || mode === "register") && <button type="button" onClick={() => setMode("request")} className="font-medium text-[#0B2B5E] hover:text-[#F28C00]">¿Olvidaste tu contraseña?</button>}
              {mode === "request" && <button type="button" onClick={() => setMode("reset")} className="font-medium text-[#0B2B5E] hover:text-[#F28C00]">Ya tengo un código</button>}
            </div>
          </form>
        </Card>

        <p className="mt-5 text-center text-xs text-slate-500">Tus contraseñas se almacenan mediante un hash seguro y nunca se guardan en texto plano.</p>
      </div>
    </main>
  );
}
