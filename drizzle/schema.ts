import { mysqlTable, mysqlEnum, int, varchar, text, timestamp, longtext, decimal, index } from "drizzle-orm/mysql-core";

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
  documentType: mysqlEnum("documentType", ["dni_peru", "pasaporte", "carta_identita_italia"]).default("dni_peru").notNull(),
  emailVerifiedAt: timestamp("emailVerifiedAt"),
  phoneVerifiedAt: timestamp("phoneVerifiedAt"),
  failedPasswordAttempts: int("failedPasswordAttempts").default(0).notNull(),
  passwordLockedUntil: timestamp("passwordLockedUntil"),
  mustChangePassword: int("mustChangePassword").default(0).notNull(),
  biography: text("biography"),
  profilePhotoMetadata: longtext("profilePhotoMetadata"), // JSON con referencia S3 de la foto personal
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type LocalAccount = typeof localAccounts.$inferSelect;
export type InsertLocalAccount = typeof localAccounts.$inferInsert;

/** Registro operativo persistente de remitentes y destinatarios, independiente de las cuentas de acceso. */
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  /** Espacio operativo del administrador que registró estos datos; nulo para registros previos o públicos. */
  ownerAdminId: int("ownerAdminId"),
  name: varchar("name", { length: 255 }).notNull(),
  lastName: varchar("lastName", { length: 255 }).notNull(),
  dni: varchar("dni", { length: 20 }),
  documentType: mysqlEnum("documentType", ["dni_peru", "pasaporte", "carta_identita_italia"]).default("dni_peru").notNull(),
  phone: varchar("phone", { length: 32 }),
  email: varchar("email", { length: 320 }),
  isSender: int("isSender").default(0).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  ownerIdx: index("clients_owner_admin_idx").on(table.ownerAdminId, table.createdAt),
  dniIdx: index("clients_dni_idx").on(table.dni),
  nameIdx: index("clients_name_last_name_idx").on(table.name, table.lastName),
}));
export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

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

/** Códigos de recuperación exclusivos de cuentas administrativas; no comparten el espacio de los clientes. */
export const adminPasswordResetCodes = mysqlTable("admin_password_reset_codes", {
  id: int("id").autoincrement().primaryKey(),
  adminId: int("adminId").notNull(),
  destination: varchar("destination", { length: 320 }).notNull(),
  codeHash: varchar("codeHash", { length: 255 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  consumedAt: timestamp("consumedAt"),
  attempts: int("attempts").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  adminIdx: index("admin_password_reset_codes_admin_idx").on(table.adminId, table.createdAt),
}));
export type AdminPasswordResetCode = typeof adminPasswordResetCodes.$inferSelect;
export type InsertAdminPasswordResetCode = typeof adminPasswordResetCodes.$inferInsert;

export const admins = mysqlTable("admins", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["registrador", "superadmin"]).default("registrador").notNull(),
  isActive: int("isActive").default(1).notNull(),
  isWorkspaceIsolated: int("isWorkspaceIsolated").default(0).notNull(),
  profilePhotoMetadata: longtext("profilePhotoMetadata"), // JSON con referencia S3 de la foto del administrador
  failedPasswordAttempts: int("failedPasswordAttempts").default(0).notNull(),
  passwordLockedUntil: timestamp("passwordLockedUntil"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = typeof admins.$inferInsert;

/** Cartas de invitación guardadas por el equipo operativo, con el contenido congelado al momento de la emisión. */
export const invitationLetters = mysqlTable("invitation_letters", {
  id: int("id").autoincrement().primaryKey(),
  createdByAdminId: int("createdByAdminId").notNull(),
  createdByAdminLabel: varchar("createdByAdminLabel", { length: 255 }).notNull(),
  inviterName: varchar("inviterName", { length: 255 }).notNull(),
  inviterLastName: varchar("inviterLastName", { length: 255 }).notNull(),
  inviteeName: varchar("inviteeName", { length: 255 }).notNull(),
  inviteeLastName: varchar("inviteeLastName", { length: 255 }).notNull(),
  clientAccountId: int("clientAccountId"),
  letterData: longtext("letterData").notNull(),
  italianData: longtext("italianData").notNull(),
  basePriceEur: decimal("basePriceEur", { precision: 10, scale: 2 }).default("15.00").notNull(),
  manualPriceEur: decimal("manualPriceEur", { precision: 10, scale: 2 }),
  extraPriceEur: decimal("extraPriceEur", { precision: 10, scale: 2 }).default("0.00").notNull(),
  extraItems: longtext("extraItems"),
  deletedAt: timestamp("deletedAt"),
  deletedByAdminId: int("deletedByAdminId"),
  deletedByAdminLabel: varchar("deletedByAdminLabel", { length: 255 }),
  deleteReason: text("deleteReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  creatorIdx: index("invitation_letters_creator_created_idx").on(table.createdByAdminId, table.createdAt),
  createdIdx: index("invitation_letters_created_idx").on(table.createdAt),
  deletedIdx: index("invitation_letters_deleted_idx").on(table.deletedAt),
}));
export type InvitationLetter = typeof invitationLetters.$inferSelect;
export type InsertInvitationLetter = typeof invitationLetters.$inferInsert;

/** Firma electrónica y solicitud de firma asociadas a una Carta de invitación. */
export const invitationLetterSignatures = mysqlTable("invitation_letter_signatures", {
  id: int("id").autoincrement().primaryKey(),
  invitationLetterId: int("invitationLetterId").notNull().unique(),
  accountId: int("accountId"),
  requestTokenHash: varchar("requestTokenHash", { length: 128 }).notNull().unique(),
  requestTokenExpiresAt: timestamp("requestTokenExpiresAt").notNull(),
  status: mysqlEnum("status", ["pending", "signed"]).default("pending").notNull(),
  signerName: varchar("signerName", { length: 255 }),
  signerEmail: varchar("signerEmail", { length: 320 }),
  consentTextVersion: varchar("consentTextVersion", { length: 64 }),
  consentAcceptedAt: timestamp("consentAcceptedAt"),
  evidenceHash: varchar("evidenceHash", { length: 128 }),
  signatureStrokes: longtext("signatureStrokes"),
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  signedAt: timestamp("signedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  letterIdx: index("invitation_letter_signatures_letter_idx").on(table.invitationLetterId),
  accountIdx: index("invitation_letter_signatures_account_idx").on(table.accountId),
}));
export type InvitationLetterSignature = typeof invitationLetterSignatures.$inferSelect;
export type InsertInvitationLetterSignature = typeof invitationLetterSignatures.$inferInsert;

/** Registro de transferencias gestionadas por Admin y Usuario Registrador. */
export const transfers = mysqlTable("transfers", {
  id: int("id").autoincrement().primaryKey(),
  transferNumber: varchar("transferNumber", { length: 32 }).notNull().unique(),
  createdByAdminId: int("createdByAdminId").notNull(),
  createdByAdminLabel: varchar("createdByAdminLabel", { length: 255 }).notNull(),
  route: varchar("route", { length: 100 }).default("Lima - Torino").notNull(),
  originOffice: varchar("originOffice", { length: 255 }).default("Servicom Internacional — Lima").notNull(),
  destinationOffice: varchar("destinationOffice", { length: 255 }),
  senderName: varchar("senderName", { length: 255 }).notNull(),
  senderPhone: varchar("senderPhone", { length: 32 }),
  senderDocument: varchar("senderDocument", { length: 64 }),
  senderDocumentType: varchar("senderDocumentType", { length: 32 }).default("dni_peru").notNull(),
  senderPassport: varchar("senderPassport", { length: 64 }),
  senderCity: varchar("senderCity", { length: 120 }),
  senderPaymentMethod: varchar("senderPaymentMethod", { length: 120 }),
  recipientName: varchar("recipientName", { length: 255 }).notNull(),
  recipientPhone: varchar("recipientPhone", { length: 32 }),
  recipientDocument: varchar("recipientDocument", { length: 64 }),
  recipientDocumentType: varchar("recipientDocumentType", { length: 32 }).default("dni_peru").notNull(),
  recipientPassport: varchar("recipientPassport", { length: 64 }),
  recipientBank: varchar("recipientBank", { length: 255 }),
  recipientIban: varchar("recipientIban", { length: 64 }),
  recipientCci: varchar("recipientCci", { length: 64 }),
  amountSent: decimal("amountSent", { precision: 12, scale: 2 }).notNull(),
  transferFee: decimal("transferFee", { precision: 12, scale: 2 }).default("0.00").notNull(),
  exchangeRate: decimal("exchangeRate", { precision: 12, scale: 4 }).default("1.0000").notNull(),
  amountReceived: decimal("amountReceived", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 8 }).default("EUR").notNull(),
  destinationCurrency: varchar("destinationCurrency", { length: 8 }).default("EUR").notNull(),
  commissionPercent: decimal("commissionPercent", { precision: 5, scale: 2 }).default("0.00").notNull(),
  exchangeRateSource: varchar("exchangeRateSource", { length: 32 }).default("manual").notNull(),
  status: mysqlEnum("status", ["Registrada", "Pagada", "Cancelada"]).default("Registrada").notNull(),
  notes: text("notes"),
  deletedAt: timestamp("deletedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  creatorIdx: index("transfers_creator_created_idx").on(table.createdByAdminId, table.createdAt),
  deletedIdx: index("transfers_deleted_idx").on(table.deletedAt),
}));
export type Transfer = typeof transfers.$inferSelect;
export type InsertTransfer = typeof transfers.$inferInsert;

/** Cupones promocionales del 25% gestionados por operadores y Master Admin. */
export const discountCoupons = mysqlTable("discount_coupons", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  discountPercent: decimal("discountPercent", { precision: 5, scale: 2 }).default("25.00").notNull(),
  appliesTo: mysqlEnum("appliesTo", ["ambos", "documento", "encomienda"]).default("ambos").notNull(),
  startsAt: timestamp("startsAt").notNull(),
  endsAt: timestamp("endsAt").notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdByAdminId: int("createdByAdminId").notNull(),
  redeemedCount: int("redeemedCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DiscountCoupon = typeof discountCoupons.$inferSelect;
export type InsertDiscountCoupon = typeof discountCoupons.$inferInsert;

/** Controles operativos por ruta, modificables únicamente por el Master Admin. */
export const shipmentRoutePolicies = mysqlTable("shipment_route_policies", {
  id: int("id").autoincrement().primaryKey(),
  route: varchar("route", { length: 100 }).notNull().unique(),
  encomiendasEnabled: int("encomiendasEnabled").default(1).notNull(),
  updatedByAdminId: int("updatedByAdminId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ShipmentRoutePolicy = typeof shipmentRoutePolicies.$inferSelect;
export type InsertShipmentRoutePolicy = typeof shipmentRoutePolicies.$inferInsert;

/** Registro de firma electrónica remota, independiente de la cuenta de acceso del cliente. */
export const shipmentSignatures = mysqlTable("shipment_signatures", {
  id: int("id").autoincrement().primaryKey(),
  shipmentId: int("shipmentId").notNull().unique(),
  requestTokenHash: varchar("requestTokenHash", { length: 128 }).notNull().unique(),
  requestTokenExpiresAt: timestamp("requestTokenExpiresAt").notNull(),
  status: mysqlEnum("status", ["pending", "signed"]).default("pending").notNull(),
  signerName: varchar("signerName", { length: 255 }),
  signerDni: varchar("signerDni", { length: 20 }),
  signerEmail: varchar("signerEmail", { length: 320 }),
  signerPhone: varchar("signerPhone", { length: 32 }),
  consentTextVersion: varchar("consentTextVersion", { length: 64 }),
  consentAcceptedAt: timestamp("consentAcceptedAt"),
  evidenceHash: varchar("evidenceHash", { length: 128 }),
  signatureStrokes: longtext("signatureStrokes"),
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  signedAt: timestamp("signedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  shipmentIdx: index("shipment_signatures_shipment_idx").on(table.shipmentId),
}));
export type ShipmentSignature = typeof shipmentSignatures.$inferSelect;
export type InsertShipmentSignature = typeof shipmentSignatures.$inferInsert;

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
  senderDocumentType: mysqlEnum("senderDocumentType", ["dni_peru", "pasaporte", "carta_identita_italia"]).default("dni_peru").notNull(),
  senderPhone: varchar("senderPhone", { length: 20 }),
  
  // Destinatario (Recipient)
  recipientName: varchar("recipientName", { length: 255 }),
  recipientLastName: varchar("recipientLastName", { length: 255 }),
  recipientDni: varchar("recipientDni", { length: 20 }),
  recipientDocumentType: mysqlEnum("recipientDocumentType", ["dni_peru", "pasaporte", "carta_identita_italia"]).default("dni_peru").notNull(),
  recipientPhone: varchar("recipientPhone", { length: 20 }),

  // Remitente utilizado para el despacho nacional a provincia (instantánea histórica)
  provinceSenderName: varchar("provinceSenderName", { length: 255 }),
  provinceSenderLastName: varchar("provinceSenderLastName", { length: 255 }),
  provinceSenderDni: varchar("provinceSenderDni", { length: 20 }),
  provinceSenderPhone: varchar("provinceSenderPhone", { length: 20 }),
  
  // Tipo de envío, peso, tarifa y notas
  shipmentType: mysqlEnum("shipmentType", ["documento", "encomienda"]).default("documento").notNull(),
  documentKind: mysqlEnum("documentKind", ["simple", "apostillado"]).default("apostillado").notNull(),
  documentSheetCount: int("documentSheetCount").default(1).notNull(),
  requiresApostilleService: int("requiresApostilleService").default(0).notNull(),
  requiresTranslationService: int("requiresTranslationService").default(0).notNull(),
  serviceManualPriceEur: decimal("serviceManualPriceEur", { precision: 10, scale: 2 }),
  serviceManualPriceSoles: decimal("serviceManualPriceSoles", { precision: 10, scale: 2 }),
  weightKg: decimal("weightKg", { precision: 10, scale: 2 }).default("1.00"),
  manualPriceEur: decimal("manualPriceEur", { precision: 10, scale: 2 }),
  extraPriceEur: decimal("extraPriceEur", { precision: 10, scale: 2 }).default("0.00").notNull(),
  extraDiscountEur: decimal("extraDiscountEur", { precision: 10, scale: 2 }).default("0.00").notNull(),
  couponCode: varchar("couponCode", { length: 64 }),
  basePriceEur: decimal("basePriceEur", { precision: 10, scale: 2 }),
  discountPercent: decimal("discountPercent", { precision: 5, scale: 2 }).default("0.00").notNull(),
  discountAmountEur: decimal("discountAmountEur", { precision: 10, scale: 2 }).default("0.00").notNull(),
  finalPriceEur: decimal("finalPriceEur", { precision: 10, scale: 2 }),
  paymentStatus: mysqlEnum("paymentStatus", ["Pagado", "Falta cancelar"]).default("Falta cancelar").notNull(),
  route: varchar("route", { length: 100 }).default("Lima - Torino").notNull(),
  originAddress: text("originAddress"),
  destinationAddress: text("destinationAddress"),
  isProvinceDelivery: int("isProvinceDelivery").default(0).notNull(),
  provinceCustomerPriceEur: decimal("provinceCustomerPriceEur", { precision: 10, scale: 2 }),
  provinceExtraPriceEur: decimal("provinceExtraPriceEur", { precision: 10, scale: 2 }).default("0.00").notNull(),
  provinceOperationalCostSoles: decimal("provinceOperationalCostSoles", { precision: 10, scale: 2 }),
  provinceCarrier: mysqlEnum("provinceCarrier", ["olva", "shalom", "fedex", "dhl", "cruz-del-sur", "movil-bus", "civa-excluciva", "transportes-linea", "oltursa", "z-buss", "erick-el-rojo", "america-express", "turismo-dias", "itttsa-bus", "allin-bus", "ronco-peru", "inca-atahualpa", "eurobus", "expreso-lobato", "molina-union", "transportes-apocalipsis", "nacional-fano", "bahia-plaza", "transmar", "turismo-raraz", "giga-bus-megabus", "expreso-selva", "grupo-palomino", "perubus-soyuz", "flores-hermanos", "cromotex", "expreso-ormeno", "expreso-antezana", "saky", "cetur", "san-cristobal-del-sur", "turismo-oropesa"]).default("shalom"),
  deliveryMode: mysqlEnum("deliveryMode", ["agencia", "remoto"]).default("agencia").notNull(),
  /** Modalidad logística específica para documentos Lima–Torino. */
  limaTorinoTransferMode: mysqlEnum("limaTorinoTransferMode", ["dhl_recogida", "persona_autorizada"]),
  deliveryPersonName: varchar("deliveryPersonName", { length: 255 }),
  deliveryPersonLastName: varchar("deliveryPersonLastName", { length: 255 }),
  deliveryPersonDni: varchar("deliveryPersonDni", { length: 20 }),
  deliveryPersonPhone: varchar("deliveryPersonPhone", { length: 32 }),
  deliveryLocationType: mysqlEnum("deliveryLocationType", ["direccion", "aeropuerto_jorge_chavez"]),
  deliveryLocationAddress: text("deliveryLocationAddress"),
  deliveryLocationLatitude: decimal("deliveryLocationLatitude", { precision: 10, scale: 7 }),
  deliveryLocationLongitude: decimal("deliveryLocationLongitude", { precision: 10, scale: 7 }),
  documentItems: longtext("documentItems"), // JSON con documentos adicionales y sus recargos/manuales
  contentChecklist: longtext("contentChecklist"), // JSON con la lista de contenido verificado
  isIncomplete: int("isIncomplete").default(0).notNull(),
  incompleteReason: text("incompleteReason"),
  /** JSON con documentos, artículos o datos pendientes de adjuntar antes del despacho. */
  missingItems: longtext("missingItems"),
  photoMetadata: longtext("photoMetadata"), // JSON con fotos cargadas en S3
  notes: text("notes"),
  deletedAt: timestamp("deletedAt"),
  deletedByType: mysqlEnum("deletedByType", ["admin", "account", "system"]),
  deletedById: int("deletedById"),
  deleteReason: text("deleteReason"),
  hiddenFromRegistradoresAt: timestamp("hiddenFromRegistradoresAt"),
  hiddenFromRegistradoresByAdminId: int("hiddenFromRegistradoresByAdminId"),
  hideFromRegistradoresReason: text("hideFromRegistradoresReason"),
  registeredByType: mysqlEnum("registeredByType", ["admin", "account", "system"]).default("system").notNull(),
  registeredById: int("registeredById"),
  registeredByEmail: varchar("registeredByEmail", { length: 320 }),
  registeredByLabel: varchar("registeredByLabel", { length: 255 }).default("Registro anterior").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Shipment = typeof shipments.$inferSelect;
export type InsertShipment = typeof shipments.$inferInsert;

/** Retroalimentación con evidencia opcional, creada por un cliente o por el equipo operativo. */
export const shipmentFeedback = mysqlTable("shipment_feedback", {
  id: int("id").autoincrement().primaryKey(),
  shipmentId: int("shipmentId").notNull(),
  authorType: mysqlEnum("authorType", ["admin", "account"]).notNull(),
  authorId: int("authorId").notNull(),
  authorLabel: varchar("authorLabel", { length: 255 }).notNull(),
  message: text("message").notNull(),
  attachmentKey: varchar("attachmentKey", { length: 512 }),
  attachmentUrl: varchar("attachmentUrl", { length: 512 }),
  attachmentName: varchar("attachmentName", { length: 255 }),
  attachmentMimeType: varchar("attachmentMimeType", { length: 128 }),
  attachmentSizeBytes: int("attachmentSizeBytes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  shipmentIdx: index("shipment_feedback_shipment_idx").on(table.shipmentId, table.createdAt),
  authorIdx: index("shipment_feedback_author_idx").on(table.authorType, table.authorId),
}));
export type ShipmentFeedback = typeof shipmentFeedback.$inferSelect;
export type InsertShipmentFeedback = typeof shipmentFeedback.$inferInsert;

/** Canal general de comentarios de la plataforma, independiente de cualquier envío. */
export const platformFeedback = mysqlTable("platform_feedback", {
  id: int("id").autoincrement().primaryKey(),
  authorType: mysqlEnum("authorType", ["admin", "account"]).notNull(),
  authorId: int("authorId").notNull(),
  authorLabel: varchar("authorLabel", { length: 255 }).notNull(),
  message: text("message").notNull(),
  attachmentKey: varchar("attachmentKey", { length: 512 }),
  attachmentUrl: varchar("attachmentUrl", { length: 512 }),
  attachmentName: varchar("attachmentName", { length: 255 }),
  attachmentMimeType: varchar("attachmentMimeType", { length: 128 }),
  attachmentSizeBytes: int("attachmentSizeBytes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  authorIdx: index("platform_feedback_author_idx").on(table.authorType, table.authorId),
  createdIdx: index("platform_feedback_created_idx").on(table.createdAt),
}));
export type PlatformFeedback = typeof platformFeedback.$inferSelect;
export type InsertPlatformFeedback = typeof platformFeedback.$inferInsert;

/** Historial append-only de cambios y snapshots para restauración y trazabilidad. */
export const shipmentAuditLogs = mysqlTable("shipment_audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  shipmentId: int("shipmentId").notNull(),
  action: mysqlEnum("action", ["created", "updated", "deleted", "restored", "price_updated", "signature_requested", "signature_completed", "hidden_from_registradores", "shown_to_registradores", "feedback_added"]).notNull(),
  actorType: mysqlEnum("actorType", ["admin", "account", "public", "system"]).notNull(),
  actorId: int("actorId"),
  actorLabel: varchar("actorLabel", { length: 255 }),
  reason: text("reason"),
  snapshot: longtext("snapshot"),
  metadata: longtext("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  shipmentIdx: index("shipment_audit_logs_shipment_idx").on(table.shipmentId),
  actionIdx: index("shipment_audit_logs_action_idx").on(table.action, table.createdAt),
}));
export type ShipmentAuditLog = typeof shipmentAuditLogs.$inferSelect;
export type InsertShipmentAuditLog = typeof shipmentAuditLogs.$inferInsert;

/** Eventos de interacción sin contenido de formularios ni datos personales sensibles. */
export const interactionEvents = mysqlTable("interaction_events", {
  id: int("id").autoincrement().primaryKey(),
  actorType: mysqlEnum("actorType", ["anonymous", "account", "admin", "system"]).notNull(),
  actorId: int("actorId"),
  sessionKeyHash: varchar("sessionKeyHash", { length: 128 }),
  eventName: varchar("eventName", { length: 100 }).notNull(),
  surface: varchar("surface", { length: 100 }).notNull(),
  metadata: longtext("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  eventIdx: index("interaction_events_event_idx").on(table.eventName, table.createdAt),
  actorIdx: index("interaction_events_actor_idx").on(table.actorType, table.actorId),
}));
export type InteractionEvent = typeof interactionEvents.$inferSelect;
export type InsertInteractionEvent = typeof interactionEvents.$inferInsert;
