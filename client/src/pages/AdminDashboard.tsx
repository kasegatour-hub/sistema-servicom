import { useEffect, useMemo, useRef, useState } from "react";
import React from "react";
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
import { Lock, LogOut, Plus, RefreshCw, Download, Printer, RotateCcw, Search, Trash2, MessageSquare, Calculator, Eye, EyeOff, Send, QrCode } from "lucide-react";
import QRCode from "qrcode";
import { buildShipmentManagementUrl, buildTrackingUrl, normalizeTrackingValue, TRACKING_QR_OPTIONS } from "@/lib/tracking";
import { PhoneInput } from "@/components/PhoneInput";
import { QuantityStepper } from "@/components/QuantityStepper";
import { DocumentCatalogSelector } from "@/components/DocumentCatalogSelector";
import { formatPhoneNumber } from "@/lib/phoneFormatting";
import { CatalogDocumentItem, catalogDocumentsToChecklist } from "@/lib/documentCatalog";
import { DNI_MAX_LENGTH, dniDigitsOnly, isDigitsOnly, isTextOnly, textOnly } from "@/lib/inputValidation";
import { getPaymentStatusUi } from "@/lib/paymentStatus";
import { getPaymentPrintPresentation } from "@/lib/paymentPrint";
import { paginateItems } from "@/lib/pagination";
import { getReceiptTicketPrintCss } from "@/lib/printLayout";
import { buildAdminDeclarationHtml, buildAdminDeliveryTicketHtml, buildAdminReceiptPrintStyles, buildAdminRouteSummaryHtml } from "@/lib/adminReceipt";
import { getRoutePresentation } from "@/lib/routeDetails";
import { buildReceiptPriceHtml } from "@/lib/receiptPrice";
import { closeUpdateModal } from "@/lib/updateModal";
import { UpdateShipmentModal } from "@/components/UpdateShipmentModal";
import { evaluateScientificExpression } from "@/lib/scientificCalculator";
import { buildElectronicSignatureHtml, buildReceiptDownloadFilename, downloadShipmentReceipt, getReceiptBranding, type ReceiptDownloadFormat } from "@/lib/userReceipt";
import { buildAdminReceiptDocument, downloadAdminReceiptUsingPrintTemplate } from "@/lib/adminReceiptDocument";
import { summarizeRevenue } from "@shared/revenueSummary";
import { DocumentPricePreview } from "@/components/DocumentPricePreview";
import { GeneralFeedbackDialog } from "@/components/GeneralFeedbackDialog";
import { IdentityDocumentField } from "@/components/IdentityDocumentField";
import { ShipmentTrendCharts } from "@/components/ShipmentTrendCharts";
import { InvitationLetterWorkspace } from "@/components/InvitationLetterWorkspace";
import { PasswordRequirements } from "@/components/PasswordRequirements";
import { AgencyDestinationPicker } from "@/components/AgencyDestinationPicker";
import { QRScanner } from "@/components/QRScanner";
import { normalizeIdentityDocument, type IdentityDocumentType } from "@shared/identityDocuments";
import { getFuzzySearchScore } from "@shared/fuzzySearch";
import { isSecurePassword, PASSWORD_REQUIREMENTS_MESSAGE } from "@shared/passwordPolicy";

type AdminWorkspace = "resumen" | "registros" | "crear" | "cupones" | "papelera" | "usuarios" | "analitica" | "carta";

function renderQrCode(canvas: HTMLCanvasElement | null, trackingUrl: string, width: number) {
  if (!canvas) return;
  try {
    const result = QRCode.toCanvas(canvas, trackingUrl, { ...TRACKING_QR_OPTIONS, width });
    if (result && typeof (result as Promise<unknown>).catch === "function") {
      void (result as Promise<unknown>).catch(() => undefined);
    }
  } catch {
    // Algunos entornos de prueba no implementan Canvas; el recibo y la URL siguen siendo válidos.
  }
}

type ClientLookupRecord = {
  id: number;
  name: string;
  lastName: string;
  dni?: string | null;
  documentType?: "dni_peru" | "pasaporte" | "carta_identita_italia" | null;
  phone?: string | null;
  email?: string | null;
};

function ClientLookup({
  label,
  value,
  onChange,
  results,
  isLoading,
  onSelect,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  results: ClientLookupRecord[];
  isLoading: boolean;
  onSelect: (client: ClientLookupRecord) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const shouldShow = value.trim().length >= 2;
  return (
    <div className="relative">
      <label className="mb-2 block text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <Input
          value={value}
          onChange={(event) => { onChange(event.target.value); setIsOpen(true); }}
          onFocus={() => shouldShow && setIsOpen(true)}
          placeholder="Ej. Sánchez Arias, Sanches o 71234567"
          aria-label={label}
          aria-describedby={`${label.replace(/\s+/g, "-").toLowerCase()}-search-help`}
          className="h-12 border-2 pl-9 text-base focus:border-primary"
        />
      </div>
      <p id={`${label.replace(/\s+/g, "-").toLowerCase()}-search-help`} role="status" className="mt-1 text-xs text-slate-600">Busca por DNI, nombre o apellido. Escribe al menos 2 caracteres; se aceptan tildes omitidas y pequeños errores.</p>
      {shouldShow && isOpen && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
          {isLoading ? (
            <p className="p-3 text-xs text-slate-500">Buscando clientes...</p>
          ) : results.length > 0 ? (
            results.map((client) => (
              <button
                type="button"
                key={client.id}
                onClick={() => { onSelect(client); setIsOpen(false); }}
                className="block w-full border-b border-slate-100 px-3 py-2 text-left last:border-b-0 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
              >
                <span className="block text-sm font-semibold text-[#0B2B5E]">{client.name} {client.lastName}</span>
                <span className="block text-xs text-slate-500">DNI: {client.dni || "No registrado"} · Tel.: {formatPhoneNumber(client.phone) || "No registrado"}</span>
              </button>
            ))
          ) : (
            <p className="p-3 text-xs text-slate-500">No se encontraron clientes guardados.</p>
          )}
        </div>
      )}
    </div>
  );
}

export const textRegisterOptions = (form: any, field: string, label: string) => ({
  setValueAs: textOnly,
  onChange: (event: any) => {
    const rawValue = String(event.target.value ?? "");
    const isValidRawValue = !rawValue.trim() || isTextOnly(rawValue);
    const sanitizedValue = textOnly(rawValue).replace(/\s+/g, " ");
    event.target.value = sanitizedValue;
    if (!isValidRawValue) form.setError(field, { type: "pattern", message: `${label} solo puede contener letras y espacios.` });
    else setTimeout(() => form.clearErrors(field), 0);
  },
});

export const digitsRegisterOptions = (form: any, field: string) => ({
  setValueAs: dniDigitsOnly,
  onChange: (event: any) => {
    const rawValue = String(event.target.value ?? "");
    const isValidRawValue = !rawValue.trim() || isDigitsOnly(rawValue);
    const sanitizedValue = dniDigitsOnly(rawValue);
    event.target.value = sanitizedValue;
    if (!isValidRawValue) form.setError(field, { type: "pattern", message: "El DNI solo puede contener números." });
    else setTimeout(() => form.clearErrors(field), 0);
  },
});

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Contraseña requerida"),
  rememberDevice: z.boolean().default(false),
});

const createAdminSchema = z.object({
  name: z.string().min(2, "Ingresa el nombre del operador.").regex(/^[A-Za-z\u00C0-\u024F]+(?: +[A-Za-z\u00C0-\u024F]+)*$/, "Solo letras y espacios."),
  email: z.string().email("Email inválido"),
  password: z.string().refine(isSecurePassword, PASSWORD_REQUIREMENTS_MESSAGE),
});

const couponFormSchema = z.object({
  code: z.string().trim().max(64),
  discountPercent: z.number().min(1, "El descuento mínimo es 1%.").max(100, "El descuento máximo es 100%."),
  appliesTo: z.enum(["ambos", "documento", "encomienda"]),
  startsAt: z.string().min(10, "Ingresa la fecha y hora inicial."),
  endsAt: z.string().min(10, "Ingresa la fecha y hora final."),
});

function getCouponDateTimeLocalValue(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

const optionalTextField = z.union([
  z.literal(""),
  z.string().trim().regex(/^[A-Za-z\u00C0-\u024F]+(?: +[A-Za-z\u00C0-\u024F]+)*$/, "Solo letras y espacios."),
]).optional();
const optionalDocumentNumberField = z.union([
  z.literal(""),
  z.string().trim().regex(/^[A-Za-z0-9]{1,9}$/, "El documento solo puede contener letras y números y no puede superar 9 caracteres."),
]).optional();

const createShipmentSchema = z.object({
  status: z.enum(["Por entregar en agencia", "En agencia", "En tránsito", "En destino", "Entregado"]),
  senderName: optionalTextField,
  senderLastName: optionalTextField,
  senderDni: optionalDocumentNumberField,
  senderDocumentType: z.enum(["dni_peru", "pasaporte", "carta_identita_italia"]).default("dni_peru"),
  senderPhone: z.string().optional(),
  recipientName: optionalTextField,
  recipientLastName: optionalTextField,
  recipientDni: optionalDocumentNumberField,
  recipientDocumentType: z.enum(["dni_peru", "pasaporte", "carta_identita_italia"]).default("dni_peru"),
  recipientPhone: z.string().optional(),
  notes: z.string().optional(),
  shipmentType: z.enum(["documento", "encomienda"]).default("documento"),
  documentCount: z.number().min(1).default(1),
  docType: z.enum(["simple", "apostillado"]).default("apostillado"),
  sheetCount: z.number().min(1).default(1),
  requiresApostilleService: z.boolean().default(false),
  requiresTranslationService: z.boolean().default(false),
  serviceManualPriceEur: z.union([z.string(), z.number()]).optional().nullable(),
  serviceManualPriceSoles: z.union([z.string(), z.number()]).optional().nullable(),
  weightKg: z.number().min(0.1).default(1),
  manualPriceEur: z.union([z.string(), z.number()]).optional().nullable(),
  extraPriceEur: z.union([z.string(), z.number()]).default(0),
  paymentStatus: z.enum(["Pagado", "Falta cancelar"]).default("Falta cancelar"),
  route: z.string().default("Lima - Torino"),
  originAddress: z.string().optional(),
  destinationAddress: z.string().optional(),
  isProvinceDelivery: z.boolean().default(false),
  provinceCustomerPriceEur: z.union([z.string(), z.number()]).optional().nullable(),
  provinceOperationalCostSoles: z.union([z.string(), z.number()]).optional().nullable(),
  provinceCarrier: z.enum(["olva", "shalom"]).default("shalom"),
  couponCode: z.string().trim().max(64).optional(),
  documentItems: z.array(z.object({
    docType: z.enum(["simple", "apostillado"]),
    sheetCount: z.number().int().min(1).max(10),
    manualPriceEur: z.union([z.string(), z.number()]).optional().nullable(),
  })).default([]),
  contentChecklist: z.array(z.string().trim().min(1).max(160)).default([]),
  deliveryMode: z.enum(["agencia", "remoto"]).default("agencia"),
});

const updateStatusSchema = z.object({
  shipmentId: z.number(),
  newStatus: z.enum(["Por entregar en agencia", "En agencia", "En tránsito", "En destino", "Entregado"]),
  description: z.string().optional(),
  senderName: optionalTextField,
  senderLastName: optionalTextField,
  senderDni: optionalDocumentNumberField,
  senderPhone: z.string().optional(),
  recipientName: optionalTextField,
  recipientLastName: optionalTextField,
  recipientDni: optionalDocumentNumberField,
  recipientPhone: z.string().optional(),
  notes: z.string().optional(),
  shipmentType: z.enum(["documento", "encomienda"]).optional(),
  docType: z.enum(["simple", "apostillado"]).optional(),
  sheetCount: z.number().int().min(1).max(10).optional(),
  requiresApostilleService: z.boolean().optional(),
  paymentStatus: z.enum(["Pagado", "Falta cancelar"]).optional(),
  route: z.string().optional(),
  originAddress: z.string().optional(),
  destinationAddress: z.string().optional(),
  weightKg: z.number().min(0.1).optional(),
  manualPriceEur: z.union([z.string(), z.number()]).optional().nullable(),
  extraPriceEur: z.union([z.string(), z.number()]).optional().nullable(),
  deliveryMode: z.enum(["agencia", "remoto"]).optional(),
  pricingMode: z.enum(["estandar", "manual"]).optional(),
});

type LoginForm = z.infer<typeof loginSchema>;
type CreateAdminForm = z.infer<typeof createAdminSchema>;
type CouponForm = z.infer<typeof couponFormSchema>;
type CreateShipmentForm = z.infer<typeof createShipmentSchema>;
type UpdateStatusForm = z.infer<typeof updateStatusSchema>;

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, "type"> & { revealLabel?: string };

const getLockoutSecondsFromMessage = (message: string) => Number(message.match(/espera\s+(\d+)\s+segundos/i)?.[1] || 0);

function PasswordInput({ className, revealLabel = "contraseña", ...inputProps }: PasswordInputProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const actionLabel = `${isVisible ? "Ocultar" : "Mostrar"} ${revealLabel}`;
  return <div className="relative"><Input {...inputProps} type={isVisible ? "text" : "password"} className={`${className || ""} pr-11`} /><button type="button" aria-label={actionLabel} aria-pressed={isVisible} title={actionLabel} onClick={() => setIsVisible(value => !value)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><>{isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</></button></div>;
}

export default function AdminDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [admin, setAdmin] = useState<any>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDeliveryInfo, setShowDeliveryInfo] = useState(false);
  const [adminWorkspace, setAdminWorkspace] = useState<AdminWorkspace>("registros");
  const [selectedShipmentId, setSelectedShipmentId] = useState<number | null>(null);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [shipmentView, setShipmentView] = useState<'documento' | 'encomienda'>('documento');
  const [currentPage, setCurrentPage] = useState(1);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const [showCoupons, setShowCoupons] = useState(false);
  const [couponSortOrder, setCouponSortOrder] = useState<"asc" | "desc">("desc");
  const [couponCurrentPage, setCouponCurrentPage] = useState(1);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [adminPasswordEmail, setAdminPasswordEmail] = useState("");
  const [adminCurrentPassword, setAdminCurrentPassword] = useState("");
  const [adminNewPassword, setAdminNewPassword] = useState("");
  const [adminPasswordConfirmation, setAdminPasswordConfirmation] = useState("");
  const [reauthPassword, setReauthPassword] = useState("");
  const [reauthLockSeconds, setReauthLockSeconds] = useState(0);
  const [loginLockSeconds, setLoginLockSeconds] = useState(0);
  const [printShipment, setPrintShipment] = useState<any>(null);
  const [receiptDownloadFormat, setReceiptDownloadFormat] = useState<ReceiptDownloadFormat>("pdf");
  const [showGeneralFeedback, setShowGeneralFeedback] = useState(false);
  const [senderClientQuery, setSenderClientQuery] = useState("");
  const [recipientClientQuery, setRecipientClientQuery] = useState("");
  const [additionalDocumentItems, setAdditionalDocumentItems] = useState<Array<{ docType: "simple" | "apostillado"; sheetCount: number; manualPriceEur: string }>>([]);
  const [contentChecklist, setContentChecklist] = useState<string[]>([]);
  const [shipmentPhoto, setShipmentPhoto] = useState<File | null>(null);
  const [createShipmentValidationError, setCreateShipmentValidationError] = useState("");
  const [catalogDocuments, setCatalogDocuments] = useState<CatalogDocumentItem[]>([]);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showAdvancedCalculator, setShowAdvancedCalculator] = useState(false);
  const [calculatorExpression, setCalculatorExpression] = useState("");
  const [calculatorResult, setCalculatorResult] = useState("");
  const [auditShipmentId, setAuditShipmentId] = useState<number | null>(null);
  const [adminAuthMode, setAdminAuthMode] = useState<"login" | "request" | "reset">("login");
  const [adminRecoveryEmail, setAdminRecoveryEmail] = useState("");
  const [adminRecoveryCode, setAdminRecoveryCode] = useState("");
  const [adminRecoveryPassword, setAdminRecoveryPassword] = useState("");
  const [adminRecoveryResendSeconds, setAdminRecoveryResendSeconds] = useState(0);
  const [deliveryScannerOpen, setDeliveryScannerOpen] = useState(false);
  const [consumedDeliveryQr, setConsumedDeliveryQr] = useState(false);
  const [deliveryQrMode, setDeliveryQrMode] = useState<"status" | "update" | null>(() => {
    if (typeof window === "undefined") return null;
    const open = new URLSearchParams(window.location.search).get("open");
    return open === "status" || open === "update" ? open : null;
  });
  const [deliveryQrTarget, setDeliveryQrTarget] = useState<{ orderNumber: string; code: string } | null>(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    if (params.get("open") !== "update" && params.get("open") !== "status") return null;
    const orderNumber = normalizeTrackingValue(params.get("order") || "");
    const code = normalizeTrackingValue(params.get("code") || "");
    return orderNumber && code ? { orderNumber, code } : null;
  });
  const [deliveryStatusShipment, setDeliveryStatusShipment] = useState<any>(null);
  const [deliveryStatusValue, setDeliveryStatusValue] = useState<UpdateStatusForm["newStatus"]>("En agencia");
  const [deliveryStatusDescription, setDeliveryStatusDescription] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [logisticsFilter, setLogisticsFilter] = useState("all");
  const [deletedSearchTerm, setDeletedSearchTerm] = useState("");
  const [deletedPaymentFilter, setDeletedPaymentFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [deletedLogisticsFilter, setDeletedLogisticsFilter] = useState("all");
  const [deletedTypeFilter, setDeletedTypeFilter] = useState<"all" | "documento" | "encomienda">("all");
  const [deletedCurrentPage, setDeletedCurrentPage] = useState(1);
  const pageSize = 6;
  const deletedPageSize = 6;
  const printQrRef = useRef<HTMLCanvasElement>(null);
  const utils = trpc.useUtils();

  // Queries
  const { data: currentAdminSession, isLoading: loadingAdminSession, refetch: refetchAdminSession } = trpc.admin.me.useQuery();
  const { data: coupons = [], refetch: refetchCoupons } = trpc.admin.listCoupons.useQuery(undefined, { enabled: isLoggedIn && !admin?.reauthRequired });
  const { data: limaTorinoPolicy, refetch: refetchLimaTorinoPolicy } = trpc.admin.getLimaTorinoEncomiendaPolicy.useQuery(undefined, { enabled: isLoggedIn && !admin?.reauthRequired });
  const { data: shipments, isLoading: loadingShipments, refetch: refetchShipments } = trpc.admin.getAllShipments.useQuery(undefined, { enabled: isLoggedIn && !admin?.reauthRequired });
  const deliveryShipmentQuery = trpc.admin.getShipmentForDeliveryUpdate.useQuery(
    deliveryQrTarget || { orderNumber: "", code: "" },
    { enabled: isLoggedIn && !admin?.reauthRequired && Boolean(deliveryQrTarget) },
  );
  const { data: deletedShipments = [], refetch: refetchDeletedShipments } = trpc.admin.listDeletedShipments.useQuery(undefined, { enabled: isLoggedIn && !admin?.reauthRequired });
  const { data: shipmentAudit = [], isFetching: isLoadingShipmentAudit } = trpc.admin.shipmentAudit.useQuery(
    { shipmentId: auditShipmentId || 0 },
    { enabled: isLoggedIn && admin?.role === "superadmin" && !admin?.reauthRequired && Boolean(auditShipmentId) },
  );
  const { data: adminInsights } = trpc.analytics.adminInsights.useQuery(undefined, { enabled: isLoggedIn && !admin?.reauthRequired && adminWorkspace === "analitica" });
  const { data: adminUsers, refetch: refetchAdminUsers } = trpc.admin.listAdmins.useQuery(undefined, { enabled: isLoggedIn && admin?.role === "superadmin" && !admin?.reauthRequired });
  const { data: senderClientResults = [], isFetching: isSearchingSender } = trpc.admin.searchClients.useQuery(
    { query: senderClientQuery.trim(), limit: 8 },
    { enabled: isLoggedIn && !admin?.reauthRequired && showCreateForm && senderClientQuery.trim().length >= 2 },
  );
  const { data: recipientClientResults = [], isFetching: isSearchingRecipient } = trpc.admin.searchClients.useQuery(
    { query: recipientClientQuery.trim(), limit: 8 },
    { enabled: isLoggedIn && !admin?.reauthRequired && showCreateForm && recipientClientQuery.trim().length >= 2 },
  );
  const couponPageSize = 5;
  const orderedCoupons = useMemo(() => [...(coupons as any[])].sort((left, right) => {
    const leftDate = new Date(left.createdAt || left.updatedAt || left.startsAt || 0).getTime();
    const rightDate = new Date(right.createdAt || right.updatedAt || right.startsAt || 0).getTime();
    const difference = (Number.isFinite(leftDate) ? leftDate : 0) - (Number.isFinite(rightDate) ? rightDate : 0);
    return couponSortOrder === "desc" ? -difference : difference;
  }), [coupons, couponSortOrder]);
  const couponTotalPages = Math.max(1, Math.ceil(orderedCoupons.length / couponPageSize));
  const visibleCoupons = orderedCoupons.slice((couponCurrentPage - 1) * couponPageSize, couponCurrentPage * couponPageSize);
  const couponFirstItem = orderedCoupons.length === 0 ? 0 : (couponCurrentPage - 1) * couponPageSize + 1;
  const couponLastItem = Math.min(couponCurrentPage * couponPageSize, orderedCoupons.length);
  const adminRevenue = useMemo(() => summarizeRevenue(shipments), [shipments]);

  const filteredDeletedShipments = useMemo(() => {
    const query = deletedSearchTerm.trim().toLowerCase();
    return [...(deletedShipments as any[])].filter((shipment) => {
      const textMatches = !query || [shipment.orderNumber, shipment.code, shipment.senderName, shipment.senderLastName, shipment.senderDni, shipment.recipientName, shipment.recipientLastName, shipment.recipientDni]
        .some(value => String(value || "").toLowerCase().includes(query));
      const paymentMatches = deletedPaymentFilter === "all" || (deletedPaymentFilter === "paid" ? shipment.paymentStatus === "Pagado" : shipment.paymentStatus !== "Pagado");
      const logisticsMatches = deletedLogisticsFilter === "all" || shipment.status === deletedLogisticsFilter;
      const typeMatches = deletedTypeFilter === "all" || (deletedTypeFilter === "encomienda" ? shipment.shipmentType === "encomienda" : shipment.shipmentType !== "encomienda");
      return textMatches && paymentMatches && logisticsMatches && typeMatches;
    }).sort((left, right) => new Date(right.deletedAt || 0).getTime() - new Date(left.deletedAt || 0).getTime());
  }, [deletedShipments, deletedSearchTerm, deletedPaymentFilter, deletedLogisticsFilter, deletedTypeFilter]);
  const deletedPagination = paginateItems(filteredDeletedShipments, deletedCurrentPage, deletedPageSize);

  useEffect(() => setCouponCurrentPage(1), [couponSortOrder, coupons.length]);
  useEffect(() => setCouponCurrentPage(page => Math.min(Math.max(1, page), couponTotalPages)), [couponTotalPages]);
  useEffect(() => setDeletedCurrentPage(1), [deletedSearchTerm, deletedPaymentFilter, deletedLogisticsFilter, deletedTypeFilter]);
  useEffect(() => setDeletedCurrentPage(page => Math.min(page, deletedPagination.totalPages)), [deletedPagination.totalPages]);
  useEffect(() => {
    if (reauthLockSeconds <= 0) return;
    const timer = window.setTimeout(() => setReauthLockSeconds(seconds => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [reauthLockSeconds]);
  useEffect(() => {
    if (loginLockSeconds <= 0) return;
    const timer = window.setTimeout(() => setLoginLockSeconds(seconds => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [loginLockSeconds]);

  // Mutations
  const loginMutation = trpc.admin.login.useMutation();
  const logoutMutation = trpc.admin.logout.useMutation();
  const createCouponMutation = trpc.admin.createCoupon.useMutation();
  const updateCouponMutation = trpc.admin.updateCoupon.useMutation();
  const deactivateCouponMutation = trpc.admin.deactivateCoupon.useMutation();
  const setLimaTorinoEncomiendasEnabledMutation = trpc.admin.setLimaTorinoEncomiendasEnabled.useMutation();
  const reauthenticateMutation = trpc.admin.reauthenticate.useMutation({
    onSuccess: async (result) => {
      toast.success(result.message);
      setReauthPassword("");
      setReauthLockSeconds(0);
      setAdmin((previous: any) => previous ? { ...previous, reauthRequired: false } : previous);
      await refetchAdminSession();
      await refetchShipments();
    },
    onError: (error) => {
      const seconds = getLockoutSecondsFromMessage(error.message);
      if (seconds) setReauthLockSeconds(seconds);
      toast.error(error.message);
    },
  });
  const createMutation = trpc.admin.createShipment.useMutation();
  const uploadShipmentPhotoMutation = trpc.admin.uploadShipmentPhoto.useMutation();
  const updateMutation = trpc.admin.updateStatus.useMutation();
  const sendShipmentSignatureMutation = trpc.shipment.requestSignature.useMutation({
    onSuccess: result => toast.success(result.status === "signed" ? "El envío ya cuenta con una firma electrónica." : `Solicitud de firma enviada al Cliente. Vence el ${new Date(result.expiresAt).toLocaleString("es-PE")}.`),
    onError: error => toast.error(error.message),
  });
  const deleteMutation = trpc.admin.deleteShipment.useMutation();
  const setShipmentRegistradorVisibilityMutation = trpc.admin.setShipmentRegistradorVisibility.useMutation();
  const reportPdfDownloadFailureMutation = trpc.admin.reportPdfDownloadFailure.useMutation();
  const restoreMutation = trpc.admin.restoreShipment.useMutation({
    onSuccess: async () => { toast.success("Envío restaurado correctamente."); await refetchDeletedShipments(); await refetchShipments(); },
    onError: error => toast.error(error.message),
  });
  const createAdminMutation = trpc.admin.createAdmin.useMutation();
  const deleteAdminMutation = trpc.admin.deleteAdmin.useMutation();
  const deactivateAdminMutation = trpc.admin.deactivateAdmin.useMutation();
  const changeMyPasswordMutation = trpc.admin.changeMyPassword.useMutation({
    onSuccess: result => {
      toast.success(result.message);
      setAdminCurrentPassword("");
      setAdminNewPassword("");
      setAdminPasswordConfirmation("");
      setShowPasswordForm(false);
    },
    onError: error => toast.error(error.message),
  });
  const requestAdminPasswordResetMutation = trpc.admin.requestPasswordReset.useMutation({
    onSuccess: result => {
      toast.success(result.message);
      setAdminRecoveryResendSeconds(result.retryAfterSeconds ?? 60);
      setAdminAuthMode("reset");
    },
    onError: error => toast.error(error.message),
  });
  const resetAdminPasswordMutation = trpc.admin.resetPassword.useMutation({
    onSuccess: result => {
      toast.success(result.message);
      loginForm.setValue("email", adminRecoveryEmail.trim().toLowerCase());
      setAdminRecoveryCode("");
      setAdminRecoveryPassword("");
      setAdminAuthMode("login");
    },
    onError: error => toast.error(error.message),
  });

  // Forms
  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) as any, defaultValues: { email: "", password: "", rememberDevice: false } });
  const couponForm = useForm<CouponForm>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: { code: "", discountPercent: 25, appliesTo: "ambos", startsAt: getCouponDateTimeLocalValue(new Date()), endsAt: getCouponDateTimeLocalValue(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) },
  });
  const editCouponForm = useForm<CouponForm>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: { code: "", discountPercent: 25, appliesTo: "ambos", startsAt: "", endsAt: "" },
  });

  const createAdminForm = useForm<CreateAdminForm>({
    resolver: zodResolver(createAdminSchema),
    defaultValues: { name: "", email: "", password: "" },
  });
  const createAdminPassword = createAdminForm.watch("password") || "";
  const createForm = useForm<any>({
    resolver: zodResolver(createShipmentSchema),
    defaultValues: {
      status: 'En agencia',
      senderName: '',
      senderLastName: '',
      senderDni: '',
      senderDocumentType: 'dni_peru',
      senderPhone: '',
      recipientName: '',
      recipientLastName: '',
      recipientDni: '',
      recipientDocumentType: 'dni_peru',
      recipientPhone: '',
      notes: '',
      shipmentType: 'documento',
      documentCount: 1,
      docType: 'apostillado',
      sheetCount: 1,
      requiresApostilleService: false,
      requiresTranslationService: false,
      serviceManualPriceEur: '',
      serviceManualPriceSoles: '',
      weightKg: 1,
      manualPriceEur: '',
      extraPriceEur: 0,
      paymentStatus: 'Falta cancelar',
      route: 'Lima - Torino',
      isProvinceDelivery: false,
      provinceCustomerPriceEur: '',
      provinceOperationalCostSoles: '',
      provinceCarrier: 'shalom',
    },
  });
  const selectedShipmentType = createForm.watch("shipmentType") || "documento";

  const resetCreateForm = () => {
    createForm.reset({ status: "En agencia", senderName: "", senderLastName: "", senderDni: "", senderDocumentType: "dni_peru", senderPhone: "", recipientName: "", recipientLastName: "", recipientDni: "", recipientDocumentType: "dni_peru", recipientPhone: "", notes: "", shipmentType: "documento", documentCount: 1, docType: "apostillado", sheetCount: 1, requiresApostilleService: false, requiresTranslationService: false, serviceManualPriceEur: "", serviceManualPriceSoles: "", weightKg: 1, manualPriceEur: "", extraPriceEur: 0, paymentStatus: "Falta cancelar", route: "Lima - Torino", originAddress: "", destinationAddress: "", isProvinceDelivery: false, provinceCustomerPriceEur: "", provinceOperationalCostSoles: "", provinceCarrier: "shalom", couponCode: "", documentItems: [], contentChecklist: [], deliveryMode: "agencia" });
    setSenderClientQuery("");
    setRecipientClientQuery("");
    setAdditionalDocumentItems([]);
    setContentChecklist([]);
    setCatalogDocuments([]);
    setShipmentPhoto(null);
    setCreateShipmentValidationError("");
    setShowDeliveryInfo(false);
  };
  const selectedDocType = createForm.watch("docType") || "apostillado";
  const selectedRoute = createForm.watch("route") || "Lima - Torino";
  const limaTorinoEncomiendasEnabled = limaTorinoPolicy?.encomiendasEnabled !== false;
  const watchedWeightKg = Number(createForm.watch("weightKg")) || 0.1;
  const automaticParcelBaseEur = selectedRoute === "Torino - Lima"
    ? watchedWeightKg <= 5 ? 10 : watchedWeightKg <= 10 ? 15 : null
    : watchedWeightKg * 13.5;
  const automaticParcelDescription = selectedRoute === "Torino - Lima"
    ? watchedWeightKg <= 5 ? "10 EUR para 1–5 kg" : watchedWeightKg <= 10 ? "15 EUR para 6–10 kg" : "Sin tarifa automática: usa Precio manual en EUR para más de 10 kg"
    : "13,5 EUR/kg";
  const manualParcelPrice = Number(createForm.watch("manualPriceEur"));
  const hasValidManualParcelPrice = String(createForm.watch("manualPriceEur") || "").trim() !== "" && Number.isFinite(manualParcelPrice) && manualParcelPrice >= 0;
  const additionalDocumentAutoTotal = additionalDocumentItems.reduce((total, item) => {
    const automaticPrice = item.docType === "simple"
      ? (item.sheetCount <= 4 ? 45 : 45 + (item.sheetCount - 4) * 2)
      : (item.sheetCount <= 5 ? 50 : 60);
    const manualPrice = Number(item.manualPriceEur);
    return total + (item.manualPriceEur.trim() !== "" && Number.isFinite(manualPrice) && manualPrice >= 0 ? manualPrice : automaticPrice);
  }, 0);

  useEffect(() => {
    const maximum = selectedDocType === "simple" ? 8 : 10;
    const currentCount = Number(createForm.getValues("sheetCount")) || 1;
    if (currentCount > maximum) createForm.setValue("sheetCount", maximum, { shouldValidate: true, shouldDirty: true });
  }, [selectedDocType]);

  useEffect(() => {
    if ((selectedShipmentType !== "documento" || selectedRoute !== "Torino - Lima") && createForm.getValues("requiresApostilleService")) {
      createForm.setValue("requiresApostilleService", false, { shouldValidate: true, shouldDirty: true });
    }
  }, [selectedShipmentType, selectedRoute]);

  const fillShipmentPerson = (prefix: "sender" | "recipient", client: ClientLookupRecord) => {
    createForm.setValue(`${prefix}Name`, client.name, { shouldDirty: true });
    createForm.setValue(`${prefix}LastName`, client.lastName, { shouldDirty: true });
    const documentType = (client.documentType || "dni_peru") as IdentityDocumentType;
    createForm.setValue(`${prefix}DocumentType`, documentType, { shouldDirty: true });
    createForm.setValue(`${prefix}Dni`, normalizeIdentityDocument(client.dni || "", documentType), { shouldDirty: true });
    createForm.setValue(`${prefix}Phone`, client.phone || "", { shouldDirty: true });
    if (prefix === "sender") setSenderClientQuery(`${client.name} ${client.lastName}`);
    else setRecipientClientQuery(`${client.name} ${client.lastName}`);
  };

  useEffect(() => {
    if (currentAdminSession) {
      setAdmin(currentAdminSession);
      setIsLoggedIn(true);
    } else if (!loadingAdminSession) {
      setAdmin(null);
      setIsLoggedIn(false);
    }
  }, [currentAdminSession, loadingAdminSession]);

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
      shipmentType: 'documento',
      docType: 'apostillado',
      sheetCount: 1,
                   requiresApostilleService: false,
                   paymentStatus: 'Falta cancelar',
      route: 'Lima - Torino',
      originAddress: '',
      destinationAddress: '',
      weightKg: 1,
      manualPriceEur: '',
      extraPriceEur: 0,
      deliveryMode: 'agencia',
      pricingMode: 'estandar',
    },
  });
  const updateShipmentType = updateForm.watch("shipmentType") || "documento";
  const updateShipmentRoute = updateForm.watch("route") || "Lima - Torino";

  useEffect(() => {
    if ((updateShipmentType !== "documento" || updateShipmentRoute !== "Torino - Lima") && updateForm.getValues("requiresApostilleService")) {
      updateForm.setValue("requiresApostilleService", false, { shouldValidate: true, shouldDirty: true });
    }
  }, [updateShipmentType, updateShipmentRoute]);

  const openShipmentUpdate = (shipment: any) => {
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
      shipmentType: shipment.shipmentType || "documento",
      docType: shipment.documentKind || "apostillado",
      sheetCount: Number(shipment.documentSheetCount || 1),
      requiresApostilleService: shipment.requiresApostilleService === 1,
      paymentStatus: shipment.paymentStatus || "Falta cancelar",
      route: shipment.route || "Lima - Torino",
      originAddress: shipment.originAddress || "",
      destinationAddress: shipment.destinationAddress || "",
      weightKg: Number(shipment.weightKg || 1),
      manualPriceEur: shipment.manualPriceEur || "",
      extraPriceEur: Number(shipment.extraPriceEur || 0),
      deliveryMode: shipment.deliveryMode || "agencia",
      pricingMode: "estandar",
    });
    setShowUpdateForm(true);
  };

  useEffect(() => {
    if (consumedDeliveryQr || !isLoggedIn || !deliveryQrTarget || typeof window === "undefined") return;
    if (deliveryShipmentQuery.isLoading) return;
    if (deliveryShipmentQuery.error || !deliveryShipmentQuery.data) {
      setConsumedDeliveryQr(true);
      toast.error(deliveryShipmentQuery.error?.message || "No se encontró un envío activo para el código escaneado.");
      return;
    }
    const shipment = deliveryShipmentQuery.data;
    setAdminWorkspace("registros");
    setShipmentView(shipment.shipmentType === "encomienda" ? "encomienda" : "documento");
    setSearchTerm(String(shipment.orderNumber));
    if (deliveryQrMode === "status") {
      setDeliveryStatusShipment(shipment);
      setDeliveryStatusValue(shipment.status || "En agencia");
      setDeliveryStatusDescription("");
    } else {
      openShipmentUpdate(shipment);
    }
    setConsumedDeliveryQr(true);
    window.history.replaceState({}, "", "/admin");
  }, [consumedDeliveryQr, isLoggedIn, deliveryQrMode, deliveryQrTarget, deliveryShipmentQuery.data, deliveryShipmentQuery.error, deliveryShipmentQuery.isLoading]);

  const handleLogin = async (data: LoginForm) => {
    try {
      const result = await loginMutation.mutateAsync(data);
      setAdmin({ ...result, reauthRequired: false });
      setIsLoggedIn(true);
      await refetchAdminSession();
      toast.success("Sesión iniciada correctamente");
    } catch (error: any) {
      const seconds = getLockoutSecondsFromMessage(error.message || "");
      if (seconds) setLoginLockSeconds(seconds);
      toast.error(error.message || "Error al iniciar sesión");
    }
  };

  const handleAdminRecoveryRequest = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    requestAdminPasswordResetMutation.mutate({ email: adminRecoveryEmail });
  };

  const handleAdminPasswordReset = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isSecurePassword(adminRecoveryPassword)) {
      toast.error(PASSWORD_REQUIREMENTS_MESSAGE);
      return;
    }
    resetAdminPasswordMutation.mutate({ email: adminRecoveryEmail, code: adminRecoveryCode, newPassword: adminRecoveryPassword });
  };

  useEffect(() => {
    if (adminRecoveryResendSeconds <= 0) return;
    const timer = window.setTimeout(() => setAdminRecoveryResendSeconds(value => Math.max(0, value - 1)), 1_000);
    return () => window.clearTimeout(timer);
  }, [adminRecoveryResendSeconds]);

  const handleCreateAdmin = async (data: CreateAdminForm) => {
    try {
      await createAdminMutation.mutateAsync({ ...data, role: "registrador" });
      toast.success("Usuario Registrador creado correctamente");
      createAdminForm.reset();
      setShowUserForm(false);
      refetchAdminUsers();
    } catch (error: any) {
      toast.error(error.message || "No se pudo crear el usuario Registrador");
    }
  };

  const handleCreateCoupon = async (data: CouponForm) => {
    try {
      const result = await createCouponMutation.mutateAsync({ code: data.code.trim() || undefined, discountPercent: data.discountPercent, appliesTo: data.appliesTo, startsAt: data.startsAt, endsAt: data.endsAt });
      toast.success(`Cupón ${result.code} creado con descuento del ${result.discountPercent}%.`);
      couponForm.reset({ code: "", discountPercent: data.discountPercent, appliesTo: data.appliesTo, startsAt: data.startsAt, endsAt: data.endsAt });
      await refetchCoupons();
    } catch (error: any) {
      toast.error(error.message || "No se pudo crear el cupón");
    }
  };

  const openCouponEditForm = (coupon: any) => {
    setEditingCoupon(coupon);
    editCouponForm.reset({
      code: coupon.code || "",
      discountPercent: Number(coupon.discountPercent) || 25,
      appliesTo: coupon.appliesTo === "documento" || coupon.appliesTo === "encomienda" ? coupon.appliesTo : "ambos",
      startsAt: getCouponDateTimeLocalValue(coupon.startsAt),
      endsAt: getCouponDateTimeLocalValue(coupon.endsAt),
    });
  };

  const handleUpdateCoupon = async (data: CouponForm) => {
    if (!editingCoupon) return;
    try {
      await updateCouponMutation.mutateAsync({ id: editingCoupon.id, ...data, code: data.code.trim() });
      toast.success("Cupón actualizado correctamente.");
      setEditingCoupon(null);
      await refetchCoupons();
    } catch (error: any) {
      toast.error(error.message || "No se pudo actualizar el cupón");
    }
  };

  const handleDeactivateCoupon = async (id: number) => {
    try {
      await deactivateCouponMutation.mutateAsync({ id });
      toast.success("Cupón desactivado.");
      await refetchCoupons();
    } catch (error: any) {
      toast.error(error.message || "No se pudo desactivar el cupón");
    }
  };

  const handleDeleteAdmin = async (user: { id: number; role: string; name: string }) => {
    if (user.role === "superadmin") return;
    if (!confirm(`¿Eliminar definitivamente a ${user.name}? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteAdminMutation.mutateAsync({ id: user.id });
      toast.success("Registrador eliminado correctamente");
      refetchAdminUsers();
    } catch (error: any) {
      toast.error(error.message || "No se pudo eliminar el Registrador");
    }
  };

  const handleDeactivateAdmin = async (user: { id: number; role: string; name: string }) => {
    if (user.role === "superadmin") return;
    if (!confirm(`¿Desactivar la cuenta de ${user.name}? Ya no podrá iniciar sesión.`)) return;
    try {
      await deactivateAdminMutation.mutateAsync({ id: user.id });
      toast.success("Registrador desactivado correctamente");
      refetchAdminUsers();
    } catch (error: any) {
      toast.error(error.message || "No se pudo desactivar el Registrador");
    }
  };

  const handleToggleRegistradorVisibility = async (shipment: { id: number; hiddenFromRegistradoresAt?: string | Date | null }) => {
    const hidden = !shipment.hiddenFromRegistradoresAt;
    try {
      await setShipmentRegistradorVisibilityMutation.mutateAsync({ shipmentId: shipment.id, hidden });
      toast.success(hidden ? "Envío oculto para Registradores. El cliente y el rastreo público mantienen el acceso." : "Envío visible nuevamente para Registradores.");
      await refetchShipments();
    } catch (error: any) {
      toast.error(error.message || "No se pudo actualizar la visibilidad operativa del envío.");
    }
  };

  const openCreateForm = (shipmentType: "documento" | "encomienda") => {
    resetCreateForm();
    createForm.setValue("shipmentType", shipmentType, { shouldDirty: true });
    if (String(admin?.id ?? "") === "210001") {
      createForm.setValue("destinationAddress", "Via Muriaglio 12, Torino, Italia", { shouldDirty: true });
    }
    if (shipmentType === "encomienda" && !limaTorinoEncomiendasEnabled) {
      createForm.setValue("route", "Torino - Lima", { shouldDirty: true });
      createForm.setValue("destinationAddress", "", { shouldDirty: true });
      toast.message("Lima - Torino está restringida para encomiendas; se seleccionó Torino - Lima.");
    }
    setAdminWorkspace("crear");
    setCreateShipmentValidationError("");
    setShowCreateForm(true);
  };

  const handleLimaTorinoEncomiendaPolicy = async () => {
    try {
      const result = await setLimaTorinoEncomiendasEnabledMutation.mutateAsync({ enabled: !limaTorinoEncomiendasEnabled });
      toast.success(result.enabled ? "Encomiendas Lima - Torino habilitadas." : "Encomiendas Lima - Torino desactivadas por control de seguridad.");
      await refetchLimaTorinoPolicy();
    } catch (error: any) {
      toast.error(error.message || "No se pudo actualizar la política de la ruta.");
    }
  };

  const appendCalculatorValue = (value: string) => {
    setCalculatorExpression(current => current + value);
    setCalculatorResult("");
  };

  const calculateScientificExpression = () => {
    try {
      const result = evaluateScientificExpression(calculatorExpression);
      const formattedResult = Number.isInteger(result) ? String(result) : String(Number(result.toFixed(10)));
      setCalculatorExpression(formattedResult);
      setCalculatorResult(`Resultado: ${formattedResult}`);
    } catch (error: any) {
      setCalculatorResult(error.message || "No se pudo calcular la expresión.");
    }
  };

  const handleCreateShipment = async (data: any) => {
    try {
      const normalizedChecklist = data.shipmentType === "documento"
        ? catalogDocumentsToChecklist(catalogDocuments)
        : contentChecklist.map(item => item.trim()).filter(Boolean);
      if (normalizedChecklist.length === 0) {
        setCreateShipmentValidationError("Agrega al menos un elemento a la lista de cosas enviadas.");
        toast.error("Agrega al menos un elemento a la lista de cosas enviadas.");
        return;
      }
      setCreateShipmentValidationError("");
      const createdShipment = await createMutation.mutateAsync({
        ...data,
        documentItems: data.shipmentType === "documento" ? additionalDocumentItems : [],
        contentChecklist: normalizedChecklist,
      });
      if (shipmentPhoto && createdShipment?.shipmentId) {
        const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("No se pudo leer la foto.")); reader.readAsDataURL(shipmentPhoto); });
        await uploadShipmentPhotoMutation.mutateAsync({ shipmentId: createdShipment.shipmentId, name: shipmentPhoto.name, mimeType: shipmentPhoto.type, dataBase64: dataUrl.split(",", 2)[1] || "" });
      }
      toast.success(`${data.shipmentType === "encomienda" ? "Encomienda" : "Documento"} creado exitosamente`);
      resetCreateForm();
      createForm.reset({
        status: "En agencia",
        senderName: "",
        senderLastName: "",
        senderDni: "",
        senderDocumentType: "dni_peru",
        senderPhone: "",
        recipientName: "",
        recipientLastName: "",
        recipientDni: "",
        recipientDocumentType: "dni_peru",
        recipientPhone: "",
        notes: "",
        shipmentType: "documento",
        documentCount: 1,
        docType: "apostillado",
        sheetCount: 1,
        requiresApostilleService: false,
        weightKg: 1,
        manualPriceEur: "",
        extraPriceEur: 0,
        paymentStatus: "Falta cancelar",
        route: "Lima - Torino",
        couponCode: "",
        documentItems: [],
        contentChecklist: [],
        deliveryMode: "agencia",
      });
      setShowCreateForm(false);
      refetchShipments();
    } catch (error: any) {
      toast.error(error.message || "Error al crear encomienda");
    }
  };

  const closeUpdateForm = () => {
    updateForm.reset();
    const closedState = closeUpdateModal();
    setShowUpdateForm(closedState.showUpdateForm);
    setSelectedShipmentId(closedState.selectedShipmentId);
  };

  const handleUpdateStatus = async (data: UpdateStatusForm) => {
    try {
      await updateMutation.mutateAsync(data);
      toast.success("Estado actualizado correctamente");
      closeUpdateForm();
      refetchShipments();
    } catch (error: any) {
      toast.error(error.message || "Error al actualizar estado");
    }
  };

  const continueWithFullUpdateFromDeliveryQr = () => {
    if (!deliveryStatusShipment) return;
    const shipment = deliveryStatusShipment;
    setDeliveryStatusShipment(null);
    setDeliveryStatusDescription("");
    openShipmentUpdate(shipment);
  };

  const updateDeliveryStatusFromQr = async () => {
    if (!deliveryStatusShipment) return;
    try {
      await updateMutation.mutateAsync({
        shipmentId: deliveryStatusShipment.id,
        newStatus: deliveryStatusValue,
        description: deliveryStatusDescription.trim(),
      });
      toast.success("Estado del envío actualizado correctamente.");
      await refetchShipments();
      continueWithFullUpdateFromDeliveryQr();
    } catch (error: any) {
      toast.error(error.message || "No se pudo actualizar el estado del envío.");
    }
  };

  const handleDeleteShipment = async (id: number) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta encomienda?')) {
      try {
        await deleteMutation.mutateAsync({ id, reason: "Eliminación solicitada desde el panel administrativo" });
        toast.success('Envío enviado a la papelera; puede restaurarse.');
        await refetchShipments();
        await refetchDeletedShipments();
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
        renderQrCode(printQrRef.current, trackingUrl, 200);
      }
    }, 100);
  };

  const printReceiptLegacy = async () => {
    if (!printShipment) return;
    let latestSignature = printShipment.signature;
    try {
      const freshShipment = await utils.shipment.search.fetch({ orderNumber: String(printShipment.orderNumber), code: String(printShipment.code) });
      latestSignature = freshShipment?.signature ?? latestSignature;
    } catch {
      // Se mantiene la información disponible si la consulta pública no está temporalmente accesible.
    }
    const receiptUrl = new URL('/recibo', window.location.origin);
    receiptUrl.searchParams.set('order', String(printShipment.orderNumber));
    receiptUrl.searchParams.set('code', String(printShipment.code));
    const printWindow = window.open(receiptUrl.href, '_blank', 'width=800,height=900');
    if (printWindow) {
      const trackingUrl = buildTrackingUrl(printShipment.orderNumber, printShipment.code);
      const managementUrl = buildShipmentManagementUrl(printShipment.orderNumber, printShipment.code);
      const brandLogo = new URL('/manus-storage/servicom_logo_final_e7ce35aa.png', window.location.origin).href;
      const today = new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
      const receiptShipmentLabel = printShipment.shipmentType === 'encomienda' ? 'ENCOMIENDA' : 'DOCUMENTO';
      const downloadFilename = buildReceiptDownloadFilename({
        recipientName: printShipment.recipientName,
        recipientLastName: printShipment.recipientLastName,
        recipientDisplayName: [printShipment.recipientName, printShipment.recipientLastName].filter(Boolean).join(" "),
        orderNumber: printShipment.orderNumber,
        shipmentType: printShipment.shipmentType,
      });
      const branding = getReceiptBranding(printShipment);
      const receiptDestinationAddress = branding.isKasega ? branding.destinationAddress : printShipment.destinationAddress;
      const routePresentation = getRoutePresentation(printShipment.route, receiptDestinationAddress);
      const paymentPrint = getPaymentPrintPresentation(printShipment.paymentStatus);
      const paymentIsPaid = paymentPrint.isPaid;
      const paymentIsPending = paymentPrint.isPending;
      const paidColor = paymentPrint.paidColor;
      const paidBackground = paymentPrint.paidBackground;
      const pendingColor = paymentPrint.pendingColor;
      const pendingBackground = paymentPrint.pendingBackground;
      const printableChecklist = (() => {
        if (Array.isArray(printShipment.contentChecklist)) return printShipment.contentChecklist.filter((item: unknown) => typeof item === "string" && item.trim());
        if (typeof printShipment.contentChecklist !== "string") return [];
        try {
          const parsed = JSON.parse(printShipment.contentChecklist);
          return Array.isArray(parsed) ? parsed.filter((item: unknown) => typeof item === "string" && item.trim()) : [];
        } catch {
          return [];
        }
      })();
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${downloadFilename}</title>
          <style>
            @media print {
              ${buildAdminReceiptPrintStyles()}
            }
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
            
            .main-title { text-align: center; font-size: 20px; font-weight: bold; margin: 20px 0; background: #f4f4f4; padding: 8px; border-radius: 4px; } .price-highlight { display:flex; flex-wrap:wrap; align-items:baseline; gap:8px; margin-top:8px; padding:8px 10px; border-left:5px solid #F28C00; background:#fff7ed; color:#0B2B5E; } .price-label { font-size:10px; font-weight:700; letter-spacing:.08em; } .price-value { font-size:18px; color:#ea580c; font-weight:800; } .price-base { font-size:10px; color:#64748b; }
            
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
                RUC: 20615004708 | Contacto: ${routePresentation.origin.phone}<br>
                ${routePresentation.origin.address}
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

          <div class="main-title">INFORMACIÓN DE ENVÍO DE ${printShipment.shipmentType === 'encomienda' ? 'ENCOMIENDA' : 'DOCUMENTO'} — ${routePresentation.route}</div>

          ${buildAdminRouteSummaryHtml(printShipment.route)}

          <div class="section">
            <div class="row"><div class="label">Orden:</div><div class="value">${printShipment.orderNumber}</div><div class="label" style="margin-left:20px">Cód. Envío:</div><div class="value">${printShipment.code}</div></div>
            <div class="row"><div class="label">Fecha:</div><div class="value">${new Date(printShipment.createdAt).toLocaleString()}</div></div>
          </div>

          <div class="section">
            <div class="section-title">Datos del Remitente</div>
            <div class="row"><div class="label">Remitente:</div><div class="value">${printShipment.senderName || ''} ${printShipment.senderLastName || ''}</div></div>
            <div class="row"><div class="label">Celular:</div><div class="value">${formatPhoneNumber(printShipment.senderPhone) || ''}</div><div class="label" style="margin-left:20px">DNI/RUC:</div><div class="value">${printShipment.senderDni || ''}</div></div>
          </div>

          <div class="section">
            <div class="section-title">Datos del Destinatario</div>
            <div class="row"><div class="label">Destinatario:</div><div class="value">${printShipment.recipientName || ''} ${printShipment.recipientLastName || ''}</div></div>
            <div class="row"><div class="label">Celular:</div><div class="value">${formatPhoneNumber(printShipment.recipientPhone) || ''}</div><div class="label" style="margin-left:20px">DNI/C.I.:</div><div class="value">${printShipment.recipientDni || ''}</div></div>
          </div>

          <div class="section">
            <div class="section-title">Estado de Pago y Descripción</div>
            <div style="font-size: 12px; border: 1px solid #eee; padding: 8px; background: #fafafa;">
              <strong>Estado de Pago:</strong> <span style="color:${paidColor};background:${paidBackground};padding:2px 8px;border-radius:4px;font-weight:bold">[${paymentIsPaid ? 'X' : ' '}] Pagado</span> &nbsp;&nbsp;&nbsp; <span style="color:${pendingColor};background:${pendingBackground};padding:2px 8px;border-radius:4px;font-weight:bold">[${paymentIsPending ? 'X' : ' '}] No cancelado</span><br><br>
              <strong>NOTAS:</strong> ${printShipment.notes || 'Sin notas'}
              ${buildReceiptPriceHtml(printShipment)}
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

          <!-- TICKET RECORTABLE PARA LA SEDE DE ENTREGA -->
          ${buildAdminDeliveryTicketHtml({
            order: String(printShipment.orderNumber),
            code: String(printShipment.code),
            recipient: `${printShipment.recipientName || ''} ${printShipment.recipientLastName || ''}`.trim(),
            recipientPhone: printShipment.recipientPhone || 'No especificado',
            recipientDni: printShipment.recipientDni || 'No especificado',
            sender: `${printShipment.senderName || ''} ${printShipment.senderLastName || ''}`.trim(),
            senderPhone: printShipment.senderPhone || 'No especificado',
            senderDni: printShipment.senderDni || 'No especificado',
            notes: printShipment.notes || 'Sin notas',
            contentChecklist: printableChecklist,
            shipmentType: printShipment.shipmentType,
            price: printShipment,
            route: printShipment.route,
            limaTorinoEncomiendasEnabled,
            managementUrl,
          })}

          <!-- PÁGINA 2: DECLARACIÓN JURADA -->
          <div class="page-break"></div>
          <div class="dj-title">
            <h2 style="margin:0">DECLARACIÓN JURADA DE CONTENIDO</h2>
            <h3 style="margin:0">Y EXENCIÓN DE RESPONSABILIDAD LEGAL</h3>
          </div>

          <div class="dj-content">
            ${buildAdminDeclarationHtml({
              sender: `${printShipment.senderName || '____________________'} ${printShipment.senderLastName || ''}`.trim(),
              senderDni: printShipment.senderDni || '__________',
              order: printShipment.orderNumber,
              token: Math.random().toString(36).substring(2, 10).toUpperCase(),
              today,
              route: printShipment.route,
            })}
          </div>

          <div class="dj-signature-area">
            <div class="signature-box">
              <div style="height: 100px;"></div>
              <strong>Firma del Remitente</strong><br>
              DNI/Pasaporte N° ${printShipment.senderDni || '__________'}<br>
              <span style="font-size: 8px;">(Firmar sobre la línea de microimpresión)</span>
              <div style="margin-top:12px; text-align:left;">${buildElectronicSignatureHtml(latestSignature, `${printShipment.senderName || ""} ${printShipment.senderLastName || ""}`.trim(), printShipment.senderDni || "")}</div>
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
      // Refuerza el nombre sugerido por el diálogo «Guardar como PDF».
      printWindow.document.title = downloadFilename;
      
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
      const deliveryControlCanvas = printWindow.document.getElementById('deliveryControlQR') as HTMLCanvasElement;
      if (deliveryControlCanvas) {
        await QRCode.toCanvas(deliveryControlCanvas, managementUrl, {
          ...TRACKING_QR_OPTIONS,
          width: 88,
          margin: 1,
          color: { dark: '#0B2B5E', light: '#ffffff' },
        });
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
      // La vista previa administrativa ya cumplió su función: se cierra antes del diálogo nativo.
      setPrintShipment(null);
      const closePrintWindow = () => {
        if (!printWindow.closed) printWindow.close();
      };
      printWindow.onafterprint = closePrintWindow;
      printWindow.focus();
      printWindow.print();
      window.setTimeout(closePrintWindow, 1200);
    }
  };

  const printReceipt = async () => {
    if (!printShipment) return;
    try {
      let shipmentForReceipt = printShipment;
      try {
        shipmentForReceipt = await utils.shipment.search.fetch({ orderNumber: String(printShipment.orderNumber), code: String(printShipment.code) }) || printShipment;
      } catch {
        // Se conserva la información visible si una actualización puntual no está disponible.
      }
      const receiptDocument = await buildAdminReceiptDocument({ shipment: shipmentForReceipt, signature: shipmentForReceipt.signature || printShipment.signature, limaTorinoEncomiendasEnabled, origin: window.location.origin });
      const receiptUrl = new URL('/recibo', window.location.origin);
      receiptUrl.searchParams.set('order', String(shipmentForReceipt.orderNumber));
      receiptUrl.searchParams.set('code', String(shipmentForReceipt.code));
      const printWindow = window.open(receiptUrl.href, '_blank', 'width=900,height=900');
      if (!printWindow) { toast.error('Permite las ventanas emergentes para imprimir el comprobante.'); return; }
      printWindow.document.open();
      printWindow.document.write(receiptDocument.html);
      printWindow.document.close();
      printWindow.document.title = receiptDocument.filename;
      await Promise.all(Array.from(printWindow.document.images).map((image) => image.complete ? Promise.resolve() : new Promise<void>((resolve) => { image.addEventListener('load', () => resolve(), { once: true }); image.addEventListener('error', () => resolve(), { once: true }); })));
      setPrintShipment(null);
      const closePrintWindow = () => { if (!printWindow.closed) printWindow.close(); };
      printWindow.onafterprint = closePrintWindow;
      printWindow.focus();
      printWindow.print();
      window.setTimeout(closePrintWindow, 1200);
    } catch (error) {
      console.error('No se pudo preparar el comprobante administrativo', error);
      toast.error('No se pudo preparar el comprobante. Inténtalo nuevamente.');
    }
  };

  const downloadReceiptFromPreview = async () => {
    if (!printShipment) return;
    const shipmentToDownload = printShipment;
    setPrintShipment(null);
    try {
      const filename = receiptDownloadFormat === "pdf"
        ? await downloadAdministrativePdfWithRetry(shipmentToDownload, shipmentToDownload.signature)
        : await downloadShipmentReceipt(shipmentToDownload, receiptDownloadFormat);
      toast.success(`Archivo descargado: ${filename}`);
    } catch (error) {
      console.error("No se pudo descargar el comprobante administrativo", error);
      reportPdfDownloadFailure(shipmentToDownload, error);
      toast.error("No se pudo generar el archivo tras un reintento automático. El fallo fue registrado.");
    }
  };

  const downloadAdministrativePdfWithRetry = async (shipment: any, signature?: any) => {
    let lastError: unknown;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        return await downloadAdminReceiptUsingPrintTemplate({ shipment, signature, limaTorinoEncomiendasEnabled, origin: window.location.origin });
      } catch (error) {
        lastError = error;
        if (attempt === 1) await new Promise(resolve => window.setTimeout(resolve, 250));
      }
    }
    throw lastError instanceof Error ? lastError : new Error("La exportación PDF falló después del reintento automático.");
  };

  const reportPdfDownloadFailure = (shipment: any, error: unknown) => {
    const message = error instanceof Error ? error.message : "Error desconocido al generar el comprobante.";
    reportPdfDownloadFailureMutation.mutate({ shipmentId: typeof shipment?.id === "number" ? shipment.id : undefined, orderNumber: String(shipment?.orderNumber || "sin-orden"), code: String(shipment?.code || "sin-codigo"), message, attempts: 2 });
  };

  const downloadAdministrativePdf = async (shipment: any) => {
    try {
      let shipmentToDownload = shipment;
      try {
        shipmentToDownload = await utils.shipment.search.fetch({ orderNumber: String(shipment.orderNumber), code: String(shipment.code) }) || shipment;
      } catch {
        // La descarga puede continuar con los datos que ya se muestran en la lista.
      }
      const filename = await downloadAdministrativePdfWithRetry(shipmentToDownload, shipmentToDownload.signature || shipment.signature);
      toast.success(`PDF descargado: ${filename}`);
    } catch (error) {
      console.error("No se pudo descargar el comprobante administrativo", error);
      reportPdfDownloadFailure(shipment, error);
      toast.error("No se pudo generar el PDF tras un reintento automático. El fallo fue registrado para su atención.");
    }
  };

  const [searchTerm, setSearchTerm] = useState('');

  const sortedShipments = useMemo(() => {
    if (!shipments) return [];
    let list = [...shipments].filter((shipment) => shipmentView === 'documento'
      ? shipment.shipmentType !== 'encomienda'
      : shipment.shipmentType === 'encomienda');
    const searchQuery = searchTerm.trim();
    const relevanceByShipmentId = new Map<number, number>();
    if (searchQuery) list = list.filter((shipment: any) => {
      const score = getFuzzySearchScore(searchQuery, [shipment.orderNumber, shipment.code, shipment.senderDni, shipment.recipientDni, shipment.senderName, shipment.senderLastName, shipment.recipientName, shipment.recipientLastName].filter(Boolean).join(" "));
      relevanceByShipmentId.set(shipment.id, score);
      return score > 0;
    });
    if (paymentFilter !== "all") {
      list = list.filter(shipment => paymentFilter === "paid" ? shipment.paymentStatus === "Pagado" : shipment.paymentStatus !== "Pagado");
    }
    if (logisticsFilter !== "all") {
      list = list.filter(shipment => shipment.status === logisticsFilter);
    }
    return list.sort((a, b) => {
      const relevanceDifference = searchQuery ? (relevanceByShipmentId.get(b.id) || 0) - (relevanceByShipmentId.get(a.id) || 0) : 0;
      if (relevanceDifference) return relevanceDifference;
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [shipments, shipmentView, sortOrder, searchTerm, paymentFilter, logisticsFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, shipmentView, sortOrder, paymentFilter, logisticsFilter]);

  const pagination = paginateItems(sortedShipments, currentPage, pageSize);
  const totalPages = pagination.totalPages;
  const visibleShipments = pagination.items;

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const handleChangeMyPassword = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const registeredEmail = String(admin?.email || "").trim().toLowerCase();
    const enteredEmail = adminPasswordEmail.trim().toLowerCase();
    if (!registeredEmail || enteredEmail !== registeredEmail) {
      toast.error("El correo debe coincidir exactamente con el correo administrativo registrado.");
      return;
    }
    if (!isSecurePassword(adminNewPassword)) {
      toast.error(PASSWORD_REQUIREMENTS_MESSAGE);
      return;
    }
    if (adminNewPassword !== adminPasswordConfirmation) {
      toast.error("La confirmación de contraseña no coincide.");
      return;
    }
    changeMyPasswordMutation.mutate({ email: enteredEmail, currentPassword: adminCurrentPassword, newPassword: adminNewPassword });
  };

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } finally {
      setIsLoggedIn(false);
      setAdmin(null);
      loginForm.reset();
      toast.success("Sesión cerrada");
      window.location.href = '/';
    }
  };

  const handleDeliveryControlScan = (scannedData: string) => {
    try {
      const scannedUrl = new URL(scannedData, window.location.origin);
      const orderNumber = normalizeTrackingValue(scannedUrl.searchParams.get("order") || "");
      const code = normalizeTrackingValue(scannedUrl.searchParams.get("code") || "");
      const isDeliveryControlQr = scannedUrl.pathname === "/admin" && ["status", "update"].includes(scannedUrl.searchParams.get("open") || "");

      if (!isDeliveryControlQr || !orderNumber || !code) {
        toast.error("El QR no corresponde a un control de entrega válido.");
        return;
      }

      setDeliveryScannerOpen(false);
      setConsumedDeliveryQr(false);
      setDeliveryQrMode("update");
      setDeliveryQrTarget({ orderNumber, code });
      setAdminWorkspace("registros");
      window.history.replaceState({}, "", buildShipmentManagementUrl(orderNumber, code));
      toast.success("QR de control leído. Abriendo la actualización autorizada...");
    } catch {
      toast.error("No se pudo leer un enlace QR de control válido.");
    }
  };

  if (loadingAdminSession && !isLoggedIn) {
    return <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-white text-primary"><Spinner className="mr-2 h-5 w-5" /> Verificando sesión...</div>;
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 shadow-lg border-0">
          <div className="mb-5 flex justify-start">
            <a href="/" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">← Volver al inicio</a>
          </div>
          <div className="flex items-center justify-center mb-6">
            <Lock className="w-8 h-8 text-primary mr-3" />
            <h1 className="text-2xl font-bold text-primary">{adminAuthMode === "login" ? "Admin Servicom Internacional" : "Recuperar acceso administrativo"}</h1>
          </div>

          <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4" autoComplete="off" hidden={adminAuthMode !== "login"}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <Input
                type="email"
                placeholder="Ingresa tu correo administrativo"
                {...loginForm.register("email")}
                autoComplete="off"
                className="border-2 focus:border-primary"
              />
              {loginForm.formState.errors.email && (
                <p className="text-red-600 text-sm mt-1">{loginForm.formState.errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
              <PasswordInput
                placeholder="Contraseña"
                {...loginForm.register("password")}
                autoComplete="current-password"
                className="border-2 focus:border-primary"
              />
              {loginForm.formState.errors.password && (
                <p className="text-red-600 text-sm mt-1">{loginForm.formState.errors.password.message}</p>
              )}
            </div>

            <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"><input type="checkbox" {...loginForm.register("rememberDevice")} className="mt-0.5 h-4 w-4 accent-primary" /><span><strong>Recordar este dispositivo</strong><br /><span className="text-xs text-slate-500">Conserva la sesión de este dispositivo hasta por 30 días sin volver a pedir tu contraseña. No la guarda y se revoca al cerrar sesión.</span></span></label>

            <Button
              type="submit"
              disabled={loginMutation.isPending || loginLockSeconds > 0}
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-2"
            >
              {loginLockSeconds > 0 ? `Espera ${loginLockSeconds}s` : loginMutation.isPending ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  Iniciando sesión...
                </>
              ) : (
                "Iniciar Sesión"
              )}
            </Button>
            {loginLockSeconds > 0 && <p role="status" aria-live="polite" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-sm text-amber-900">Por seguridad, agotaste los intentos. Podrás volver a intentarlo en {loginLockSeconds} segundos.</p>}
            <div className="text-center"><button type="button" onClick={() => { setAdminRecoveryEmail(loginForm.getValues("email") || ""); setAdminAuthMode("request"); }} className="text-sm font-semibold text-primary hover:underline">¿Olvidaste tu contraseña?</button></div>
          </form>
          {adminAuthMode !== "login" && <form onSubmit={adminAuthMode === "request" ? handleAdminRecoveryRequest : handleAdminPasswordReset} className="space-y-4" autoComplete="off">
            <div><label htmlFor="admin-recovery-email" className="mb-2 block text-sm font-medium text-gray-700">Correo administrativo</label><Input id="admin-recovery-email" type="email" placeholder="Ingresa tu correo administrativo" value={adminRecoveryEmail} onChange={event => setAdminRecoveryEmail(event.target.value)} className="border-2 focus:border-primary" autoComplete="email" required /></div>
            <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-primary">Enviaremos un código de seis dígitos al correo administrativo registrado. El código vence en 10 minutos.</div>
            {adminAuthMode === "reset" && <><div><label htmlFor="admin-recovery-code" className="mb-2 block text-sm font-medium text-gray-700">Código de 6 dígitos</label><Input id="admin-recovery-code" value={adminRecoveryCode} onChange={event => setAdminRecoveryCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" pattern="[0-9]{6}" maxLength={6} className="border-2 tracking-[0.35em] focus:border-primary" required /></div><div><label htmlFor="admin-recovery-password" className="mb-2 block text-sm font-medium text-gray-700">Nueva contraseña</label><PasswordInput id="admin-recovery-password" revealLabel="nueva contraseña" value={adminRecoveryPassword} onChange={event => setAdminRecoveryPassword(event.target.value)} minLength={12} autoComplete="new-password" className="border-2 focus:border-primary" required /><PasswordRequirements password={adminRecoveryPassword} /></div></>}
            <Button type="submit" disabled={requestAdminPasswordResetMutation.isPending || resetAdminPasswordMutation.isPending} className="w-full bg-primary text-white hover:bg-primary/90">{adminAuthMode === "request" ? (requestAdminPasswordResetMutation.isPending ? "Enviando código..." : "Enviar código") : (resetAdminPasswordMutation.isPending ? "Actualizando..." : "Restablecer contraseña")}</Button>
            <div className="flex flex-col items-center gap-3 text-sm"><button type="button" onClick={() => setAdminAuthMode("login")} className="font-semibold text-primary hover:underline">Volver a iniciar sesión</button>{adminAuthMode === "reset" && <button type="button" disabled={adminRecoveryResendSeconds > 0 || requestAdminPasswordResetMutation.isPending} onClick={() => requestAdminPasswordResetMutation.mutate({ email: adminRecoveryEmail })} className="font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline">{adminRecoveryResendSeconds > 0 ? `Reenviar código en ${adminRecoveryResendSeconds}s` : "Reenviar código"}</button>}</div>
          </form>}
        </Card>
      </div>
    );
  }

  return (
    <div className="admin-surface min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {admin?.reauthRequired && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-labelledby="admin-reauth-title">
          <Card className="w-full max-w-md border-0 p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <Lock className="h-6 w-6 text-primary" />
              <h2 id="admin-reauth-title" className="text-xl font-semibold text-primary">Verificación de seguridad</h2>
            </div>
            <p className="mb-5 text-sm text-slate-600">Tu sesión administrativa continúa activa, pero debes volver a escribir tu contraseña para continuar.</p>
            <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); reauthenticateMutation.mutate({ password: reauthPassword }); }}>
              <div>
                <label htmlFor="admin-reauth-password" className="mb-2 block text-sm font-medium text-slate-700">Contraseña administrativa</label>
                <PasswordInput id="admin-reauth-password" revealLabel="contraseña administrativa" value={reauthPassword} onChange={(event) => setReauthPassword(event.target.value)} autoComplete="current-password" />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleLogout} disabled={logoutMutation.isPending}>Cerrar sesión</Button>
                <Button type="submit" disabled={!reauthPassword || reauthenticateMutation.isPending || reauthLockSeconds > 0}>{reauthLockSeconds > 0 ? `Espera ${reauthLockSeconds}s` : reauthenticateMutation.isPending ? "Verificando..." : "Verificar contraseña"}</Button>
              </div>
              {reauthLockSeconds > 0 && <p role="status" aria-live="polite" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">Por seguridad, alcanzaste cinco intentos fallidos. Podrás verificar de nuevo en {reauthLockSeconds} segundos.</p>}
            </form>
          </Card>
        </div>
      )}

      {/* Header */}
      <header className="bg-primary text-white shadow-md sticky top-0 z-40">
        <div className="mx-auto flex w-[min(96vw,1560px)] items-center justify-between px-5 py-5">
          <div>
            <h1 className="text-2xl font-bold">Panel de Administración</h1>
            <p className="text-sm opacity-90">Servicom Internacional - Gestión de Encomiendas</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 md:gap-4">
            <a href="/" className="rounded-md border border-white/70 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20">Inicio</a>
            <Button type="button" onClick={() => setDeliveryScannerOpen(true)} variant="outline" className="border-white bg-white text-primary hover:bg-blue-50" aria-label="Escanear QR de control para actualizar un envío">
              <QrCode className="mr-2 h-4 w-4" /> Escanear QR de control
            </Button>
            <Button type="button" onClick={() => setShowGeneralFeedback(true)} variant="outline" className="border-white text-white hover:bg-white/20"><MessageSquare className="mr-2 h-4 w-4" /> Comentarios</Button>
            <div className="text-right">
              <span className="block text-sm">{admin?.name}</span>
              <span className="block text-xs opacity-80">{admin?.role === "superadmin" ? "Master Admin" : "Registrador"}</span>
            </div>
            <Button
              type="button"
              onClick={() => {
                setAdminPasswordEmail(admin?.email || "");
                setShowPasswordForm(previous => !previous);
              }}
              variant="outline"
              className="border-white text-white hover:bg-white/20"
            >
              Cambiar contraseña
            </Button>
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
        <Card className="mb-6 border-0 p-4 shadow-sm" aria-label="Áreas de trabajo">
          <div className="flex flex-wrap items-center gap-2">
            {([
              ["registros", "Ver registros"],
              ["crear", "Registrar envío"],
              ["cupones", "Cupones"],
              ["carta", "Carta de invitación"],
              ["papelera", `Papelera (${deletedShipments.length})`],
              ["resumen", "Resumen"],
              ["analitica", "Analítica"],
              ...(admin?.role === "superadmin" ? [["usuarios", "Registradores"]] : []),
            ] as Array<[AdminWorkspace, string]>).map(([workspace, label]) => (
              <Button key={workspace} type="button" size="sm" variant={adminWorkspace === workspace ? "default" : "outline"} onClick={() => setAdminWorkspace(workspace)} className={adminWorkspace === workspace ? "bg-primary text-white" : "border-slate-300 text-slate-700"}>{label}</Button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">Abre solo el área que necesitas para mantener el trabajo operativo limpio y enfocado.</p>
        </Card>
        {showPasswordForm && (
          <Card className="mb-8 border-0 p-6 shadow-lg">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Actualizar contraseña administrativa</h2>
                <p className="mt-1 text-sm text-slate-500">Confirma el correo registrado para validar que estás cambiando tu propia cuenta.</p>
              </div>
              <Button type="button" variant="outline" onClick={() => setShowPasswordForm(false)} aria-label="Cerrar cambio de contraseña">Cerrar</Button>
            </div>
            <form onSubmit={handleChangeMyPassword} className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Correo registrado</label>
                <Input type="email" value={adminPasswordEmail} onChange={event => setAdminPasswordEmail(event.target.value)} required autoComplete="username" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Contraseña actual</label>
                <PasswordInput revealLabel="contraseña actual" value={adminCurrentPassword} onChange={event => setAdminCurrentPassword(event.target.value)} required autoComplete="current-password" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Nueva contraseña</label>
                <PasswordInput revealLabel="nueva contraseña" value={adminNewPassword} onChange={event => setAdminNewPassword(event.target.value)} minLength={12} required autoComplete="new-password" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Confirmar nueva contraseña</label>
                <PasswordInput revealLabel="confirmación de contraseña" value={adminPasswordConfirmation} onChange={event => setAdminPasswordConfirmation(event.target.value)} minLength={12} required autoComplete="new-password" />
              </div>
              <div className="md:col-span-4"><PasswordRequirements password={adminNewPassword} /></div>
              <div className="flex flex-wrap justify-end gap-2 md:col-span-4">
                <Button type="button" variant="outline" onClick={() => setShowPasswordForm(false)}>Cancelar</Button>
                <Button type="submit" disabled={changeMyPasswordMutation.isPending} className="bg-primary text-white">{changeMyPasswordMutation.isPending ? "Actualizando..." : "Guardar contraseña"}</Button>
              </div>
            </form>
          </Card>
        )}

        <Card className={`mb-8 border-0 p-6 shadow-lg ${adminWorkspace === "resumen" ? "" : "hidden"}`}>
          <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-semibold text-gray-900">Ingresos confirmados</h2><p className="mt-1 text-sm text-slate-500">Solo incluye envíos activos, visibles y marcados como pagados.</p></div><div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-right"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Total ingresado</p><p className="text-2xl font-extrabold text-emerald-800">{adminRevenue.confirmedEur.toLocaleString("es-PE", { style: "currency", currency: "EUR" })}</p></div></div>
          {adminRevenue.unpricedPaidCount > 0 && <p role="status" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"><strong>{adminRevenue.unpricedPaidCount} pago(s) confirmado(s) no tiene(n) precio registrado.</strong> No se suman al total hasta completar la tarifa manual desde «Actualizar».</p>}
          <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"><summary className="cursor-pointer text-sm font-semibold text-[#0B2B5E]">Ver desglose de ingresos</summary><div className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-6"><div><span className="block text-xs text-slate-500">Envíos pagados</span><strong>{adminRevenue.paidCount}</strong></div><div><span className="block text-xs text-slate-500">Pagados sin precio</span><strong>{adminRevenue.unpricedPaidCount}</strong></div><div><span className="block text-xs text-slate-500">Pendiente</span><strong>{adminRevenue.pendingEur.toLocaleString("es-PE", { style: "currency", currency: "EUR" })}</strong></div><div><span className="block text-xs text-slate-500">Documentos pagados</span><strong>{adminRevenue.documentsEur.toLocaleString("es-PE", { style: "currency", currency: "EUR" })}</strong></div><div><span className="block text-xs text-slate-500">Encomiendas pagadas</span><strong>{adminRevenue.parcelsEur.toLocaleString("es-PE", { style: "currency", currency: "EUR" })}</strong></div><div><span className="block text-xs text-slate-500">Provincia</span><strong>{adminRevenue.provinceShipmentCount}</strong></div><div><span className="block text-xs text-slate-500">Costo operativo provincia</span><strong>S/ {adminRevenue.provinceOperationalCostSoles.toFixed(2)}</strong></div><div><span className="block text-xs text-slate-500">Registros pendientes</span><strong>{adminRevenue.pendingCount}</strong></div></div></details>
        </Card>

        {adminWorkspace === "analitica" && <Card className="mb-8 border-0 p-6 shadow-lg"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold text-gray-900">Analítica de interacción y tendencias</h2><p className="mt-1 text-sm text-slate-500">Esta área se abre solo al revisar la operación. No inspecciona nombres, documentos, teléfonos ni notas.</p></div>{adminInsights && <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-[#0B2B5E]">Puntaje {adminInsights.engagementScore}/100</span>}</div>{adminInsights && <><div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4"><div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Interacciones</p><strong>{adminInsights.totalEvents}</strong></div><div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Sesiones</p><strong>{adminInsights.uniqueSessions}</strong></div><div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Continuidad</p><strong>{Math.round(adminInsights.completionRate * 100)}%</strong></div><div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Anomalía</p><strong>{adminInsights.anomalyScore}/100</strong></div></div><ul className="mt-4 space-y-1 text-sm text-slate-700">{adminInsights.insights.map((insight: string) => <li key={insight}>• {insight}</li>)}</ul></>}<div className="mt-6"><ShipmentTrendCharts shipments={shipments} /></div></Card>}

        {adminWorkspace === "carta" && <InvitationLetterWorkspace shipments={shipments} />}

        {/* Coupon Management Section */}
        <Card className={`mb-8 border-0 p-6 shadow-lg ${adminWorkspace === "cupones" ? "" : "hidden"}`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Cupones promocionales</h2>
              <p className="mt-1 text-sm text-slate-500">Configura porcentaje, tipo de envío y vigencia exacta con fecha y hora.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" aria-expanded={showCoupons} onClick={() => setShowCoupons(value => !value)}>{showCoupons ? "Ocultar cupones" : "Mostrar cupones"}</Button>
              <Button type="button" variant="outline" onClick={() => { setShowCoupons(true); setShowCouponForm(value => !value); }}>{showCouponForm ? "Cerrar" : "Nuevo cupón"}</Button>
            </div>
          </div>
          {showCoupons && <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-sm text-slate-600"><strong>{orderedCoupons.length}</strong> cupón(es) · mostrando 5 por página</p>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">Ordenar
              <select aria-label="Orden de cupones" value={couponSortOrder} onChange={event => setCouponSortOrder(event.target.value as "asc" | "desc")} className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm">
                <option value="desc">Recientes (descendentes)</option>
                <option value="asc">Antiguos (ascendente)</option>
              </select>
            </label>
          </div>
          {showCouponForm && (
            <form onSubmit={couponForm.handleSubmit(handleCreateCoupon)} className="mt-5 grid grid-cols-1 gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 md:grid-cols-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Código personalizado (opcional)</label>
                <Input placeholder="Ej. SERVI25-VERANO" {...couponForm.register("code")} className="bg-white" />
                <p className="mt-1 text-xs text-slate-500">Si lo dejas vacío, se genera automáticamente.</p>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Descuento (%)</label>
                <Input type="number" min="1" max="100" step="1" {...couponForm.register("discountPercent", { valueAsNumber: true })} className="bg-white" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Aplica a</label>
                <Select value={couponForm.watch("appliesTo")} onValueChange={(value) => couponForm.setValue("appliesTo", value as CouponForm["appliesTo"], { shouldValidate: true })}>
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="ambos">Documentos y encomiendas</SelectItem><SelectItem value="documento">Solo documentos</SelectItem><SelectItem value="encomienda">Solo encomiendas</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Válido desde</label>
                <Input type="datetime-local" {...couponForm.register("startsAt", { required: true })} className="bg-white" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Válido hasta</label>
                <Input type="datetime-local" {...couponForm.register("endsAt", { required: true })} className="bg-white" />
              </div>
              <div className="flex items-end md:col-span-5 md:justify-end">
                <Button type="submit" disabled={createCouponMutation.isPending} className="bg-[#F28C00] text-white hover:bg-[#d97800]">{createCouponMutation.isPending ? "Generando..." : "Generar cupón"}</Button>
              </div>
            </form>
          )}
          {editingCoupon && (
            <form onSubmit={editCouponForm.handleSubmit(handleUpdateCoupon)} className="mt-5 grid grid-cols-1 gap-4 rounded-xl border border-blue-200 bg-blue-50 p-4 md:grid-cols-5">
              <div className="md:col-span-5 flex items-center justify-between gap-3"><div><h3 className="font-semibold text-[#0B2B5E]">Editar cupón {editingCoupon.code}</h3><p className="text-xs text-slate-600">Los cambios aplicarán a nuevos registros desde el momento de guardarlos.</p></div><Button type="button" variant="outline" size="sm" onClick={() => setEditingCoupon(null)}>Cancelar</Button></div>
              <div><label className="mb-2 block text-sm font-medium text-slate-700">Código</label><Input {...editCouponForm.register("code")} className="bg-white uppercase" /></div>
              <div><label className="mb-2 block text-sm font-medium text-slate-700">Descuento (%)</label><Input type="number" min="1" max="100" step="1" {...editCouponForm.register("discountPercent", { valueAsNumber: true })} className="bg-white" /></div>
              <div><label className="mb-2 block text-sm font-medium text-slate-700">Aplica a</label><Select value={editCouponForm.watch("appliesTo")} onValueChange={(value) => editCouponForm.setValue("appliesTo", value as CouponForm["appliesTo"], { shouldValidate: true })}><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ambos">Documentos y encomiendas</SelectItem><SelectItem value="documento">Solo documentos</SelectItem><SelectItem value="encomienda">Solo encomiendas</SelectItem></SelectContent></Select></div>
              <div><label className="mb-2 block text-sm font-medium text-slate-700">Válido desde</label><Input type="datetime-local" {...editCouponForm.register("startsAt", { required: true })} className="bg-white" /></div>
              <div><label className="mb-2 block text-sm font-medium text-slate-700">Válido hasta</label><Input type="datetime-local" {...editCouponForm.register("endsAt", { required: true })} className="bg-white" /></div>
              <div className="md:col-span-5 flex justify-end"><Button type="submit" disabled={updateCouponMutation.isPending} className="bg-[#0B2B5E] text-white">{updateCouponMutation.isPending ? "Guardando..." : "Guardar cambios"}</Button></div>
            </form>
          )}
          <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-[860px] w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600"><tr><th className="px-4 py-3">Código</th><th className="px-4 py-3">Descuento</th><th className="px-4 py-3">Ámbito</th><th className="px-4 py-3">Vigencia</th><th className="px-4 py-3">Canjes</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Acciones</th></tr></thead>
              <tbody>
                {orderedCoupons.length > 0 ? visibleCoupons.map((coupon: any) => (
                  <tr key={coupon.id} className="border-t">
                    <td className="px-4 py-3 font-mono font-semibold text-[#0B2B5E]">{coupon.code}</td>
                    <td className="px-4 py-3 font-bold text-[#F28C00]">{Number(coupon.discountPercent).toFixed(0)}%</td>
                    <td className="px-4 py-3">{coupon.appliesTo === "documento" ? "Documentos" : coupon.appliesTo === "encomienda" ? "Encomiendas" : "Ambos"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{new Date(coupon.startsAt).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })} – {new Date(coupon.endsAt).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}</td>
                    <td className="px-4 py-3">{coupon.redeemedCount || 0}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${coupon.isActive === 1 ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>{coupon.isActive === 1 ? "Activo" : "Desactivado"}</span></td>
                    <td className="px-4 py-3"><div className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={() => openCouponEditForm(coupon)} disabled={updateCouponMutation.isPending}>Editar</Button>{coupon.isActive === 1 && <Button type="button" size="sm" variant="outline" onClick={() => handleDeactivateCoupon(coupon.id)} disabled={deactivateCouponMutation.isPending}>Desactivar</Button>}</div></td>
                  </tr>
                )) : <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">Aún no hay cupones generados.</td></tr>}
              </tbody>
            </table>
          </div>
          {orderedCoupons.length > 0 && <div className="flex flex-col gap-3 border-x border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">Mostrando {couponFirstItem}–{couponLastItem} de {orderedCoupons.length} cupones</p>
            <div className="flex items-center gap-2"><Button type="button" variant="outline" size="sm" disabled={couponCurrentPage === 1} onClick={() => setCouponCurrentPage(page => Math.max(1, page - 1))}>Anterior</Button><span className="min-w-20 text-center text-sm font-medium text-slate-700">Página {couponCurrentPage} de {couponTotalPages}</span><Button type="button" variant="outline" size="sm" disabled={couponCurrentPage >= couponTotalPages} onClick={() => setCouponCurrentPage(page => Math.min(couponTotalPages, page + 1))}>Siguiente</Button></div>
          </div>}
          </>}
        </Card>

        {/* Create Shipment Section */}
        <Card className={`mb-8 border-0 p-6 shadow-lg ${adminWorkspace === "crear" ? "" : "hidden"}`}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Crear nuevo registro</h2>
              <p className="mt-1 text-sm text-slate-500">Elige directamente qué deseas registrar.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => openCreateForm("documento")} className="bg-primary text-white hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" /> Nuevo documento
              </Button>
              <Button type="button" onClick={() => openCreateForm("encomienda")} className="bg-[#F28C00] text-white hover:bg-[#d67900]">
                <Plus className="mr-2 h-4 w-4" /> Nueva encomienda
              </Button>
            </div>
          </div>

          {adminInsights && adminWorkspace === "analitica" && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-[#0B2B5E]">Analítica de interacción</h3><p className="mt-1 text-xs text-slate-500">Modelo estadístico explicable sobre eventos operativos; no inspecciona nombres, DNI, teléfonos ni contenido libre.</p></div><span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-[#0B2B5E]">Puntaje {adminInsights.engagementScore}/100</span></div>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4"><div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Interacciones</p><strong>{adminInsights.totalEvents}</strong></div><div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Sesiones</p><strong>{adminInsights.uniqueSessions}</strong></div><div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Continuidad</p><strong>{Math.round(adminInsights.completionRate * 100)}%</strong></div><div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Anomalía</p><strong>{adminInsights.anomalyScore}/100</strong></div></div>
              <ul className="mt-4 space-y-1 text-sm text-slate-700">{adminInsights.insights.map((insight: string) => <li key={insight}>• {insight}</li>)}</ul>
            </div>
          )}

          {admin?.role === "superadmin" && (
            <div className={`mt-4 flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between ${limaTorinoEncomiendasEnabled ? "border-amber-200 bg-amber-50" : "border-red-200 bg-red-50"}`}>
              <div>
                <p className="font-semibold text-slate-900">Control de encomiendas Lima – Torino</p>
                <p className="mt-1 text-sm text-slate-600">{limaTorinoEncomiendasEnabled ? "Las encomiendas están habilitadas actualmente." : "Restringidas por control de seguridad; solo se permiten documentos en esta ruta."}</p>
              </div>
              <Button type="button" variant="outline" onClick={handleLimaTorinoEncomiendaPolicy} disabled={setLimaTorinoEncomiendasEnabledMutation.isPending} className={limaTorinoEncomiendasEnabled ? "border-red-300 text-red-700 hover:bg-red-100" : "border-emerald-300 text-emerald-700 hover:bg-emerald-100"}>
                {setLimaTorinoEncomiendasEnabledMutation.isPending ? "Actualizando..." : limaTorinoEncomiendasEnabled ? "Desactivar encomiendas Lima – Torino" : "Habilitar encomiendas Lima – Torino"}
              </Button>
            </div>
          )}

          {showCreateForm && (
            <form onSubmit={createForm.handleSubmit(handleCreateShipment)} className="space-y-4">
              {/* Tarifa y estado del registro; el tipo ya lo define el botón de entrada */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#0B2B5E]">Formulario de registro</p>
                    <p className="text-lg font-bold text-[#0B2B5E]">{selectedShipmentType === "encomienda" ? "Nueva encomienda" : "Nuevo documento"}</p>
                  </div>
                  <span className="text-xs text-slate-600">El tipo ya fue definido por el botón elegido</span>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ruta de envío</label>
                    <Select value={selectedRoute} onValueChange={(value) => {
                      createForm.setValue("route", value as "Lima - Torino" | "Torino - Lima", { shouldValidate: true, shouldDirty: true });
                      if (String(admin?.id ?? "") === "210001" && value === "Lima - Torino") createForm.setValue("destinationAddress", "Via Muriaglio 12, Torino, Italia", { shouldValidate: true, shouldDirty: true });
                    }}>
                      <SelectTrigger className="border-2 focus:border-primary"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Lima - Torino">Lima – Torino</SelectItem>
                        <SelectItem value="Torino - Lima">Torino – Lima</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-xs text-slate-500">Origen definido manualmente; no usa IP, GPS ni geolocalización.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Modalidad de entrega</label>
                    <Select value={createForm.watch("deliveryMode") || "agencia"} onValueChange={(value) => createForm.setValue("deliveryMode", value as "agencia" | "remoto", { shouldValidate: true, shouldDirty: true })}>
                      <SelectTrigger className="border-2 focus:border-primary"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="agencia">Entrega en agencia</SelectItem><SelectItem value="remoto">Envío remoto: firma electrónica</SelectItem></SelectContent>
                    </Select>
                    <button type="button" onClick={() => setShowDeliveryInfo(value => !value)} aria-expanded={showDeliveryInfo} className="mt-3 inline-flex min-h-10 items-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-[#0B2B5E] transition hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F28C00]">{showDeliveryInfo ? "Ocultar información" : "Más información: recepción del envío"}</button>
                    {showDeliveryInfo && <div className="mt-2 rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-sm text-slate-700" role="region" aria-label="Información sobre la recepción del envío"><p className="font-bold text-[#0B2B5E]">¿Cómo recibirá la agencia este envío?</p><p className="mt-1 leading-5"><strong>Entrega en agencia:</strong> el remitente entrega el paquete directamente en la sede indicada y el personal de la agencia lo recibe allí. El cliente lo recogerá en la sede de destino.</p><p className="mt-2 leading-5"><strong>Envío remoto:</strong> el paquete se envía sin entrega presencial del remitente; el cliente debe completar la firma electrónica desde su recibo.</p></div>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Estado Inicial</label>
                    <Select defaultValue="En agencia" onValueChange={(value) => createForm.setValue("status", value as any)}>
                      <SelectTrigger className="border-2 focus:border-primary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Por entregar en agencia">Por entregar en agencia</SelectItem>
                        <SelectItem value="En agencia">En agencia</SelectItem>
                        <SelectItem value="En tránsito">En tránsito</SelectItem>
                        <SelectItem value="En destino">En destino</SelectItem>
                        <SelectItem value="Entregado">Entregado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Estado de Pago</label>
                    <Select value={createForm.watch("paymentStatus") || "Falta cancelar"} onValueChange={(value) => createForm.setValue("paymentStatus", value as "Pagado" | "Falta cancelar", { shouldValidate: true, shouldDirty: true })}>
                      <SelectTrigger aria-label="Estado de Pago" className="border-2 focus:border-primary"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pagado">Pagado</SelectItem>
                        <SelectItem value="Falta cancelar">No cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-xs text-slate-500">Define si el envío se registra como pagado o pendiente de pago.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Precio manual en EUR (opcional)</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Ej. 75.00"
                      {...createForm.register("manualPriceEur")}
                      className="border-2 focus:border-primary"
                    />
                    <p className="mt-1 text-xs text-slate-500">Si lo completas, reemplaza la tarifa automática.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Importe extra en EUR</label>
                    <Input type="number" min="0" step="0.01" aria-label="Importe extra en EUR" {...createForm.register("extraPriceEur")} />
                    <p className="mt-1 text-xs text-slate-500">Por defecto es 0. Se suma al precio final, incluso con tarifa manual.</p>
                  </div>
                </div>
                <AgencyDestinationPicker route={selectedRoute} value={createForm.watch("destinationAddress") || ""} onChange={(destinationAddress) => createForm.setValue("destinationAddress", destinationAddress, { shouldValidate: true, shouldDirty: true })} />


                {selectedShipmentType === "encomienda" && selectedRoute === "Lima - Torino" && !limaTorinoEncomiendasEnabled && (
                  <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800">
                    Encomiendas Lima – Torino desactivadas: por control de seguridad solo se pueden registrar documentos en esta ruta. Selecciona Torino – Lima para continuar con una encomienda.
                  </div>
                )}

                <div className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                  <div>
                    <label className="block text-sm font-medium text-emerald-900 mb-2">Cupón de descuento (opcional)</label>
                    <Input placeholder="Ej. SERVI25-VERANO" {...createForm.register("couponCode")} className="border-emerald-300 bg-white uppercase" />
                    <p className="mt-1 text-xs text-emerald-800">Se validará la vigencia, el horario y el ámbito del cupón; el porcentaje configurado se aplicará al precio final.</p>
                  </div>
                  <div className="rounded-md bg-white px-4 py-3 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">El precio promocional se calcula al guardar</div>
                </div>

                {selectedShipmentType === "documento" ? (
                  <>
                  <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-200 pt-4 md:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Documento</label>
                      <select
                        {...createForm.register("docType")}
                        defaultValue="apostillado"
                        className="w-full rounded-md border-2 border-slate-200 bg-white p-2.5 text-sm font-medium focus:border-primary"
                      >
                        <option value="simple">Documento simple (45 € hasta 4 hojas, +2 € por hoja adicional)</option>
                        <option value="apostillado">Documento apostillado (50 € hasta 5 hojas, +10 € adicionales)</option>
                      </select>
                    </div>
                    <QuantityStepper
                      id="admin-sheet-count"
                      label="Cantidad de Hojas / Documentos"
                      value={Number(createForm.watch("sheetCount")) || 1}
                      min={1}
                      max={createForm.watch("docType") === "simple" ? 8 : 10}
                      onChange={(nextValue) => createForm.setValue("sheetCount", nextValue, { shouldValidate: true, shouldDirty: true })}
                      description={createForm.watch("docType") === "simple" ? "Máximo 8 hojas por registro." : "Máximo 10 hojas por registro."}
                    />
                    <DocumentPricePreview docType={selectedDocType} sheetCount={Number(createForm.watch("sheetCount")) || 1} additionalTotalEur={additionalDocumentAutoTotal} manualPriceEur={createForm.watch("manualPriceEur")} extraPriceEur={createForm.watch("extraPriceEur")} />
                  </div>
                                     {selectedRoute === "Torino - Lima" && (
                     <>
                       <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border-2 border-[#0B2B5E] bg-blue-50 p-4 text-sm shadow-sm transition hover:bg-blue-100/70">
                         <input type="checkbox" aria-label="Documentos para apostillar" {...createForm.register("requiresApostilleService")} className="mt-0.5 h-5 w-5 rounded border-slate-400 text-[#0B2B5E] focus:ring-[#0B2B5E]" />
                         <span><strong className="block text-base text-[#0B2B5E]">Documentos para apostillar</strong><span className="mt-1 block text-slate-700">Tarifa estándar: 40 EUR o 160 soles. Disponible solo para la ruta Torino – Lima.</span></span>
                       </label>
                       <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm"><input type="checkbox" aria-label="Servicio de traducción" {...createForm.register("requiresTranslationService")} className="mt-0.5 h-5 w-5" /><span><strong className="block text-base text-[#0B2B5E]">Traducción</strong><span className="mt-1 block text-slate-700">Tarifa estándar: 200 soles. Disponible para Italia – Lima.</span></span></label>
                       <div className="mt-3 grid gap-3 sm:grid-cols-2"><div><label className="mb-2 block text-sm font-medium text-gray-700">Precio manual del servicio (EUR)</label><Input type="number" min="0" step="0.01" placeholder="Apostilla: 40" {...createForm.register("serviceManualPriceEur")} /></div><div><label className="mb-2 block text-sm font-medium text-gray-700">Precio manual del servicio (soles)</label><Input type="number" min="0" step="0.01" placeholder="Apostilla: 160 / Traducción: 200" {...createForm.register("serviceManualPriceSoles")} /></div></div>
                     </>
                   )}
                   <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h4 className="font-semibold text-[#0B2B5E]">Documentos adicionales</h4>
                        <p className="mt-1 text-xs text-slate-600">Añade más piezas documentales con tarifa automática o un importe manual por ítem.</p>
                      </div>
                      <Button type="button" size="sm" variant="outline" onClick={() => setAdditionalDocumentItems(items => [...items, { docType: "apostillado", sheetCount: 1, manualPriceEur: "" }])} className="border-blue-300 text-[#0B2B5E]">
                        <Plus className="mr-1 h-4 w-4" /> Añadir documento
                      </Button>
                    </div>
                    {additionalDocumentItems.length > 0 ? (
                      <div className="mt-4 space-y-3">
                        {additionalDocumentItems.map((item, index) => {
                          const maxSheets = item.docType === "simple" ? 8 : 10;
                          return (
                            <div key={`additional-document-${index}`} className="grid grid-cols-1 gap-3 rounded-lg border border-blue-100 bg-white p-3 md:grid-cols-[minmax(180px,1fr)_minmax(190px,1fr)_minmax(180px,1fr)_auto] md:items-end">
                              <div>
                                <label className="mb-2 block text-xs font-semibold text-slate-700">Tipo</label>
                                <Select value={item.docType} onValueChange={(value) => setAdditionalDocumentItems(items => items.map((current, itemIndex) => itemIndex === index ? { ...current, docType: value as "simple" | "apostillado", sheetCount: Math.min(current.sheetCount, value === "simple" ? 8 : 10) } : current))}>
                                  <SelectTrigger aria-label={`Tipo de documento adicional ${index + 1}`}><SelectValue /></SelectTrigger>
                                  <SelectContent><SelectItem value="simple">Documento simple</SelectItem><SelectItem value="apostillado">Documento apostillado</SelectItem></SelectContent>
                                </Select>
                              </div>
                              <QuantityStepper id={`additional-sheet-count-${index}`} label="Hojas" value={item.sheetCount} min={1} max={maxSheets} onChange={(nextValue) => setAdditionalDocumentItems(items => items.map((current, itemIndex) => itemIndex === index ? { ...current, sheetCount: nextValue } : current))} description={`Máximo ${maxSheets} hojas.`} />
                              <div>
                                <label className="mb-2 block text-xs font-semibold text-slate-700">Precio manual EUR (opcional)</label>
                                <Input aria-label={`Precio manual documento adicional ${index + 1}`} type="number" min="0" step="0.01" value={item.manualPriceEur} onChange={(event) => setAdditionalDocumentItems(items => items.map((current, itemIndex) => itemIndex === index ? { ...current, manualPriceEur: event.target.value } : current))} placeholder="Tarifa automática" />
                              </div>
                              <Button type="button" variant="outline" size="sm" onClick={() => setAdditionalDocumentItems(items => items.filter((_, itemIndex) => itemIndex !== index))} className="border-red-200 text-red-700 hover:bg-red-50">Quitar</Button>
                            </div>
                          );
                        })}
                        <p className="text-right text-sm font-semibold text-[#0B2B5E]">Subtotal de documentos adicionales: {additionalDocumentAutoTotal.toFixed(2)} €</p>
                      </div>
                    ) : <p className="mt-3 text-sm text-slate-500">No hay documentos adicionales registrados.</p>}
                  </div>
                  </>
                ) : (
                  <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-200 pt-4 md:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Peso de la encomienda (kg)</label>
                      <Input
                        type="number"
                        min="0.1"
                        step="0.1"
                        {...createForm.register("weightKg", { valueAsNumber: true })}
                        className="border-2 focus:border-primary"
                      />
                      <p className={`mt-1 text-base font-semibold ${automaticParcelBaseEur === null ? "text-amber-900" : "text-[#0B2B5E]"}`}>Tarifa automática {selectedRoute === "Torino - Lima" ? "Torino–Lima" : "Lima–Torino"}: {automaticParcelDescription}.</p>
                    </div>
                    <div className={`flex items-end rounded-md p-4 text-lg font-bold ring-1 ${automaticParcelBaseEur === null && !hasValidManualParcelPrice ? "bg-amber-50 text-amber-900 ring-amber-200" : "bg-emerald-50 text-[#0B2B5E] ring-emerald-200"}`}>
                      {hasValidManualParcelPrice ? `Total manual: ${(manualParcelPrice + Math.max(0, Number(createForm.watch("extraPriceEur")) || 0)).toFixed(2)} €` : automaticParcelBaseEur === null ? "Precio manual requerido" : `Total automático: ${(automaticParcelBaseEur + Math.max(0, Number(createForm.watch("extraPriceEur")) || 0)).toFixed(2)} €`}
                    </div>
                    <div className="flex items-end rounded-md bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-amber-200">
                      {automaticParcelBaseEur === null ? "Para más de 10 kg, ingresa un Precio manual en EUR antes de guardar." : "Puedes reemplazar el total usando Precio manual en EUR."}
                    </div>
                  </div>
                )}
              </div>

                      <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
                <label className="flex cursor-pointer items-start gap-3 text-sm"><input type="checkbox" aria-label="Envío incompleto" {...createForm.register("isIncomplete")} className="mt-0.5 h-5 w-5" /><span><strong className="block text-base text-amber-900">Envío incompleto</strong><span className="text-amber-800">Marca esta opción si falta algún documento, artículo o dato.</span></span></label>
                {createForm.watch("isIncomplete") && <Input className="mt-3 bg-white" aria-label="Motivo del envío incompleto" placeholder="Indica qué falta (opcional)" {...createForm.register("incompleteReason")} />}
              </div>
              {/* Información del remitente */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-3">Información del Remitente</h3>
                <div className="mb-4 max-w-xl">
                  <ClientLookup
                    label="Buscar remitente guardado"
                    value={senderClientQuery}
                    onChange={setSenderClientQuery}
                    results={senderClientResults as ClientLookupRecord[]}
                    isLoading={isSearchingSender}
                    onSelect={(client) => fillShipmentPerson("sender", client)}
                  />
                  <p className="mt-1 text-xs text-slate-500">Escribe al menos 2 caracteres del nombre o DNI para reutilizar sus datos.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nombre</label>
                    <Input
                      placeholder="Nombre"
                      inputMode="text"
                      {...createForm.register("senderName", textRegisterOptions(createForm, "senderName", "El nombre"))}
                      className="border-2 focus:border-primary"
                    />
                    <p className="mt-1 text-xs text-gray-500">Solo letras y espacios.</p>
                    {createForm.formState.errors.senderName?.message && <p className="text-xs text-red-600">{String(createForm.formState.errors.senderName.message)}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Apellido</label>
                    <Input
                      placeholder="Apellido"
                      inputMode="text"
                      {...createForm.register("senderLastName", textRegisterOptions(createForm, "senderLastName", "El apellido"))}
                      className="border-2 focus:border-primary"
                    />
                    <p className="mt-1 text-xs text-gray-500">Solo letras y espacios.</p>
                    {createForm.formState.errors.senderLastName?.message && <p className="text-xs text-red-600">{String(createForm.formState.errors.senderLastName.message)}</p>}
                  </div>
                  <div>
                    <IdentityDocumentField id="admin-sender-document" label="Documento de remitente" documentType={(createForm.watch("senderDocumentType") || "dni_peru") as IdentityDocumentType} onDocumentTypeChange={(value) => createForm.setValue("senderDocumentType", value, { shouldDirty: true, shouldValidate: true })} value={createForm.watch("senderDni") || ""} onValueChange={(value) => createForm.setValue("senderDni", value, { shouldDirty: true, shouldValidate: true })} />
                    {createForm.formState.errors.senderDni?.message && <p className="text-xs text-red-600">{String(createForm.formState.errors.senderDni.message)}</p>}
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
                <div className="mb-4 max-w-xl">
                  <ClientLookup
                    label="Buscar destinatario guardado"
                    value={recipientClientQuery}
                    onChange={setRecipientClientQuery}
                    results={recipientClientResults as ClientLookupRecord[]}
                    isLoading={isSearchingRecipient}
                    onSelect={(client) => fillShipmentPerson("recipient", client)}
                  />
                  <p className="mt-1 text-xs text-slate-500">Selecciona una coincidencia para completar nombre, DNI y teléfono.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nombre</label>
                    <Input
                      placeholder="Nombre"
                      inputMode="text"
                      {...createForm.register("recipientName", textRegisterOptions(createForm, "recipientName", "El nombre"))}
                      className="border-2 focus:border-primary"
                    />
                    <p className="mt-1 text-xs text-gray-500">Solo letras y espacios.</p>
                    {createForm.formState.errors.recipientName?.message && <p className="text-xs text-red-600">{String(createForm.formState.errors.recipientName.message)}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Apellido</label>
                    <Input
                      placeholder="Apellido"
                      inputMode="text"
                      {...createForm.register("recipientLastName", textRegisterOptions(createForm, "recipientLastName", "El apellido"))}
                      className="border-2 focus:border-primary"
                    />
                    <p className="mt-1 text-xs text-gray-500">Solo letras y espacios.</p>
                    {createForm.formState.errors.recipientLastName?.message && <p className="text-xs text-red-600">{String(createForm.formState.errors.recipientLastName.message)}</p>}
                  </div>
                  <div>
                    <IdentityDocumentField id="admin-recipient-document" label="Documento de destinatario" documentType={(createForm.watch("recipientDocumentType") || "dni_peru") as IdentityDocumentType} onDocumentTypeChange={(value) => createForm.setValue("recipientDocumentType", value, { shouldDirty: true, shouldValidate: true })} value={createForm.watch("recipientDni") || ""} onValueChange={(value) => createForm.setValue("recipientDni", value, { shouldDirty: true, shouldValidate: true })} />
                    {createForm.formState.errors.recipientDni?.message && <p className="text-xs text-red-600">{String(createForm.formState.errors.recipientDni.message)}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
                    <PhoneInput
                      value={createForm.watch("recipientPhone") || "+51 "}
                      onChange={(val) => createForm.setValue("recipientPhone", val)}
                      placeholder="908722617"
                    />
                  </div>
                </div>
              </div>

              {selectedShipmentType === "documento" ? (
                <div className={`border-t pt-4 ${createShipmentValidationError ? "rounded-lg border border-rose-300 bg-rose-50 p-3" : ""}`}><DocumentCatalogSelector value={catalogDocuments} onChange={items => { setCatalogDocuments(items); if (items.length) setCreateShipmentValidationError(""); }} idPrefix="admin-document" />{createShipmentValidationError && <p role="alert" className="mt-2 text-sm font-medium text-rose-700">{createShipmentValidationError}</p>}</div>
              ) : (
                <div className={`border-t pt-4 ${createShipmentValidationError ? "rounded-lg border border-rose-300 bg-rose-50 p-3" : ""}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Checklist de contenido</label>
                      <p className="mt-1 text-xs text-slate-500">Registro verificable de los artículos entregados, separado de las notas.</p>
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={() => { setContentChecklist(items => [...items, ""]); setCreateShipmentValidationError(""); }}><Plus className="mr-1 h-4 w-4" /> Añadir ítem</Button>
                  </div>
                  {contentChecklist.length > 0 && <div className="mt-3 space-y-2">
                    {contentChecklist.map((item, index) => <div key={`content-check-${index}`} className="flex gap-2">
                      <Input aria-label={`Ítem de checklist ${index + 1}`} value={item} maxLength={160} onChange={(event) => setContentChecklist(items => items.map((current, itemIndex) => itemIndex === index ? event.target.value : current))} placeholder="Ej. Paquete sellado" />
                      <Button type="button" size="sm" variant="outline" onClick={() => setContentChecklist(items => items.filter((_, itemIndex) => itemIndex !== index))} className="shrink-0 border-red-200 text-red-700 hover:bg-red-50">Quitar</Button>
                    </div>)}
                  </div>}
                  {createShipmentValidationError && <p role="alert" className="mt-2 text-sm font-medium text-rose-700">{createShipmentValidationError}</p>}
                </div>
              )}

              {selectedRoute === "Torino - Lima" && <section className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-4"><label className="flex cursor-pointer items-start gap-3 text-sm font-semibold text-[#0B2B5E]"><input type="checkbox" aria-label="Envío a provincia" {...createForm.register("isProvinceDelivery")} className="mt-0.5 h-5 w-5 rounded border-slate-400 text-[#0B2B5E]" /><span><span className="block">Envío a provincia</span><span className="mt-1 block text-xs font-normal text-slate-700">Primero selecciona la sede y registra el peso de la encomienda. Luego indica cuánto se cobra al cliente; la agencia/courier ya está definido por la sede elegida.</span></span></label>{createForm.watch("isProvinceDelivery") && <div className="mt-3 grid gap-3 sm:grid-cols-2"><div><p className="mb-1 text-sm font-semibold text-slate-700">Peso enviado</p><p className="rounded-md bg-white px-3 py-2 text-base font-bold text-[#0B2B5E]">{selectedShipmentType === "encomienda" ? `${watchedWeightKg.toFixed(1)} kg` : "No aplica a documentos"}</p></div><div><label className="mb-1 block text-sm font-semibold text-slate-700">Precio al cliente (EUR)</label><Input type="number" min="0" step="0.01" placeholder="Ej. 15.00" {...createForm.register("provinceCustomerPriceEur")} /></div><div><label className="mb-1 block text-sm font-semibold text-slate-700">Costo operativo (soles)</label><Input type="number" min="0" step="0.01" placeholder={selectedShipmentType === "documento" ? "8.00 automático" : "Ej. 12.00"} {...createForm.register("provinceOperationalCostSoles")} /><p className="mt-1 text-xs text-slate-600">Documentos: S/ 8.00 por defecto.</p></div><div className="rounded-md bg-white px-3 py-2 text-sm text-slate-700"><strong>Courier:</strong> Se usará la agencia seleccionada arriba.</div></div>}</section>}

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

              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                <label className="block text-base font-semibold text-[#0B2B5E]">Fotografía especial del envío (opcional)</label>
                <p className="mt-1 text-sm text-slate-600">Adjunta una foto final del paquete o documento para que quede asociada al registro. JPG, PNG, WebP o HEIC; máximo 8 MB.</p>
                <Input type="file" accept="image/jpeg,image/png,image/webp,image/heic" className="mt-3 h-12 text-base" aria-label="Foto del envío" onChange={event => setShipmentPhoto(event.target.files?.[0] || null)} />
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={createMutation.isPending || (selectedShipmentType === "encomienda" && selectedRoute === "Lima - Torino" && !limaTorinoEncomiendasEnabled)}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                    {createMutation.isPending ? (
                      <>
                        <Spinner className="w-4 h-4 mr-2" />
                        Creando...
                      </>
                    ) : (
                      selectedShipmentType === "encomienda" ? "Crear Encomienda" : "Crear Documento"
                    )}
                </Button>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={resetCreateForm} aria-label="Limpiar todos los campos del formulario">Limpiar formulario</Button>
                  <Button type="button" variant="outline" onClick={() => { resetCreateForm(); setShowCreateForm(false); }}>Cancelar</Button>
                </div>
              </div>
            </form>
          )}
        </Card>

        {adminWorkspace === "usuarios" && admin?.role === "superadmin" && (
          <Card className="p-6 mb-8 shadow-lg border-0">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Usuarios Registradores</h2>
                <p className="text-sm text-slate-500">Solo el Master Admin puede crear cuentas para operadores de agencia.</p>
              </div>
              <Button onClick={() => setShowUserForm(previous => !previous)} variant="outline" className="border-primary text-primary">
                {showUserForm ? "Cerrar formulario" : "Crear Registrador"}
              </Button>
            </div>

            {showUserForm && (
              <form onSubmit={createAdminForm.handleSubmit(handleCreateAdmin)} className="mt-5 grid grid-cols-1 gap-4 rounded-lg bg-slate-50 p-4 md:grid-cols-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del operador</label>
                  <Input {...createAdminForm.register("name", textRegisterOptions(createAdminForm, "name", "El nombre"))} placeholder="Nombre y apellido" />
                  {createAdminForm.formState.errors.name?.message && <p className="mt-1 text-xs text-red-600">{String(createAdminForm.formState.errors.name.message)}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Correo electrónico</label>
                  <Input type="email" {...createAdminForm.register("email")} placeholder="operador@servicom.pe" />
                  {createAdminForm.formState.errors.email?.message && <p className="mt-1 text-xs text-red-600">{String(createAdminForm.formState.errors.email.message)}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña inicial</label>
                  <PasswordInput revealLabel="contraseña inicial" {...createAdminForm.register("password")} placeholder="Contraseña segura de 12+ caracteres" minLength={12} autoComplete="new-password" />
                  {createAdminForm.formState.errors.password?.message && <p className="mt-1 text-xs text-red-600">{String(createAdminForm.formState.errors.password.message)}</p>}
                </div>
                <div className="flex items-end">
                  <Button type="submit" disabled={createAdminMutation.isPending} className="w-full bg-primary text-white">
                    {createAdminMutation.isPending ? "Creando..." : "Crear usuario"}
                  </Button>
                </div>
                <div className="md:col-span-4"><PasswordRequirements password={createAdminPassword} /></div>
              </form>
            )}

            <div className="mt-5 overflow-x-auto rounded-lg border bg-white">
              <table className="min-w-[620px] w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr><th className="px-4 py-3">Nombre</th><th className="px-4 py-3">Correo</th><th className="px-4 py-3">Rol</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Creado</th><th className="px-4 py-3">Acciones</th></tr>
                </thead>
                <tbody>
                  {(adminUsers || []).map((user: any) => (
                    <tr key={user.id} className="border-t">
                      <td className="px-4 py-3 font-medium">{user.name}</td>
                      <td className="px-4 py-3">{user.email}</td>
                      <td className="px-4 py-3">{user.role === "superadmin" ? "Master Admin" : "Registrador"}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${user.isActive === 1 ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>
                          {user.isActive === 1 ? "Activo" : "Desactivado"}
                        </span>
                      </td>
                      <td className="px-4 py-3">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-"}</td>
                      <td className="px-4 py-3">
                        {user.role === "superadmin" ? (
                          <span className="text-xs text-slate-500">Protegido</span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {user.isActive === 1 && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="border-amber-500 text-amber-700 hover:bg-amber-50"
                                onClick={() => handleDeactivateAdmin(user)}
                                disabled={deactivateAdminMutation.isPending}
                              >
                                Desactivar
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-red-600 text-red-600 hover:bg-red-50"
                              onClick={() => handleDeleteAdmin(user)}
                              disabled={deleteAdminMutation.isPending}
                            >
                              Eliminar
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Shipments Table */}
        <Card className={`border-0 p-6 shadow-lg ${adminWorkspace === "registros" ? "" : "hidden"}`}>
          <div className="flex flex-col gap-5 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-semibold text-gray-900">{shipmentView === 'documento' ? 'Documentos Registrados' : 'Encomiendas Registradas'}</h2>
              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Tipo de envío">
                <button
                  type="button"
                  role="tab"
                  aria-selected={shipmentView === 'documento'}
                  onClick={() => setShipmentView('documento')}
                  className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${shipmentView === 'documento' ? 'bg-white text-[#0B2B5E] shadow-sm' : 'text-slate-500 hover:text-[#0B2B5E]'}`}
                >
                  Documentos <span className="ml-1 text-xs">({(shipments || []).filter((shipment: any) => shipment.shipmentType !== 'encomienda').length})</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={shipmentView === 'encomienda'}
                  onClick={() => setShipmentView('encomienda')}
                  className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${shipmentView === 'encomienda' ? 'bg-white text-[#0B2B5E] shadow-sm' : 'text-slate-500 hover:text-[#0B2B5E]'}`}
                >
                  Encomiendas <span className="ml-1 text-xs">({(shipments || []).filter((shipment: any) => shipment.shipmentType === 'encomienda').length})</span>
                </button>
              </div>
            </div>
            <div className="w-full">
              <label htmlFor="admin-shipment-search" className="mb-2 block text-sm font-semibold text-[#0B2B5E]">Buscar en registros</label>
              <div className="relative w-full">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <Input
                  id="admin-shipment-search"
                  aria-label="Buscar registros"
                  aria-describedby="admin-shipment-search-help"
                  placeholder="Escribe orden, código, DNI, nombre o apellido"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-14 w-full bg-white pl-11 pr-4 text-base shadow-sm ring-1 ring-slate-200 focus-visible:ring-2 focus-visible:ring-[#0B2B5E]"
                />
              </div>
              <div className="mt-2 flex justify-end">
                <Button type="button" variant="outline" size="sm" onClick={() => setSearchTerm("")} disabled={!searchTerm} className="min-h-10 border-[#0B2B5E]/30 text-[#0B2B5E]">
                  <RotateCcw className="mr-2 h-4 w-4" /> Limpiar búsqueda
                </Button>
              </div>
              <p id="admin-shipment-search-help" role="status" className="mt-2 text-sm leading-5 text-slate-600">Busca por orden, código, DNI, nombre o apellido. Se muestran coincidencias similares aunque falten tildes o haya errores menores.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                variant="outline"
                size="sm"
              >
                {sortOrder === 'asc' ? '↑ Antiguos (ascendente)' : '↓ Recientes (descendentes)'}
              </Button>
              <select aria-label="Filtro de pago" value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value as "all" | "paid" | "unpaid")} className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700">
                <option value="all">Todos los pagos</option>
                <option value="paid">Pagados</option>
                <option value="unpaid">No pagados</option>
              </select>
              <select aria-label="Filtro de estado del envío" value={logisticsFilter} onChange={(event) => setLogisticsFilter(event.target.value)} className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700">
                <option value="all">Todos los estados</option>
                <option value="Por entregar en agencia">Por entregar en agencia</option>
                <option value="En agencia">En agencia</option>
                <option value="En tránsito">En tránsito</option>
                <option value="En destino">En destino</option>
                <option value="Entregado">Entregado</option>
              </select>
              <Button
                onClick={async () => {
                  await refetchShipments();
                  toast.success(`Lista de ${shipmentView === 'documento' ? 'documentos' : 'encomiendas'} actualizada`);
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
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <Table className="min-w-[980px] w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[250px]">Destinatario</TableHead>
                    <TableHead className="min-w-[190px]">Estado</TableHead>
                    <TableHead className="min-w-[130px]">Fecha de creación</TableHead>
                    <TableHead className="min-w-[280px]">Acciones</TableHead>
                    <TableHead className="hidden xl:table-cell">Número de orden</TableHead>
                    <TableHead className="hidden xl:table-cell">Código</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleShipments.map((shipment: any) => (
                    <TableRow key={shipment.id} className={shipment.hiddenFromRegistradoresAt ? "bg-violet-50/60" : undefined}>
                      <TableCell className="max-w-[280px] whitespace-normal font-semibold text-slate-900">{shipment.recipientName ? `${shipment.recipientName} ${shipment.recipientLastName || ''}` : 'Destinatario no especificado'}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5 items-start">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            shipment.status === 'Por entregar en agencia' ? 'bg-sky-100 text-sky-800' :
                            shipment.status === 'En agencia' ? 'bg-blue-100 text-blue-800' :
                            shipment.status === 'En tránsito' ? 'bg-yellow-100 text-yellow-800' :
                            shipment.status === 'En destino' ? 'bg-orange-100 text-orange-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {shipment.status}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getPaymentStatusUi(shipment.paymentStatus).badgeClass}`}>
                            {getPaymentStatusUi(shipment.paymentStatus).label}
                          </span>
                          {admin?.role === "superadmin" && shipment.hiddenFromRegistradoresAt && <span className="rounded bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800">Oculto a Registradores</span>}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap"><div>{new Date(shipment.createdAt).toLocaleDateString()}</div><p className="mt-1 whitespace-normal text-xs text-slate-500"><strong>Registrado por:</strong> {shipment.registeredByLabel || "Registro anterior"}</p></TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            onClick={() => openShipmentUpdate(shipment)}
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
                            onClick={() => void downloadAdministrativePdf(shipment)}
                            size="sm"
                            variant="outline"
                            className="text-[#0B2B5E] border-[#0B2B5E] hover:bg-blue-50"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Descargar PDF
                          </Button>
                          {shipment.deliveryMode === "remoto" && (
                            <Button
                              onClick={() => sendShipmentSignatureMutation.mutate({ orderNumber: shipment.orderNumber, code: shipment.code })}
                              size="sm"
                              variant="outline"
                              disabled={sendShipmentSignatureMutation.isPending}
                              className="border-[#0B2B5E] text-[#0B2B5E] hover:bg-blue-50"
                            >
                              <Send className="mr-1 h-4 w-4" />
                              {sendShipmentSignatureMutation.isPending ? "Enviando…" : "Enviar firma"}
                            </Button>
                          )}
                          <Button
                            onClick={() => handleDeleteShipment(shipment.id)}
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-600 hover:bg-red-50"
                            disabled={deleteMutation.isPending}
                          >
                            Eliminar
                          </Button>
                          {admin?.role === "superadmin" && <Button onClick={() => handleToggleRegistradorVisibility(shipment)} size="sm" variant="outline" className="border-violet-300 text-violet-800 hover:bg-violet-50" disabled={setShipmentRegistradorVisibilityMutation.isPending}>{shipment.hiddenFromRegistradoresAt ? "Mostrar a Registradores" : "Ocultar a Registradores"}</Button>}
                          {admin?.role === "superadmin" && <Button onClick={() => setAuditShipmentId(shipment.id)} size="sm" variant="outline" className="border-slate-400 text-slate-700 hover:bg-slate-100">Historial</Button>}
                        </div>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell font-medium">{shipment.orderNumber}</TableCell>
                      <TableCell className="hidden xl:table-cell">{shipment.code}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex flex-col gap-3 border-t bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-600">Mostrando {sortedShipments.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, sortedShipments.length)} de {sortedShipments.length} envíos</p>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(page => Math.max(1, page - 1))}>Anterior</Button>
                  <span className="min-w-20 text-center text-sm font-medium text-slate-700">Página {currentPage} de {totalPages}</span>
                  <Button type="button" variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}>Siguiente</Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No hay {shipmentView === 'documento' ? 'documentos' : 'encomiendas'} registradas</p>
          )}
        </Card>

        <Card className={`mt-0 border-0 p-6 shadow-md ${adminWorkspace === "papelera" ? "" : "hidden"}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-[#0B2B5E]"><Trash2 className="h-5 w-5 text-slate-500" /> Papelera y recuperación</h2>
              <p className="mt-1 text-xs text-slate-500">Los envíos no se borran físicamente. Aquí puedes revisar cuándo, quién y por qué se eliminaron.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{deletedShipments.length} eliminado(s)</span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-4">
            <Input aria-label="Buscar en papelera" value={deletedSearchTerm} onChange={(event) => setDeletedSearchTerm(event.target.value)} placeholder="Buscar orden, código, nombre o DNI" className="bg-white md:col-span-2" />
            <select aria-label="Filtro de pago en papelera" value={deletedPaymentFilter} onChange={(event) => setDeletedPaymentFilter(event.target.value as "all" | "paid" | "unpaid")} className="h-10 rounded-md border border-slate-300 bg-white px-2 text-sm"><option value="all">Todos los pagos</option><option value="paid">Pagados</option><option value="unpaid">No pagados</option></select>
            <select aria-label="Filtro de tipo en papelera" value={deletedTypeFilter} onChange={(event) => setDeletedTypeFilter(event.target.value as "all" | "documento" | "encomienda")} className="h-10 rounded-md border border-slate-300 bg-white px-2 text-sm"><option value="all">Documentos y encomiendas</option><option value="documento">Documentos</option><option value="encomienda">Encomiendas</option></select>
            <select aria-label="Filtro de estado en papelera" value={deletedLogisticsFilter} onChange={(event) => setDeletedLogisticsFilter(event.target.value)} className="h-10 rounded-md border border-slate-300 bg-white px-2 text-sm md:col-span-2"><option value="all">Todos los estados</option><option value="Por entregar en agencia">Por entregar en agencia</option><option value="En agencia">En agencia</option><option value="En tránsito">En tránsito</option><option value="En destino">En destino</option><option value="Entregado">Entregado</option></select>
            <p className="self-center text-sm text-slate-600 md:col-span-2">{filteredDeletedShipments.length} resultado(s) · 6 por página</p>
          </div>
          {filteredDeletedShipments.length === 0 ? <p className="mt-4 text-sm text-slate-500">No hay envíos eliminados que coincidan con los filtros seleccionados.</p> : <div className="mt-4 space-y-2">
            {deletedPagination.items.map((shipment: any) => <div key={shipment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div><div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-[#0B2B5E]">{shipment.shipmentType === "encomienda" ? "Encomienda" : "Documento"} · Orden {shipment.orderNumber}</strong><span className="rounded bg-white px-2 py-0.5 text-xs text-slate-500">{shipment.code}</span></div><p className="mt-1 text-xs text-slate-500">Eliminado: {shipment.deletedAt ? new Date(shipment.deletedAt).toLocaleString() : "sin fecha"}</p>{admin?.role === "superadmin" && <p className="mt-1 text-xs font-medium text-[#0B2B5E]">Eliminado por: {shipment.deletedByDisplayName || "No indicado"}</p>}{shipment.deleteReason && <p className="text-xs text-slate-600">Motivo: {shipment.deleteReason}</p>}</div>
              <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={restoreMutation.isPending} onClick={() => restoreMutation.mutate({ shipmentId: shipment.id })}><RotateCcw className="mr-2 h-3.5 w-3.5" /> Restaurar</Button>{admin?.role === "superadmin" && <Button size="sm" variant="outline" onClick={() => setAuditShipmentId(shipment.id)}>Historial</Button>}</div>
            </div>)}
            <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-600">Mostrando {filteredDeletedShipments.length === 0 ? 0 : (deletedPagination.currentPage - 1) * deletedPageSize + 1}–{Math.min(deletedPagination.currentPage * deletedPageSize, filteredDeletedShipments.length)} de {filteredDeletedShipments.length} eliminados</p><div className="flex items-center gap-2"><Button type="button" size="sm" variant="outline" disabled={deletedPagination.currentPage === 1} onClick={() => setDeletedCurrentPage(page => Math.max(1, page - 1))}>Anterior</Button><span className="min-w-20 text-center text-sm font-medium">Página {deletedPagination.currentPage} de {deletedPagination.totalPages}</span><Button type="button" size="sm" variant="outline" disabled={deletedPagination.currentPage >= deletedPagination.totalPages} onClick={() => setDeletedCurrentPage(page => Math.min(deletedPagination.totalPages, page + 1))}>Siguiente</Button></div></div>
          </div>}
        </Card>

        {admin?.role === "superadmin" && auditShipmentId && <Card className="mt-6 border-0 p-6 shadow-md" aria-label="Historial administrativo del envío">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-[#0B2B5E]">Historial de cambios del envío</h2><p className="mt-1 text-xs text-slate-500">Visible únicamente para el Master Admin. Incluye quién eliminó, actualizó, restauró o completó una firma.</p></div><Button size="sm" variant="outline" onClick={() => setAuditShipmentId(null)}>Cerrar historial</Button></div>
          {isLoadingShipmentAudit ? <p className="mt-4 text-sm text-slate-500">Cargando historial…</p> : shipmentAudit.length === 0 ? <p className="mt-4 text-sm text-slate-500">No hay registros de auditoría disponibles para este envío.</p> : <ol className="mt-4 space-y-3">{shipmentAudit.map((entry: any) => <li key={entry.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-sm font-semibold text-[#0B2B5E]">{({ created: "Registro creado", updated: "Datos o estado actualizado", deleted: "Envío eliminado", restored: "Envío restaurado", price_updated: "Precio actualizado", signature_requested: "Firma solicitada", signature_completed: "Firma completada", feedback_added: "Retroalimentación añadida", hidden_from_registradores: "Envío oculto para Registradores", shown_to_registradores: "Envío mostrado a Registradores" } as Record<string, string>)[entry.action] || entry.action}</p><p className="mt-1 text-xs text-slate-600">Realizado por: <strong>{entry.actorDisplayName || "No indicado"}</strong> · {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "sin fecha"}</p>{entry.reason && <p className="mt-1 text-xs text-slate-600">Motivo: {entry.reason}</p>}</li>)}</ol>}
        </Card>}

        {deliveryStatusShipment && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="delivery-status-title">
            <Card className="w-full max-w-2xl border-0 p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#F28C00]">Control de entrega escaneado</p>
                  <h2 id="delivery-status-title" className="mt-1 text-xl font-bold text-[#0B2B5E]">Actualizar estado del envío</h2>
                  <p className="mt-1 text-sm text-slate-600">Orden {deliveryStatusShipment.orderNumber} · Código {deliveryStatusShipment.code} · {deliveryStatusShipment.recipientName || "Destinatario"} {deliveryStatusShipment.recipientLastName || ""}</p>
                </div>
                <Button type="button" variant="outline" size="sm" aria-label="Cerrar actualización rápida y abrir formulario completo" onClick={continueWithFullUpdateFromDeliveryQr}>×</Button>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="delivery-status-select" className="mb-2 block text-sm font-semibold text-slate-800">Nuevo estado del envío</label>
                  <select id="delivery-status-select" aria-label="Nuevo estado del envío" value={deliveryStatusValue} onChange={(event) => setDeliveryStatusValue(event.target.value as UpdateStatusForm["newStatus"])} className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 focus:border-[#0B2B5E] focus:outline-none">
                    <option value="Por entregar en agencia">Por entregar en agencia</option>
                    <option value="En agencia">En agencia</option>
                    <option value="En tránsito">En tránsito</option>
                    <option value="En destino">En destino</option>
                    <option value="Entregado">Entregado</option>
                  </select>
                </div>
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-[#0B2B5E]"><strong>Envío identificado</strong><br />El cambio se aplicará únicamente a esta orden y código.</div>
              </div>
              <div className="mt-4">
                <label htmlFor="delivery-status-description" className="mb-2 block text-sm font-semibold text-slate-800">Nota de actualización <span className="font-normal text-slate-500">(opcional)</span></label>
                <Textarea id="delivery-status-description" aria-label="Nota de actualización" value={deliveryStatusDescription} onChange={(event) => setDeliveryStatusDescription(event.target.value)} placeholder="Ej. Entregado al destinatario en la sede de destino" rows={3} />
              </div>
              <div className="mt-6 flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" onClick={continueWithFullUpdateFromDeliveryQr}>Abrir actualización completa</Button>
                <Button type="button" onClick={() => void updateDeliveryStatusFromQr()} disabled={updateMutation.isPending} className="bg-[#0B2B5E] text-white hover:bg-[#123d78]">{updateMutation.isPending ? "Actualizando…" : "Actualizar estado"}</Button>
              </div>
            </Card>
          </div>
        )}

        <QRScanner
          isOpen={deliveryScannerOpen}
          onClose={() => setDeliveryScannerOpen(false)}
          onScan={handleDeliveryControlScan}
        />

        {/* Update Status Modal */}
        <UpdateShipmentModal
          open={showUpdateForm && Boolean(selectedShipmentId)}
          onClose={closeUpdateForm}
          onSubmit={updateForm.handleSubmit(handleUpdateStatus as any)}
          isSubmitting={updateMutation.isPending}
          paymentStatus={updateForm.watch("paymentStatus")}
          registerPaymentStatus={(name) => updateForm.register(name)}
          shipmentType={updateForm.watch("shipmentType") === "encomienda" ? "encomienda" : "documento"}
        >
                <input type="hidden" {...updateForm.register("shipmentId", { valueAsNumber: true })} />
                <input type="hidden" {...updateForm.register("shipmentType")} />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nuevo Estado</label>
                  <Select value={updateForm.watch("newStatus") || ""} onValueChange={(value) => updateForm.setValue("newStatus", value as any)}>
                    <SelectTrigger className="border-2 focus:border-primary">
                      <SelectValue placeholder="Selecciona un estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Por entregar en agencia">Por entregar en agencia</SelectItem>
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
                    placeholder={updateForm.watch("shipmentType") === "documento" ? "Ej: Documento en camino a destino" : "Ej: Encomienda en camino a destino"}
                    {...updateForm.register("description")}
                    className="border-2 focus:border-primary"
                  />
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Remitente</h4>
                  <div className="grid grid-cols-1 gap-3">
                    <Input placeholder="Nombre" inputMode="text" {...updateForm.register("senderName", textRegisterOptions(updateForm, "senderName", "El nombre"))} />
                    <p className="text-xs text-gray-500">Solo letras y espacios.</p>
                    {updateForm.formState.errors.senderName?.message && <p className="text-xs text-red-600">{String(updateForm.formState.errors.senderName.message)}</p>}
                    <Input placeholder="Apellido" inputMode="text" {...updateForm.register("senderLastName", textRegisterOptions(updateForm, "senderLastName", "El apellido"))} />
                    <p className="text-xs text-gray-500">Solo letras y espacios.</p>
                    {updateForm.formState.errors.senderLastName?.message && <p className="text-xs text-red-600">{String(updateForm.formState.errors.senderLastName.message)}</p>}
                    <Input placeholder="DNI" inputMode="numeric" pattern="[0-9]*" maxLength={DNI_MAX_LENGTH} {...updateForm.register("senderDni", digitsRegisterOptions(updateForm, "senderDni"))} />
                    <p className="text-xs text-gray-500">Solo números, máximo 8 dígitos.</p>
                    {updateForm.formState.errors.senderDni?.message && <p className="text-xs text-red-600">{String(updateForm.formState.errors.senderDni.message)}</p>}
                    <PhoneInput
                      value={updateForm.watch("senderPhone") || ""}
                      onChange={(value) => updateForm.setValue("senderPhone", value, { shouldDirty: true })}
                      placeholder="970 188 447"
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Destinatario</h4>
                  <div className="grid grid-cols-1 gap-3">
                    <Input placeholder="Nombre" inputMode="text" {...updateForm.register("recipientName", textRegisterOptions(updateForm, "recipientName", "El nombre"))} />
                    <p className="text-xs text-gray-500">Solo letras y espacios.</p>
                    {updateForm.formState.errors.recipientName?.message && <p className="text-xs text-red-600">{String(updateForm.formState.errors.recipientName.message)}</p>}
                    <Input placeholder="Apellido" inputMode="text" {...updateForm.register("recipientLastName", textRegisterOptions(updateForm, "recipientLastName", "El apellido"))} />
                    <p className="text-xs text-gray-500">Solo letras y espacios.</p>
                    {updateForm.formState.errors.recipientLastName?.message && <p className="text-xs text-red-600">{String(updateForm.formState.errors.recipientLastName.message)}</p>}
                    <Input placeholder="DNI" inputMode="numeric" pattern="[0-9]*" maxLength={DNI_MAX_LENGTH} {...updateForm.register("recipientDni", digitsRegisterOptions(updateForm, "recipientDni"))} />
                    <p className="text-xs text-gray-500">Solo números, máximo 8 dígitos.</p>
                    {updateForm.formState.errors.recipientDni?.message && <p className="text-xs text-red-600">{String(updateForm.formState.errors.recipientDni.message)}</p>}
                    <PhoneInput
                      value={updateForm.watch("recipientPhone") || ""}
                      onChange={(value) => updateForm.setValue("recipientPhone", value, { shouldDirty: true })}
                      placeholder="908 722 617"
                    />
                  </div>
                </div>

                <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ruta</label>
                    <select
                      {...updateForm.register("route")}
                      className="w-full p-2 bg-white border-2 border-slate-200 rounded-md text-sm font-medium focus:border-primary"
                    >
                      <option value="Lima - Torino">Lima - Torino</option>
                      <option value="Torino - Lima">Torino - Lima</option>
                    </select>
                  </div>
<div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Modalidad de entrega</label>
                     <select {...updateForm.register("deliveryMode")} className="w-full p-2 bg-white border-2 border-slate-200 rounded-md text-sm font-medium focus:border-primary">
                       <option value="agencia">Entrega en agencia</option>
                       <option value="remoto">Envío remoto: firma electrónica</option>
                     </select>
                     <div className="mt-2 rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-sm text-slate-700"><p className="font-bold text-[#0B2B5E]">Recepción del paquete</p><p className="mt-1 leading-5"><strong>En agencia:</strong> se entrega directamente en la sede de origen y la agencia registra la recepción. El destinatario recoge en la sede de destino.</p><p className="mt-2 leading-5"><strong>Remoto:</strong> no requiere entrega presencial del remitente; el cliente firma electrónicamente el recibo.</p></div>
                   </div>
                  {updateForm.watch("shipmentType") === "encomienda" ? <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
                      <Input type="number" min="0.1" step="0.1" {...updateForm.register("weightKg", { valueAsNumber: true })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tarifa</label>
                      <select {...updateForm.register("pricingMode")} className="w-full p-2 bg-white border-2 border-slate-200 rounded-md text-sm font-medium focus:border-primary">
                        <option value="estandar">Estándar: 13,50 €/kg</option>
                        <option value="manual">Precio manual en EUR</option>
                      </select>
                    </div>
                  </> : <>
                    <div>
                      <label htmlFor="update-document-type" className="block text-sm font-medium text-gray-700 mb-1">Tipo de documento</label>
                      <select id="update-document-type" {...updateForm.register("docType")} className="w-full p-2 bg-white border-2 border-[#0B2B5E] rounded-md text-sm font-medium focus:border-primary">
                        <option value="simple">Documento simple (45 € hasta 4 hojas, +2 € por hoja adicional)</option>
                        <option value="apostillado">Documento apostillado (50 € hasta 5 hojas, +10 € adicional)</option>
                      </select>
                    </div>
                    <QuantityStepper
                      id="update-document-sheet-count"
                      label="Cantidad de Hojas / Documentos"
                      value={Number(updateForm.watch("sheetCount") || 1)}
                      min={1}
                      max={updateForm.watch("docType") === "simple" ? 8 : 10}
                      description={updateForm.watch("docType") === "simple" ? "Máximo 8 hojas por registro. Si supera el límite, crea otro registro." : "Máximo 10 hojas por registro. Si supera el límite, crea otro registro."}
                      onChange={(value) => updateForm.setValue("sheetCount", value, { shouldDirty: true, shouldValidate: true })}
                    />
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tarifa del documento</label>
                      <select {...updateForm.register("pricingMode")} className="w-full p-2 bg-white border-2 border-slate-200 rounded-md text-sm font-medium focus:border-primary">
                        <option value="estandar">Tarifa automática según tipo y hojas</option>
                        <option value="manual">Precio manual en EUR</option>
                      </select>
                    </div>
                    {updateForm.watch("route") === "Torino - Lima" && (
                      <label className="md:col-span-2 flex cursor-pointer items-start gap-3 rounded-xl border-2 border-[#0B2B5E] bg-blue-50 p-4 text-sm shadow-sm transition hover:bg-blue-100/70">
                        <input type="checkbox" aria-label="Documentos para apostillar" {...updateForm.register("requiresApostilleService")} className="mt-0.5 h-5 w-5 rounded border-slate-400 text-[#0B2B5E] focus:ring-[#0B2B5E]" />
                        <span><strong className="block text-base text-[#0B2B5E]">Documentos para apostillar</strong><span className="mt-1 block text-slate-700">Se conserva esta solicitud únicamente para documentos en la ruta Torino – Lima.</span></span>
                      </label>
                    )}
                  </>}
                  {updateForm.watch("pricingMode") === "manual" && <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Precio manual (EUR)</label><Input type="number" min="0" step="0.01" {...updateForm.register("manualPriceEur")} placeholder="Ej.: 25.00" /><p className="mt-1 text-xs text-slate-500">Guarda una tarifa para que los pagos de este envío se contabilicen correctamente.</p></div>}
                  <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Importe extra (EUR)</label><Input type="number" min="0" step="0.01" aria-label="Importe extra de actualización" {...updateForm.register("extraPriceEur")} /><p className="mt-1 text-xs text-slate-500">Por defecto es 0 y se suma al total de documento o encomienda.</p></div>
                  {updateForm.watch("shipmentType") === "documento" && <div className="md:col-span-2"><DocumentPricePreview docType={(updateForm.watch("docType") || "apostillado") as "simple" | "apostillado"} sheetCount={Number(updateForm.watch("sheetCount") || 1)} manualPriceEur={updateForm.watch("pricingMode") === "manual" ? updateForm.watch("manualPriceEur") : null} extraPriceEur={updateForm.watch("extraPriceEur")} /></div>}
                </div>

                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notas</label>
                  <Textarea
                    placeholder={`Notas adicionales sobre el ${updateForm.watch("shipmentType") === "documento" ? "documento" : "envío"}`}
                    {...updateForm.register("notes")}
                    className="border-2 focus:border-primary"
                    rows={3}
                  />
                </div>

        </UpdateShipmentModal>

        {/* Print Receipt Modal */}
        {printShipment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md p-6 shadow-lg border-0">
              <h3 className="text-lg font-semibold mb-4 text-center">Vista Previa de Recibo</h3>
              
              <div className="bg-white p-4 rounded-lg mb-4 max-h-96 overflow-y-auto text-sm">
                <div className="text-center border-b pb-3 mb-3">
                  <div className="font-bold text-lg text-primary">SERVICOM INTERNACIONAL</div>
                  <div className="text-xs text-gray-600">RUC 20615004708</div>
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
                    {printShipment.senderPhone && <div className="text-xs">Tel: {formatPhoneNumber(printShipment.senderPhone)}</div>}
                  </div>
                )}

                {printShipment.recipientName && (
                  <div className="mb-3">
                    <div className="font-bold text-xs bg-gray-100 p-1 mb-2">DESTINATARIO</div>
                    <div className="text-xs mb-1">{printShipment.recipientName} {printShipment.recipientLastName || ""}</div>
                    {printShipment.recipientDni && <div className="text-xs mb-1">DNI: {printShipment.recipientDni}</div>}
                    {printShipment.recipientPhone && <div className="text-xs">Tel: {formatPhoneNumber(printShipment.recipientPhone)}</div>}
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

              <div className="flex flex-wrap gap-2">
                <select aria-label="Formato de descarga administrativa" value={receiptDownloadFormat} onChange={(event) => setReceiptDownloadFormat(event.target.value as ReceiptDownloadFormat)} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 focus:border-primary focus:outline-none">
                  <option value="pdf">PDF (predeterminado)</option>
                  <option value="word">Word (.doc)</option>
                  <option value="md">Markdown (.md)</option>
                </select>
                <Button
                  onClick={downloadReceiptFromPreview}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar {receiptDownloadFormat === "word" ? "Word" : receiptDownloadFormat === "md" ? "MD" : "PDF"}
                </Button>
                <Button
                  onClick={printReceipt}
                  variant="outline"
                  className="flex-1"
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
        <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3 print:hidden" aria-label="Herramientas operativas">
          {showCalculator && (
            <section id="admin-scientific-calculator" aria-label="Calculadora científica" className="w-[min(23rem,calc(100vw-2rem))] rounded-2xl border border-[#0B2B5E]/20 bg-white p-4 shadow-2xl">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h3 className="flex items-center gap-2 font-semibold text-[#0B2B5E]"><Calculator className="h-4 w-4" /> Calculadora científica</h3>
                  <p className="mt-1 text-xs text-slate-600">Operaciones básicas y porcentaje. Despliega las funciones científicas cuando las necesites.</p>
                </div>
                <div className="flex shrink-0 gap-1"><Button type="button" size="sm" variant="outline" onClick={() => { setCalculatorExpression(""); setCalculatorResult(""); }}>Limpiar</Button><Button type="button" size="sm" variant="outline" aria-label="Cerrar calculadora" onClick={() => setShowCalculator(false)}>×</Button></div>
              </div>
              <form onSubmit={(event) => { event.preventDefault(); calculateScientificExpression(); }}>
                <Input aria-label="Operación de calculadora" inputMode="decimal" value={calculatorExpression} onChange={(event) => { setCalculatorExpression(event.target.value); setCalculatorResult(""); }} placeholder="Ej. (13.5 × 2) + 10" className="bg-white font-mono" />
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {["7", "8", "9", "÷", "%", "4", "5", "6", "×", "-", "1", "2", "3", "+", "(", "0", "00", ".", ")"].map(value => (
                    <Button key={value} type="button" size="sm" variant="outline" onClick={() => appendCalculatorValue(value)} className="bg-slate-50 font-mono hover:bg-blue-50">{value === "sqrt(" ? "√(" : value}</Button>
                  ))}
                  <Button type="button" size="sm" variant="outline" onClick={() => { setCalculatorExpression(value => value.slice(0, -1)); setCalculatorResult(""); }} className="bg-slate-50">⌫</Button>
                  <Button type="submit" size="sm" className="col-span-2 bg-[#F28C00] text-white hover:bg-[#d97800]">=</Button>
                </div>
                <Button type="button" variant="outline" size="sm" className="mt-3 w-full border-[#0B2B5E]/25 text-[#0B2B5E] hover:bg-blue-50" aria-expanded={showAdvancedCalculator} aria-controls="admin-calculator-advanced" onClick={() => setShowAdvancedCalculator(value => !value)}>{showAdvancedCalculator ? "Ocultar funciones científicas" : "Ver funciones científicas y trigonométricas"}</Button>
                {showAdvancedCalculator && <div id="admin-calculator-advanced" className="mt-2 rounded-xl border border-blue-100 bg-blue-50 p-2"><p className="mb-2 text-xs text-slate-600">Funciones en radianes: sin, cos, tan, log, ln, √, abs, π, e y potencia.</p><div className="grid grid-cols-5 gap-2">{["sin(", "cos(", "tan(", "log(", "ln(", "sqrt(", "abs(", "pi", "e", "^"].map(value => <Button key={value} type="button" size="sm" variant="outline" onClick={() => appendCalculatorValue(value)} className="bg-white font-mono hover:bg-blue-100">{value === "sqrt(" ? "√(" : value}</Button>)}</div></div>}
              </form>
              <p aria-live="polite" className={`mt-3 min-h-5 text-sm font-semibold ${!calculatorResult ? "text-slate-500" : calculatorResult.startsWith("Resultado") ? "text-emerald-700" : "text-red-700"}`}>{calculatorResult || "Escribe una operación para calcular."}</p>
            </section>
          )}
          <Button type="button" onClick={() => setShowCalculator(value => !value)} aria-expanded={showCalculator} aria-controls="admin-scientific-calculator" className="h-12 rounded-full bg-[#0B2B5E] px-4 text-white shadow-lg hover:bg-[#123b78]">
            <Calculator className="mr-2 h-5 w-5" /><span>{showCalculator ? "Ocultar" : "Calculadora"}</span>
          </Button>
        </div>
        <GeneralFeedbackDialog open={showGeneralFeedback} onOpenChange={setShowGeneralFeedback} />
      </main>
    </div>
  );
}
