import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, CheckCircle2, Download, Eye, EyeOff, KeyRound, Lock, LogOut, Mail, Package, Plus, Printer, RotateCcw, Search, Trash2, User, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { buildTrackingUrl, TRACKING_QR_OPTIONS, normalizeTrackingValue } from "@/lib/tracking";
import { printUserShipmentReceipt } from "@/lib/userReceipt";
import { digitsOnly, isDigitsOnly, isTextOnly, textOnly } from "@/lib/inputValidation";
import { getPaymentStatusUi } from "@/lib/paymentStatus";
import { getRoutePresentation } from "@/lib/routeDetails";
import { PhoneInput } from "@/components/PhoneInput";
import { QuantityStepper } from "@/components/QuantityStepper";
import { DocumentCatalogSelector } from "@/components/DocumentCatalogSelector";
import { formatPhoneNumber } from "@/lib/phoneFormatting";
import { CatalogDocumentItem, catalogDocumentsToChecklist } from "@/lib/documentCatalog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showAccountNewPassword, setShowAccountNewPassword] = useState(false);
  const [receiptShipment, setReceiptShipment] = useState<any>(null);
  const [reauthPassword, setReauthPassword] = useState("");
  const [showReauthPassword, setShowReauthPassword] = useState(false);

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
  const [shipmentRoute, setShipmentRoute] = useState<"Lima - Torino" | "Torino - Lima">("Lima - Torino");
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
  const [catalogDocuments, setCatalogDocuments] = useState<CatalogDocumentItem[]>([]);
  const [identityErrors, setIdentityErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const maximum = docType === "simple" ? 8 : 10;
    if (sheetCount > maximum) setSheetCount(maximum);
  }, [docType]);

  const updateTextValue = (field: string, rawValue: string, setter: (value: string) => void, label: string) => {
    if (rawValue && !isTextOnly(rawValue)) setIdentityErrors(previous => ({ ...previous, [field]: `${label} solo puede contener letras y espacios.` }));
    else setIdentityErrors(previous => ({ ...previous, [field]: "" }));
    setter(textOnly(rawValue));
  };

  const updateDigitsValue = (field: string, rawValue: string, setter: (value: string) => void) => {
    if (rawValue && !isDigitsOnly(rawValue)) setIdentityErrors(previous => ({ ...previous, [field]: "El DNI solo puede contener números." }));
    else setIdentityErrors(previous => ({ ...previous, [field]: "" }));
    setter(digitsOnly(rawValue));
  };

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
    enabled: !!me && !me.reauthRequired,
  });
  const { data: myDeletedShipments, refetch: refetchDeletedShipments } = trpc.account.myDeletedShipments.useQuery(undefined, {
    enabled: !!me && !me.reauthRequired,
  });
  const { data: myInsights } = trpc.analytics.myInsights.useQuery(undefined, { enabled: !!me && !me.reauthRequired });

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

  const reauthenticateMutation = trpc.account.reauthenticate.useMutation({
    onSuccess: async result => {
      toast.success(result.message);
      setReauthPassword("");
      await utils.account.me.invalidate();
      await refetchShipments();
    },
    onError: error => toast.error(error.message),
  });

  const updateProfileMutation = trpc.account.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Datos de perfil actualizados correctamente.");
      setIsEditingProfile(false);
      utils.account.me.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const handleProfileSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!profileName.trim() || !isTextOnly(profileName)) nextErrors.profileName = "El nombre solo puede contener letras y espacios.";
    if (!profileLastName.trim() || !isTextOnly(profileLastName)) nextErrors.profileLastName = "El apellido solo puede contener letras y espacios.";
    if (!profileDni.trim() || !isDigitsOnly(profileDni)) nextErrors.profileDni = "El DNI solo puede contener números.";
    if (Object.keys(nextErrors).length > 0) {
      setIdentityErrors(previous => ({ ...previous, ...nextErrors }));
      toast.error("Revisa los datos personales antes de guardar.");
      return;
    }
    updateProfileMutation.mutate({ name: profileName.trim().replace(/\s+/g, " "), lastName: profileLastName.trim().replace(/\s+/g, " "), dni: profileDni.trim(), phone: profilePhone.trim() });
  };

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
      setCatalogDocuments([]);
      setReceiptShipment(result.shipment);
      refetchShipments();
    },
    onError: error => toast.error(error.message),
  });
  const deleteMyShipmentMutation = trpc.account.deleteMyShipment.useMutation({
    onSuccess: async () => { toast.success("Envío enviado a la papelera; puedes restaurarlo."); await refetchShipments(); await refetchDeletedShipments(); },
    onError: error => toast.error(error.message),
  });
  const restoreMyShipmentMutation = trpc.account.restoreMyShipment.useMutation({
    onSuccess: async () => { toast.success("Envío restaurado."); await refetchShipments(); await refetchDeletedShipments(); },
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
    const receiptPaymentUi = receiptShipment ? getPaymentStatusUi(receiptShipment.paymentStatus) : null;
    const receiptRoute = receiptShipment ? getRoutePresentation(receiptShipment.route) : null;

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
          {me.reauthRequired && (
            <Dialog open>
              <DialogContent className="max-w-md" onPointerDownOutside={(event) => event.preventDefault()} onEscapeKeyDown={(event) => event.preventDefault()}>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-[#0B2B5E]"><Lock className="h-5 w-5" /> Verificación de seguridad</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-slate-600">Tu sesión continúa activa, pero por seguridad debes volver a escribir tu contraseña antes de seguir usando tu cuenta.</p>
                <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); reauthenticateMutation.mutate({ password: reauthPassword }); }}>
                  <div className="relative">
                    <Label htmlFor="account-reauth-password">Contraseña</Label>
                    <Input id="account-reauth-password" type={showReauthPassword ? "text" : "password"} value={reauthPassword} onChange={(event) => setReauthPassword(event.target.value)} autoComplete="current-password" className="pr-10" />
                    <button type="button" aria-label={showReauthPassword ? "Ocultar contraseña" : "Mostrar contraseña"} onClick={() => setShowReauthPassword(value => !value)} className="absolute right-2 top-7 rounded p-1 text-slate-500 hover:text-[#0B2B5E]"><Eye className="h-4 w-4" /></button>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => logoutMutation.mutate()} disabled={logoutMutation.isPending}>Cerrar sesión</Button>
                    <Button type="submit" disabled={!reauthPassword || reauthenticateMutation.isPending}>{reauthenticateMutation.isPending ? "Verificando..." : "Verificar contraseña"}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
          {receiptShipment && (
            <Dialog open={!!receiptShipment} onOpenChange={(open) => { if (!open) setReceiptShipment(null); }}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-[#0B2B5E] flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" /> Vista Previa del Recibo y Declaración Jurada
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 text-sm text-slate-700">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex justify-between items-center font-bold text-[#0B2B5E] border-b pb-2">
                      <span>Orden: {receiptShipment.orderNumber}</span>
                      <span className="bg-blue-100 text-[#0B2B5E] px-2 py-0.5 rounded text-xs">Código: {receiptShipment.code}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <div><strong>Remitente:</strong> {receiptShipment.senderName} {receiptShipment.senderLastName}</div>
                      <div><strong>DNI Remitente:</strong> {receiptShipment.senderDni || '-'}</div>
                      <div><strong>Cel. Remitente:</strong> {formatPhoneNumber(receiptShipment.senderPhone) || '-'}</div>
                      <div><strong>Destinatario:</strong> {receiptShipment.recipientName} {receiptShipment.recipientLastName}</div>
                      <div><strong>DNI Destinatario:</strong> {receiptShipment.recipientDni || '-'}</div>
                      <div><strong>Cel. Destinataria:</strong> {formatPhoneNumber(receiptShipment.recipientPhone) || '-'}</div>
                      <div><strong>Fecha:</strong> {new Date(receiptShipment.createdAt || Date.now()).toLocaleDateString()}</div>
                      <div className="col-span-2"><strong>Estado de Pago:</strong> <span className={`inline-flex rounded px-2 py-0.5 font-semibold ${receiptPaymentUi?.badgeClass}`}>{receiptPaymentUi?.label}</span></div>
                      <div className="col-span-2"><strong>Descripción / Notas:</strong> {receiptShipment.notes || "Documentación lícita"}</div>
                    </div>
                  </div>

                  <div className="border-2 border-dashed border-[#0B2B5E] p-4 rounded-xl bg-blue-50/50">
                    <div className="font-bold text-[#0B2B5E] text-center mb-2">{receiptRoute?.deliveryTitle}</div>
                    <div className="text-xs space-y-1">
                      <div><strong>Orden:</strong> {receiptShipment.orderNumber}</div>
                      <div><strong>Código Completo:</strong> {receiptShipment.code}</div>
                      <div><strong>Ruta:</strong> {receiptRoute?.route}</div>
                      <div><strong>Origen:</strong> {receiptRoute?.originPrintLabel} · {receiptRoute?.origin.officeLabel}</div>
                      <div><strong>Destino:</strong> {receiptRoute?.destinationPrintLabel}</div>
                      <div><strong>Sede de entrega:</strong> {receiptRoute?.destination.officeLabel}</div>
                      <div><strong>Dirección:</strong> {receiptRoute?.destination.address}</div>
                      <div><strong>Receptor:</strong> {receiptShipment.recipientName} {receiptShipment.recipientLastName}</div>
                      <div><strong>Celular Destinataria:</strong> {formatPhoneNumber(receiptShipment.recipientPhone) || 'No especificado'}</div>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                    <strong>Declaración Jurada y Exención de Responsabilidad Legal:</strong> El remitente declara bajo juramento que el envío contiene única y exclusivamente documentación lícita, eximiendo a Servicom Internacional de cualquier responsabilidad y firmando electrónicamente.
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setReceiptShipment(null)}>Cerrar</Button>
                  <Button onClick={() => printUserShipmentReceipt(receiptShipment)} className="bg-[#0B2B5E] text-white hover:bg-[#123d78]">
                    <Printer className="mr-2 h-4 w-4" /> Imprimir Recibo Ahora
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
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
                  <p className="text-base text-slate-800">{formatPhoneNumber(me.phone) || "No especificado"}</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleProfileSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nombres</Label>
                  <Input value={profileName} onChange={e => updateTextValue("profileName", e.target.value, setProfileName, "El nombre")} placeholder="Ej: Juan" autoComplete="given-name" required className="mt-1" />
                  <p className="mt-1 text-xs text-slate-500">Solo letras y espacios.</p>
                  {identityErrors.profileName && <p className="text-xs text-red-600">{identityErrors.profileName}</p>}
                </div>
                <div>
                  <Label>Apellidos</Label>
                  <Input value={profileLastName} onChange={e => updateTextValue("profileLastName", e.target.value, setProfileLastName, "El apellido")} placeholder="Ej: Pérez Gómez" autoComplete="family-name" required className="mt-1" />
                  <p className="mt-1 text-xs text-slate-500">Solo letras y espacios.</p>
                  {identityErrors.profileLastName && <p className="text-xs text-red-600">{identityErrors.profileLastName}</p>}
                </div>
                <div>
                  <Label>DNI</Label>
                  <Input value={profileDni} onChange={e => updateDigitsValue("profileDni", e.target.value, setProfileDni)} placeholder="Ej: 71234567" inputMode="numeric" pattern="[0-9]*" required className="mt-1" />
                  <p className="mt-1 text-xs text-slate-500">Solo números.</p>
                  {identityErrors.profileDni && <p className="text-xs text-red-600">{identityErrors.profileDni}</p>}
                </div>
                <div>
                  <Label>Teléfono Celular / WhatsApp</Label>
                  <PhoneInput value={profilePhone} onChange={setProfilePhone} placeholder="970 188 447" required />
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
            <p className="mt-3 text-xs text-slate-500">También puedes recuperar la contraseña desde la pantalla de inicio de sesión mediante un código enviado por correo electrónico.</p>
          </Card>

          {myInsights && (
            <Card className="border-0 p-6 shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-[#0B2B5E]">Resumen de uso</h2><p className="mt-1 text-xs text-slate-500">Análisis estadístico de tus acciones en los últimos {myInsights.windowDays} días; no analiza el contenido de tus documentos.</p></div><span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-[#0B2B5E]">Puntaje {myInsights.engagementScore}/100</span></div>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4"><div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Interacciones</p><strong>{myInsights.totalEvents}</strong></div><div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Sesiones</p><strong>{myInsights.uniqueSessions}</strong></div><div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Continuidad</p><strong>{Math.round(myInsights.completionRate * 100)}%</strong></div><div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Actividad atípica</p><strong>{myInsights.anomalyScore}/100</strong></div></div>
              <ul className="mt-4 space-y-1 text-sm text-slate-700">{myInsights.insights.map((insight: string) => <li key={insight}>• {insight}</li>)}</ul>
            </Card>
          )}

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
                <Plus className="mr-2 h-4 w-4" /> Registrar Nuevo Documento
              </Button>
            </div>

            {showNewShipment && (
              <form onSubmit={(e) => {
                e.preventDefault();
                const normalizedChecklist = catalogDocumentsToChecklist(catalogDocuments);
                if (normalizedChecklist.length === 0) {
                  toast.error("Agrega al menos un elemento a la lista de cosas enviadas.");
                  return;
                }
                createShipmentMutation.mutate({
                  documentCount,
                   docType,
                   sheetCount,
                   route: shipmentRoute,
                  senderName: profileName || senderName,
                  senderLastName: profileLastName || senderLastName,
                  senderDni: profileDni || senderDni,
                  senderPhone: profilePhone || senderPhone,
                  recipientName,
                  recipientLastName,
                  recipientDni,
                  recipientPhone,
                  notes,
                  contentChecklist: normalizedChecklist,
                  deliveryMode: "remoto",
                });
              }} className="bg-blue-50/50 p-4 rounded-xl mb-6 space-y-4 border border-blue-100">
                        <h3 className="font-bold text-[#0B2B5E]">Detalles del envío de documentos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Ruta de envío</Label>
                    <select
                      aria-label="Ruta de envío"
                      value={shipmentRoute}
                      onChange={e => setShipmentRoute(e.target.value as "Lima - Torino" | "Torino - Lima")}
                      className="w-full mt-1 p-2 bg-white border border-slate-300 rounded-md text-sm font-medium"
                    >
                      <option value="Lima - Torino">Lima – Torino</option>
                      <option value="Torino - Lima">Torino – Lima</option>
                    </select>
                    <p className="mt-1 text-[10px] text-gray-500">Selecciona la sede a la que llegará tu envío.</p>
                  </div>
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
                  <QuantityStepper
                    id="account-sheet-count"
                    label="Cantidad de Hojas / Documentos"
                    value={sheetCount}
                    min={1}
                    max={docType === "simple" ? 8 : 10}
                    onChange={setSheetCount}
                    description={docType === "simple"
                      ? (sheetCount <= 4 ? "Tarifa: 45 € (máx. 8 hojas)" : "Tarifa calculada (máx. 8 hojas)")
                      : (sheetCount <= 5 ? "Tarifa: 50 € (máx. 10 hojas)" : "Tarifa: 60 € (máx. 10 hojas)")}
                  />
                  <div>
                    <Label>Destinatario - Nombres</Label>
                    <Input value={recipientName} onChange={e => updateTextValue("recipientName", e.target.value, setRecipientName, "El nombre")} placeholder="Ej: María" autoComplete="given-name" required className="mt-1 bg-white" />
                    <p className="mt-1 text-xs text-slate-500">Solo letras y espacios.</p>
                    {identityErrors.recipientName && <p className="text-xs text-red-600">{identityErrors.recipientName}</p>}
                  </div>
                  <div>
                    <Label>Destinatario - Apellidos</Label>
                    <Input value={recipientLastName} onChange={e => updateTextValue("recipientLastName", e.target.value, setRecipientLastName, "El apellido")} placeholder="Ej: López" autoComplete="family-name" required className="mt-1 bg-white" />
                    <p className="mt-1 text-xs text-slate-500">Solo letras y espacios.</p>
                    {identityErrors.recipientLastName && <p className="text-xs text-red-600">{identityErrors.recipientLastName}</p>}
                  </div>
                  <div>
                    <Label>Destinatario - DNI</Label>
                    <Input value={recipientDni} onChange={e => updateDigitsValue("recipientDni", e.target.value, setRecipientDni)} placeholder="Ej: 41234567" inputMode="numeric" pattern="[0-9]*" required className="mt-1 bg-white" />
                    <p className="mt-1 text-xs text-slate-500">Solo números.</p>
                    {identityErrors.recipientDni && <p className="text-xs text-red-600">{identityErrors.recipientDni}</p>}
                  </div>
                  <div>
                    <Label>Destinatario - Teléfono</Label>
                    <div className="mt-1">
                      <PhoneInput value={recipientPhone} onChange={setRecipientPhone} placeholder="987654321" required />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <DocumentCatalogSelector value={catalogDocuments} onChange={setCatalogDocuments} idPrefix="account-document" />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Notas (opcional)</Label>
                    <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Instrucciones adicionales de entrega" className="mt-1 bg-white" />
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
                <p className="text-xs text-slate-400 mt-1">Usa el botón superior para registrar tu primer documento.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myShipments.map((shipment) => (
                  <div key={shipment.id} className="border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white shadow-sm">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[#0B2B5E]">Orden: {shipment.orderNumber}</span>
                        <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-[#0B2B5E]">Código: {shipment.code}</span>
                        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${shipment.status === 'Entregado' ? 'bg-blue-600 text-white' : shipment.status === 'Por entregar en agencia' ? 'bg-sky-100 text-sky-800' : 'bg-orange-100 text-[#F28C00]'}`}>
                          {shipment.status}
                        </span>
                        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${getPaymentStatusUi(shipment.paymentStatus).badgeClass}`}>
                          {getPaymentStatusUi(shipment.paymentStatus).label}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">
                        <strong>Destinatario:</strong> {shipment.recipientName || "No especificado"} {shipment.recipientLastName || ""} ({formatPhoneNumber(shipment.recipientPhone) || "Sin teléfono"})
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">Registrado el {new Date(shipment.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/?order=${encodeURIComponent(shipment.orderNumber)}&code=${encodeURIComponent(shipment.code)}`}>
                        <Button size="sm" className="bg-[#0B2B5E] text-white hover:bg-[#123d78]"><Search className="mr-2 h-3.5 w-3.5" /> Rastrear envío</Button>
                      </Link>
                      <Button size="sm" variant="outline" onClick={() => setReceiptShipment(shipment)} className="border-[#F28C00] text-[#0B2B5E] hover:bg-orange-50"><Download className="mr-2 h-3.5 w-3.5" /> Ver recibo</Button>
                      <Button size="sm" variant="outline" disabled={deleteMyShipmentMutation.isPending} onClick={() => { if (window.confirm("El envío se moverá a la papelera y podrás restaurarlo.")) deleteMyShipmentMutation.mutate({ shipmentId: shipment.id }); }} className="border-red-200 text-red-700 hover:bg-red-50"><Trash2 className="mr-2 h-3.5 w-3.5" /> Eliminar</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {myDeletedShipments && myDeletedShipments.length > 0 && (
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2"><Trash2 className="h-5 w-5 text-slate-500" /><h3 className="font-bold text-[#0B2B5E]">Papelera y recuperación</h3></div>
                <p className="mt-1 text-xs text-slate-500">Los envíos eliminados se conservan con su historial y pueden restaurarse.</p>
                <div className="mt-3 space-y-2">
                  {myDeletedShipments.map(shipment => <div key={shipment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white p-3"><div><strong className="text-sm text-[#0B2B5E]">Orden {shipment.orderNumber}</strong><p className="text-xs text-slate-500">Eliminado el {shipment.deletedAt ? new Date(shipment.deletedAt).toLocaleString() : "fecha no disponible"}</p></div><Button size="sm" variant="outline" disabled={restoreMyShipmentMutation.isPending} onClick={() => restoreMyShipmentMutation.mutate({ shipmentId: shipment.id })}><RotateCcw className="mr-2 h-3.5 w-3.5" /> Restaurar</Button></div>)}
                </div>
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
      requestMutation.mutate({ email, channel: "email" });
    } else {
      resetMutation.mutate({ email, channel: "email", code, newPassword });
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
                  <Input id="register-name" value={registerName} onChange={event => updateTextValue("registerName", event.target.value, setRegisterName, "El nombre")} autoComplete="given-name" className="mt-2" required />
                  <p className="mt-1 text-xs text-slate-500">Solo letras y espacios.</p>
                  {identityErrors.registerName && <p className="text-xs text-red-600">{identityErrors.registerName}</p>}
                </div>
                <div>
                  <Label htmlFor="register-last-name">Apellidos</Label>
                  <Input id="register-last-name" value={registerLastName} onChange={event => updateTextValue("registerLastName", event.target.value, setRegisterLastName, "El apellido")} autoComplete="family-name" className="mt-2" required />
                  <p className="mt-1 text-xs text-slate-500">Solo letras y espacios.</p>
                  {identityErrors.registerLastName && <p className="text-xs text-red-600">{identityErrors.registerLastName}</p>}
                </div>
                <div>
                  <Label htmlFor="register-dni">DNI</Label>
                  <Input id="register-dni" value={registerDni} onChange={event => updateDigitsValue("registerDni", event.target.value, setRegisterDni)} inputMode="numeric" pattern="[0-9]*" className="mt-2" minLength={8} required />
                  <p className="mt-1 text-xs text-slate-500">Solo números; mínimo 8 dígitos.</p>
                  {identityErrors.registerDni && <p className="text-xs text-red-600">{identityErrors.registerDni}</p>}
                </div>
                  <div>
                    <Label htmlFor="account-phone">Celular con código de país (opcional)</Label>
                    <div className="mt-2">
                      <PhoneInput id="account-phone" value={phone} onChange={setPhone} placeholder="970 188 447" />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Selecciona el país y busca por nombre o código internacional.</p>
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
              <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-[#0B2B5E]">
                El código de recuperación se enviará al correo electrónico registrado.
              </div>
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
