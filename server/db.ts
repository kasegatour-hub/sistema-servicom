import { and, desc, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, shipments, admins, localAccounts, verificationCodes } from "../drizzle/schema";
import { ENV } from './_core/env';

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

export async function getAllShipments() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get shipments: database not available");
    return [];
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
  destinationAddress?: string
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
    accountId: accountId || null,
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
    paymentStatus: paymentStatus || "Falta cancelar",
    route: route || "Lima - Torino",
    originAddress: originAddress || "",
    destinationAddress: destinationAddress || "",
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
  destinationAddress?: string
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
