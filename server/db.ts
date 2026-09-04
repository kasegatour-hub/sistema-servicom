import { and, asc, count, desc, eq, gt, gte, inArray, isNotNull, isNull, like, lt, ne, notInArray, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { createHash } from "node:crypto";
import { InsertUser, users, shipments, shipmentSignatures, recipientChangeRequests, shipmentAuditLogs, shipmentFeedback, platformFeedback, interactionEvents, admins, localAccounts, verificationCodes, adminPasswordResetCodes, clients, discountCoupons, shipmentRoutePolicies, invitationLetters, invitationLetterSignatures, transfers, deliveryReceipts, notifications, operatingExpenses, type Notification } from "../drizzle/schema";
import { ENV } from './_core/env';
import { buildShipmentClientDirectoryRecords, type ClientDirectoryRecord, type ShipmentClientDirectoryInput } from "./clientDirectory";
import { rankFuzzyMatches } from "../shared/fuzzySearch";
import { searchInvitationPeople, type InvitationPersonSeed } from "../shared/invitationPeople";
import { getFailureUpdate } from "./loginProtection";
import { getShipmentOperationalEnvironment, isProvinceShipmentRoute, isTorinoLimaRoute, type ShipmentOperationalEnvironment } from "../shared/shipmentRoutes";
import { derivePricingCurrency, normalizeIndependentEndpoints } from "../shared/shipmentEndpoints";
import { shouldSuppressNotifications } from "./notificationRuntime";

// Normalizar números de orden y códigos: remover espacios y convertir a mayúsculas
function normalizeOrderCode(value: string): string {
  return value.trim().replace(/\s+/g, '').toUpperCase();
}

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export type NotificationRecipientType = "admin" | "account";
export const ISOLATED_WORKSPACE_ADMIN_IDS = [210001, 210002] as const;

export function getNotificationWorkspaceAdminId(adminId?: number | null): number | null {
  const normalizedId = Number(adminId);
  return ISOLATED_WORKSPACE_ADMIN_IDS.includes(normalizedId as (typeof ISOLATED_WORKSPACE_ADMIN_IDS)[number]) ? normalizedId : null;
}

export type NotificationActor = {
  actorType: "admin" | "account" | "system" | "public";
  actorId?: number | null;
  actorLabel?: string | null;
};

type NotificationActorDisplay = {
  label: string;
  role: string;
};

async function getNotificationActorDisplay(actor: NotificationActor): Promise<NotificationActorDisplay> {
  const fallbackLabel = actor.actorLabel?.trim() || "No identificado";
  if (actor.actorType === "system") return { label: actor.actorLabel?.trim() || "Sistema", role: "Sistema" };
  if (actor.actorType === "public") return { label: actor.actorLabel?.trim() || "Usuario público", role: "Usuario" };
  const db = await getDb();
  if (!db || !actor.actorId) return { label: fallbackLabel, role: actor.actorType === "admin" ? "Administrador" : "Cliente" };

  if (actor.actorType === "admin") {
    const [admin] = await db.select({ name: admins.name, email: admins.email, role: admins.role }).from(admins).where(eq(admins.id, actor.actorId)).limit(1);
    return {
      label: admin?.name?.trim() || admin?.email?.trim() || fallbackLabel,
      role: admin?.role === "superadmin" ? "Administrador principal" : "Usuario registrador",
    };
  }

  const [account] = await db.select({ name: localAccounts.name, lastName: localAccounts.lastName, email: localAccounts.email }).from(localAccounts).where(eq(localAccounts.id, actor.actorId)).limit(1);
  const accountName = [account?.name, account?.lastName].filter(Boolean).join(" ").trim();
  return { label: accountName || account?.email?.trim() || fallbackLabel, role: "Cliente" };
}

const SHIPMENT_CHANGE_LABELS: Record<string, string> = {
  senderName: "remitente",
  senderLastName: "remitente",
  senderDni: "DNI del remitente",
  senderDocumentType: "documento del remitente",
  senderPhone: "teléfono del remitente",
  recipientName: "destinatario",
  recipientLastName: "destinatario",
  recipientDni: "DNI del destinatario",
  recipientDocumentType: "documento del destinatario",
  recipientPhone: "teléfono del destinatario",
  status: "estado del envío",
  paymentStatus: "estado de pago",
  destinationAddress: "sede o destino",
  provinceCarrier: "agencia provincial",
  route: "ruta",
  shipmentType: "tipo de envío",
  weightKg: "peso",
  notes: "notas",
  finalPriceEur: "precio",
  basePriceEur: "precio base",
  manualPriceEur: "precio manual",
  requiresApostilleService: "apostilla",
  requiresTranslationService: "traducción",
};

export function getShipmentNotificationTitle(input: {
  shipmentType: "documento" | "encomienda";
  action: "created" | "updated" | "deleted" | "restored" | "signature_requested" | "signature_completed";
  changedFields?: string[];
}) {
  const noun = input.shipmentType === "documento" ? "documento" : "encomienda";
  const capitalizedNoun = noun.charAt(0).toUpperCase() + noun.slice(1);
  const updatedNoun = input.shipmentType === "documento" ? "Documento actualizado" : "Encomienda actualizada";
  if (input.action === "created") return input.shipmentType === "documento" ? "Nuevo documento creado" : "Nueva encomienda creada";
  if (input.action === "deleted") return `${capitalizedNoun} enviado a papelera`;
  if (input.action === "restored") return `${capitalizedNoun} restaurado`;
  if (input.action === "signature_requested") return "Enlace creado para firmar";
  if (input.action === "signature_completed") return "Firma completada";
  const labels = Array.from(new Set((input.changedFields || []).map(field => SHIPMENT_CHANGE_LABELS[field] || field).filter(Boolean)));
  return labels.length ? `${updatedNoun}: ${labels.join(", ")}` : updatedNoun;
}

export function getShipmentChangedFields(previous: Record<string, unknown> | null | undefined, next: Record<string, unknown> | null | undefined) {
  if (!previous || !next) return [];
  return Object.keys(SHIPMENT_CHANGE_LABELS).filter(key => String(previous[key] ?? "") !== String(next[key] ?? ""));
}

export function buildShipmentNotificationMessage(input: {
  shipmentType: "documento" | "encomienda";
  orderNumber: string;
  code: string;
  senderName?: string | null;
  senderLastName?: string | null;
  senderDni?: string | null;
  senderPhone?: string | null;
  recipientName?: string | null;
  recipientLastName?: string | null;
  action: "created" | "updated" | "deleted" | "restored" | "signature_requested" | "signature_completed";
  actor: NotificationActorDisplay;
  previousStatus?: string | null;
  currentStatus?: string | null;
  changedFields?: string[];
  details?: string | null;
}) {
  const shipmentLabel = input.shipmentType === "documento" ? "Documento" : "Encomienda";
  const sender = [input.senderName, input.senderLastName].filter(Boolean).join(" ").trim() || "No registrado";
  const recipient = [input.recipientName, input.recipientLastName].filter(Boolean).join(" ").trim() || "No registrado";
  const actionText = getShipmentNotificationTitle(input);
  const statusLine = input.action === "updated" && input.previousStatus && input.currentStatus && input.previousStatus !== input.currentStatus
    ? `Estado: ${input.previousStatus} → ${input.currentStatus}`
    : input.currentStatus ? `Estado: ${input.currentStatus}` : null;
  const changedLine = input.action === "updated" && input.changedFields?.length
    ? `Campos actualizados: ${Array.from(new Set(input.changedFields.map(field => SHIPMENT_CHANGE_LABELS[field] || field))).join(", ")}`
    : null;
  return [
    actionText,
    `Envío: ${shipmentLabel}`,
    `Orden: ${input.orderNumber}`,
    `Código: ${input.code}`,
    `Remitente / cliente: ${sender}`,
    input.senderDni ? `Documento del remitente: ${input.senderDni}` : null,
    input.senderPhone ? `Teléfono del remitente: ${input.senderPhone}` : null,
    `Destinatario: ${recipient}`,
    `${input.actor.role}: ${input.actor.label}`,
    changedLine,
    statusLine,
    input.details?.trim() ? `Detalle: ${input.details.trim()}` : null,
  ].filter(Boolean).join("\n");
}

async function activeAdminIds(options?: { workspaceAdminId?: number | null }) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ id: admins.id }).from(admins).where(eq(admins.isActive, 1));
  return filterNotificationAdminIds(rows.map(row => row.id), options?.workspaceAdminId);
}

export function filterNotificationAdminIds(adminIds: number[], workspaceAdminId?: number | null) {
  const isolatedWorkspaceAdminId = getNotificationWorkspaceAdminId(workspaceAdminId);
  if (isolatedWorkspaceAdminId) return adminIds.filter(id => id === isolatedWorkspaceAdminId);
  return adminIds.filter(id => !ISOLATED_WORKSPACE_ADMIN_IDS.includes(id as (typeof ISOLATED_WORKSPACE_ADMIN_IDS)[number]));
}

async function getAccountNotificationWorkspaceAdminId(accountId: number): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const [ownedShipment] = await db.select({ registeredById: shipments.registeredById })
    .from(shipments)
    .where(and(
      eq(shipments.accountId, accountId),
      eq(shipments.registeredByType, "admin"),
      inArray(shipments.registeredById, [...ISOLATED_WORKSPACE_ADMIN_IDS]),
    ))
    .orderBy(desc(shipments.createdAt), desc(shipments.id))
    .limit(1);
  return getNotificationWorkspaceAdminId(ownedShipment?.registeredById);
}

function notificationWorkspaceCondition(recipientType: NotificationRecipientType, recipientId: number) {
  if (recipientType !== "admin") return undefined;
  const workspaceAdminId = getNotificationWorkspaceAdminId(recipientId);
  return workspaceAdminId ? eq(notifications.workspaceAdminId, workspaceAdminId) : isNull(notifications.workspaceAdminId);
}

export async function listNotificationsForRecipient(input: { recipientType: NotificationRecipientType; recipientId: number; limit?: number }) {
  const db = await getDb();
  if (!db) return { items: [] as Notification[], unreadCount: 0 };
  const limit = Math.max(1, Math.min(input.limit ?? 40, 100));
  const condition = and(
    eq(notifications.recipientType, input.recipientType),
    eq(notifications.recipientId, input.recipientId),
    notificationWorkspaceCondition(input.recipientType, input.recipientId),
  );
  const [items, unreadRows] = await Promise.all([
    db.select().from(notifications).where(condition).orderBy(desc(notifications.createdAt)).limit(limit),
    db.select({ count: count() }).from(notifications).where(and(condition, eq(notifications.isRead, 0))),
  ]);
  return { items, unreadCount: Number(unreadRows[0]?.count || 0) };
}

export async function markNotificationRead(input: { id: number; recipientType: NotificationRecipientType; recipientId: number }) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.update(notifications).set({ isRead: 1, readAt: new Date() }).where(and(eq(notifications.id, input.id), eq(notifications.recipientType, input.recipientType), eq(notifications.recipientId, input.recipientId), notificationWorkspaceCondition(input.recipientType, input.recipientId), eq(notifications.isRead, 0)));
  return Number(result[0]?.affectedRows || 0) > 0;
}

export async function markAllNotificationsRead(input: { recipientType: NotificationRecipientType; recipientId: number }) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.update(notifications).set({ isRead: 1, readAt: new Date() }).where(and(eq(notifications.recipientType, input.recipientType), eq(notifications.recipientId, input.recipientId), notificationWorkspaceCondition(input.recipientType, input.recipientId), eq(notifications.isRead, 0)));
  return Number(result[0]?.affectedRows || 0);
}

async function insertNotifications(rows: Array<typeof notifications.$inferInsert>) {
  if (shouldSuppressNotifications()) return true;
  const db = await getDb();
  if (!db || rows.length === 0) return false;
  try {
    await db.insert(notifications).values(rows);
    return true;
  } catch (error) {
    console.warn("[Notifications] No se pudo guardar un aviso:", error);
    return false;
  }
}

export async function notifyShipmentEvent(input: {
  shipmentId: number;
  orderNumber: string;
  code: string;
  shipmentType: "documento" | "encomienda";
  senderName?: string | null;
  senderLastName?: string | null;
  senderDni?: string | null;
  senderPhone?: string | null;
  recipientName?: string | null;
  recipientLastName?: string | null;
  accountId?: number | null;
  registeredByType?: string | null;
  registeredById?: number | null;
  action: "created" | "updated" | "deleted" | "restored" | "signature_requested" | "signature_completed";
  actor: NotificationActor;
  details?: string;
  previousStatus?: string | null;
  currentStatus?: string | null;
  changedFields?: string[];
  notifyAccount?: boolean;
}) {
  if (shouldSuppressNotifications()) return true;
  const workspaceAdminId = input.registeredByType === "admin"
    ? getNotificationWorkspaceAdminId(input.registeredById)
    : input.accountId ? await getAccountNotificationWorkspaceAdminId(input.accountId) : null;
  const adminIds = await activeAdminIds({ workspaceAdminId });
  const actorDisplay = await getNotificationActorDisplay(input.actor);
  const message = buildShipmentNotificationMessage({
    shipmentType: input.shipmentType,
    orderNumber: input.orderNumber,
    code: input.code,
    senderName: input.senderName,
    senderLastName: input.senderLastName,
    senderDni: input.senderDni,
    senderPhone: input.senderPhone,
    recipientName: input.recipientName,
    recipientLastName: input.recipientLastName,
    action: input.action,
    actor: actorDisplay,
    previousStatus: input.previousStatus,
    currentStatus: input.currentStatus,
    changedFields: input.changedFields,
    details: input.details,
  });
  const recipients = new Map<string, { type: NotificationRecipientType; id: number }>();
  for (const id of adminIds) recipients.set(`admin:${id}`, { type: "admin", id });
  if (input.notifyAccount !== false && input.accountId) recipients.set(`account:${input.accountId}`, { type: "account", id: input.accountId });
  return insertNotifications(Array.from(recipients.values()).map(recipient => ({
    recipientType: recipient.type,
    recipientId: recipient.id,
    kind: `shipment_${input.action}`,
    title: getShipmentNotificationTitle(input),
    message,
    entityType: "shipment",
    entityId: input.shipmentId,
    workspaceAdminId,
    actorType: input.actor.actorType === "public" ? "system" : input.actor.actorType,
    actorId: input.actor.actorId ?? null,
    actorLabel: input.actor.actorLabel ?? null,
    isRead: 0,
  })));
}

export async function notifyAccountEvent(input: {
  accountId: number;
  title: string;
  message: string;
  kind: "account_created" | "account_updated" | "recipient_change_signature";
  actor: NotificationActor;
  details?: string;
  workspaceAdminId?: number | null;
}) {
  if (shouldSuppressNotifications()) return true;
  const workspaceAdminId = input.workspaceAdminId === undefined
    ? await getAccountNotificationWorkspaceAdminId(input.accountId)
    : getNotificationWorkspaceAdminId(input.workspaceAdminId);
  const adminIds = await activeAdminIds({ workspaceAdminId });
  const message = input.details ? `${input.message} ${input.details}` : input.message;
  const recipients = [
    ...adminIds.map(id => ({ type: "admin" as const, id })),
    { type: "account" as const, id: input.accountId },
  ];
  return insertNotifications(recipients.map(recipient => ({
    recipientType: recipient.type,
    recipientId: recipient.id,
    kind: input.kind,
    title: input.title,
    message,
    entityType: "account",
    entityId: input.accountId,
    workspaceAdminId,
    actorType: input.actor.actorType === "public" ? "system" : input.actor.actorType,
    actorId: input.actor.actorId ?? null,
    actorLabel: input.actor.actorLabel ?? null,
    isRead: 0,
  })));
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getShipmentByOrderAndCode(orderNumber: string, code: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get shipment: database not available");
    return undefined;
  }

  // Normalizar los parámetros de búsqueda
  const normalizedOrder = normalizeOrderCode(orderNumber);
  const normalizedCode = normalizeOrderCode(code);
  const compactOrder = normalizedOrder.replace(/-/g, "");
  const orderCondition = compactOrder !== normalizedOrder
    ? or(eq(shipments.orderNumber, normalizedOrder), eq(shipments.orderNumber, compactOrder))
    : eq(shipments.orderNumber, normalizedOrder);

  const result = await db
    .select()
    .from(shipments)
    .where(
      and(
        orderCondition,
        eq(shipments.code, normalizedCode),
        isNull(shipments.deletedAt)
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/** Obtiene las órdenes ya reservadas de un mes para generar una encomienda sin duplicados. */
export async function listShipmentOrderNumbersByPrefix(prefix: string, operationalEnvironment?: ShipmentOperationalEnvironment): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const normalizedPrefix = normalizeOrderCode(prefix);
  const rows = await db.select({ orderNumber: shipments.orderNumber, route: shipments.route }).from(shipments).where(and(like(shipments.orderNumber, `${normalizedPrefix}-%`), ne(shipments.status, "Entregado")));
  if (!operationalEnvironment) return rows.map(row => row.orderNumber);
  return rows.filter(row => getShipmentOperationalEnvironment(row.route) === operationalEnvironment).map(row => row.orderNumber);
}

export async function getShipmentById(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get shipment: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(shipments)
    .where(and(eq(shipments.id, id), isNull(shipments.deletedAt)))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export function shipmentSenderMatchesAccount(shipment: { senderName?: string | null; senderLastName?: string | null; senderDni?: string | null; senderDocumentType?: string | null }, account: { name?: string | null; lastName?: string | null; dni?: string | null; documentType?: string | null }) {
  const normalize = (value: string | null | undefined) => String(value || "").trim().toUpperCase();
  return Boolean(
    normalize(shipment.senderName) && normalize(shipment.senderLastName) && normalize(shipment.senderDni)
    && normalize(shipment.senderName) === normalize(account.name)
    && normalize(shipment.senderLastName) === normalize(account.lastName)
    && normalize(shipment.senderDni) === normalize(account.dni)
    && normalize(shipment.senderDocumentType) === normalize(account.documentType),
  );
}

export async function createRecipientChangeRequest(input: {
  shipment: typeof shipments.$inferSelect;
  accountId?: number | null;
  requestedByAdminId: number;
  requestedByLabel: string;
  tokenHash: string;
  expiresAt: Date;
  newRecipientName: string;
  newRecipientLastName: string;
  newRecipientDni: string;
  newRecipientDocumentType: "dni_peru" | "pasaporte" | "carta_identita_italia";
  newRecipientPhone: string;
}) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(recipientChangeRequests).values({
    shipmentId: input.shipment.id,
    accountId: input.accountId ?? null,
    requestedByAdminId: input.requestedByAdminId,
    requestedByLabel: input.requestedByLabel,
    requestTokenHash: input.tokenHash,
    requestTokenExpiresAt: input.expiresAt,
    status: "pending",
    senderName: input.shipment.senderName || "No indicado",
    senderLastName: input.shipment.senderLastName || null,
    senderDni: input.shipment.senderDni || null,
    senderDocumentType: input.shipment.senderDocumentType || "dni_peru",
    previousRecipientName: input.shipment.recipientName || null,
    previousRecipientLastName: input.shipment.recipientLastName || null,
    previousRecipientDni: input.shipment.recipientDni || null,
    previousRecipientDocumentType: input.shipment.recipientDocumentType || "dni_peru",
    previousRecipientPhone: input.shipment.recipientPhone || null,
    newRecipientName: input.newRecipientName,
    newRecipientLastName: input.newRecipientLastName,
    newRecipientDni: input.newRecipientDni,
    newRecipientDocumentType: input.newRecipientDocumentType,
    newRecipientPhone: input.newRecipientPhone,
    route: input.shipment.route || "Lima - Torino",
  });
  const rows = await db.select().from(recipientChangeRequests).where(eq(recipientChangeRequests.requestTokenHash, input.tokenHash)).limit(1);
  const request = rows[0];
  if (request) await recordShipmentAudit({ shipmentId: input.shipment.id, action: "updated", actor: { actorType: "admin", actorId: input.requestedByAdminId, actorLabel: input.requestedByLabel }, metadata: { recipientChangeRequestId: request.id, status: "pending", proposedRecipient: `${input.newRecipientName} ${input.newRecipientLastName}` }, snapshot: request });
  return request;
}

export async function getRecipientChangeRequestById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(recipientChangeRequests).where(eq(recipientChangeRequests.id, id)).limit(1);
  return rows[0];
}

export async function getRecipientChangeRequestByTokenHash(tokenHash: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(recipientChangeRequests).where(eq(recipientChangeRequests.requestTokenHash, tokenHash)).limit(1);
  return rows[0];
}

export async function listRecipientChangeRequestsForShipment(shipmentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(recipientChangeRequests).where(eq(recipientChangeRequests.shipmentId, shipmentId)).orderBy(desc(recipientChangeRequests.createdAt));
}

export async function markRecipientChangeRequestNotified(input: { id: number; emailSent?: boolean; accountNotified?: boolean }) {
  const db = await getDb();
  if (!db) return;
  const now = new Date();
  await db.update(recipientChangeRequests).set({
    notificationSentAt: input.accountNotified ? now : undefined,
    emailSentAt: input.emailSent ? now : undefined,
    updatedAt: now,
  }).where(eq(recipientChangeRequests.id, input.id));
}

export async function completeRecipientChangeRequest(input: { requestId: number; tokenHash: string; signerName: string; signerEmail?: string | null; signerAccountId?: number | null; consentTextVersion: string; consentAcceptedAt: Date; signatureStrokes: string }) {
  const db = await getDb();
  if (!db) return undefined;
  const now = new Date();
  const rows = await db.select().from(recipientChangeRequests).where(and(eq(recipientChangeRequests.id, input.requestId), eq(recipientChangeRequests.requestTokenHash, input.tokenHash), eq(recipientChangeRequests.status, "pending"), gt(recipientChangeRequests.requestTokenExpiresAt, now))).limit(1);
  const request = rows[0];
  if (!request) return undefined;
  const shipment = await getShipmentById(request.shipmentId);
  if (!shipment) return undefined;
  const evidenceHash = createHash("sha256").update(JSON.stringify({ requestId: request.id, shipmentId: request.shipmentId, signerName: input.signerName, signerEmail: input.signerEmail || null, signerAccountId: input.signerAccountId || null, consentTextVersion: input.consentTextVersion, consentAcceptedAt: input.consentAcceptedAt.toISOString(), signatureStrokes: input.signatureStrokes })).digest("hex");
  await db.update(recipientChangeRequests).set({ status: "signed", signerName: input.signerName, signerEmail: input.signerEmail || null, signerAccountId: input.signerAccountId || null, consentTextVersion: input.consentTextVersion, consentAcceptedAt: input.consentAcceptedAt, evidenceHash, signatureStrokes: input.signatureStrokes, signedAt: now, appliedAt: now, updatedAt: now }).where(and(eq(recipientChangeRequests.id, request.id), eq(recipientChangeRequests.status, "pending")));
  await db.update(shipments).set({ recipientName: request.newRecipientName, recipientLastName: request.newRecipientLastName, recipientDni: request.newRecipientDni, recipientDocumentType: request.newRecipientDocumentType, recipientPhone: request.newRecipientPhone, updatedAt: now }).where(eq(shipments.id, shipment.id));
  const saved = await getRecipientChangeRequestById(request.id);
  await recordShipmentAudit({ shipmentId: shipment.id, action: "updated", actor: { actorType: input.signerAccountId ? "account" : "public", actorId: input.signerAccountId || null, actorLabel: input.signerName }, metadata: { recipientChangeRequestId: request.id, evidenceHash, recipientChangedFrom: `${request.previousRecipientName || ""} ${request.previousRecipientLastName || ""}`.trim(), recipientChangedTo: `${request.newRecipientName} ${request.newRecipientLastName}` }, snapshot: saved });
  return saved;
}

export async function getShipmentSignatureByShipmentId(shipmentId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(shipmentSignatures).where(eq(shipmentSignatures.shipmentId, shipmentId)).limit(1);
  return rows[0];
}

export async function createOrRefreshShipmentSignatureRequest(input: {
  shipmentId: number;
  tokenHash: string;
  expiresAt: Date;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const existing = await getShipmentSignatureByShipmentId(input.shipmentId);
  if (existing?.status === "signed") return existing;

  if (existing) {
    await db.update(shipmentSignatures).set({
      requestTokenHash: input.tokenHash,
      requestTokenExpiresAt: input.expiresAt,
      status: "pending",
      signerName: null,
      signerDni: null,
      signerEmail: null,
      signerPhone: null,
      consentTextVersion: null,
      consentAcceptedAt: null,
      evidenceHash: null,
      signatureStrokes: null,
      requestedAt: new Date(),
      signedAt: null,
      updatedAt: new Date(),
    }).where(eq(shipmentSignatures.id, existing.id));
  } else {
    await db.insert(shipmentSignatures).values({
      shipmentId: input.shipmentId,
      requestTokenHash: input.tokenHash,
      requestTokenExpiresAt: input.expiresAt,
      status: "pending",
    });
  }
  return getShipmentSignatureByShipmentId(input.shipmentId);
}

export async function completeShipmentSignature(input: {
  shipmentId: number;
  tokenHash: string;
  signerName: string;
  signerDni?: string | null;
  signerEmail?: string | null;
  signerPhone?: string | null;
  consentTextVersion: string;
  consentAcceptedAt: Date;
  signatureStrokes: string;
  signedAt?: Date;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const now = input.signedAt ?? new Date();
  const rows = await db.select().from(shipmentSignatures).where(and(
    eq(shipmentSignatures.shipmentId, input.shipmentId),
    eq(shipmentSignatures.requestTokenHash, input.tokenHash),
    eq(shipmentSignatures.status, "pending"),
    gt(shipmentSignatures.requestTokenExpiresAt, now),
  )).limit(1);
  const record = rows[0];
  if (!record) return undefined;

  const evidenceHash = createHash("sha256").update(JSON.stringify({ shipmentId: input.shipmentId, signerName: input.signerName, signerDni: input.signerDni || null, signerEmail: input.signerEmail || null, signerPhone: input.signerPhone || null, consentTextVersion: input.consentTextVersion, consentAcceptedAt: input.consentAcceptedAt.toISOString(), signatureStrokes: input.signatureStrokes })).digest("hex");
  await db.update(shipmentSignatures).set({
    status: "signed",
    signerName: input.signerName,
    signerDni: input.signerDni || null,
    signerEmail: input.signerEmail || null,
    signerPhone: input.signerPhone || null,
    consentTextVersion: input.consentTextVersion,
    consentAcceptedAt: input.consentAcceptedAt,
    evidenceHash,
    signatureStrokes: input.signatureStrokes,
    signedAt: now,
    updatedAt: new Date(),
  }).where(and(
    eq(shipmentSignatures.id, record.id),
    eq(shipmentSignatures.status, "pending"),
  ));
  const saved = await getShipmentSignatureByShipmentId(input.shipmentId);
  await recordShipmentAudit({ shipmentId: input.shipmentId, action: "signature_completed", actor: { actorType: "public", actorLabel: input.signerName }, metadata: { consentTextVersion: input.consentTextVersion, evidenceHash }, snapshot: saved });
  return saved;
}

export async function getAdminById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [admin] = await db.select().from(admins).where(eq(admins.id, id)).limit(1);
  return admin;
}

export async function getAdminByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get admin: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(admins)
    .where(eq(admins.email, email))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function registerAdminPasswordFailure(adminId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [admin] = await db.select().from(admins).where(eq(admins.id, adminId)).limit(1);
  if (!admin) return undefined;
  const next = getFailureUpdate(admin.failedPasswordAttempts, admin.passwordLockedUntil);
  await db.update(admins).set({ failedPasswordAttempts: next.attempts, passwordLockedUntil: next.lockedUntil }).where(eq(admins.id, adminId));
  return next;
}

export async function clearAdminPasswordFailures(adminId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(admins).set({ failedPasswordAttempts: 0, passwordLockedUntil: null }).where(eq(admins.id, adminId));
}

export async function getClientById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return result[0];
}

export async function searchClients(query: string, limit = 8, ownerAdminId?: number | null) {
  const db = await getDb();
  const normalizedQuery = query.trim();
  if (!db || normalizedQuery.length < 2) return [];
  const candidates = ownerAdminId === undefined
    ? await db.select().from(clients).limit(500)
    : await db.select().from(clients).where(ownerAdminId === null ? isNull(clients.ownerAdminId) : eq(clients.ownerAdminId, ownerAdminId)).limit(500);
  return rankFuzzyMatches(candidates, normalizedQuery, client => `${client.dni || ""} ${client.name} ${client.lastName}`)
    .slice(0, Math.min(Math.max(limit, 1), 20));
}

export async function upsertClient(record: ClientDirectoryRecord) {
  const db = await getDb();
  const name = record.name;
  const lastName = record.lastName;
  if (!db || !name || !lastName) return undefined;

  const dni = record.dni;
  const phone = record.phone;
  const email = record.email;
  const ownerCondition = record.ownerAdminId === null ? isNull(clients.ownerAdminId) : eq(clients.ownerAdminId, record.ownerAdminId);
  const existing = dni
    ? await db.select().from(clients).where(and(eq(clients.dni, dni), ownerCondition)).limit(1)
    : await db.select().from(clients).where(and(
        ownerCondition,
        eq(clients.name, name),
        eq(clients.lastName, lastName),
        phone ? eq(clients.phone, phone) : isNull(clients.phone),
      )).limit(1);

  if (existing[0]) {
    await db.update(clients).set({ name, lastName, dni, documentType: record.documentType || "dni_peru", phone, email, updatedAt: new Date() }).where(eq(clients.id, existing[0].id));
    return getClientById(existing[0].id);
  }

  const inserted = await db.insert(clients).values({ ownerAdminId: record.ownerAdminId, name, lastName, dni, documentType: record.documentType || "dni_peru", phone, email });
  const insertedId = Number((inserted as { insertId?: number }).insertId);
  return insertedId ? getClientById(insertedId) : undefined;
}

export async function listShipmentSenders(ownerAdminId: number | null) {
  const db = await getDb();
  if (!db) return [];
  const ownerCondition = ownerAdminId === null ? isNull(clients.ownerAdminId) : eq(clients.ownerAdminId, ownerAdminId);
  return db.select().from(clients).where(and(ownerCondition, eq(clients.isSender, 1))).orderBy(desc(clients.isActive), desc(clients.updatedAt));
}

export async function createShipmentSender(input: { ownerAdminId: number | null; name: string; lastName: string; dni: string; phone?: string | null }) {
  const db = await getDb();
  if (!db || !input.name.trim() || !input.lastName.trim() || !input.dni.trim()) return undefined;
  const inserted = await db.insert(clients).values({ ownerAdminId: input.ownerAdminId, name: input.name.trim().toUpperCase(), lastName: input.lastName.trim().toUpperCase(), dni: input.dni.trim(), documentType: "dni_peru", phone: input.phone?.trim() || null, isSender: 1, isActive: 1 });
  const id = Number((inserted as { insertId?: number }).insertId);
  return id ? getClientById(id) : undefined;
}

export async function setShipmentSenderActive(id: number, ownerAdminId: number | null, isActive: boolean) {
  const db = await getDb();
  if (!db) return false;
  const ownerCondition = ownerAdminId === null ? isNull(clients.ownerAdminId) : eq(clients.ownerAdminId, ownerAdminId);
  const result = await db.update(clients).set({ isActive: isActive ? 1 : 0, updatedAt: new Date() }).where(and(eq(clients.id, id), ownerCondition, eq(clients.isSender, 1)));
  return Number((result as { affectedRows?: number }).affectedRows || 0) > 0;
}

export async function persistShipmentClients(input: ShipmentClientDirectoryInput) {
  const records = buildShipmentClientDirectoryRecords(input);
  const [sender, recipient] = await Promise.all([
    records[0] ? upsertClient(records[0]) : Promise.resolve(undefined),
    records[1] ? upsertClient(records[1]) : Promise.resolve(undefined),
  ]);
  return { sender, recipient };
}

export async function getLocalAccountByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(localAccounts).where(eq(localAccounts.email, email)).limit(1);
  return result[0];
}

export async function getLocalAccountById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(localAccounts).where(eq(localAccounts.id, id)).limit(1);
  return result[0];
}

export async function registerLocalAccountPasswordFailure(accountId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [account] = await db.select().from(localAccounts).where(eq(localAccounts.id, accountId)).limit(1);
  if (!account) return undefined;
  const next = getFailureUpdate(account.failedPasswordAttempts, account.passwordLockedUntil);
  await db.update(localAccounts).set({ failedPasswordAttempts: next.attempts, passwordLockedUntil: next.lockedUntil, updatedAt: new Date() }).where(eq(localAccounts.id, accountId));
  return next;
}

export async function clearLocalAccountPasswordFailures(accountId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(localAccounts).set({ failedPasswordAttempts: 0, passwordLockedUntil: null, updatedAt: new Date() }).where(eq(localAccounts.id, accountId));
}

export async function createLocalAccount(email: string, phone: string | null, passwordHash: string, name?: string, lastName?: string, dni?: string, documentType: "dni_peru" | "pasaporte" | "carta_identita_italia" = "dni_peru", mustChangePassword = false) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(localAccounts).values({ email, phone, passwordHash, name, lastName, dni, documentType, mustChangePassword: mustChangePassword ? 1 : 0 });
  return getLocalAccountByEmail(email);
}

export async function createInvitationLetterAccount(input: {
  email: string;
  phone: string | null;
  passwordHash: string;
  name: string;
  lastName: string;
  documentNumber: string;
}) {
  const existing = await getLocalAccountByEmail(input.email);
  if (existing) return { account: existing, created: false };
  const account = await createLocalAccount(input.email, input.phone, input.passwordHash, input.name, input.lastName, input.documentNumber, "pasaporte", true);
  return account ? { account, created: true } : undefined;
}

export async function updateLocalAccountProfile(id: number, name: string, lastName: string, dni: string, phone: string, documentType: "dni_peru" | "pasaporte" | "carta_identita_italia" = "dni_peru", biography = "") {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(localAccounts).set({ name, lastName, dni, phone, documentType, biography, updatedAt: new Date() }).where(eq(localAccounts.id, id));
  return getLocalAccountById(id);
}

export async function updateLocalAccountProfilePhotos(id: number, photos: string) {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(localAccounts).set({ profilePhotoMetadata: photos, updatedAt: new Date() }).where(eq(localAccounts.id, id));
  return getLocalAccountById(id);
}

export async function getShipmentsByAccountId(accountId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(shipments).where(and(eq(shipments.accountId, accountId), isNull(shipments.deletedAt))).orderBy(desc(shipments.createdAt));
}

export async function createInvitationLetterRecord(input: {
  createdByAdminId: number;
  createdByAdminLabel: string;
  inviterName: string;
  inviterLastName: string;
  inviteeName: string;
  inviteeLastName: string;
  clientAccountId?: number | null;
  letterData: unknown;
  italianData: unknown;
  basePriceEur?: number;
  manualPriceEur?: number | null;
  extraItems?: Array<{ description: string; amountEur: number }>;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const createdAt = new Date();
  const letterData = JSON.stringify(input.letterData);
  const italianData = JSON.stringify(input.italianData);
  const basePriceEur = Number.isFinite(input.basePriceEur) ? Number(input.basePriceEur) : 15;
  const manualPriceEur = Number.isFinite(input.manualPriceEur) ? Number(input.manualPriceEur) : null;
  const extraItems = (input.extraItems || []).filter(item => item.description.trim() || item.amountEur > 0).map(item => ({ description: item.description.trim().slice(0, 255), amountEur: Number(item.amountEur.toFixed(2)) }));
  const extraPriceEur = extraItems.reduce((total, item) => total + item.amountEur, 0);
  const result = await db.insert(invitationLetters).values({
    createdByAdminId: input.createdByAdminId,
    createdByAdminLabel: input.createdByAdminLabel,
    inviterName: input.inviterName,
    inviterLastName: input.inviterLastName,
    inviteeName: input.inviteeName,
    inviteeLastName: input.inviteeLastName,
    clientAccountId: input.clientAccountId ?? null,
    letterData,
    italianData,
    basePriceEur: basePriceEur.toFixed(2),
    manualPriceEur: manualPriceEur === null ? null : manualPriceEur.toFixed(2),
    extraPriceEur: extraPriceEur.toFixed(2),
    extraItems: JSON.stringify(extraItems),
    createdAt,
  });
  const insertHeader = Array.isArray(result) ? result[0] : result;
  const insertedId = Number((insertHeader as { insertId?: unknown } | undefined)?.insertId);
  if (Number.isInteger(insertedId) && insertedId > 0) {
    const stored = await getInvitationLetterById(insertedId);
    if (stored) return stored;
  }

  // Algunos adaptadores MySQL/TiDB entregan el encabezado de inserción en otra forma.
  // La fila ya puede existir aunque `insertId` no esté disponible; se recupera con el
  // contenido exacto recién insertado para evitar reportar falsamente un fallo al usuario.
  const [stored] = await db.select().from(invitationLetters).where(and(
    eq(invitationLetters.createdByAdminId, input.createdByAdminId),
    eq(invitationLetters.inviterName, input.inviterName),
    eq(invitationLetters.inviterLastName, input.inviterLastName),
    eq(invitationLetters.inviteeName, input.inviteeName),
    eq(invitationLetters.inviteeLastName, input.inviteeLastName),
    eq(invitationLetters.letterData, letterData),
    eq(invitationLetters.italianData, italianData),
  )).orderBy(desc(invitationLetters.id)).limit(1);
  return stored;
}

export async function getInvitationLetterById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(invitationLetters).where(eq(invitationLetters.id, id)).limit(1);
  return rows[0];
}

export async function getInvitationLetterSignatureByLetterId(invitationLetterId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(invitationLetterSignatures).where(eq(invitationLetterSignatures.invitationLetterId, invitationLetterId)).limit(1);
  return rows[0];
}

export async function createOrRefreshInvitationLetterSignatureRequest(input: {
  invitationLetterId: number;
  accountId?: number | null;
  tokenHash: string;
  expiresAt: Date;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const existing = await getInvitationLetterSignatureByLetterId(input.invitationLetterId);
  if (existing?.status === "signed") return existing;
  if (existing) {
    await db.update(invitationLetterSignatures).set({
      accountId: input.accountId ?? existing.accountId,
      requestTokenHash: input.tokenHash,
      requestTokenExpiresAt: input.expiresAt,
      status: "pending",
      signerName: null,
      signerEmail: null,
      consentTextVersion: null,
      consentAcceptedAt: null,
      evidenceHash: null,
      signatureStrokes: null,
      requestedAt: new Date(),
      signedAt: null,
      updatedAt: new Date(),
    }).where(eq(invitationLetterSignatures.id, existing.id));
  } else {
    await db.insert(invitationLetterSignatures).values({
      invitationLetterId: input.invitationLetterId,
      accountId: input.accountId ?? null,
      requestTokenHash: input.tokenHash,
      requestTokenExpiresAt: input.expiresAt,
      status: "pending",
    });
  }
  return getInvitationLetterSignatureByLetterId(input.invitationLetterId);
}

export async function completeInvitationLetterSignature(input: {
  invitationLetterId: number;
  tokenHash: string;
  signerName: string;
  signerEmail: string;
  consentTextVersion: string;
  consentAcceptedAt: Date;
  signatureStrokes: string;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const now = new Date();
  const rows = await db.select().from(invitationLetterSignatures).where(and(
    eq(invitationLetterSignatures.invitationLetterId, input.invitationLetterId),
    eq(invitationLetterSignatures.requestTokenHash, input.tokenHash),
    eq(invitationLetterSignatures.status, "pending"),
    gt(invitationLetterSignatures.requestTokenExpiresAt, now),
  )).limit(1);
  const record = rows[0];
  if (!record) return undefined;
  const evidenceHash = createHash("sha256").update(JSON.stringify({ invitationLetterId: input.invitationLetterId, signerName: input.signerName, signerEmail: input.signerEmail, consentTextVersion: input.consentTextVersion, consentAcceptedAt: input.consentAcceptedAt.toISOString(), signatureStrokes: input.signatureStrokes })).digest("hex");
  await db.update(invitationLetterSignatures).set({
    status: "signed",
    signerName: input.signerName,
    signerEmail: input.signerEmail,
    consentTextVersion: input.consentTextVersion,
    consentAcceptedAt: input.consentAcceptedAt,
    evidenceHash,
    signatureStrokes: input.signatureStrokes,
    signedAt: now,
    updatedAt: now,
  }).where(and(eq(invitationLetterSignatures.id, record.id), eq(invitationLetterSignatures.status, "pending")));
  return getInvitationLetterSignatureByLetterId(input.invitationLetterId);
}

export async function listInvitationLetterRecords(actor: { adminId: number; canReviewAll: boolean }) {
  const db = await getDb();
  if (!db) return [];
  const condition = actor.canReviewAll ? isNull(invitationLetters.deletedAt) : and(eq(invitationLetters.createdByAdminId, actor.adminId), isNull(invitationLetters.deletedAt));
  const rows = condition
    ? db.select().from(invitationLetters).where(condition).orderBy(desc(invitationLetters.createdAt))
    : db.select().from(invitationLetters).orderBy(desc(invitationLetters.createdAt));
  const letters = await rows;
  const signatures = await Promise.all(letters.map(letter => getInvitationLetterSignatureByLetterId(letter.id)));
  return letters.map((letter, index) => ({
    ...letter,
    signature: signatures[index] ? {
      status: signatures[index]!.status,
      signerName: signatures[index]!.signerName,
      signedAt: signatures[index]!.signedAt,
      signatureStrokes: signatures[index]!.signatureStrokes,
    } : null,
  }));
}

export async function listDeletedInvitationLetterRecords(actor: { adminId: number; canReviewAll: boolean }) {
  const db = await getDb();
  if (!db) return [];
  const condition = actor.canReviewAll ? isNotNull(invitationLetters.deletedAt) : and(eq(invitationLetters.createdByAdminId, actor.adminId), isNotNull(invitationLetters.deletedAt));
  return db.select().from(invitationLetters).where(condition).orderBy(desc(invitationLetters.deletedAt));
}

export async function moveInvitationLetterToTrash(id: number, actor: { adminId: number; label: string; canReviewAll: boolean }, reason?: string) {
  const db = await getDb();
  if (!db) return false;
  const condition = actor.canReviewAll ? and(eq(invitationLetters.id, id), isNull(invitationLetters.deletedAt)) : and(eq(invitationLetters.id, id), eq(invitationLetters.createdByAdminId, actor.adminId), isNull(invitationLetters.deletedAt));
  const record = await db.select({ id: invitationLetters.id }).from(invitationLetters).where(condition).limit(1);
  if (!record[0]) return false;
  await db.update(invitationLetters).set({ deletedAt: new Date(), deletedByAdminId: actor.adminId, deletedByAdminLabel: actor.label, deleteReason: reason?.trim() || null }).where(eq(invitationLetters.id, id));
  return true;
}

export async function restoreInvitationLetterFromTrash(id: number, actor: { adminId: number; canReviewAll: boolean }) {
  const db = await getDb();
  if (!db) return false;
  const condition = actor.canReviewAll ? and(eq(invitationLetters.id, id), isNotNull(invitationLetters.deletedAt)) : and(eq(invitationLetters.id, id), eq(invitationLetters.createdByAdminId, actor.adminId), isNotNull(invitationLetters.deletedAt));
  const record = await db.select({ id: invitationLetters.id }).from(invitationLetters).where(condition).limit(1);
  if (!record[0]) return false;
  await db.update(invitationLetters).set({ deletedAt: null, deletedByAdminId: null, deletedByAdminLabel: null, deleteReason: null }).where(eq(invitationLetters.id, id));
  return true;
}

const invitationSeedFromDirectory = (client: typeof clients.$inferSelect): InvitationPersonSeed => ({
  source: "directorio",
  firstName: client.name || "", lastName: client.lastName || "",
  identityCard: client.documentType === "pasaporte" ? "" : client.dni || "",
  passport: client.documentType === "pasaporte" ? client.dni || "" : "",
  residencePermit: "", address: "", occupation: "", phone: client.phone || "", email: client.email || "", birthDate: "", birthPlace: "", nationality: "",
});

const invitationSeedFromShipment = (shipment: typeof shipments.$inferSelect, role: "sender" | "recipient"): InvitationPersonSeed => {
  const isSender = role === "sender";
  const documentType = isSender ? shipment.senderDocumentType : shipment.recipientDocumentType;
  const document = isSender ? shipment.senderDni : shipment.recipientDni;
  return {
    source: "envio",
    firstName: isSender ? shipment.senderName || "" : shipment.recipientName || "",
    lastName: isSender ? shipment.senderLastName || "" : shipment.recipientLastName || "",
    identityCard: documentType === "pasaporte" ? "" : document || "",
    passport: documentType === "pasaporte" ? document || "" : "",
    residencePermit: "", address: "", occupation: "", phone: isSender ? shipment.senderPhone || "" : shipment.recipientPhone || "", email: "", birthDate: "", birthPlace: "", nationality: "",
  };
};

export async function searchInvitationLetterPeople(input: { query: string; adminId: number; canReviewAll: boolean; excludeHiddenShipments: boolean }) {
  const normalizedQuery = input.query.trim();
  if (normalizedQuery.length < 2) return [];
  const db = await getDb();
  if (!db) return [];
  const [directoryRows, shipmentRows, letterRows] = await Promise.all([
    db.select().from(clients).limit(600),
    getAllShipments(undefined, { excludeHiddenForRegistradores: input.excludeHiddenShipments }),
    listInvitationLetterRecords({ adminId: input.adminId, canReviewAll: input.canReviewAll }),
  ]);
  const letterSeeds: InvitationPersonSeed[] = letterRows.flatMap(letter => {
    try {
      const data = JSON.parse(letter.letterData) as { inviter?: Record<string, string>; invitee?: Record<string, string> };
      const makeSeed = (person: Record<string, string> | undefined): InvitationPersonSeed | null => person ? {
        source: "carta", firstName: person.firstName || "", lastName: person.lastName || "", identityCard: person.identityCard || "", passport: person.passport || "", residencePermit: person.residencePermit || "", address: person.address || "", occupation: person.occupation || "", phone: person.phone || "", email: person.email || "", birthDate: person.birthDate || "", birthPlace: person.birthPlace || "", nationality: person.nationality || "",
      } : null;
      return [makeSeed(data.inviter), makeSeed(data.invitee)].filter((seed): seed is InvitationPersonSeed => Boolean(seed));
    } catch { return []; }
  });
  return searchInvitationPeople([
    ...letterSeeds,
    ...directoryRows.map(invitationSeedFromDirectory),
    ...shipmentRows.flatMap(shipment => [invitationSeedFromShipment(shipment, "sender"), invitationSeedFromShipment(shipment, "recipient")]),
  ], normalizedQuery, 8);
}

export type ShipmentAuditActor = {
  actorType: "admin" | "account" | "public" | "system";
  actorId?: number | null;
  actorLabel?: string | null;
};

export type ShipmentRegistrationActor = {
  type: "admin" | "account" | "system";
  id?: number | null;
  label: string;
  email?: string | null;
};

export async function recordShipmentAudit(input: {
  shipmentId: number;
  action: "created" | "updated" | "deleted" | "restored" | "price_updated" | "signature_requested" | "signature_completed" | "hidden_from_registradores" | "shown_to_registradores" | "feedback_added";
  actor: ShipmentAuditActor;
  reason?: string | null;
  snapshot?: unknown;
  metadata?: unknown;
}) {
  const db = await getDb();
  if (!db) return false;
  await db.insert(shipmentAuditLogs).values({
    shipmentId: input.shipmentId,
    action: input.action,
    actorType: input.actor.actorType,
    actorId: input.actor.actorId ?? null,
    actorLabel: input.actor.actorLabel ?? null,
    reason: input.reason ?? null,
    snapshot: input.snapshot === undefined ? null : JSON.stringify(input.snapshot),
    metadata: input.metadata === undefined ? null : JSON.stringify(input.metadata),
  });
  return true;
}

export async function createDeliveryReceipt(input: {
  operationType: "documento" | "encomienda" | "transferencia";
  operationId: number;
  operationReference: string;
  brand: "servicom" | "kasega";
  legalEntity: string;
  recipientName: string;
  recipientLastName: string;
  recipientDni: string;
  deliveredAt?: Date | null;
  createdByAdminId?: number | null;
  signerName?: string | null;
  signerDni?: string | null;
  signatureStrokes?: string | null;
  consentTextVersion?: string | null;
  evidenceHash?: string | null;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const existing = await db.select().from(deliveryReceipts).where(and(eq(deliveryReceipts.operationType, input.operationType), eq(deliveryReceipts.operationId, input.operationId))).orderBy(desc(deliveryReceipts.createdAt)).limit(1);
  if (existing[0]) return existing[0];
  const result = await db.insert(deliveryReceipts).values({ ...input, status: input.signatureStrokes ? "signed" : "pending", deliveredAt: input.deliveredAt ?? new Date(), createdByAdminId: input.createdByAdminId ?? null, consentAcceptedAt: input.signatureStrokes ? new Date() : null });
  const inserted = await db.select().from(deliveryReceipts).where(eq(deliveryReceipts.id, Number(result[0].insertId))).limit(1);
  return inserted[0];
}

export async function getDeliveryReceipt(operationType: "documento" | "encomienda" | "transferencia", operationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(deliveryReceipts).where(and(eq(deliveryReceipts.operationType, operationType), eq(deliveryReceipts.operationId, operationId))).orderBy(desc(deliveryReceipts.createdAt)).limit(1);
  return rows[0];
}

export async function signDeliveryReceipt(input: { id: number; signerName: string; signerDni: string; signatureStrokes: string; consentTextVersion: string; evidenceHash: string; }) {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(deliveryReceipts).set({ status: "signed", signerName: input.signerName, signerDni: input.signerDni, signatureStrokes: input.signatureStrokes, consentTextVersion: input.consentTextVersion, consentAcceptedAt: new Date(), evidenceHash: input.evidenceHash }).where(and(eq(deliveryReceipts.id, input.id), eq(deliveryReceipts.status, "pending")));
  const rows = await db.select().from(deliveryReceipts).where(eq(deliveryReceipts.id, input.id)).limit(1);
  return rows[0];
}

export async function getShipmentAuditLogs(shipmentId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(shipmentAuditLogs).where(eq(shipmentAuditLogs.shipmentId, shipmentId)).orderBy(desc(shipmentAuditLogs.createdAt));
}

export async function listShipmentFeedback(shipmentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(shipmentFeedback).where(eq(shipmentFeedback.shipmentId, shipmentId)).orderBy(desc(shipmentFeedback.createdAt));
}

export async function createShipmentFeedback(input: {
  shipmentId: number;
  authorType: "admin" | "account";
  authorId: number;
  authorLabel: string;
  message: string;
  attachment?: { key: string; url: string; name: string; mimeType: string; sizeBytes: number } | null;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(shipmentFeedback).values({
    shipmentId: input.shipmentId,
    authorType: input.authorType,
    authorId: input.authorId,
    authorLabel: input.authorLabel,
    message: input.message,
    attachmentKey: input.attachment?.key ?? null,
    attachmentUrl: input.attachment?.url ?? null,
    attachmentName: input.attachment?.name ?? null,
    attachmentMimeType: input.attachment?.mimeType ?? null,
    attachmentSizeBytes: input.attachment?.sizeBytes ?? null,
  });
  await recordShipmentAudit({
    shipmentId: input.shipmentId,
    action: "feedback_added",
    actor: { actorType: input.authorType, actorId: input.authorId, actorLabel: input.authorLabel },
    metadata: { hasAttachment: Boolean(input.attachment), attachmentMimeType: input.attachment?.mimeType ?? null },
  });
  return result;
}

export type FeedbackWorkspaceContext = {
  key: string;
  label: string;
};

export const SERVICOM_WORKSPACE: FeedbackWorkspaceContext = { key: "servicom", label: "Servicom Internacional" };

export function getAdminWorkspaceContext(adminId: number, isWorkspaceIsolated: boolean, adminEmail?: string | null): FeedbackWorkspaceContext {
  if (!isWorkspaceIsolated) return SERVICOM_WORKSPACE;
  const normalizedEmail = (adminEmail || "").trim().toLowerCase();
  const label = normalizedEmail === "kasegatour@gmail.com" || normalizedEmail === "magda.barreto.alv@gmail.com"
    ? "KASEGA TOUR EIRL"
    : `Entorno administrativo ${adminId}`;
  return { key: `admin:${adminId}`, label };
}

export async function getAccountFeedbackWorkspace(accountId: number): Promise<FeedbackWorkspaceContext> {
  const db = await getDb();
  if (!db) return SERVICOM_WORKSPACE;
  const [shipment] = await db.select({ registeredByType: shipments.registeredByType, registeredById: shipments.registeredById })
    .from(shipments)
    .where(and(eq(shipments.accountId, accountId), isNull(shipments.deletedAt)))
    .orderBy(desc(shipments.createdAt))
    .limit(1);
  if (shipment?.registeredByType === "admin" && shipment.registeredById && ISOLATED_WORKSPACE_ADMIN_IDS.includes(shipment.registeredById as (typeof ISOLATED_WORKSPACE_ADMIN_IDS)[number])) {
    return getAdminWorkspaceContext(shipment.registeredById, true);
  }
  return SERVICOM_WORKSPACE;
}

export async function listPlatformFeedback(actor: { type: "admin" | "account"; id: number; canReviewAll: boolean; workspaceKey: string }, filters?: { authorType?: "admin" | "account"; authorId?: number; search?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(platformFeedback.workspaceKey, actor.workspaceKey)];
  if (!actor.canReviewAll) {
    conditions.push(eq(platformFeedback.authorType, actor.type), eq(platformFeedback.authorId, actor.id));
  } else {
    if (filters?.authorType) conditions.push(eq(platformFeedback.authorType, filters.authorType));
    if (filters?.authorId) conditions.push(eq(platformFeedback.authorId, filters.authorId));
    if (filters?.search?.trim()) {
      const query = `%${filters.search.trim().slice(0, 120)}%`;
      const searchCondition = or(like(platformFeedback.authorLabel, query), sql`${platformFeedback.authorEmail} like ${query}`, like(platformFeedback.message, query), like(platformFeedback.workspaceLabel, query));
      if (searchCondition) conditions.push(searchCondition);
    }
  }
  return db.select().from(platformFeedback).where(and(...conditions)).orderBy(desc(platformFeedback.createdAt)).limit(Math.max(1, Math.min(filters?.limit ?? 200, 500)));
}

export async function listShipmentFeedbackForAdmin(input: { workspaceKey: string; workspaceAdminId?: number | null; filters?: { authorType?: "admin" | "account"; authorId?: number; search?: string; limit?: number } }) {
  const db = await getDb();
  if (!db) return [];
  const workspaceCondition = input.workspaceKey === "servicom"
    ? or(ne(shipments.registeredByType, "admin"), isNull(shipments.registeredById), notInArray(shipments.registeredById, [...ISOLATED_WORKSPACE_ADMIN_IDS]))
    : and(eq(shipments.registeredByType, "admin"), eq(shipments.registeredById, input.workspaceAdminId ?? -1));
  if (!workspaceCondition) return [];
  const conditions = [workspaceCondition];
  if (input.filters?.authorType) conditions.push(eq(shipmentFeedback.authorType, input.filters.authorType));
  if (input.filters?.authorId) conditions.push(eq(shipmentFeedback.authorId, input.filters.authorId));
  if (input.filters?.search?.trim()) {
    const query = `%${input.filters.search.trim().slice(0, 120)}%`;
    const searchCondition = or(like(shipmentFeedback.authorLabel, query), like(shipmentFeedback.message, query), like(shipments.orderNumber, query), like(shipments.code, query));
    if (searchCondition) conditions.push(searchCondition);
  }
  const rows = await db.select({
    id: shipmentFeedback.id,
    authorType: shipmentFeedback.authorType,
    authorId: shipmentFeedback.authorId,
    authorLabel: shipmentFeedback.authorLabel,
    message: shipmentFeedback.message,
    attachmentUrl: shipmentFeedback.attachmentUrl,
    attachmentName: shipmentFeedback.attachmentName,
    attachmentMimeType: shipmentFeedback.attachmentMimeType,
    createdAt: shipmentFeedback.createdAt,
    shipmentId: shipments.id,
    orderNumber: shipments.orderNumber,
    code: shipments.code,
    shipmentType: shipments.shipmentType,
    registeredByType: shipments.registeredByType,
    registeredById: shipments.registeredById,
  }).from(shipmentFeedback).innerJoin(shipments, eq(shipmentFeedback.shipmentId, shipments.id)).where(and(...conditions)).orderBy(desc(shipmentFeedback.createdAt)).limit(Math.max(1, Math.min(input.filters?.limit ?? 200, 500)));
  return rows.map(row => ({
    ...row,
    source: "shipment" as const,
    authorEmail: null,
    authorRole: row.authorType === "admin" ? "admin" : "client",
    workspaceKey: input.workspaceKey,
    workspaceLabel: input.workspaceKey === "servicom" ? SERVICOM_WORKSPACE.label : "KASEGA TOUR EIRL",
    attachmentKey: null,
    attachmentSizeBytes: null,
  }));
}

export async function createPlatformFeedback(input: {
  authorType: "admin" | "account";
  authorId: number;
  authorLabel: string;
  authorEmail?: string | null;
  authorRole: string;
  workspaceKey: string;
  workspaceLabel: string;
  message: string;
  attachment?: { key: string; url: string; name: string; mimeType: string; sizeBytes: number } | null;
}) {
  const db = await getDb();
  if (!db) return undefined;
  return db.insert(platformFeedback).values({
    authorType: input.authorType,
    authorId: input.authorId,
    authorLabel: input.authorLabel,
    authorEmail: input.authorEmail ?? null,
    authorRole: input.authorRole,
    workspaceKey: input.workspaceKey,
    workspaceLabel: input.workspaceLabel,
    message: input.message,
    attachmentKey: input.attachment?.key ?? null,
    attachmentUrl: input.attachment?.url ?? null,
    attachmentName: input.attachment?.name ?? null,
    attachmentMimeType: input.attachment?.mimeType ?? null,
    attachmentSizeBytes: input.attachment?.sizeBytes ?? null,
  });
}

export type ShipmentAuditActorRecord = {
  actorType: "admin" | "account" | "public" | "system";
  actorId?: number | null;
  actorLabel?: string | null;
};

/** Resuelve identidades legibles en servidor; la información solo debe exponerse mediante procedimientos autorizados. */
export async function attachShipmentAuditActorLabels<T extends ShipmentAuditActorRecord>(records: T[]): Promise<Array<T & { actorDisplayName: string }>> {
  const db = await getDb();
  if (!db || records.length === 0) {
    return records.map(record => ({ ...record, actorDisplayName: record.actorLabel || record.actorType }));
  }

  const adminIds = Array.from(new Set(records.filter(record => record.actorType === "admin" && record.actorId).map(record => record.actorId!)));
  const accountIds = Array.from(new Set(records.filter(record => record.actorType === "account" && record.actorId).map(record => record.actorId!)));
  const [adminRows, accountRows] = await Promise.all([
    adminIds.length ? db.select({ id: admins.id, name: admins.name, email: admins.email, role: admins.role }).from(admins).where(inArray(admins.id, adminIds)) : Promise.resolve([]),
    accountIds.length ? db.select({ id: localAccounts.id, name: localAccounts.name, lastName: localAccounts.lastName, email: localAccounts.email }).from(localAccounts).where(inArray(localAccounts.id, accountIds)) : Promise.resolve([]),
  ]);
  const adminLabels = new Map(adminRows.map(admin => [admin.id, `${admin.name} (${admin.email})`])) ;
  const accountLabels = new Map(accountRows.map(account => [account.id, `${[account.name, account.lastName].filter(Boolean).join(" ") || "Cliente"} (${account.email})`]));

  return records.map(record => {
    const actorDisplayName = record.actorType === "admin"
      ? adminLabels.get(record.actorId ?? -1) || record.actorLabel || "Administrador no disponible"
      : record.actorType === "account"
        ? accountLabels.get(record.actorId ?? -1) || record.actorLabel || "Cliente no disponible"
        : record.actorLabel || (record.actorType === "public" ? "Firmante remoto" : "Sistema");
    return { ...record, actorDisplayName };
  });
}

export async function recordInteractionEvent(input: {
  actorType: "anonymous" | "account" | "admin" | "system";
  actorId?: number | null;
  sessionKeyHash?: string | null;
  eventName: string;
  surface: string;
  metadata?: Record<string, string | number | boolean | null>;
}) {
  const db = await getDb();
  if (!db) return false;
  await db.insert(interactionEvents).values({
    actorType: input.actorType,
    actorId: input.actorId ?? null,
    sessionKeyHash: input.sessionKeyHash ?? null,
    eventName: input.eventName,
    surface: input.surface,
    metadata: input.metadata ? JSON.stringify(input.metadata) : null,
  });
  return true;
}

export async function listInteractionEvents(since: Date) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(interactionEvents).where(gte(interactionEvents.createdAt, since)).orderBy(desc(interactionEvents.createdAt));
}

export async function updateLocalAccountPassword(id: number, passwordHash: string, channel: "email" | "sms") {
  const db = await getDb();
  if (!db) return undefined;
  const updateSet = channel === "email"
    ? { passwordHash, emailVerifiedAt: new Date(), mustChangePassword: 0, updatedAt: new Date() }
    : { passwordHash, phoneVerifiedAt: new Date(), mustChangePassword: 0, updatedAt: new Date() };
  return db.update(localAccounts).set(updateSet).where(eq(localAccounts.id, id));
}

export async function createVerificationCode(
  accountId: number,
  channel: "email" | "sms",
  destination: string,
  codeHash: string,
  expiresAt: Date,
) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(verificationCodes).values({ accountId, channel, destination, codeHash, expiresAt });
  const result = await db
    .select()
    .from(verificationCodes)
    .where(and(eq(verificationCodes.accountId, accountId), eq(verificationCodes.channel, channel)))
    .orderBy(desc(verificationCodes.createdAt))
    .limit(1);
  return result[0];
}

export async function getActiveVerificationCode(accountId: number, channel: "email" | "sms") {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(verificationCodes)
    .where(and(
      eq(verificationCodes.accountId, accountId),
      eq(verificationCodes.channel, channel),
      isNull(verificationCodes.consumedAt),
    ))
    .orderBy(desc(verificationCodes.createdAt))
    .limit(1);
  return result[0];
}

export async function consumeVerificationCode(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  return db.update(verificationCodes).set({ consumedAt: new Date() }).where(eq(verificationCodes.id, id));
}

export async function incrementVerificationAttempts(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const code = await db.select().from(verificationCodes).where(eq(verificationCodes.id, id)).limit(1);
  if (!code[0]) return undefined;
  return db.update(verificationCodes).set({ attempts: code[0].attempts + 1 }).where(eq(verificationCodes.id, id));
}

export async function createAdminPasswordResetCode(adminId: number, destination: string, codeHash: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(adminPasswordResetCodes).values({ adminId, destination, codeHash, expiresAt });
  const result = await db.select().from(adminPasswordResetCodes).where(eq(adminPasswordResetCodes.adminId, adminId)).orderBy(desc(adminPasswordResetCodes.createdAt)).limit(1);
  return result[0];
}

export async function getActiveAdminPasswordResetCode(adminId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(adminPasswordResetCodes).where(and(eq(adminPasswordResetCodes.adminId, adminId), isNull(adminPasswordResetCodes.consumedAt))).orderBy(desc(adminPasswordResetCodes.createdAt)).limit(1);
  return result[0];
}

export async function consumeAdminPasswordResetCode(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  return db.update(adminPasswordResetCodes).set({ consumedAt: new Date() }).where(eq(adminPasswordResetCodes.id, id));
}

export async function incrementAdminPasswordResetAttempts(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(adminPasswordResetCodes).where(eq(adminPasswordResetCodes.id, id)).limit(1);
  if (!result[0]) return undefined;
  return db.update(adminPasswordResetCodes).set({ attempts: result[0].attempts + 1 }).where(eq(adminPasswordResetCodes.id, id));
}

export async function updateAdminPassword(id: number, password: string) {
  const db = await getDb();
  if (!db) return undefined;
  return db.update(admins).set({ password, updatedAt: new Date() }).where(eq(admins.id, id));
}

export async function updateAdminProfilePhoto(id: number, metadata: string) {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(admins).set({ profilePhotoMetadata: metadata, updatedAt: new Date() }).where(eq(admins.id, id));
  const result = await db.select().from(admins).where(eq(admins.id, id)).limit(1);
  return result[0];
}

export async function updateAdminProfile(id: number, name: string) {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(admins).set({ name: name.trim(), updatedAt: new Date() }).where(eq(admins.id, id));
  const result = await db.select().from(admins).where(eq(admins.id, id)).limit(1);
  return result[0];
}

export async function createDiscountCoupon(input: {
  code: string;
  discountPercent: string | number;
  appliesTo: "ambos" | "documento" | "encomienda";
  startsAt: Date;
  endsAt: Date;
  createdByAdminId: number;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const code = normalizeOrderCode(input.code);
  const discountPercent = String(input.discountPercent);
  const result = await db.insert(discountCoupons).values({
    code,
    discountPercent,
    appliesTo: input.appliesTo,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    createdByAdminId: input.createdByAdminId,
  });
  return { ...input, code, discountPercent, result };
}

export async function updateDiscountCoupon(input: {
  id: number;
  code: string;
  discountPercent: string | number;
  appliesTo: "ambos" | "documento" | "encomienda";
  startsAt: Date;
  endsAt: Date;
  ownerAdminId?: number;
}) {
  const db = await getDb();
  if (!db) return false;
  await db.update(discountCoupons).set({
    code: normalizeOrderCode(input.code),
    discountPercent: String(input.discountPercent),
    appliesTo: input.appliesTo,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    updatedAt: new Date(),
  }).where(input.ownerAdminId === undefined
    ? eq(discountCoupons.id, input.id)
    : and(eq(discountCoupons.id, input.id), eq(discountCoupons.createdByAdminId, input.ownerAdminId)));
  return true;
}

export async function listDiscountCoupons(ownerAdminId?: number) {
  const db = await getDb();
  if (!db) return [];
  return ownerAdminId === undefined
    ? await db.select().from(discountCoupons)
    : await db.select().from(discountCoupons).where(eq(discountCoupons.createdByAdminId, ownerAdminId));
}

export async function getDiscountCouponByCode(code: string, ownerAdminId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  const normalizedCode = normalizeOrderCode(code);
  const condition = ownerAdminId === undefined
    ? eq(discountCoupons.code, normalizedCode)
    : and(eq(discountCoupons.code, normalizedCode), eq(discountCoupons.createdByAdminId, ownerAdminId));
  const rows = await db.select().from(discountCoupons).where(condition).limit(1);
  return rows[0];
}

export async function deactivateDiscountCoupon(id: number, ownerAdminId?: number) {
  const db = await getDb();
  if (!db) return false;
  const condition = ownerAdminId === undefined ? eq(discountCoupons.id, id) : and(eq(discountCoupons.id, id), eq(discountCoupons.createdByAdminId, ownerAdminId));
  await db.update(discountCoupons).set({ isActive: 0, updatedAt: new Date() }).where(condition);
  return true;
}

export async function incrementDiscountCouponRedemption(id: number) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select({ redeemedCount: discountCoupons.redeemedCount }).from(discountCoupons).where(eq(discountCoupons.id, id)).limit(1);
  const redeemedCount = Number(rows[0]?.redeemedCount || 0);
  await db.update(discountCoupons).set({ redeemedCount: redeemedCount + 1, updatedAt: new Date() }).where(eq(discountCoupons.id, id));
  return true;
}

export async function getShipmentRoutePolicy(route: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(shipmentRoutePolicies).where(eq(shipmentRoutePolicies.route, route)).limit(1);
  return rows[0];
}

export async function isEncomiendaEnabledForRoute(route: string) {
  const policy = await getShipmentRoutePolicy(route);
  return policy ? policy.encomiendasEnabled === 1 : true;
}

export async function setEncomiendaAvailabilityForRoute(route: string, encomiendasEnabled: boolean, updatedByAdminId: number) {
  const db = await getDb();
  if (!db) return false;
  await db.insert(shipmentRoutePolicies).values({
    route,
    encomiendasEnabled: encomiendasEnabled ? 1 : 0,
    updatedByAdminId,
  }).onDuplicateKeyUpdate({
    set: { encomiendasEnabled: encomiendasEnabled ? 1 : 0, updatedByAdminId, updatedAt: new Date() },
  });
  return true;
}

export async function getAllShipments(shipmentType?: "documento" | "encomienda", options?: { excludeHiddenForRegistradores?: boolean; ownerAdminId?: number; ownerAdminEmail?: string; excludeIsolatedWorkspaces?: boolean }) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get shipments: database not available");
    return [];
  }

  const conditions = [isNull(shipments.deletedAt)];
  if (shipmentType) conditions.push(eq(shipments.shipmentType, shipmentType));
  if (options?.excludeHiddenForRegistradores) conditions.push(isNull(shipments.hiddenFromRegistradoresAt));
  if (options?.ownerAdminId !== undefined) {
    const ownerConditions = [eq(shipments.registeredById, options.ownerAdminId)];
    if (options.ownerAdminEmail?.trim()) ownerConditions.push(eq(shipments.registeredByEmail, options.ownerAdminEmail.trim().toLowerCase()));
    conditions.push(eq(shipments.registeredByType, "admin"));
    conditions.push(or(...ownerConditions)!);
  } else if (options?.excludeIsolatedWorkspaces) {
    const isolatedWorkspaceFilter = or(ne(shipments.registeredByType, "admin"), isNull(shipments.registeredById), notInArray(shipments.registeredById, [...ISOLATED_WORKSPACE_ADMIN_IDS]));
    if (isolatedWorkspaceFilter) conditions.push(isolatedWorkspaceFilter);
  }
  return await db.select().from(shipments).where(and(...conditions));
}

export type OperatingExpenseInput = {
  workspaceKey: string;
  workspaceLabel: string;
  shipmentId?: number | null;
  category: "transporte" | "agencia_provincial" | "embalaje" | "operativo" | "otro";
  amount: number;
  currency: "EUR" | "PEN";
  description: string;
  expenseDate: Date;
  createdByAdminId: number;
  createdByLabel: string;
};

export async function createOperatingExpense(input: OperatingExpenseInput) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(operatingExpenses).values({
    workspaceKey: input.workspaceKey,
    workspaceLabel: input.workspaceLabel,
    shipmentId: input.shipmentId ?? null,
    category: input.category,
    amount: String(input.amount),
    currency: input.currency,
    description: input.description.trim(),
    expenseDate: input.expenseDate,
    createdByAdminId: input.createdByAdminId,
    createdByLabel: input.createdByLabel,
  });
  const id = Number((result as { insertId?: number }).insertId);
  if (!id) return undefined;
  const [expense] = await db.select().from(operatingExpenses).where(eq(operatingExpenses.id, id)).limit(1);
  return expense;
}

export async function listOperatingExpenses(input: { workspaceKey: string; startsAt: Date; endsAt: Date }) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(operatingExpenses).where(and(
    eq(operatingExpenses.workspaceKey, input.workspaceKey),
    gte(operatingExpenses.expenseDate, input.startsAt),
    lt(operatingExpenses.expenseDate, input.endsAt),
  )).orderBy(desc(operatingExpenses.expenseDate), desc(operatingExpenses.id));
}

export async function getDeletedShipments(shipmentType?: "documento" | "encomienda", ownerAdminId?: number, excludeIsolatedWorkspaces = false) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [isNotNull(shipments.deletedAt)];
  if (shipmentType) conditions.push(eq(shipments.shipmentType, shipmentType));
  if (ownerAdminId !== undefined) {
    conditions.push(eq(shipments.registeredByType, "admin"));
    conditions.push(eq(shipments.registeredById, ownerAdminId));
  } else if (excludeIsolatedWorkspaces) {
    const isolatedWorkspaceFilter = or(ne(shipments.registeredByType, "admin"), isNull(shipments.registeredById), notInArray(shipments.registeredById, [...ISOLATED_WORKSPACE_ADMIN_IDS]));
    if (isolatedWorkspaceFilter) conditions.push(isolatedWorkspaceFilter);
  }
  const deletedCondition = and(...conditions);
  return await db.select().from(shipments).where(deletedCondition).orderBy(desc(shipments.deletedAt));
}

export async function createShipment(
  orderNumber: string,
  code: string,
  status: "Por entregar en agencia" | "En agencia" | "En tránsito" | "En destino" | "Alerta" | "Devolución" | "Entregado",
  senderName?: string,
  senderLastName?: string,
  senderDni?: string,
  senderPhone?: string,
  recipientName?: string,
  recipientLastName?: string,
  recipientDni?: string,
  recipientPhone?: string,
  notes?: string,
  accountId?: number | null,
  shipmentType?: "documento" | "encomienda",
  weightKg?: string | number,
  manualPriceEur?: string | number | null,
  extraPriceEur?: string | number | null,
  paymentStatus?: "Pagado" | "Falta cancelar",
  route?: string,
  originAddress?: string,
  destinationAddress?: string,
  couponCode?: string | null,
  basePriceEur?: string | number | null,
  discountPercent?: string | number | null,
  discountAmountEur?: string | number | null,
  finalPriceEur?: string | number | null,
  documentItems?: string | null,
  contentChecklist?: string | null,
  deliveryMode?: "agencia" | "remoto",
  registeredBy?: ShipmentRegistrationActor,
  senderDocumentType?: "dni_peru" | "pasaporte" | "carta_identita_italia",
  recipientDocumentType?: "dni_peru" | "pasaporte" | "carta_identita_italia",
  documentKind?: "simple" | "apostillado",
  documentSheetCount?: number,
  requiresApostilleService?: boolean,
  requiresTranslationService?: boolean,
  serviceManualPriceEur?: string | number | null,
  serviceManualPriceSoles?: string | number | null,
  isIncomplete?: boolean,
  incompleteReason?: string | null,
  isProvinceDelivery?: boolean,
  provinceCustomerPriceEur?: string | number | null,
  provinceExtraPriceEur?: string | number | null,
  provinceOperationalCostSoles?: string | number | null,
  provinceCarrier?: string | null,
  provinceSenderName?: string | null,
  provinceSenderLastName?: string | null,
  provinceSenderDni?: string | null,
  provinceSenderPhone?: string | null,
  limaTorinoTransferMode?: "dhl_recogida" | "persona_autorizada" | null,
  deliveryPersonName?: string | null,
  deliveryPersonLastName?: string | null,
  deliveryPersonDni?: string | null,
  deliveryPersonPhone?: string | null,
  deliveryLocationType?: "direccion" | "aeropuerto_jorge_chavez" | null,
  deliveryLocationAddress?: string | null,
  deliveryLocationLatitude?: string | number | null,
  deliveryLocationLongitude?: string | number | null,
  missingItems?: string[] | string | null,
  extraDiscountEur?: string | number | null,
) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create shipment: database not available");
    return undefined;
  }

  // Normalizar los parámetros
  const normalizedOrder = normalizeOrderCode(orderNumber);
  const normalizedCode = normalizeOrderCode(code);
  const normalizedShipmentType = shipmentType || "documento";
  const normalizedRoute = route || "Lima - Torino";
  const normalizedEndpoints = normalizeIndependentEndpoints({ route: normalizedRoute, isProvinceDelivery });
  const pricingCurrency = derivePricingCurrency(normalizedEndpoints);
  const canRequireApostilleService = normalizedShipmentType === "documento";
  const provinceDelivery = Boolean(isProvinceDelivery) || isProvinceShipmentRoute(normalizedRoute);

  const events = [
    {
      stage: status,
      date: new Date().toISOString(),
      description: `${shipmentType === "encomienda" ? "Encomienda" : "Documento"} registrado en estado: ${status}`,
    },
  ];

  const result = await db.insert(shipments).values({
    accountId: accountId ?? null,
    orderNumber: normalizedOrder,
    code: normalizedCode,
    status,
    events: JSON.stringify(events),
    senderName,
    senderLastName,
    senderDni,
    senderDocumentType: senderDocumentType || "dni_peru",
    senderPhone,
    recipientName,
    recipientLastName,
    recipientDni,
    recipientDocumentType: recipientDocumentType || "dni_peru",
    recipientPhone,
    notes,
    shipmentType: normalizedShipmentType,
    documentKind: documentKind || "apostillado",
    documentSheetCount: Math.max(1, Math.min(10, Math.round(Number(documentSheetCount) || 1))),
    requiresApostilleService: requiresApostilleService && canRequireApostilleService ? 1 : 0,
    requiresTranslationService: requiresTranslationService && canRequireApostilleService ? 1 : 0,
    serviceManualPriceEur: serviceManualPriceEur !== undefined && serviceManualPriceEur !== null && String(serviceManualPriceEur).trim() !== "" ? String(serviceManualPriceEur) : null,
    serviceManualPriceSoles: serviceManualPriceSoles !== undefined && serviceManualPriceSoles !== null && String(serviceManualPriceSoles).trim() !== "" ? String(serviceManualPriceSoles) : null,
    isIncomplete: isIncomplete ? 1 : 0,
    incompleteReason: isIncomplete && incompleteReason ? incompleteReason.trim() : null,
    missingItems: Array.isArray(missingItems) ? JSON.stringify(missingItems) : missingItems || null,
    weightKg: String(weightKg ?? "1.00"),
    manualPriceEur: manualPriceEur !== undefined && manualPriceEur !== null && String(manualPriceEur).trim() !== "" ? String(manualPriceEur) : null,
    extraPriceEur: extraPriceEur !== undefined && extraPriceEur !== null && String(extraPriceEur).trim() !== "" ? String(Math.max(0, Number(extraPriceEur) || 0)) : "0.00",
    extraDiscountEur: extraDiscountEur !== undefined && extraDiscountEur !== null && String(extraDiscountEur).trim() !== "" ? String(Math.max(0, Number(extraDiscountEur) || 0)) : "0.00",
    couponCode: couponCode ? normalizeOrderCode(couponCode) : null,
    basePriceEur: basePriceEur !== undefined && basePriceEur !== null && String(basePriceEur).trim() !== "" ? String(basePriceEur) : null,
    discountPercent: discountPercent !== undefined && discountPercent !== null && String(discountPercent).trim() !== "" ? String(discountPercent) : "0.00",
    discountAmountEur: discountAmountEur !== undefined && discountAmountEur !== null && String(discountAmountEur).trim() !== "" ? String(discountAmountEur) : "0.00",
    finalPriceEur: finalPriceEur !== undefined && finalPriceEur !== null && String(finalPriceEur).trim() !== "" ? String(finalPriceEur) : null,
    paymentStatus: paymentStatus || "Falta cancelar",
    route: normalizedRoute,
    pricingCurrency,
    originPoint: normalizedEndpoints.originPoint,
    destinationPoint: normalizedEndpoints.destinationPoint,
    originAddress: originAddress || "",
    destinationAddress: destinationAddress || "",
    isProvinceDelivery: provinceDelivery ? 1 : 0,
    provinceCustomerPriceEur: provinceDelivery && provinceCustomerPriceEur !== undefined && provinceCustomerPriceEur !== null && String(provinceCustomerPriceEur).trim() !== "" ? String(provinceCustomerPriceEur) : null,
    provinceExtraPriceEur: provinceDelivery && provinceExtraPriceEur !== undefined && provinceExtraPriceEur !== null && String(provinceExtraPriceEur).trim() !== "" ? String(Math.max(0, Number(provinceExtraPriceEur) || 0)) : "0.00",
    provinceOperationalCostSoles: provinceDelivery && provinceOperationalCostSoles !== undefined && provinceOperationalCostSoles !== null && String(provinceOperationalCostSoles).trim() !== "" ? String(provinceOperationalCostSoles) : null,
    provinceCarrier: (provinceDelivery ? provinceCarrier || "shalom" : null) as any,
    provinceSenderName: provinceDelivery ? provinceSenderName || senderName || null : null,
    provinceSenderLastName: provinceDelivery ? provinceSenderLastName || senderLastName || null : null,
    provinceSenderDni: provinceDelivery ? provinceSenderDni || senderDni || null : null,
    provinceSenderPhone: provinceDelivery ? provinceSenderPhone || senderPhone || null : null,
    documentItems: documentItems || null,
    contentChecklist: contentChecklist || null,
    deliveryMode: deliveryMode || "agencia",
    limaTorinoTransferMode: normalizedShipmentType === "documento" && normalizedRoute === "Lima - Torino" ? limaTorinoTransferMode || null : null,
    deliveryPersonName: limaTorinoTransferMode === "persona_autorizada" ? deliveryPersonName?.trim() || null : null,
    deliveryPersonLastName: limaTorinoTransferMode === "persona_autorizada" ? deliveryPersonLastName?.trim() || null : null,
    deliveryPersonDni: limaTorinoTransferMode === "persona_autorizada" ? deliveryPersonDni?.trim() || null : null,
    deliveryPersonPhone: limaTorinoTransferMode === "persona_autorizada" ? deliveryPersonPhone?.trim() || null : null,
    deliveryLocationType: limaTorinoTransferMode === "persona_autorizada" ? deliveryLocationType || null : null,
    deliveryLocationAddress: limaTorinoTransferMode === "persona_autorizada" ? deliveryLocationAddress?.trim() || null : null,
    deliveryLocationLatitude: limaTorinoTransferMode === "persona_autorizada" && deliveryLocationLatitude != null ? String(deliveryLocationLatitude) : null,
    deliveryLocationLongitude: limaTorinoTransferMode === "persona_autorizada" && deliveryLocationLongitude != null ? String(deliveryLocationLongitude) : null,
    registeredByType: registeredBy?.type || (accountId ? "account" : "system"),
    registeredById: registeredBy?.id ?? accountId ?? null,
    registeredByEmail: registeredBy?.email || null,
    registeredByLabel: registeredBy?.label || (accountId ? "Cliente" : "Registro anterior"),
  });

  // El directorio de clientes no depende de la cuenta de acceso y no se elimina con ella.
  await persistShipmentClients({
    ownerAdminId: registeredBy?.type === "admin" ? registeredBy.id ?? null : null,
    senderName,
    senderLastName,
    senderDni,
    senderDocumentType,
    senderPhone,
    recipientName,
    recipientLastName,
    recipientDni,
    recipientDocumentType,
    recipientPhone,
  });

  const insertedId = Number((result as any)?.insertId ?? 0);
  const actor = registeredBy
    ? { actorType: registeredBy.type === "system" ? "system" as const : registeredBy.type, actorId: registeredBy.id ?? null, actorLabel: registeredBy.label }
    : { actorType: accountId ? "account" as const : "system" as const, actorId: accountId ?? null, actorLabel: accountId ? "Cliente" : "Sistema" };
  if (insertedId > 0) {
    const createdShipment = await getShipmentRecordById(insertedId);
    await recordShipmentAudit({ shipmentId: insertedId, action: "created", actor, snapshot: createdShipment });
    await notifyShipmentEvent({ shipmentId: insertedId, orderNumber: normalizedOrder, code: normalizedCode, shipmentType: normalizedShipmentType, senderName, senderLastName, senderDni, senderPhone, recipientName, recipientLastName, accountId: accountId ?? null, registeredByType: registeredBy?.type ?? (accountId ? "account" : "system"), registeredById: registeredBy?.id ?? accountId ?? null, action: "created", actor, currentStatus: status, details: `Documento del remitente: ${senderDni || "No indicado"}. Teléfono: ${senderPhone || "No indicado"}. Revisa el estado y los datos del registro desde tu panel.`, notifyAccount: Boolean(accountId) });
  }

  return result;
}

export async function updateShipmentStatus(
  id: number,
  newStatus: "Por entregar en agencia" | "En agencia" | "En tránsito" | "En destino" | "Alerta" | "Devolución" | "Entregado",
  description: string,
  senderName?: string,
  senderLastName?: string,
  senderDni?: string,
  senderPhone?: string,
  recipientName?: string,
  recipientLastName?: string,
  recipientDni?: string,
  recipientPhone?: string,
  senderDocumentType?: "dni_peru" | "pasaporte" | "carta_identita_italia",
  recipientDocumentType?: "dni_peru" | "pasaporte" | "carta_identita_italia",
  notes?: string,
  shipmentType?: "documento" | "encomienda",
  weightKg?: string | number,
  manualPriceEur?: string | number | null,
  extraPriceEur?: string | number | null,
  paymentStatus?: "Pagado" | "Falta cancelar",
  route?: string,
  originAddress?: string,
  destinationAddress?: string,
  couponCode?: string | null,
  basePriceEur?: string | number | null,
  discountPercent?: string | number | null,
  discountAmountEur?: string | number | null,
  finalPriceEur?: string | number | null,
  deliveryMode?: "agencia" | "remoto",
  documentKind?: "simple" | "apostillado",
  documentSheetCount?: number,
  requiresApostilleService?: boolean,
  requiresTranslationService?: boolean,
  serviceManualPriceEur?: string | number | null,
  serviceManualPriceSoles?: string | number | null,
  isProvinceDelivery?: boolean,
  provinceCustomerPriceEur?: string | number | null,
  provinceExtraPriceEur?: string | number | null,
  provinceOperationalCostSoles?: string | number | null,
  provinceCarrier?: string | null,
  provinceSenderName?: string | null,
  provinceSenderLastName?: string | null,
  provinceSenderDni?: string | null,
  provinceSenderPhone?: string | null,
  limaTorinoTransferMode?: "dhl_recogida" | "persona_autorizada" | null,
  deliveryPersonName?: string | null,
  deliveryPersonLastName?: string | null,
  deliveryPersonDni?: string | null,
  deliveryPersonPhone?: string | null,
  deliveryLocationType?: "direccion" | "aeropuerto_jorge_chavez" | null,
  deliveryLocationAddress?: string | null,
  deliveryLocationLatitude?: string | number | null,
  deliveryLocationLongitude?: string | number | null,
  missingItems?: string[] | string | null,
  extraDiscountEur?: string | number | null,
  changeActor?: ShipmentAuditActor,
) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update shipment: database not available");
    return undefined;
  }

  try {
    const shipment = await getShipmentById(id);
    if (!shipment) return undefined;
    const updatedShipmentType = shipmentType ?? shipment.shipmentType ?? "documento";
    const updatedRoute = route ?? shipment.route ?? "Lima - Torino";
    const updatedEndpoints = normalizeIndependentEndpoints({ route: updatedRoute, isProvinceDelivery });
    const pricingCurrency = derivePricingCurrency(updatedEndpoints);
    const shouldRequireApostilleService = requiresApostilleService ?? shipment.requiresApostilleService === 1;
    const shouldRequireTranslationService = requiresTranslationService ?? shipment.requiresTranslationService === 1;
    const canRequireApostilleService = updatedShipmentType === "documento";
    const updatedProvinceDelivery = Boolean(isProvinceDelivery ?? shipment.isProvinceDelivery) || isProvinceShipmentRoute(updatedRoute);

    let events = [];
    try {
      events = JSON.parse(shipment.events);
    } catch (e) {
      console.warn("[Database] Error parsing events JSON, starting fresh", e);
      events = [];
    }

    events.push({
      stage: newStatus,
      date: new Date().toISOString(),
      description,
    });

    const eventsJson = JSON.stringify(events);

    // Update using Drizzle ORM
    const result = await db
      .update(shipments)
      .set({
        status: newStatus,
        events: eventsJson as any,
        senderName: senderName !== undefined ? senderName : shipment.senderName,
        senderLastName: senderLastName !== undefined ? senderLastName : shipment.senderLastName,
        senderDni: senderDni !== undefined ? senderDni : shipment.senderDni,
        senderDocumentType: senderDocumentType ?? shipment.senderDocumentType ?? "dni_peru",
        senderPhone: senderPhone !== undefined ? senderPhone : shipment.senderPhone,
        recipientName: recipientName !== undefined ? recipientName : shipment.recipientName,
        recipientLastName: recipientLastName !== undefined ? recipientLastName : shipment.recipientLastName,
        recipientDni: recipientDni !== undefined ? recipientDni : shipment.recipientDni,
        recipientDocumentType: recipientDocumentType ?? shipment.recipientDocumentType ?? "dni_peru",
        recipientPhone: recipientPhone !== undefined ? recipientPhone : shipment.recipientPhone,
        notes: notes !== undefined ? notes : shipment.notes,
        shipmentType: updatedShipmentType,
        documentKind: documentKind ?? shipment.documentKind ?? "apostillado",
        documentSheetCount: documentSheetCount !== undefined ? Math.max(1, Math.min(10, Math.round(Number(documentSheetCount) || 1))) : shipment.documentSheetCount ?? 1,
        requiresApostilleService: shouldRequireApostilleService && canRequireApostilleService ? 1 : 0,
        requiresTranslationService: shouldRequireTranslationService && canRequireApostilleService ? 1 : 0,
        serviceManualPriceEur: serviceManualPriceEur !== undefined ? (serviceManualPriceEur !== null && String(serviceManualPriceEur).trim() !== "" ? String(serviceManualPriceEur) : null) : shipment.serviceManualPriceEur,
        serviceManualPriceSoles: serviceManualPriceSoles !== undefined ? (serviceManualPriceSoles !== null && String(serviceManualPriceSoles).trim() !== "" ? String(serviceManualPriceSoles) : null) : shipment.serviceManualPriceSoles,
        isProvinceDelivery: updatedProvinceDelivery ? 1 : 0,
        provinceCustomerPriceEur: updatedProvinceDelivery ? (provinceCustomerPriceEur !== undefined && provinceCustomerPriceEur !== null && String(provinceCustomerPriceEur).trim() !== "" ? String(provinceCustomerPriceEur) : shipment.provinceCustomerPriceEur) : null,
        provinceExtraPriceEur: updatedProvinceDelivery ? (provinceExtraPriceEur !== undefined && provinceExtraPriceEur !== null && String(provinceExtraPriceEur).trim() !== "" ? String(Math.max(0, Number(provinceExtraPriceEur) || 0)) : shipment.provinceExtraPriceEur ?? "0.00") : "0.00",
        provinceOperationalCostSoles: updatedProvinceDelivery ? (provinceOperationalCostSoles !== undefined && provinceOperationalCostSoles !== null && String(provinceOperationalCostSoles).trim() !== "" ? String(provinceOperationalCostSoles) : shipment.provinceOperationalCostSoles) : null,
        provinceCarrier: (updatedProvinceDelivery ? (provinceCarrier ?? shipment.provinceCarrier ?? "shalom") : null) as any,
        provinceSenderName: updatedProvinceDelivery ? (provinceSenderName ?? shipment.provinceSenderName ?? senderName ?? shipment.senderName) : null,
        provinceSenderLastName: updatedProvinceDelivery ? (provinceSenderLastName ?? shipment.provinceSenderLastName ?? senderLastName ?? shipment.senderLastName) : null,
        provinceSenderDni: updatedProvinceDelivery ? (provinceSenderDni ?? shipment.provinceSenderDni ?? senderDni ?? shipment.senderDni) : null,
        provinceSenderPhone: updatedProvinceDelivery ? (provinceSenderPhone ?? shipment.provinceSenderPhone ?? senderPhone ?? shipment.senderPhone) : null,
        weightKg: weightKg !== undefined ? String(weightKg) : shipment.weightKg ?? "1.00",
        manualPriceEur: manualPriceEur !== undefined ? (manualPriceEur !== null && String(manualPriceEur).trim() !== "" ? String(manualPriceEur) : null) : shipment.manualPriceEur,
        extraPriceEur: extraPriceEur !== undefined ? String(Math.max(0, Number(extraPriceEur) || 0)) : shipment.extraPriceEur ?? "0.00",
        extraDiscountEur: extraDiscountEur !== undefined ? String(Math.max(0, Math.min(Number(extraPriceEur ?? shipment.extraPriceEur ?? 0) || 0, Number(extraDiscountEur) || 0))) : shipment.extraDiscountEur ?? "0.00",
        couponCode: couponCode !== undefined ? (couponCode ? normalizeOrderCode(couponCode) : null) : shipment.couponCode,
        basePriceEur: basePriceEur !== undefined ? (basePriceEur !== null && String(basePriceEur).trim() !== "" ? String(basePriceEur) : null) : shipment.basePriceEur,
        discountPercent: discountPercent !== undefined ? (discountPercent !== null && String(discountPercent).trim() !== "" ? String(discountPercent) : "0.00") : shipment.discountPercent,
        discountAmountEur: discountAmountEur !== undefined ? (discountAmountEur !== null && String(discountAmountEur).trim() !== "" ? String(discountAmountEur) : "0.00") : shipment.discountAmountEur,
        finalPriceEur: finalPriceEur !== undefined ? (finalPriceEur !== null && String(finalPriceEur).trim() !== "" ? String(finalPriceEur) : null) : shipment.finalPriceEur,
        paymentStatus: paymentStatus ?? shipment.paymentStatus ?? "Falta cancelar",
        route: updatedRoute,
        pricingCurrency,
        originPoint: updatedEndpoints.originPoint,
        destinationPoint: updatedEndpoints.destinationPoint,
        originAddress: originAddress ?? shipment.originAddress ?? "",
        destinationAddress: destinationAddress ?? shipment.destinationAddress ?? "",
        deliveryMode: deliveryMode ?? shipment.deliveryMode ?? "agencia",
        limaTorinoTransferMode: updatedShipmentType === "documento" && updatedRoute === "Lima - Torino" ? (limaTorinoTransferMode ?? shipment.limaTorinoTransferMode ?? null) : null,
        deliveryPersonName: limaTorinoTransferMode === "persona_autorizada" ? deliveryPersonName?.trim() || shipment.deliveryPersonName || null : null,
        deliveryPersonLastName: limaTorinoTransferMode === "persona_autorizada" ? deliveryPersonLastName?.trim() || shipment.deliveryPersonLastName || null : null,
        deliveryPersonDni: limaTorinoTransferMode === "persona_autorizada" ? deliveryPersonDni?.trim() || shipment.deliveryPersonDni || null : null,
        deliveryPersonPhone: limaTorinoTransferMode === "persona_autorizada" ? deliveryPersonPhone?.trim() || shipment.deliveryPersonPhone || null : null,
        deliveryLocationType: limaTorinoTransferMode === "persona_autorizada" ? deliveryLocationType ?? shipment.deliveryLocationType ?? null : null,
        deliveryLocationAddress: limaTorinoTransferMode === "persona_autorizada" ? deliveryLocationAddress?.trim() || shipment.deliveryLocationAddress || null : null,
        deliveryLocationLatitude: limaTorinoTransferMode === "persona_autorizada" && deliveryLocationLatitude != null ? String(deliveryLocationLatitude) : shipment.deliveryLocationLatitude ?? null,
        deliveryLocationLongitude: limaTorinoTransferMode === "persona_autorizada" && deliveryLocationLongitude != null ? String(deliveryLocationLongitude) : shipment.deliveryLocationLongitude ?? null,
        missingItems: missingItems !== undefined ? (Array.isArray(missingItems) ? JSON.stringify(missingItems) : missingItems || null) : shipment.missingItems ?? null,
        updatedAt: new Date(),
      })
      .where(eq(shipments.id, id));

    const updatedShipment = await getShipmentRecordById(id);
    const changedFields = getShipmentChangedFields(shipment as Record<string, unknown>, updatedShipment as Record<string, unknown> | undefined);
    await notifyShipmentEvent({ shipmentId: id, orderNumber: shipment.orderNumber, code: shipment.code, shipmentType: updatedShipmentType, senderName: updatedShipment?.senderName ?? shipment.senderName, senderLastName: updatedShipment?.senderLastName ?? shipment.senderLastName, senderDni: updatedShipment?.senderDni ?? shipment.senderDni, senderPhone: updatedShipment?.senderPhone ?? shipment.senderPhone, recipientName: updatedShipment?.recipientName ?? shipment.recipientName, recipientLastName: updatedShipment?.recipientLastName ?? shipment.recipientLastName, accountId: shipment.accountId, registeredByType: shipment.registeredByType, registeredById: shipment.registeredById, action: "updated", actor: changeActor || { actorType: "system", actorLabel: "Sistema" }, previousStatus: shipment.status, currentStatus: newStatus, changedFields, details: description || undefined, notifyAccount: Boolean(shipment.accountId) });
    console.log("[Database] Shipment updated successfully:", { id, newStatus, eventsLength: events.length });
    return result;
  } catch (error) {
    console.error("[Database] Error updating shipment status:", error);
    throw error;
  }
}

async function getShipmentRecordById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(shipments).where(eq(shipments.id, id)).limit(1);
  return rows[0];
}

export async function deleteShipment(id: number, actor: ShipmentAuditActor = { actorType: "system" }, reason = "Eliminación solicitada") {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete shipment: database not available");
    return false;
  }

  try {
    const shipment = await getShipmentRecordById(id);
    if (!shipment || shipment.deletedAt) return false;
    await db.update(shipments).set({
      deletedAt: new Date(),
      deletedByType: actor.actorType === "public" ? "system" : actor.actorType,
      deletedById: actor.actorId ?? null,
      deleteReason: reason,
      updatedAt: new Date(),
    }).where(eq(shipments.id, id));
    await recordShipmentAudit({ shipmentId: id, action: "deleted", actor, reason, snapshot: shipment });
    await notifyShipmentEvent({ shipmentId: id, orderNumber: shipment.orderNumber, code: shipment.code, shipmentType: shipment.shipmentType, senderName: shipment.senderName, senderLastName: shipment.senderLastName, senderDni: shipment.senderDni, senderPhone: shipment.senderPhone, recipientName: shipment.recipientName, recipientLastName: shipment.recipientLastName, accountId: shipment.accountId, registeredByType: shipment.registeredByType, registeredById: shipment.registeredById, action: "deleted", actor, currentStatus: shipment.status, details: reason, notifyAccount: Boolean(shipment.accountId) });
    return true;
  } catch (error) {
    console.error("[Database] Error moving shipment to trash:", error);
    return false;
  }
}

export async function restoreShipment(id: number, actor: ShipmentAuditActor = { actorType: "system" }) {
  const db = await getDb();
  if (!db) return false;
  const shipment = await getShipmentRecordById(id);
  if (!shipment || !shipment.deletedAt) return false;
  await db.update(shipments).set({
    deletedAt: null,
    deletedByType: null,
    deletedById: null,
    deleteReason: null,
    updatedAt: new Date(),
  }).where(eq(shipments.id, id));
  await recordShipmentAudit({ shipmentId: id, action: "restored", actor, snapshot: shipment });
  await notifyShipmentEvent({ shipmentId: id, orderNumber: shipment.orderNumber, code: shipment.code, shipmentType: shipment.shipmentType, senderName: shipment.senderName, senderLastName: shipment.senderLastName, senderDni: shipment.senderDni, senderPhone: shipment.senderPhone, recipientName: shipment.recipientName, recipientLastName: shipment.recipientLastName, accountId: shipment.accountId, registeredByType: shipment.registeredByType, registeredById: shipment.registeredById, action: "restored", actor, currentStatus: shipment.status, details: "El registro vuelve a estar disponible para su seguimiento.", notifyAccount: Boolean(shipment.accountId) });
  return true;
}

/** Oculta un envío solo de las listas operativas de Registradores; no afecta al cliente, rastreo público ni papelera. */
export async function setShipmentRegistradorVisibility(id: number, hidden: boolean, actor: ShipmentAuditActor, reason?: string | null) {
  const db = await getDb();
  if (!db) return false;
  const shipment = await getShipmentRecordById(id);
  if (!shipment || shipment.deletedAt) return false;
  await db.update(shipments).set({
    hiddenFromRegistradoresAt: hidden ? new Date() : null,
    hiddenFromRegistradoresByAdminId: hidden ? actor.actorId ?? null : null,
    hideFromRegistradoresReason: hidden ? reason?.trim() || null : null,
    updatedAt: new Date(),
  }).where(eq(shipments.id, id));
  await recordShipmentAudit({
    shipmentId: id,
    action: hidden ? "hidden_from_registradores" : "shown_to_registradores",
    actor,
    reason: hidden ? reason?.trim() || null : null,
    snapshot: shipment,
    metadata: { hiddenFromRegistradores: hidden },
  });
  await notifyShipmentEvent({ shipmentId: id, orderNumber: shipment.orderNumber, code: shipment.code, shipmentType: shipment.shipmentType, senderName: shipment.senderName, senderLastName: shipment.senderLastName, senderDni: shipment.senderDni, senderPhone: shipment.senderPhone, recipientName: shipment.recipientName, recipientLastName: shipment.recipientLastName, accountId: shipment.accountId, registeredByType: shipment.registeredByType, registeredById: shipment.registeredById, action: "updated", actor, previousStatus: shipment.status, currentStatus: shipment.status, changedFields: [hidden ? "visibilidad" : "visibilidad"], details: hidden ? `Envío ocultado para Registradores.${reason ? ` Motivo: ${reason.trim()}` : ""}` : "Envío visible nuevamente para Registradores.", notifyAccount: false });
  return true;
}


export async function createTransfer(input: {
  transferNumber: string;
  createdByAdminId: number;
  createdByAdminLabel: string;
  route?: string;
  originOffice?: string;
  destinationOffice?: string | null;
  senderName: string;
  senderPhone?: string | null;
  senderDocument?: string | null;
  senderDocumentType?: string;
  senderPassport?: string | null;
  senderCity?: string | null;
  senderPaymentMethod?: string | null;
  recipientName: string;
  recipientPhone?: string | null;
  recipientDocument?: string | null;
  recipientDocumentType?: string;
  recipientPassport?: string | null;
  recipientBank?: string | null;
  recipientIban?: string | null;
  recipientCci?: string | null;
  amountSent: string;
  transferFee: string;
  exchangeRate: string;
  amountReceived: string;
  currency?: string;
  destinationCurrency?: string;
  commissionPercent?: string;
  exchangeRateSource?: string;
  status?: "Registrada" | "Pagada" | "Cancelada";
  notes?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  await db.insert(transfers).values({ ...input, route: input.route || "Lima - Torino", originOffice: input.originOffice || "Servicom Internacional — Lima", currency: input.currency || "EUR", status: input.status || "Registrada" });
  const rows = await db.select().from(transfers).where(eq(transfers.transferNumber, input.transferNumber)).limit(1);
  return rows[0] || null;
}

export async function listTransfersByAdmin(adminId: number, includeDeleted = false) {
  const db = await getDb();
  if (!db) return [];
  const condition = includeDeleted ? eq(transfers.createdByAdminId, adminId) : and(eq(transfers.createdByAdminId, adminId), isNull(transfers.deletedAt));
  return db.select().from(transfers).where(condition).orderBy(desc(transfers.createdAt));
}
