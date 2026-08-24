import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, CheckCircle2, Download, Eye, EyeOff, KeyRound, Lock, LogOut, Mail, MessageSquare, Package, Plus, Printer, RotateCcw, Search, Trash2, User, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { buildTrackingUrl, TRACKING_QR_OPTIONS, normalizeTrackingValue } from "@/lib/tracking";
import { printUserShipmentReceipt } from "@/lib/userReceipt";
import { DNI_MAX_LENGTH, digitsOnly, dniDigitsOnly, isDigitsOnly, isTextOnly, isValidDni, textOnly } from "@/lib/inputValidation";
import { getPaymentStatusUi } from "@/lib/paymentStatus";
import { getRoutePresentation } from "@/lib/routeDetails";
import { PhoneInput } from "@/components/PhoneInput";
import { QuantityStepper } from "@/components/QuantityStepper";
import { DocumentCatalogSelector } from "@/components/DocumentCatalogSelector";
import { formatPhoneNumber } from "@/lib/phoneFormatting";
import { CatalogDocumentItem, catalogDocumentsToChecklist } from "@/lib/documentCatalog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { summarizeRevenue } from "@shared/revenueSummary";
import { DocumentPricePreview } from "@/components/DocumentPricePreview";
import { paginateItems } from "@/lib/pagination";
import { GeneralFeedbackDialog } from "@/components/GeneralFeedbackDialog";
import { IdentityDocumentField } from "@/components/IdentityDocumentField";
import { ShipmentTrendCharts } from "@/components/ShipmentTrendCharts";
import { PasswordRequirements } from "@/components/PasswordRequirements";
import { AgencyDestinationPicker } from "@/components/AgencyDestinationPicker";
import type { IdentityDocumentType } from "@shared/identityDocuments";
import { getFuzzySearchScore } from "@shared/fuzzySearch";
import { isSecurePassword, PASSWORD_REQUIREMENTS_MESSAGE } from "@shared/passwordPolicy";
import { isValidInternationalPhone } from "@shared/phoneValidation";

const brandLogo = "/manus-storage/servicom_logo_final_e7ce35aa.png";

type AccountMode = "login" | "register" | "request" | "reset";
type ClientWorkspace = "envios" | "registrar" | "papelera" | "perfil" | "seguridad" | "resumen" | "analitica";
const getLockoutSecondsFromMessage = (message: string) => Number(message.match(/espera\s+(\d+)\s+segundos/i)?.[1] || 0);

export default function AccountPage() {
  const [, setLocation] = useLocation();
  const returnToMobileApp = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("returnTo") === "/movil";
  const mobileClientMode = returnToMobileApp || (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("mobile") === "1");
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
  const [rememberDevice, setRememberDevice] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showAccountNewPassword, setShowAccountNewPassword] = useState(false);
  const [receiptShipment, setReceiptShipment] = useState<any>(null);
  const [showGeneralFeedback, setShowGeneralFeedback] = useState(false);
  const [reauthPassword, setReauthPassword] = useState("");
  const [showReauthPassword, setShowReauthPassword] = useState(false);
  const [loginLockSeconds, setLoginLockSeconds] = useState(0);
  const [reauthLockSeconds, setReauthLockSeconds] = useState(0);

  // Perfil con modo de visualización y edición
  const [profileName, setProfileName] = useState("");
  const [profileLastName, setProfileLastName] = useState("");
  const [profileDni, setProfileDni] = useState("");
  const [profileDocumentType, setProfileDocumentType] = useState<IdentityDocumentType>("dni_peru");
  const [profilePhone, setProfilePhone] = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Registro de encomienda por usuario
  const [showNewShipment, setShowNewShipment] = useState(false);
  const [shipmentStep, setShipmentStep] = useState<1 | 2 | 3>(1);
  const [clientWorkspace, setClientWorkspace] = useState<ClientWorkspace>("envios");
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [clientPaymentFilter, setClientPaymentFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [clientStatusFilter, setClientStatusFilter] = useState("all");
  const [clientCurrentPage, setClientCurrentPage] = useState(1);
  const [showClientTrash, setShowClientTrash] = useState(false);
  const [clientTrashSearchTerm, setClientTrashSearchTerm] = useState("");
  const [clientTrashPaymentFilter, setClientTrashPaymentFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [clientTrashStatusFilter, setClientTrashStatusFilter] = useState("all");
  const [clientTrashCurrentPage, setClientTrashCurrentPage] = useState(1);
  const [documentCount, setDocumentCount] = useState(1);
  const [docType, setDocType] = useState<"simple" | "apostillado">("simple");
  const [shipmentRoute, setShipmentRoute] = useState<"Lima - Torino" | "Torino - Lima">("Lima - Torino");
  const [requiresApostilleService, setRequiresApostilleService] = useState(false);
  const [requiresTranslationService, setRequiresTranslationService] = useState(false);
  const [destinationAddress, setDestinationAddress] = useState("");
  const [sheetCount, setSheetCount] = useState(1);
  const [senderName, setSenderName] = useState("");
  const [senderLastName, setSenderLastName] = useState("");
  const [senderDni, setSenderDni] = useState("");
  const [senderPhone, setSenderPhone] = useState("+51 ");
  const [recipientName, setRecipientName] = useState("");
  const [recipientLastName, setRecipientLastName] = useState("");
  const [recipientDni, setRecipientDni] = useState("");
  const [recipientDocumentType, setRecipientDocumentType] = useState<IdentityDocumentType>("dni_peru");
  const [recipientPhone, setRecipientPhone] = useState("+51 ");
  const [recipientLookupQuery, setRecipientLookupQuery] = useState("");
  const [recipientLookupOpen, setRecipientLookupOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [shipmentPhoto, setShipmentPhoto] = useState<File | null>(null);
  const [isIncomplete, setIsIncomplete] = useState(false);
  const [incompleteReason, setIncompleteReason] = useState("");
  const [catalogDocuments, setCatalogDocuments] = useState<CatalogDocumentItem[]>([]);
  const [identityErrors, setIdentityErrors] = useState<Record<string, string>>({});
  const [shipmentValidationErrors, setShipmentValidationErrors] = useState<Record<string, string>>({});
  const mobileShipmentStepVisible = (step: 1 | 2 | 3) => !mobileClientMode || shipmentStep === step;
  const advanceMobileShipmentStep = () => setShipmentStep(step => step === 1 ? 2 : 3);
  const previousMobileShipmentStep = () => setShipmentStep(step => step === 3 ? 2 : 1);

  const resetClientShipmentForm = () => {
    setDocumentCount(1);
    setDocType("simple");
    setShipmentRoute("Lima - Torino");
    setRequiresApostilleService(false);
    setRequiresTranslationService(false);
    setDestinationAddress("");
    setSheetCount(1);
    setSenderName("");
    setSenderLastName("");
    setSenderDni("");
    setSenderPhone("+51 ");
    setRecipientName("");
    setRecipientLastName("");
    setRecipientDni("");
    setRecipientDocumentType("dni_peru");
    setRecipientPhone("+51 ");
    setRecipientLookupQuery("");
    setRecipientLookupOpen(false);
    setNotes("");
    setShipmentPhoto(null);
    setIsIncomplete(false);
    setIncompleteReason("");
    setCatalogDocuments([]);
    setIdentityErrors({});
    setShipmentValidationErrors({});
    setShipmentStep(1);
  };

  useEffect(() => {
    const maximum = docType === "simple" ? 8 : 10;
    if (sheetCount > maximum) setSheetCount(maximum);
  }, [docType]);

  useEffect(() => {
    if (shipmentRoute !== "Torino - Lima") {
      setRequiresApostilleService(false);
      setRequiresTranslationService(false);
    }
  }, [shipmentRoute]);

  const updateTextValue = (field: string, rawValue: string, setter: (value: string) => void, label: string) => {
    if (rawValue && !isTextOnly(rawValue)) setIdentityErrors(previous => ({ ...previous, [field]: `${label} solo puede contener letras y espacios.` }));
    else setIdentityErrors(previous => ({ ...previous, [field]: "" }));
    setter(textOnly(rawValue));
  };

  const updateDigitsValue = (field: string, rawValue: string, setter: (value: string) => void) => {
    if (rawValue && !isDigitsOnly(rawValue)) setIdentityErrors(previous => ({ ...previous, [field]: "El DNI solo puede contener números." }));
    else if (digitsOnly(rawValue).length > DNI_MAX_LENGTH) setIdentityErrors(previous => ({ ...previous, [field]: "El DNI no puede tener más de 8 dígitos." }));
    else setIdentityErrors(previous => ({ ...previous, [field]: "" }));
    setter(dniDigitsOnly(rawValue));
  };

  const utils = trpc.useUtils();
  const handlePrintReceipt = async () => {
    if (!receiptShipment) return;
    try {
      const freshShipment = await utils.shipment.search.fetch({ orderNumber: String(receiptShipment.orderNumber), code: String(receiptShipment.code) });
      await printUserShipmentReceipt(freshShipment || receiptShipment);
    } catch {
      await printUserShipmentReceipt(receiptShipment);
      toast.info("El recibo se imprimió con la última información disponible en pantalla.");
    }
  };
  const { data: me, isLoading: meLoading } = trpc.account.me.useQuery();

  // Sincronizar datos de perfil cuando la sesión local ya esté disponible.
  useEffect(() => {
    if (!me) return;
    setProfileName(me.name || "");
    setProfileLastName(me.lastName || "");
    setProfileDni(me.dni || "");
    setProfileDocumentType((me.documentType || "dni_peru") as IdentityDocumentType);
    setProfilePhone(me.phone || "");
    if (me.mustChangePassword) setClientWorkspace("seguridad");
  }, [me]);

  const { data: myShipments, refetch: refetchShipments } = trpc.account.myShipments.useQuery(undefined, {
    enabled: !!me && !me.reauthRequired,
  });
  const recipientLookupResults = useMemo(() => {
    const query = recipientLookupQuery.trim();
    if (query.length < 2) return [] as Array<any & { relevance: number }>;
    const uniqueRecipients = new Map<string, any & { relevance: number }>();
    for (const shipment of myShipments || []) {
      const candidate = shipment as any;
      if (!candidate.recipientName && !candidate.recipientLastName && !candidate.recipientDni) continue;
      const searchable = [candidate.recipientName, candidate.recipientLastName, candidate.recipientDni].filter(Boolean).join(" ");
      const relevance = getFuzzySearchScore(query, searchable);
      if (relevance <= 0) continue;
      const key = [candidate.recipientDocumentType || "dni_peru", candidate.recipientDni || "", candidate.recipientName || "", candidate.recipientLastName || ""].join("|").toLowerCase();
      const existing = uniqueRecipients.get(key);
      if (!existing || relevance > existing.relevance) uniqueRecipients.set(key, { ...candidate, relevance });
    }
    return Array.from(uniqueRecipients.values()).sort((left, right) => right.relevance - left.relevance).slice(0, 6);
  }, [myShipments, recipientLookupQuery]);
  const applyRecipientLookup = (recipient: any) => {
    setRecipientName(recipient.recipientName || "");
    setRecipientLastName(recipient.recipientLastName || "");
    setRecipientDni(recipient.recipientDni || "");
    setRecipientDocumentType((recipient.recipientDocumentType || "dni_peru") as IdentityDocumentType);
    setRecipientPhone(recipient.recipientPhone || "+51 ");
    setRecipientLookupQuery("");
    setRecipientLookupOpen(false);
    setIdentityErrors(previous => ({ ...previous, recipientName: "", recipientLastName: "" }));
  };
  const clientRevenue = useMemo(() => summarizeRevenue(myShipments), [myShipments]);
  const { data: myDeletedShipments, refetch: refetchDeletedShipments } = trpc.account.myDeletedShipments.useQuery(undefined, {
    enabled: !!me && !me.reauthRequired,
  });
  const { data: myInsights } = trpc.analytics.myInsights.useQuery(undefined, { enabled: !!me && !me.reauthRequired && clientWorkspace === "analitica" });
  const clientPageSize = 6;
  const filteredClientShipments = useMemo(() => {
    const query = clientSearchTerm.trim();
    const relevanceByShipmentId = new Map<number, number>();
    return [...(myShipments || [])].filter((shipment: any) => {
      const relevance = getFuzzySearchScore(query, [shipment.orderNumber, shipment.code, shipment.recipientName, shipment.recipientLastName, shipment.recipientDni].filter(Boolean).join(" "));
      relevanceByShipmentId.set(shipment.id, relevance);
      const textMatches = !query || relevance > 0;
      const paymentMatches = clientPaymentFilter === "all" || (clientPaymentFilter === "paid" ? shipment.paymentStatus === "Pagado" : shipment.paymentStatus !== "Pagado");
      const statusMatches = clientStatusFilter === "all" || shipment.status === clientStatusFilter;
      return textMatches && paymentMatches && statusMatches;
    }).sort((left: any, right: any) => (query ? (relevanceByShipmentId.get(right.id) || 0) - (relevanceByShipmentId.get(left.id) || 0) : 0) || new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());
  }, [myShipments, clientSearchTerm, clientPaymentFilter, clientStatusFilter]);
  const clientPagination = paginateItems(filteredClientShipments, clientCurrentPage, clientPageSize);
  const filteredClientTrash = useMemo(() => {
    const query = clientTrashSearchTerm.trim();
    return [...(myDeletedShipments || [])].filter((shipment: any) => {
      const textMatches = !query || getFuzzySearchScore(query, [shipment.orderNumber, shipment.code, shipment.recipientName, shipment.recipientLastName, shipment.recipientDni].filter(Boolean).join(" ")) > 0;
      const paymentMatches = clientTrashPaymentFilter === "all" || (clientTrashPaymentFilter === "paid" ? shipment.paymentStatus === "Pagado" : shipment.paymentStatus !== "Pagado");
      const statusMatches = clientTrashStatusFilter === "all" || shipment.status === clientTrashStatusFilter;
      return textMatches && paymentMatches && statusMatches;
    }).sort((left: any, right: any) => new Date(right.deletedAt || 0).getTime() - new Date(left.deletedAt || 0).getTime());
  }, [myDeletedShipments, clientTrashSearchTerm, clientTrashPaymentFilter, clientTrashStatusFilter]);
  const clientTrashPagination = paginateItems(filteredClientTrash, clientTrashCurrentPage, clientPageSize);

  useEffect(() => setClientCurrentPage(1), [clientSearchTerm, clientPaymentFilter, clientStatusFilter]);
  useEffect(() => setClientCurrentPage(page => Math.min(page, clientPagination.totalPages)), [clientPagination.totalPages]);
  useEffect(() => setClientTrashCurrentPage(1), [clientTrashSearchTerm, clientTrashPaymentFilter, clientTrashStatusFilter]);
  useEffect(() => setClientTrashCurrentPage(page => Math.min(page, clientTrashPagination.totalPages)), [clientTrashPagination.totalPages]);
  useEffect(() => {
    if (loginLockSeconds <= 0) return;
    const timer = window.setTimeout(() => setLoginLockSeconds(seconds => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [loginLockSeconds]);
  useEffect(() => {
    if (reauthLockSeconds <= 0) return;
    const timer = window.setTimeout(() => setReauthLockSeconds(seconds => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [reauthLockSeconds]);

  const registerMutation = trpc.account.register.useMutation({
    onSuccess: async () => {
      toast.success("Cuenta creada correctamente. Sesión iniciada.");
      // La mutación ya estableció la cookie: forzar la consulta para mostrar el panel.
      await utils.account.me.invalidate();
      if (returnToMobileApp) setLocation("/movil");
    },
    onError: error => toast.error(error.message),
  });

  const loginMutation = trpc.account.login.useMutation({
    onSuccess: async () => {
      setLoginLockSeconds(0);
      toast.success("Sesión iniciada correctamente.");
      await utils.account.me.invalidate();
      if (returnToMobileApp) setLocation("/movil");
    },
    onError: error => {
      const seconds = getLockoutSecondsFromMessage(error.message);
      if (seconds) setLoginLockSeconds(seconds);
      toast.error(error.message);
    },
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
      setReauthLockSeconds(0);
      await utils.account.me.invalidate();
      await refetchShipments();
    },
    onError: error => {
      const seconds = getLockoutSecondsFromMessage(error.message);
      if (seconds) setReauthLockSeconds(seconds);
      toast.error(error.message);
    },
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
    if (!profileDni.trim() || !isValidDni(profileDni)) nextErrors.profileDni = "El DNI debe contener solo números y no puede superar 8 dígitos.";
    if (Object.keys(nextErrors).length > 0) {
      setIdentityErrors(previous => ({ ...previous, ...nextErrors }));
      toast.error("Revisa los datos personales antes de guardar.");
      return;
    }
    updateProfileMutation.mutate({ name: profileName.trim().replace(/\s+/g, " "), lastName: profileLastName.trim().replace(/\s+/g, " "), dni: profileDni.trim(), documentType: profileDocumentType, phone: profilePhone.trim() });
  };

  const changePasswordMutation = trpc.account.changePassword.useMutation({
    onSuccess: result => {
      toast.success(result.message);
      setCurrentPassword("");
      setAccountNewPassword("");
    },
    onError: error => toast.error(error.message),
  });

  const uploadMyShipmentPhotoMutation = trpc.account.uploadMyShipmentPhoto.useMutation({ onError: error => toast.error(error.message) });
  const createShipmentMutation = trpc.account.createMyShipment.useMutation({
    onSuccess: async result => {
      if (shipmentPhoto && result.shipment?.id) {
        const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("No se pudo leer la foto.")); reader.readAsDataURL(shipmentPhoto); });
        await uploadMyShipmentPhotoMutation.mutateAsync({ shipmentId: result.shipment.id, name: shipmentPhoto.name, mimeType: shipmentPhoto.type, dataBase64: dataUrl.split(",", 2)[1] || "" });
      }
      toast.success("Envío registrado. Tu recibo está disponible.");
      setShowNewShipment(false);
      setClientWorkspace("envios");
      setDocumentCount(1);
      setRequiresApostilleService(false);
      setRequiresTranslationService(false);
       setNotes("");
      setShipmentPhoto(null);
      setIsIncomplete(false);
      setIncompleteReason("");
      setCatalogDocuments([]);
      setShipmentValidationErrors({});
      setReceiptShipment(result.shipment);
      refetchShipments();
    },
    onError: error => toast.error(error.message),
  });
  const validateClientShipment = () => {
    const errors: Record<string, string> = {};
    if (!recipientName.trim() || !isTextOnly(recipientName)) errors.recipientName = "Completa los nombres del destinatario usando solo letras.";
    if (!recipientLastName.trim() || !isTextOnly(recipientLastName)) errors.recipientLastName = "Completa los apellidos del destinatario usando solo letras.";
    if (!recipientDni.trim()) errors.recipientDni = "Completa el documento de identidad del destinatario.";
    if (!isValidInternationalPhone(recipientPhone)) errors.recipientPhone = "Completa un teléfono válido con código de país.";
    if (catalogDocumentsToChecklist(catalogDocuments).length === 0) errors.contentChecklist = "Agrega al menos un elemento a la lista de cosas enviadas.";
    setShipmentValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
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
    const receiptRoute = receiptShipment ? getRoutePresentation(receiptShipment.route, receiptShipment.destinationAddress) : null;

    return (
      <div className="account-surface min-h-screen bg-gradient-to-b from-[#eef6fb] to-white pb-12">
        <header className="bg-[#0B2B5E] text-white shadow-md">
          <div className="mx-auto flex w-[min(96vw,1560px)] flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <img src={brandLogo} alt="Servicom Internacional" className="h-12 w-auto rounded bg-white p-1" />
              <div className="min-w-0">
<h1 className="text-xl font-extrabold leading-tight sm:text-2xl">Hola, {[me.name, me.lastName].filter(Boolean).join(" ") || "Cliente"}</h1>
                 <p className="truncate text-xs text-blue-200">{me.email}</p>
                 <p className="text-[11px] text-blue-100">Mi cuenta de Cliente · datos personales y envíos</p>
              </div>
            </div>
            <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto">
              <Link href="/" className="rounded bg-white/10 px-2 py-2 text-center text-xs font-medium transition hover:bg-white/20 sm:px-3 sm:text-sm">
                <span className="sm:hidden">Rastrear</span><span className="hidden sm:inline">Ir a Rastreo Público</span>
              </Link>
              <Button aria-label="Comentarios" onClick={() => setShowGeneralFeedback(true)} variant="outline" className="border-white/30 bg-transparent px-2 text-xs text-white hover:bg-white/20 sm:px-3 sm:text-sm">
                <MessageSquare className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Comentarios</span><span className="sm:hidden">Ayuda</span>
              </Button>
              <Button onClick={() => logoutMutation.mutate()} variant="outline" className="border-white/30 bg-transparent px-2 text-xs text-white hover:bg-white/20 sm:px-3 sm:text-sm">
                <LogOut className="h-4 w-4 sm:mr-2" /><span>Salir</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-[min(96vw,1560px)] space-y-8 px-5 py-10">
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
                    <Button type="submit" disabled={!reauthPassword || reauthenticateMutation.isPending || reauthLockSeconds > 0}>{reauthLockSeconds > 0 ? `Espera ${reauthLockSeconds}s` : reauthenticateMutation.isPending ? "Verificando..." : "Verificar contraseña"}</Button>
                  </div>
                  {reauthLockSeconds > 0 && <p role="status" aria-live="polite" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">Por seguridad, alcanzaste cinco intentos fallidos. Podrás verificar de nuevo en {reauthLockSeconds} segundos.</p>}
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
                       {(receiptShipment.requiresApostilleService === true || Number(receiptShipment.requiresApostilleService) === 1) && <div className="col-span-2 rounded-md border border-[#0B2B5E]/20 bg-blue-50 px-3 py-2 font-semibold text-[#0B2B5E]"><strong>Servicio solicitado:</strong> Documentos para apostillar — 40 EUR + 160 soles</div>}
                       {(receiptShipment.requiresTranslationService === true || Number(receiptShipment.requiresTranslationService) === 1) && <div className="col-span-2 rounded-md border border-[#0B2B5E]/20 bg-blue-50 px-3 py-2 font-semibold text-[#0B2B5E]"><strong>Servicio solicitado:</strong> Documentos para traducir — 200 soles</div>}
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
                  <Button onClick={handlePrintReceipt} className="bg-[#0B2B5E] text-white hover:bg-[#123d78]">
                    <Printer className="mr-2 h-4 w-4" /> Imprimir Recibo Ahora
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          <GeneralFeedbackDialog open={showGeneralFeedback} onOpenChange={setShowGeneralFeedback} />

          <Card className="border-0 p-4 shadow-sm" aria-label="Áreas de mi cuenta">
            <div className="flex flex-wrap items-center gap-2">
              {((mobileClientMode ? [["envios", "Rastrear"], ["registrar", "Registrar"], ["seguridad", "Cambiar contraseña"]] : [["envios", "Mis envíos"], ["registrar", "Registrar documento"], ["papelera", `Papelera (${myDeletedShipments?.length || 0})`], ["perfil", "Mi perfil"], ["seguridad", "Seguridad"], ["resumen", "Resumen"], ["analitica", "Analítica"]]) as Array<[ClientWorkspace, string]>).map(([workspace, label]) => <Button key={workspace} type="button" size="sm" variant={clientWorkspace === workspace ? "default" : "outline"} onClick={() => { setClientWorkspace(workspace); if (workspace === "registrar") setShowNewShipment(true); }} className={`${!mobileClientMode && (workspace === "resumen" || workspace === "analitica") ? "hidden sm:inline-flex" : ""} ${clientWorkspace === workspace ? "bg-[#0B2B5E] text-white" : "border-slate-300 text-slate-700"}`}>{label}</Button>)}
            </div>
            {!mobileClientMode && <details className="mt-3 sm:hidden"><summary className="cursor-pointer text-xs font-semibold text-[#0B2B5E]">Más opciones de cuenta</summary><div className="mt-2 flex flex-wrap gap-2">{([["resumen", "Resumen"], ["analitica", "Analítica"]] as Array<[ClientWorkspace, string]>).map(([workspace, label]) => <Button key={workspace} type="button" size="sm" variant={clientWorkspace === workspace ? "default" : "outline"} onClick={() => setClientWorkspace(workspace)} className={clientWorkspace === workspace ? "bg-[#0B2B5E] text-white" : "border-slate-300 text-slate-700"}>{label}</Button>)}</div></details>}
            <p className="mt-2 text-xs text-slate-500">{mobileClientMode ? "En la aplicación móvil del Cliente solo están disponibles registrar, rastrear y cambiar contraseña." : "Elige una tarea principal; las opciones menos usadas quedan disponibles en «Más opciones»."}</p>
          </Card>

          {me.mustChangePassword && <Card className="border border-amber-300 bg-amber-50 p-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-medium text-amber-950">Tu cuenta fue creada con una contraseña temporal. Cámbiala ahora para continuar con un acceso seguro.</p><Button type="button" size="sm" className="bg-[#0B2B5E] text-white hover:bg-[#123d78]" onClick={() => setClientWorkspace("seguridad")}>Cambiar contraseña</Button></div></Card>}

          {/* Datos Personales */}
          <Card className={`border-0 p-6 shadow-md ${clientWorkspace === "perfil" ? "" : "hidden"}`}>
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
                  <IdentityDocumentField id="profile-document" label="Documento de identidad" documentType={profileDocumentType} onDocumentTypeChange={setProfileDocumentType} value={profileDni} onValueChange={setProfileDni} required />
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
          <Card className={`border-0 p-6 shadow-md ${clientWorkspace === "seguridad" ? "" : "hidden"}`}>
            <h2 className="text-lg font-bold text-[#0B2B5E] mb-4 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-[#F28C00]" /> Seguridad de la cuenta
            </h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!isSecurePassword(accountNewPassword)) {
                toast.error(PASSWORD_REQUIREMENTS_MESSAGE);
                return;
              }
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
                  <Input type={showAccountNewPassword ? "text" : "password"} minLength={12} value={accountNewPassword} onChange={e => setAccountNewPassword(e.target.value)} required className="pr-10" autoComplete="new-password" />
                  <button type="button" aria-label={showAccountNewPassword ? "Ocultar nueva contraseña" : "Mostrar nueva contraseña"} onClick={() => setShowAccountNewPassword(value => !value)} className="absolute right-2 top-2 text-slate-500 hover:text-[#0B2B5E]"><>{showAccountNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</></button>
                </div>
              </div>
              <Button type="submit" disabled={changePasswordMutation.isPending} className="bg-[#0B2B5E] text-white hover:bg-[#123d78]">
                {changePasswordMutation.isPending ? "Actualizando..." : "Cambiar contraseña"}
              </Button>
              <div className="md:col-span-3"><PasswordRequirements password={accountNewPassword} /></div>
            </form>
            <p className="mt-3 text-xs text-slate-500">También puedes recuperar la contraseña desde la pantalla de inicio de sesión mediante un código enviado por correo electrónico.</p>
          </Card>

          <Card className={`border-0 p-6 shadow-md ${clientWorkspace === "resumen" ? "" : "hidden"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h2 className="text-lg font-bold text-[#0B2B5E]">Resumen de pagos</h2><p className="mt-1 text-xs text-slate-500">Solo se contabilizan tus envíos marcados como pagados.</p></div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-right"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Pagado confirmado</p><p className="text-2xl font-extrabold text-emerald-800">{clientRevenue.confirmedEur.toLocaleString("es-PE", { style: "currency", currency: "EUR" })}</p></div>
            </div>
            <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"><summary className="cursor-pointer text-sm font-semibold text-[#0B2B5E]">Ver detalle de mis pagos</summary><div className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-4"><div><span className="block text-xs text-slate-500">Envíos pagados</span><strong>{clientRevenue.paidCount}</strong></div><div><span className="block text-xs text-slate-500">Pendiente</span><strong>{clientRevenue.pendingEur.toLocaleString("es-PE", { style: "currency", currency: "EUR" })}</strong></div><div><span className="block text-xs text-slate-500">Registros pendientes</span><strong>{clientRevenue.pendingCount}</strong></div><div><span className="block text-xs text-slate-500">Total de envíos</span><strong>{clientRevenue.totalCount}</strong></div></div></details>
          </Card>

          {!mobileClientMode && clientWorkspace === "analitica" && (
            <Card className="border-0 p-6 shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-[#0B2B5E]">Analítica de interacción y tendencias</h2><p className="mt-1 text-xs text-slate-500">Esta área se abre solo cuando deseas revisar la operación. No analiza nombres, documentos, teléfonos ni notas.</p></div>{myInsights && <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-[#0B2B5E]">Puntaje {myInsights.engagementScore}/100</span>}</div>
              {myInsights && <><div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4"><div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Interacciones</p><strong>{myInsights.totalEvents}</strong></div><div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Sesiones</p><strong>{myInsights.uniqueSessions}</strong></div><div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Continuidad</p><strong>{Math.round(myInsights.completionRate * 100)}%</strong></div><div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Actividad atípica</p><strong>{myInsights.anomalyScore}/100</strong></div></div><ul className="mt-4 space-y-1 text-sm text-slate-700">{myInsights.insights.map((insight: string) => <li key={insight}>• {insight}</li>)}</ul></>}
              <div className="mt-6"><ShipmentTrendCharts shipments={myShipments} /></div>
            </Card>
          )}

          {/* Mis Envíos y Registro */}
          <Card className={`border-0 p-6 shadow-md ${["envios", "registrar", "papelera"].includes(clientWorkspace) ? "" : "hidden"}`}>
            {clientWorkspace !== "papelera" && <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#0B2B5E] flex items-center gap-2">
                  <Package className="h-5 w-5 text-[#F28C00]" /> Mis Envíos Registrados
                </h2>
                <p className="text-xs text-slate-500">Registra envíos de documentos o consulta el estado actual de tus registros.</p>
              </div>
              <Button onClick={() => { setClientWorkspace("registrar"); resetClientShipmentForm(); setShowNewShipment(value => !value); }} className="bg-[#F28C00] text-white hover:bg-[#d67900]">
                <Plus className="mr-2 h-4 w-4" /> Registrar Nuevo Documento
              </Button>
            </div>}

            {clientWorkspace === "registrar" && showNewShipment && (
              <form noValidate onSubmit={(e) => {
                e.preventDefault();
                if (!validateClientShipment()) { toast.error("Revisa los campos marcados en rojo antes de registrar el envío."); return; }
                const normalizedChecklist = catalogDocumentsToChecklist(catalogDocuments);
                createShipmentMutation.mutate({
                  documentCount,
                   docType,
                   sheetCount,
                   route: shipmentRoute,
                  requiresApostilleService,
                  requiresTranslationService,
                  destinationAddress,
                  senderName: profileName || senderName,
                  senderLastName: profileLastName || senderLastName,
                  senderDni: profileDni || senderDni,
                  senderDocumentType: profileDocumentType,
                  senderPhone: profilePhone || senderPhone,
                  recipientName,
                  recipientLastName,
                  recipientDni,
                  recipientDocumentType,
                   recipientPhone,
                   notes,
                   contentChecklist: normalizedChecklist,
                  deliveryMode: "remoto",
                });
                  }} className="shipment-form bg-blue-50/50 p-5 md:p-7 rounded-xl mb-6 space-y-5 border border-blue-100 text-base">
                        <h3 className="font-bold text-[#0B2B5E]">Detalles del envío de documentos</h3>
                        {mobileClientMode && <div className="mt-4 rounded-xl border border-blue-100 bg-white p-3" aria-label="Pasos del registro"><div className="flex items-center justify-between gap-2 text-xs font-semibold"><span className={shipmentStep >= 1 ? "text-[#0B2B5E]" : "text-slate-400"}>1. Sede y tipo</span><span className={shipmentStep >= 2 ? "text-[#0B2B5E]" : "text-slate-400"}>2. Personas</span><span className={shipmentStep >= 3 ? "text-[#0B2B5E]" : "text-slate-400"}>3. Contenido</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#F28C00] transition-all" style={{ width: `${shipmentStep * 33.333}%` }} /></div><p className="mt-2 text-xs text-slate-500">Paso {shipmentStep} de 3. Tus datos se conservan mientras avanzas.</p></div>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={mobileShipmentStepVisible(1) ? "" : "hidden"}>
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
                  <div className={mobileShipmentStepVisible(1) ? "" : "hidden"}>
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
                  {shipmentRoute === "Torino - Lima" && (
                    <label className={`${mobileShipmentStepVisible(1) ? "" : "hidden"} md:col-span-2 flex cursor-pointer items-start gap-3 rounded-xl border-2 border-[#0B2B5E] bg-blue-50 p-4 text-sm shadow-sm transition hover:bg-blue-100/70`}>
                      <input type="checkbox" aria-label="Documentos para apostillar" checked={requiresApostilleService} onChange={event => setRequiresApostilleService(event.target.checked)} className="mt-0.5 h-5 w-5 rounded border-slate-400 text-[#0B2B5E] focus:ring-[#0B2B5E]" />
                      <span><strong className="block text-base text-[#0B2B5E]">Documentos para apostillar — 40 EUR + 160 soles</strong><span className="mt-1 block text-slate-700">Solicita el servicio de apostilla para documentos Torino – Lima. El importe automático coincide con la tarifa administrativa.</span></span>
                    </label>
                  )}
                  {shipmentRoute === "Torino - Lima" && (
                    <label className={`${mobileShipmentStepVisible(1) ? "" : "hidden"} md:col-span-2 flex cursor-pointer items-start gap-3 rounded-xl border-2 border-[#0B2B5E] bg-blue-50 p-4 text-sm shadow-sm transition hover:bg-blue-100/70`}>
                      <input type="checkbox" aria-label="Documentos para traducir" checked={requiresTranslationService} onChange={event => setRequiresTranslationService(event.target.checked)} className="mt-0.5 h-5 w-5 rounded border-slate-400 text-[#0B2B5E] focus:ring-[#0B2B5E]" />
                      <span><strong className="block text-base text-[#0B2B5E]">Documentos para traducir — 200 soles</strong><span className="mt-1 block text-slate-700">Solicita la traducción de tus documentos Torino – Lima. Puedes combinar este servicio con la apostilla.</span></span>
                    </label>
                  )}
                  <div className={`${mobileShipmentStepVisible(1) ? "" : "hidden"} md:col-span-2`}><AgencyDestinationPicker route={shipmentRoute} value={destinationAddress} onChange={setDestinationAddress} /></div>
                  <div className={mobileShipmentStepVisible(2) ? "" : "hidden"}><QuantityStepper
                    id="account-sheet-count"
                    label="Cantidad de Hojas / Documentos"
                    value={sheetCount}
                    min={1}
                    max={docType === "simple" ? 8 : 10}
                    onChange={setSheetCount}
                    description={docType === "simple" ? "Máximo 8 hojas por registro." : "Máximo 10 hojas por registro."}
                  />
                  </div>
                  <div className={mobileShipmentStepVisible(2) ? "" : "hidden"}><DocumentPricePreview docType={docType} sheetCount={sheetCount} /></div>
                  <div className={`${mobileShipmentStepVisible(2) ? "" : "hidden"} relative md:col-span-2`}>
                    <Label htmlFor="account-recipient-search">Buscar destinatario guardado</Label>
                    <Search className="pointer-events-none absolute left-3 top-9 h-4 w-4 text-slate-400" aria-hidden="true" />
                    <Input
                      id="account-recipient-search"
                      aria-describedby="account-recipient-search-help"
                      value={recipientLookupQuery}
                      onFocus={() => setRecipientLookupOpen(true)}
                      onChange={event => { setRecipientLookupQuery(event.target.value); setRecipientLookupOpen(true); }}
                      placeholder="Escribe DNI, nombre o apellido de un destinatario anterior"
                      className="mt-1 h-12 bg-white pl-9 text-base"
                    />
                    <p id="account-recipient-search-help" className="mt-1 text-xs text-slate-500">Busca entre los destinatarios de tus envíos anteriores. Se aceptan coincidencias parecidas, sin tildes y con pequeños errores.</p>
                    {recipientLookupOpen && recipientLookupQuery.trim().length >= 2 && (
                      <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                        {recipientLookupResults.length > 0 ? recipientLookupResults.map(recipient => (
                          <button key={`${recipient.id}-${recipient.recipientDni || recipient.recipientName}`} type="button" onClick={() => applyRecipientLookup(recipient)} className="w-full rounded-md px-3 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none">
                            <span className="block text-sm font-semibold text-[#0B2B5E]">Usar {[recipient.recipientName, recipient.recipientLastName].filter(Boolean).join(" ") || "Destinatario sin nombre"}</span>
                            <span className="block text-xs text-slate-600">{recipient.recipientDni || "Sin documento"} · {recipient.recipientPhone || "Sin teléfono"}</span>
                          </button>
                        )) : <p className="px-3 py-3 text-sm text-slate-500">No encontramos destinatarios similares en tus envíos anteriores.</p>}
                      </div>
                    )}
                  </div>
                  <div className={mobileShipmentStepVisible(2) ? "" : "hidden"}>
                    <Label>Destinatario - Nombres</Label>
                    <Input value={recipientName} onChange={e => updateTextValue("recipientName", e.target.value, setRecipientName, "El nombre")} placeholder="Ej: María" autoComplete="given-name" required aria-invalid={Boolean(shipmentValidationErrors.recipientName || identityErrors.recipientName)} className={`mt-1 bg-white ${shipmentValidationErrors.recipientName || identityErrors.recipientName ? "border-rose-500 ring-1 ring-rose-200" : ""}`} />
                    <p className="mt-1 text-xs text-slate-500">Solo letras y espacios.</p>
                    {(shipmentValidationErrors.recipientName || identityErrors.recipientName) && <p role="alert" className="text-xs text-red-600">{shipmentValidationErrors.recipientName || identityErrors.recipientName}</p>}
                  </div>
                  <div className={mobileShipmentStepVisible(2) ? "" : "hidden"}>
                    <Label>Destinatario - Apellidos</Label>
                    <Input value={recipientLastName} onChange={e => updateTextValue("recipientLastName", e.target.value, setRecipientLastName, "El apellido")} placeholder="Ej: López" autoComplete="family-name" required aria-invalid={Boolean(shipmentValidationErrors.recipientLastName || identityErrors.recipientLastName)} className={`mt-1 bg-white ${shipmentValidationErrors.recipientLastName || identityErrors.recipientLastName ? "border-rose-500 ring-1 ring-rose-200" : ""}`} />
                    <p className="mt-1 text-xs text-slate-500">Solo letras y espacios.</p>
                    {(shipmentValidationErrors.recipientLastName || identityErrors.recipientLastName) && <p role="alert" className="text-xs text-red-600">{shipmentValidationErrors.recipientLastName || identityErrors.recipientLastName}</p>}
                  </div>
                  <div className={mobileShipmentStepVisible(2) ? "" : "hidden"}><IdentityDocumentField id="recipient-document" label="Destinatario - documento de identidad" documentType={recipientDocumentType} onDocumentTypeChange={setRecipientDocumentType} value={recipientDni} onValueChange={setRecipientDni} required error={shipmentValidationErrors.recipientDni || ""} /></div>
                  <div className={mobileShipmentStepVisible(2) ? "" : "hidden"}>
                    <Label>Destinatario - Teléfono</Label>
                    <div className="mt-1">
                      <PhoneInput value={recipientPhone} onChange={setRecipientPhone} placeholder="987654321" required className={shipmentValidationErrors.recipientPhone ? "rounded-md ring-1 ring-rose-300" : ""} />
                    </div>
                    {shipmentValidationErrors.recipientPhone && <p role="alert" className="mt-1 text-xs text-rose-700">{shipmentValidationErrors.recipientPhone}</p>}
                  </div>
                  <div className={`${mobileShipmentStepVisible(3) ? "" : "hidden"} md:col-span-2`}>
                    <div className={shipmentValidationErrors.contentChecklist ? "rounded-lg border border-rose-300 bg-rose-50 p-3" : ""}><DocumentCatalogSelector value={catalogDocuments} onChange={items => { setCatalogDocuments(items); if (items.length) setShipmentValidationErrors(current => ({ ...current, contentChecklist: "" })); }} idPrefix="account-document" />{shipmentValidationErrors.contentChecklist && <p role="alert" className="mt-2 text-sm font-medium text-rose-700">{shipmentValidationErrors.contentChecklist}</p>}</div>
                  </div>
                   <div className={`${mobileShipmentStepVisible(3) ? "" : "hidden"} md:col-span-2`}>
                     <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-base leading-6 text-[#0B2B5E]"><strong>Antes de crear el envío:</strong> entrega todos los documentos y datos solicitados en la agencia o completa la firma remota. El Cliente no puede registrar envíos incompletos.</div>
                     <Label>Notas (opcional)</Label>
                     <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Instrucciones adicionales de entrega" className="mt-1 bg-white" />
                     <label className="mt-3 block text-sm font-semibold text-[#0B2B5E]">Foto del envío (opcional)</label>
                     <Input type="file" accept="image/jpeg,image/png,image/webp,image/heic" aria-label="Foto del envío" onChange={event => setShipmentPhoto(event.target.files?.[0] || null)} className="mt-1 bg-white" />
                   </div>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={resetClientShipmentForm} aria-label="Limpiar todos los campos del formulario">Limpiar formulario</Button>
                    <Button type="button" variant="outline" onClick={() => { resetClientShipmentForm(); setShowNewShipment(false); }}>Cancelar</Button>
                  </div>
                  {mobileClientMode && shipmentStep > 1 && <Button type="button" variant="outline" onClick={previousMobileShipmentStep}>Anterior</Button>}
                  {mobileClientMode && shipmentStep < 3 ? <Button type="button" onClick={advanceMobileShipmentStep} className="ml-auto bg-[#0B2B5E] text-white">Continuar</Button> : <Button type="submit" disabled={createShipmentMutation.isPending} className="ml-auto bg-[#0B2B5E] text-white">
                    {createShipmentMutation.isPending ? "Registrando..." : "Guardar envío"}
                  </Button>}
                </div>
              </form>
            )}

            {clientWorkspace === "envios" && <div className="mb-4 grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-4">
              <div className="relative md:col-span-2"><Search className="pointer-events-none absolute left-3 top-6 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><Input aria-label="Buscar mis envíos" aria-describedby="client-shipment-search-help" value={clientSearchTerm} onChange={(event) => setClientSearchTerm(event.target.value)} placeholder="Orden, código, destinatario o DNI" className="h-12 bg-white pl-9 pr-28 text-base" /><Button type="button" variant="outline" size="sm" onClick={() => setClientSearchTerm("")} disabled={!clientSearchTerm} className="absolute right-2 top-1 h-10 border-[#0B2B5E]/30 text-[#0B2B5E]"><RotateCcw className="mr-1 h-4 w-4" />Limpiar</Button><p id="client-shipment-search-help" role="status" className="mt-1 text-xs leading-4 text-slate-600">Busca por orden, código, DNI, nombre o apellido del destinatario. Se aceptan coincidencias parecidas, sin tildes y con pequeños errores.</p></div>
              <select aria-label="Filtro de pago de mis envíos" value={clientPaymentFilter} onChange={(event) => setClientPaymentFilter(event.target.value as "all" | "paid" | "unpaid")} className="h-10 rounded-md border border-slate-300 bg-white px-2 text-sm"><option value="all">Todos los pagos</option><option value="paid">Pagados</option><option value="unpaid">No pagados</option></select>
              <select aria-label="Filtro de estado de mis envíos" value={clientStatusFilter} onChange={(event) => setClientStatusFilter(event.target.value)} className="h-10 rounded-md border border-slate-300 bg-white px-2 text-sm"><option value="all">Todos los estados</option><option value="Por entregar en agencia">Por entregar en agencia</option><option value="En agencia">En agencia</option><option value="En tránsito">En tránsito</option><option value="En destino">En destino</option></select>
            </div>}

            {clientWorkspace === "envios" && (!myShipments || myShipments.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Package className="h-12 w-12 mx-auto text-slate-300 mb-2" />
                <p>No tienes envíos registrados aún.</p>
                <p className="text-xs text-slate-400 mt-1">Usa el botón superior para registrar tu primer documento.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {clientPagination.items.map((shipment: any) => (
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
                      <p className="mt-0.5 text-xs text-slate-500"><strong>Registrado por:</strong> {shipment.registeredByLabel || "Registro anterior"}</p>
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
                <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-600">Mostrando {filteredClientShipments.length === 0 ? 0 : (clientPagination.currentPage - 1) * clientPageSize + 1}–{Math.min(clientPagination.currentPage * clientPageSize, filteredClientShipments.length)} de {filteredClientShipments.length} envíos</p><div className="flex items-center gap-2"><Button type="button" size="sm" variant="outline" disabled={clientPagination.currentPage === 1} onClick={() => setClientCurrentPage(page => Math.max(1, page - 1))}>Anterior</Button><span className="min-w-20 text-center text-sm font-medium">Página {clientPagination.currentPage} de {clientPagination.totalPages}</span><Button type="button" size="sm" variant="outline" disabled={clientPagination.currentPage >= clientPagination.totalPages} onClick={() => setClientCurrentPage(page => Math.min(clientPagination.totalPages, page + 1))}>Siguiente</Button></div></div>
              </div>
            ))}
            {clientWorkspace === "papelera" && <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Trash2 className="h-5 w-5 text-slate-500" /><h3 className="font-bold text-[#0B2B5E]">Papelera y recuperación</h3></div><Button type="button" size="sm" variant="outline" onClick={() => setShowClientTrash(value => !value)} aria-expanded={showClientTrash}>{showClientTrash ? "Cerrar papelera" : `Abrir papelera (${myDeletedShipments?.length || 0})`}</Button></div>
              <p className="mt-1 text-xs text-slate-500">Los envíos eliminados se conservan y pueden restaurarse. La lista permanece cerrada hasta que la abras.</p>
              {showClientTrash && <><div className="mt-4 grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-3"><Input aria-label="Buscar en mi papelera" value={clientTrashSearchTerm} onChange={(event) => setClientTrashSearchTerm(event.target.value)} placeholder="Buscar orden, código, destinatario o DNI" className="md:col-span-2" /><select aria-label="Filtro de pago de mi papelera" value={clientTrashPaymentFilter} onChange={(event) => setClientTrashPaymentFilter(event.target.value as "all" | "paid" | "unpaid")} className="h-10 rounded-md border border-slate-300 bg-white px-2 text-sm"><option value="all">Todos los pagos</option><option value="paid">Pagados</option><option value="unpaid">No pagados</option></select><select aria-label="Filtro de estado de mi papelera" value={clientTrashStatusFilter} onChange={(event) => setClientTrashStatusFilter(event.target.value)} className="h-10 rounded-md border border-slate-300 bg-white px-2 text-sm"><option value="all">Todos los estados</option><option value="Por entregar en agencia">Por entregar en agencia</option><option value="En agencia">En agencia</option><option value="En tránsito">En tránsito</option><option value="En destino">En destino</option><option value="Entregado">Entregado</option></select></div>{filteredClientTrash.length === 0 ? <p className="mt-4 text-sm text-slate-500">No hay envíos eliminados que coincidan con los filtros.</p> : <div className="mt-3 space-y-2">{clientTrashPagination.items.map((shipment: any) => <div key={shipment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white p-3"><div><strong className="text-sm text-[#0B2B5E]">Orden {shipment.orderNumber}</strong><p className="text-xs text-slate-500">Eliminado el {shipment.deletedAt ? new Date(shipment.deletedAt).toLocaleString() : "fecha no disponible"}</p></div><Button size="sm" variant="outline" disabled={restoreMyShipmentMutation.isPending} onClick={() => restoreMyShipmentMutation.mutate({ shipmentId: shipment.id })}><RotateCcw className="mr-2 h-3.5 w-3.5" /> Restaurar</Button></div>)}<div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-600">Mostrando {filteredClientTrash.length === 0 ? 0 : (clientTrashPagination.currentPage - 1) * clientPageSize + 1}–{Math.min(clientTrashPagination.currentPage * clientPageSize, filteredClientTrash.length)} de {filteredClientTrash.length} eliminados</p><div className="flex items-center gap-2"><Button type="button" size="sm" variant="outline" disabled={clientTrashPagination.currentPage === 1} onClick={() => setClientTrashCurrentPage(page => Math.max(1, page - 1))}>Anterior</Button><span className="min-w-20 text-center text-sm font-medium">Página {clientTrashPagination.currentPage} de {clientTrashPagination.totalPages}</span><Button type="button" size="sm" variant="outline" disabled={clientTrashPagination.currentPage >= clientTrashPagination.totalPages} onClick={() => setClientTrashCurrentPage(page => Math.min(clientTrashPagination.totalPages, page + 1))}>Siguiente</Button></div></div></div>}</>}
            </div>}
          </Card>
        </main>
      </div>
    );
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (mode === "register") {
      if (!isSecurePassword(password)) {
        toast.error(PASSWORD_REQUIREMENTS_MESSAGE);
        return;
      }
      registerMutation.mutate({ email, phone: phone || undefined, password, name: registerName, lastName: registerLastName, dni: registerDni });
    } else if (mode === "login") {
      loginMutation.mutate({ email, password, rememberDevice });
    } else if (mode === "request") {
      requestMutation.mutate({ email, channel: "email" });
    } else {
      if (!isSecurePassword(newPassword)) {
        toast.error(PASSWORD_REQUIREMENTS_MESSAGE);
        return;
      }
      resetMutation.mutate({ email, channel: "email", code, newPassword });
    }
  };

  const title = mode === "register" ? "Crear cuenta" : mode === "request" ? "Recuperar contraseña" : mode === "reset" ? "Confirmar código" : "Iniciar sesión";

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#eef6fb] to-white px-4 py-8">
      <div className="mx-auto max-w-md">
        <Link href={returnToMobileApp ? "/movil" : "/"} className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#0B2B5E] hover:text-[#F28C00]">
          <ArrowLeft className="h-4 w-4" /> Volver al rastreo
        </Link>

        <Card className="overflow-hidden border-0 shadow-xl">
          <div className="bg-[#0B2B5E] px-6 py-6 text-white">
            <img src={brandLogo} alt="Servicom Internacional" className="mb-5 h-24 w-24 rounded-2xl bg-white p-2 object-contain shadow-lg" />
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
                  <Input id="register-dni" value={registerDni} onChange={event => updateDigitsValue("registerDni", event.target.value, setRegisterDni)} inputMode="numeric" pattern="[0-9]*" className="mt-2" minLength={DNI_MAX_LENGTH} maxLength={DNI_MAX_LENGTH} required />
                  <p className="mt-1 text-xs text-slate-500">Solo números; exactamente 8 dígitos.</p>
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
                  <Input id="account-password" type={showPassword ? "text" : "password"} minLength={mode === "register" ? 12 : 1} value={password} onChange={event => setPassword(event.target.value)} className="pr-10" required autoComplete={mode === "register" ? "new-password" : "current-password"} />
                  <button type="button" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} onClick={() => setShowPassword(value => !value)} className="absolute right-2 top-2 text-slate-500 hover:text-[#0B2B5E]"><>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</></button>
                </div>
                {mode === "register" && <PasswordRequirements password={password} />}
              </div>
            )}

            {mode === "login" && <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"><input type="checkbox" checked={rememberDevice} onChange={event => setRememberDevice(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#0B2B5E]" /><span><strong>Recordar este dispositivo</strong><br /><span className="text-xs text-slate-500">Conserva la sesión de este dispositivo hasta por 30 días sin volver a pedir tu contraseña. No la guarda y se revoca al cerrar sesión.</span></span></label>}

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
                    <Input id="new-password" type={showNewPassword ? "text" : "password"} minLength={12} value={newPassword} onChange={event => setNewPassword(event.target.value)} className="pr-10" required autoComplete="new-password" />
                    <button type="button" aria-label={showNewPassword ? "Ocultar nueva contraseña" : "Mostrar nueva contraseña"} onClick={() => setShowNewPassword(value => !value)} className="absolute right-2 top-2 text-slate-500 hover:text-[#0B2B5E]"><>{showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</></button>
                  </div>
                  <PasswordRequirements password={newPassword} />
                </div>
              </>
            )}

            <Button type="submit" disabled={registerMutation.isPending || loginMutation.isPending || requestMutation.isPending || resetMutation.isPending || (mode === "login" && loginLockSeconds > 0)} className="w-full bg-[#0B2B5E] text-white hover:bg-[#123d78]">
              {mode === "register" ? (registerMutation.isPending ? "Creando cuenta..." : "Crear cuenta") : mode === "request" ? (requestMutation.isPending ? "Enviando código..." : "Enviar código") : mode === "reset" ? (resetMutation.isPending ? "Cambiando contraseña..." : "Cambiar contraseña") : (loginLockSeconds > 0 ? `Espera ${loginLockSeconds}s` : loginMutation.isPending ? "Iniciando sesión..." : "Iniciar sesión")}
            </Button>
            <p role="status" aria-live="polite" className="min-h-5 text-center text-xs text-slate-500">{loginLockSeconds > 0 ? `Por seguridad, podrás volver a intentarlo en ${loginLockSeconds} segundos.` : registerMutation.isPending ? "Estamos creando tu cuenta; no cierres esta pantalla." : loginMutation.isPending ? "Estamos verificando tus credenciales." : requestMutation.isPending ? "Estamos enviando el código de recuperación." : resetMutation.isPending ? "Estamos actualizando tu contraseña." : ""}</p>

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
