import { and, asc, desc, eq, gt, gte, inArray, isNotNull, isNull, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { createHash } from "node:crypto";
import { InsertUser, users, shipments, shipmentSignatures, shipmentAuditLogs, shipmentFeedback, interactionEvents, admins, localAccounts, verificationCodes, adminPasswordResetCodes, clients, discountCoupons, shipmentRoutePolicies } from "../drizzle/schema";
import { ENV } from './_core/env';
import { buildShipmentClientDirectoryRecords, type ClientDirectoryRecord, type ShipmentClientDirectoryInput } from "./clientDirectory";

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

  const result = await db
    .select()
    .from(shipments)
    .where(
      and(
        eq(shipments.orderNumber, normalizedOrder),
        eq(shipments.code, normalizedCode),
        isNull(shipments.deletedAt)
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
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

export async function getClientById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return result[0];
}

export async function searchClients(query: string, limit = 8) {
  const db = await getDb();
  const normalizedQuery = query.trim();
  if (!db || normalizedQuery.length < 2) return [];
  const pattern = `%${normalizedQuery}%`;
  return db.select().from(clients)
    .where(or(like(clients.dni, pattern), like(clients.name, pattern), like(clients.lastName, pattern)))
    .orderBy(asc(clients.lastName), asc(clients.name))
    .limit(Math.min(Math.max(limit, 1), 20));
}

export async function upsertClient(record: ClientDirectoryRecord) {
  const db = await getDb();
  const name = record.name;
  const lastName = record.lastName;
  if (!db || !name || !lastName) return undefined;

  const dni = record.dni;
  const phone = record.phone;
  const email = record.email;
  const existing = dni
    ? await db.select().from(clients).where(eq(clients.dni, dni)).limit(1)
    : await db.select().from(clients).where(and(
        eq(clients.name, name),
        eq(clients.lastName, lastName),
        phone ? eq(clients.phone, phone) : isNull(clients.phone),
      )).limit(1);

  if (existing[0]) {
    await db.update(clients).set({ name, lastName, dni, phone, email, updatedAt: new Date() }).where(eq(clients.id, existing[0].id));
    return getClientById(existing[0].id);
  }

  const inserted = await db.insert(clients).values({ name, lastName, dni, phone, email });
  const insertedId = Number((inserted as { insertId?: number }).insertId);
  return insertedId ? getClientById(insertedId) : undefined;
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

export async function createLocalAccount(email: string, phone: string | null, passwordHash: string, name?: string, lastName?: string, dni?: string) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(localAccounts).values({ email, phone, passwordHash, name, lastName, dni });
  return getLocalAccountByEmail(email);
}

export async function updateLocalAccountProfile(id: number, name: string, lastName: string, dni: string, phone: string) {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(localAccounts).set({ name, lastName, dni, phone, updatedAt: new Date() }).where(eq(localAccounts.id, id));
  return getLocalAccountById(id);
}

export async function getShipmentsByAccountId(accountId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(shipments).where(and(eq(shipments.accountId, accountId), isNull(shipments.deletedAt))).orderBy(desc(shipments.createdAt));
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
    ? { passwordHash, emailVerifiedAt: new Date(), updatedAt: new Date() }
    : { passwordHash, phoneVerifiedAt: new Date(), updatedAt: new Date() };
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
  }).where(eq(discountCoupons.id, input.id));
  return true;
}

export async function listDiscountCoupons() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(discountCoupons);
}

export async function getDiscountCouponByCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  const normalizedCode = normalizeOrderCode(code);
  const rows = await db.select().from(discountCoupons).where(eq(discountCoupons.code, normalizedCode)).limit(1);
  return rows[0];
}

export async function deactivateDiscountCoupon(id: number) {
  const db = await getDb();
  if (!db) return false;
  await db.update(discountCoupons).set({ isActive: 0, updatedAt: new Date() }).where(eq(discountCoupons.id, id));
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

export async function getAllShipments(shipmentType?: "documento" | "encomienda", options?: { excludeHiddenForRegistradores?: boolean }) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get shipments: database not available");
    return [];
  }

  const conditions = [isNull(shipments.deletedAt)];
  if (shipmentType) conditions.push(eq(shipments.shipmentType, shipmentType));
  if (options?.excludeHiddenForRegistradores) conditions.push(isNull(shipments.hiddenFromRegistradoresAt));
  return await db.select().from(shipments).where(and(...conditions));
}

export async function getDeletedShipments(shipmentType?: "documento" | "encomienda") {
  const db = await getDb();
  if (!db) return [];
  const deletedCondition = shipmentType
    ? and(eq(shipments.shipmentType, shipmentType), isNotNull(shipments.deletedAt))
    : isNotNull(shipments.deletedAt);
  return await db.select().from(shipments).where(deletedCondition).orderBy(desc(shipments.deletedAt));
}

export async function createShipment(
  orderNumber: string,
  code: string,
  status: "Por entregar en agencia" | "En agencia" | "En tránsito" | "En destino" | "Entregado",
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
) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create shipment: database not available");
    return undefined;
  }

  // Normalizar los parámetros
  const normalizedOrder = normalizeOrderCode(orderNumber);
  const normalizedCode = normalizeOrderCode(code);

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
    senderPhone,
    recipientName,
    recipientLastName,
    recipientDni,
    recipientPhone,
    notes,
    shipmentType: shipmentType || "documento",
    weightKg: String(weightKg ?? "1.00"),
    manualPriceEur: manualPriceEur !== undefined && manualPriceEur !== null && String(manualPriceEur).trim() !== "" ? String(manualPriceEur) : null,
    couponCode: couponCode ? normalizeOrderCode(couponCode) : null,
    basePriceEur: basePriceEur !== undefined && basePriceEur !== null && String(basePriceEur).trim() !== "" ? String(basePriceEur) : null,
    discountPercent: discountPercent !== undefined && discountPercent !== null && String(discountPercent).trim() !== "" ? String(discountPercent) : "0.00",
    discountAmountEur: discountAmountEur !== undefined && discountAmountEur !== null && String(discountAmountEur).trim() !== "" ? String(discountAmountEur) : "0.00",
    finalPriceEur: finalPriceEur !== undefined && finalPriceEur !== null && String(finalPriceEur).trim() !== "" ? String(finalPriceEur) : null,
    paymentStatus: paymentStatus || "Falta cancelar",
    route: route || "Lima - Torino",
    originAddress: originAddress || "",
    destinationAddress: destinationAddress || "",
    documentItems: documentItems || null,
    contentChecklist: contentChecklist || null,
    deliveryMode: deliveryMode || "agencia",
    registeredByType: registeredBy?.type || (accountId ? "account" : "system"),
    registeredById: registeredBy?.id ?? accountId ?? null,
    registeredByLabel: registeredBy?.label || (accountId ? "Cliente" : "Registro anterior"),
  });

  // El directorio de clientes no depende de la cuenta de acceso y no se elimina con ella.
  await persistShipmentClients({
    senderName,
    senderLastName,
    senderDni,
    senderPhone,
    recipientName,
    recipientLastName,
    recipientDni,
    recipientPhone,
  });

  const insertedId = Number((result as any)?.insertId ?? 0);
  if (insertedId > 0) {
    const createdShipment = await getShipmentRecordById(insertedId);
    const actor = registeredBy
      ? { actorType: registeredBy.type === "system" ? "system" as const : registeredBy.type, actorId: registeredBy.id ?? null, actorLabel: registeredBy.label }
      : { actorType: accountId ? "account" as const : "system" as const, actorId: accountId ?? null, actorLabel: accountId ? "Cliente" : "Sistema" };
    await recordShipmentAudit({ shipmentId: insertedId, action: "created", actor, snapshot: createdShipment });
  }

  return result;
}

export async function updateShipmentStatus(
  id: number,
  newStatus: "Por entregar en agencia" | "En agencia" | "En tránsito" | "En destino" | "Entregado",
  description: string,
  senderName?: string,
  senderLastName?: string,
  senderDni?: string,
  senderPhone?: string,
  recipientName?: string,
  recipientLastName?: string,
  recipientDni?: string,
  recipientPhone?: string,
  notes?: string,
  shipmentType?: "documento" | "encomienda",
  weightKg?: string | number,
  manualPriceEur?: string | number | null,
  paymentStatus?: "Pagado" | "Falta cancelar",
  route?: string,
  originAddress?: string,
  destinationAddress?: string,
  couponCode?: string | null,
  basePriceEur?: string | number | null,
  discountPercent?: string | number | null,
  discountAmountEur?: string | number | null,
  finalPriceEur?: string | number | null,
  deliveryMode?: "agencia" | "remoto"
) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update shipment: database not available");
    return undefined;
  }

  try {
    const shipment = await getShipmentById(id);
    if (!shipment) return undefined;

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
        senderName,
        senderLastName,
        senderDni,
        senderPhone,
        recipientName,
        recipientLastName,
        recipientDni,
        recipientPhone,
        notes,
        shipmentType: shipmentType ?? shipment.shipmentType ?? "documento",
        weightKg: weightKg !== undefined ? String(weightKg) : shipment.weightKg ?? "1.00",
        manualPriceEur: manualPriceEur !== undefined ? (manualPriceEur !== null && String(manualPriceEur).trim() !== "" ? String(manualPriceEur) : null) : shipment.manualPriceEur,
        couponCode: couponCode !== undefined ? (couponCode ? normalizeOrderCode(couponCode) : null) : shipment.couponCode,
        basePriceEur: basePriceEur !== undefined ? (basePriceEur !== null && String(basePriceEur).trim() !== "" ? String(basePriceEur) : null) : shipment.basePriceEur,
        discountPercent: discountPercent !== undefined ? (discountPercent !== null && String(discountPercent).trim() !== "" ? String(discountPercent) : "0.00") : shipment.discountPercent,
        discountAmountEur: discountAmountEur !== undefined ? (discountAmountEur !== null && String(discountAmountEur).trim() !== "" ? String(discountAmountEur) : "0.00") : shipment.discountAmountEur,
        finalPriceEur: finalPriceEur !== undefined ? (finalPriceEur !== null && String(finalPriceEur).trim() !== "" ? String(finalPriceEur) : null) : shipment.finalPriceEur,
        paymentStatus: paymentStatus ?? shipment.paymentStatus ?? "Falta cancelar",
        route: route ?? shipment.route ?? "Lima - Torino",
        originAddress: originAddress ?? shipment.originAddress ?? "",
        destinationAddress: destinationAddress ?? shipment.destinationAddress ?? "",
        deliveryMode: deliveryMode ?? shipment.deliveryMode ?? "agencia",
        updatedAt: new Date(),
      })
      .where(eq(shipments.id, id));

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
  return true;
}
