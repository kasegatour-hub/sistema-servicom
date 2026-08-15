import { and, asc, desc, eq, gt, isNull, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, shipments, shipmentSignatures, admins, localAccounts, verificationCodes, clients, discountCoupons } from "../drizzle/schema";
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
        eq(shipments.code, normalizedCode)
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
    .where(eq(shipments.id, id))
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

  await db.update(shipmentSignatures).set({
    status: "signed",
    signerName: input.signerName,
    signerDni: input.signerDni || null,
    signatureStrokes: input.signatureStrokes,
    signedAt: now,
    updatedAt: new Date(),
  }).where(and(
    eq(shipmentSignatures.id, record.id),
    eq(shipmentSignatures.status, "pending"),
  ));
  return getShipmentSignatureByShipmentId(input.shipmentId);
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
  return await db.select().from(shipments).where(eq(shipments.accountId, accountId)).orderBy(desc(shipments.createdAt));
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

export async function createDiscountCoupon(input: {
  code: string;
  startsAt: Date;
  endsAt: Date;
  createdByAdminId: number;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const code = normalizeOrderCode(input.code);
  const result = await db.insert(discountCoupons).values({
    code,
    discountPercent: "25.00",
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    createdByAdminId: input.createdByAdminId,
  });
  return { ...input, code, discountPercent: "25.00", result };
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

export async function getAllShipments(shipmentType?: "documento" | "encomienda") {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get shipments: database not available");
    return [];
  }

  if (shipmentType) {
    return await db.select().from(shipments).where(eq(shipments.shipmentType, shipmentType));
  }
  return await db.select().from(shipments);
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
  finalPriceEur?: string | number | null
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
      description: `Encomienda registrada en estado: ${status}`,
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
  finalPriceEur?: string | number | null
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

export async function deleteShipment(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete shipment: database not available");
    return false;
  }

  try {
    const result = await db.delete(shipments).where(eq(shipments.id, id));
    return true;
  } catch (error) {
    console.error("[Database] Error deleting shipment:", error);
    return false;
  }
}
