import { and, asc, desc, eq, gt, gte, inArray, isNotNull, isNull, like, ne, notInArray, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { createHash } from "node:crypto";
import { InsertUser, users, shipments, shipmentSignatures, shipmentAuditLogs, shipmentFeedback, platformFeedback, interactionEvents, admins, localAccounts, verificationCodes, adminPasswordResetCodes, clients, discountCoupons, shipmentRoutePolicies, invitationLetters, invitationLetterSignatures, transfers } from "../drizzle/schema";
import { ENV } from './_core/env';
import { buildShipmentClientDirectoryRecords, type ClientDirectoryRecord, type ShipmentClientDirectoryInput } from "./clientDirectory";
import { rankFuzzyMatches } from "../shared/fuzzySearch";
import { searchInvitationPeople, type InvitationPersonSeed } from "../shared/invitationPeople";
import { getFailureUpdate } from "./loginProtection";

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

export async function listPlatformFeedback(actor: { type: "admin" | "account"; id: number; canReviewAll: boolean }) {
  const db = await getDb();
  if (!db) return [];
  const condition = actor.canReviewAll ? undefined : and(eq(platformFeedback.authorType, actor.type), eq(platformFeedback.authorId, actor.id));
  return condition
    ? db.select().from(platformFeedback).where(condition).orderBy(desc(platformFeedback.createdAt))
    : db.select().from(platformFeedback).orderBy(desc(platformFeedback.createdAt));
}

export async function createPlatformFeedback(input: {
  authorType: "admin" | "account";
  authorId: number;
  authorLabel: string;
  message: string;
  attachment?: { key: string; url: string; name: string; mimeType: string; sizeBytes: number } | null;
}) {
  const db = await getDb();
  if (!db) return undefined;
  return db.insert(platformFeedback).values({
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

export const ISOLATED_WORKSPACE_ADMIN_IDS = [210001, 210002] as const;

export async function getAllShipments(shipmentType?: "documento" | "encomienda", options?: { excludeHiddenForRegistradores?: boolean; ownerAdminId?: number; excludeIsolatedWorkspaces?: boolean }) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get shipments: database not available");
    return [];
  }

  const conditions = [isNull(shipments.deletedAt)];
  if (shipmentType) conditions.push(eq(shipments.shipmentType, shipmentType));
  if (options?.excludeHiddenForRegistradores) conditions.push(isNull(shipments.hiddenFromRegistradoresAt));
  if (options?.ownerAdminId !== undefined) {
    conditions.push(eq(shipments.registeredByType, "admin"));
    conditions.push(eq(shipments.registeredById, options.ownerAdminId));
  } else if (options?.excludeIsolatedWorkspaces) {
    const isolatedWorkspaceFilter = or(ne(shipments.registeredByType, "admin"), isNull(shipments.registeredById), notInArray(shipments.registeredById, [...ISOLATED_WORKSPACE_ADMIN_IDS]));
    if (isolatedWorkspaceFilter) conditions.push(isolatedWorkspaceFilter);
  }
  return await db.select().from(shipments).where(and(...conditions));
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
  const canRequireApostilleService = normalizedShipmentType === "documento" && normalizedRoute === "Torino - Lima";
  const provinceDelivery = Boolean(isProvinceDelivery) && normalizedRoute === "Torino - Lima";

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
    console.warn("[Database] Cannot update shipment: database not available");
    return undefined;
  }

  try {
    const shipment = await getShipmentById(id);
    if (!shipment) return undefined;
    const updatedShipmentType = shipmentType ?? shipment.shipmentType ?? "documento";
    const updatedRoute = route ?? shipment.route ?? "Lima - Torino";
    const shouldRequireApostilleService = requiresApostilleService ?? shipment.requiresApostilleService === 1;
    const canRequireApostilleService = updatedShipmentType === "documento" && updatedRoute === "Torino - Lima";

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
        shipmentType: updatedShipmentType,
        documentKind: documentKind ?? shipment.documentKind ?? "apostillado",
        documentSheetCount: documentSheetCount !== undefined ? Math.max(1, Math.min(10, Math.round(Number(documentSheetCount) || 1))) : shipment.documentSheetCount ?? 1,
        requiresApostilleService: shouldRequireApostilleService && canRequireApostilleService ? 1 : 0,
        isProvinceDelivery: Boolean(isProvinceDelivery ?? shipment.isProvinceDelivery) && updatedRoute === "Torino - Lima" ? 1 : 0,
        provinceCustomerPriceEur: Boolean(isProvinceDelivery ?? shipment.isProvinceDelivery) && updatedRoute === "Torino - Lima" ? (provinceCustomerPriceEur !== undefined && provinceCustomerPriceEur !== null && String(provinceCustomerPriceEur).trim() !== "" ? String(provinceCustomerPriceEur) : shipment.provinceCustomerPriceEur) : null,
        provinceExtraPriceEur: Boolean(isProvinceDelivery ?? shipment.isProvinceDelivery) && updatedRoute === "Torino - Lima" ? (provinceExtraPriceEur !== undefined && provinceExtraPriceEur !== null && String(provinceExtraPriceEur).trim() !== "" ? String(Math.max(0, Number(provinceExtraPriceEur) || 0)) : shipment.provinceExtraPriceEur ?? "0.00") : "0.00",
        provinceOperationalCostSoles: Boolean(isProvinceDelivery ?? shipment.isProvinceDelivery) && updatedRoute === "Torino - Lima" ? (provinceOperationalCostSoles !== undefined && provinceOperationalCostSoles !== null && String(provinceOperationalCostSoles).trim() !== "" ? String(provinceOperationalCostSoles) : shipment.provinceOperationalCostSoles) : null,
        provinceCarrier: (Boolean(isProvinceDelivery ?? shipment.isProvinceDelivery) && updatedRoute === "Torino - Lima" ? (provinceCarrier ?? shipment.provinceCarrier ?? "shalom") : null) as any,
        provinceSenderName: Boolean(isProvinceDelivery ?? shipment.isProvinceDelivery) && updatedRoute === "Torino - Lima" ? (provinceSenderName ?? shipment.provinceSenderName ?? senderName ?? shipment.senderName) : null,
        provinceSenderLastName: Boolean(isProvinceDelivery ?? shipment.isProvinceDelivery) && updatedRoute === "Torino - Lima" ? (provinceSenderLastName ?? shipment.provinceSenderLastName ?? senderLastName ?? shipment.senderLastName) : null,
        provinceSenderDni: Boolean(isProvinceDelivery ?? shipment.isProvinceDelivery) && updatedRoute === "Torino - Lima" ? (provinceSenderDni ?? shipment.provinceSenderDni ?? senderDni ?? shipment.senderDni) : null,
        provinceSenderPhone: Boolean(isProvinceDelivery ?? shipment.isProvinceDelivery) && updatedRoute === "Torino - Lima" ? (provinceSenderPhone ?? shipment.provinceSenderPhone ?? senderPhone ?? shipment.senderPhone) : null,
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


export async function createTransfer(input: {
  transferNumber: string;
  createdByAdminId: number;
  createdByAdminLabel: string;
  originOffice?: string;
  destinationOffice?: string | null;
  senderName: string;
  senderPhone?: string | null;
  senderDocument?: string | null;
  senderPassport?: string | null;
  senderCity?: string | null;
  senderPaymentMethod?: string | null;
  recipientName: string;
  recipientPhone?: string | null;
  recipientDocument?: string | null;
  recipientPassport?: string | null;
  recipientBank?: string | null;
  recipientIban?: string | null;
  recipientCci?: string | null;
  amountSent: string;
  transferFee: string;
  exchangeRate: string;
  amountReceived: string;
  currency?: string;
  status?: "Registrada" | "Pagada" | "Cancelada";
  notes?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  await db.insert(transfers).values({ ...input, originOffice: input.originOffice || "Servicom Internacional — Lima", currency: input.currency || "EUR", status: input.status || "Registrada" });
  const rows = await db.select().from(transfers).where(eq(transfers.transferNumber, input.transferNumber)).limit(1);
  return rows[0] || null;
}

export async function listTransfersByAdmin(adminId: number, includeDeleted = false) {
  const db = await getDb();
  if (!db) return [];
  const condition = includeDeleted ? eq(transfers.createdByAdminId, adminId) : and(eq(transfers.createdByAdminId, adminId), isNull(transfers.deletedAt));
  return db.select().from(transfers).where(condition).orderBy(desc(transfers.createdAt));
}
