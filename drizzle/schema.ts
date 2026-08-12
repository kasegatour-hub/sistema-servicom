import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, longtext } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** Cuentas locales creadas por usuarios, separadas del acceso OAuth existente. */
export const localAccounts = mysqlTable("local_accounts", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  phone: varchar("phone", { length: 32 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }),
  lastName: varchar("lastName", { length: 255 }),
  dni: varchar("dni", { length: 20 }),
  emailVerifiedAt: timestamp("emailVerifiedAt"),
  phoneVerifiedAt: timestamp("phoneVerifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type LocalAccount = typeof localAccounts.$inferSelect;
export type InsertLocalAccount = typeof localAccounts.$inferInsert;

export const verificationCodes = mysqlTable("verification_codes", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull(),
  channel: mysqlEnum("channel", ["email", "sms"]).notNull(),
  destination: varchar("destination", { length: 320 }).notNull(),
  codeHash: varchar("codeHash", { length: 255 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  consumedAt: timestamp("consumedAt"),
  attempts: int("attempts").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type VerificationCode = typeof verificationCodes.$inferSelect;
export type InsertVerificationCode = typeof verificationCodes.$inferInsert;

export const admins = mysqlTable("admins", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["admin", "superadmin"]).default("admin").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = typeof admins.$inferInsert;

export const shipments = mysqlTable("shipments", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId"), // Propietario del envío (opcional para mantener compatibilidad con envíos públicos o de admin)
  orderNumber: varchar("orderNumber", { length: 64 }).notNull().unique(),
  code: varchar("code", { length: 64 }).notNull(),
  status: mysqlEnum("status", ["Por entregar en agencia", "En agencia", "En tránsito", "En destino", "Entregado"]).notNull(),
  events: longtext("events").notNull(), // JSON string with array of events
  
  // Remitente (Sender)
  senderName: varchar("senderName", { length: 255 }),
  senderLastName: varchar("senderLastName", { length: 255 }),
  senderDni: varchar("senderDni", { length: 20 }),
  senderPhone: varchar("senderPhone", { length: 20 }),
  
  // Destinatario (Recipient)
  recipientName: varchar("recipientName", { length: 255 }),
  recipientLastName: varchar("recipientLastName", { length: 255 }),
  recipientDni: varchar("recipientDni", { length: 20 }),
  recipientPhone: varchar("recipientPhone", { length: 20 }),
  
  // Payment condition, route and Notes
  paymentCondition: varchar("paymentCondition", { length: 100 }).default("Pagará en Italia (Torino)"),
  paymentStatus: mysqlEnum("paymentStatus", ["Pagado", "Falta cancelar"]).default("Falta cancelar").notNull(),
  route: varchar("route", { length: 100 }).default("Lima - Torino").notNull(),
  originAddress: text("originAddress"),
  destinationAddress: text("destinationAddress"),
  notes: text("notes"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Shipment = typeof shipments.$inferSelect;
export type InsertShipment = typeof shipments.$inferInsert;