import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import {
  consumeVerificationCode,
  createLocalAccount,
  clearLocalAccountPasswordFailures,
  createVerificationCode,
  getActiveVerificationCode,
  getLocalAccountByEmail,
  getLocalAccountById,
  registerLocalAccountPasswordFailure,
  getShipmentByOrderAndCode,
  incrementVerificationAttempts,
  updateLocalAccountProfile,
  updateLocalAccountProfilePhotos,
  getShipmentsByAccountId,
  createShipment,
  deleteShipment,
  getDeletedShipments,
  getShipmentById,
  getDb,
  recordInteractionEvent,
  restoreShipment,
  updateLocalAccountPassword,
  upsertClient,
  notifyAccountEvent,
} from "./db";
import { getRemainingLockoutSeconds, MAX_PASSWORD_FAILURES, PASSWORD_LOCKOUT_SECONDS } from "./loginProtection";
import {
  generateVerificationCode,
  hashPassword,
  hashVerificationCode,
  normalizeEmail,
  normalizePhone,
  sendVerificationEmail,
  verifyPassword,
  verificationExpiry,
} from "./localAuth";
import { AccountSessionPayload, clearAccountSession, getAccountSession, setAccountSession } from "./localSession";
import { identityDocumentNumberSchema, identityDocumentTypeSchema, isIdentityDocumentValid, identityDocumentValidationMessage, optionalIdentityDocumentNumberSchema, optionalPersonNameSchema, personNameSchema } from "./inputValidation";
import { isValidInternationalPhone, normalizeInternationalPhone } from "../shared/phoneValidation";
import { isSecurePassword, PASSWORD_REQUIREMENTS_MESSAGE } from "../shared/passwordPolicy";
import { generateShipmentCode, generateShipmentOrderNumber } from "../shared/shipmentIdentifiers";
import { storagePut } from "./storage";
import { localAccounts, shipments } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const passwordSchema = z.string().refine(isSecurePassword, PASSWORD_REQUIREMENTS_MESSAGE);
const emailSchema = z.string().email("Correo electrónico inválido.");
const optionalInternationalPhoneSchema = z.string().trim().optional()
  .transform(value => value ? normalizeInternationalPhone(value) : value)
  .refine(value => !value || isValidInternationalPhone(value), "Completa el teléfono con su código de país y los dígitos requeridos.");
const internationalPhoneSchema = z.string().trim().min(1, "Teléfono requerido")
  .transform(value => normalizeInternationalPhone(value))
  .refine(isValidInternationalPhone, "Completa el teléfono con su código de país y los dígitos requeridos.");
export const passwordResetChannelSchema = z.literal("email");

export const ACCOUNT_REAUTH_REQUIRED_MESSAGE = "Por seguridad, vuelve a escribir tu contraseña para continuar.";

function parseProfilePhotos(value: string | null | undefined) {
  try {
    const parsed = value ? JSON.parse(value) : [];
    const photos = Array.isArray(parsed) ? parsed : parsed && typeof parsed === "object" ? [parsed] : [];
    return photos.filter((photo): photo is { key?: string; url: string; name?: string; mimeType?: string; sizeBytes?: number; createdAt?: string } => Boolean(photo && typeof photo === "object" && typeof (photo as { url?: unknown }).url === "string"));
  } catch {
    return [];
  }
}

async function requireFreshAccountSession(req: Parameters<typeof getAccountSession>[0], action: string): Promise<AccountSessionPayload> {
  const session = getAccountSession(req);
  if (!session) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: `Inicia sesión para ${action}.` });
  }
  if (session.reauthRequired) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: ACCOUNT_REAUTH_REQUIRED_MESSAGE });
  }
  return session;
}

export const CLIENT_PAYMENT_DEFAULTS = {
  status: "Falta cancelar",
} as const;

export const clientShipmentInputSchema = z.object({
  senderName: optionalPersonNameSchema,
  senderLastName: optionalPersonNameSchema,
  senderDni: optionalIdentityDocumentNumberSchema,
  senderDocumentType: identityDocumentTypeSchema.default("dni_peru"),
  senderPhone: optionalInternationalPhoneSchema,
  recipientName: optionalPersonNameSchema,
  recipientLastName: optionalPersonNameSchema,
  recipientDni: optionalIdentityDocumentNumberSchema,
  recipientDocumentType: identityDocumentTypeSchema.default("dni_peru"),
  recipientPhone: optionalInternationalPhoneSchema,
  notes: z.string().optional(),
  contentChecklist: z.array(z.string().trim().min(1).max(160)).max(24).min(1, "La lista de cosas enviadas es obligatoria."),
  deliveryMode: z.literal("remoto").default("remoto"),
  documentCount: z.number().min(1).default(1),
  docType: z.enum(["simple", "apostillado"]).default("apostillado"),
  sheetCount: z.number().min(1).default(1),
  requiresApostilleService: z.boolean().default(false),
  requiresTranslationService: z.boolean().default(false),
  serviceManualPriceEur: z.union([z.string(), z.number()]).optional().nullable(),
  serviceManualPriceSoles: z.union([z.string(), z.number()]).optional().nullable(),
  isIncomplete: z.literal(false).default(false),
  route: z.enum(["Lima - Torino", "Torino - Lima"]).default("Lima - Torino"),
  destinationAddress: z.string().trim().max(1000).optional(),
}).strict().superRefine((input, ctx) => {
  if (input.senderDni && !isIdentityDocumentValid(input.senderDni, input.senderDocumentType)) ctx.addIssue({ code: "custom", path: ["senderDni"], message: identityDocumentValidationMessage(input.senderDocumentType) });
  if (input.recipientDni && !isIdentityDocumentValid(input.recipientDni, input.recipientDocumentType)) ctx.addIssue({ code: "custom", path: ["recipientDni"], message: identityDocumentValidationMessage(input.recipientDocumentType) });
  if (input.requiresApostilleService && input.route !== "Torino - Lima") ctx.addIssue({ code: "custom", path: ["requiresApostilleService"], message: "La opción «Documentos para apostillar» solo está disponible para la ruta Torino - Lima." });
});

export function buildClientShipmentPersistenceArgs(
  input: z.infer<typeof clientShipmentInputSchema>,
  orderNumber: string,
  code: string,
  calculatedNotes: string,
  accountId: number,
  basePriceEur?: number,
  registeredEmail?: string | null,
) {
  return [
    orderNumber,
    code,
    "Por entregar en agencia",
    input.senderName,
    input.senderLastName,
    input.senderDni,
    input.senderPhone,
    input.recipientName,
    input.recipientLastName,
    input.recipientDni,
    input.recipientPhone,
    calculatedNotes,
    accountId,
    "documento",
    1,
    null,
    0,
    CLIENT_PAYMENT_DEFAULTS.status,
    input.route,
    "",
    input.destinationAddress || "",
    null,
    basePriceEur ?? null,
    0,
    0,
    basePriceEur ?? null,
    null,
    JSON.stringify(input.contentChecklist),
    input.deliveryMode,
    { type: "account" as const, id: accountId, label: "Cliente", email: registeredEmail || null },
    input.senderDocumentType,
    input.recipientDocumentType,
    input.docType,
    input.sheetCount,
    input.requiresApostilleService,
    input.requiresTranslationService,
    input.serviceManualPriceEur,
    input.serviceManualPriceSoles,
    false,
    null,
    false,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
  ] as const;
}

export const accountRouter = router({
  register: publicProcedure
    .input(z.object({
      email: emailSchema,
      phone: optionalInternationalPhoneSchema,
      name: personNameSchema,
      lastName: personNameSchema,
      dni: identityDocumentNumberSchema,
      documentType: identityDocumentTypeSchema.default("dni_peru"),
      password: passwordSchema,
    }).superRefine((input, ctx) => {
      if (!isIdentityDocumentValid(input.dni, input.documentType)) ctx.addIssue({ code: "custom", path: ["dni"], message: identityDocumentValidationMessage(input.documentType) });
    }))
    .mutation(async ({ input, ctx }) => {
      const email = normalizeEmail(input.email);
      const phone = input.phone ? normalizePhone(input.phone) : null;
      if (phone && !/^\+?[1-9]\d{7,14}$/.test(phone)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Ingresa un celular válido con código de país." });
      }

      if (await getLocalAccountByEmail(email)) {
        throw new TRPCError({ code: "CONFLICT", message: "Ya existe una cuenta con ese correo." });
      }

      const account = await createLocalAccount(email, phone, await hashPassword(input.password), input.name, input.lastName, input.dni, input.documentType);
      if (!account) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No se pudo crear la cuenta." });
      }

await upsertClient({ ownerAdminId: null, name: input.name, lastName: input.lastName, dni: input.dni, documentType: input.documentType, phone, email });
      await notifyAccountEvent({ accountId: account.id, title: "Nuevo cliente registrado", message: "Tu cuenta Cliente fue creada correctamente.", kind: "account_created", actor: { actorType: "account", actorId: account.id, actorLabel: `${input.name} ${input.lastName}`.trim() }, details: "Ya puedes registrar y rastrear tus envíos desde la plataforma." });
      setAccountSession(ctx.req, ctx.res, account.id, false);
return {
success: true,
account: {
id: account.id,
email: account.email,
phone: account.phone,
name: account.name,
lastName: account.lastName,
dni: account.dni,
          mustChangePassword: account.mustChangePassword === 1,
createdAt: account.createdAt,
        },
      };
    }),

  login: publicProcedure
    .input(z.object({ email: emailSchema, password: z.string().min(1), rememberDevice: z.boolean().default(false) }))
    .mutation(async ({ input, ctx }) => {
      const account = await getLocalAccountByEmail(normalizeEmail(input.email));
      const remainingLock = getRemainingLockoutSeconds(account?.passwordLockedUntil);
      if (remainingLock > 0) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `Por seguridad, espera ${remainingLock} segundos antes de volver a intentarlo.` });
      if (!account || !(await verifyPassword(input.password, account.passwordHash))) {
        const failure = account ? await registerLocalAccountPasswordFailure(account.id) : undefined;
        const lockSeconds = getRemainingLockoutSeconds(failure?.lockedUntil);
        if (lockSeconds > 0) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `Alcanzaste ${MAX_PASSWORD_FAILURES} intentos fallidos. Espera ${lockSeconds || PASSWORD_LOCKOUT_SECONDS} segundos antes de volver a intentarlo.` });
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Correo o contraseña inválidos." });
      }

await clearLocalAccountPasswordFailures(account.id);
setAccountSession(ctx.req, ctx.res, account.id, input.rememberDevice);
return {
success: true,
account: {
id: account.id,
email: account.email,
phone: account.phone,
name: account.name,
lastName: account.lastName,
dni: account.dni,
          mustChangePassword: account.mustChangePassword === 1,
createdAt: account.createdAt,
        },
      };
    }),

  me: publicProcedure.query(async ({ ctx }) => {
    const session = getAccountSession(ctx.req);
    if (!session) return null;
    const account = await getLocalAccountById(session.accountId);
    if (!account) return null;
    return {
      id: account.id,
      email: account.email,
      phone: account.phone,
      name: account.name,
      lastName: account.lastName,
dni: account.dni,
      documentType: account.documentType,
      biography: account.biography || "",
      profilePhotos: parseProfilePhotos(account.profilePhotoMetadata),
      createdAt: account.createdAt,
      mustChangePassword: account.mustChangePassword === 1,
reauthRequired: session.reauthRequired,
    };
  }),

  reauthenticate: publicProcedure
    .input(z.object({ password: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const session = getAccountSession(ctx.req);
      if (!session) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Tu sesión ha expirado. Inicia sesión nuevamente." });
      }
      const account = await getLocalAccountById(session.accountId);
      const remainingLock = getRemainingLockoutSeconds(account?.passwordLockedUntil);
      if (remainingLock > 0) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `Por seguridad, espera ${remainingLock} segundos antes de volver a intentarlo.` });
      if (!account || !(await verifyPassword(input.password, account.passwordHash))) {
        const failure = account ? await registerLocalAccountPasswordFailure(account.id) : undefined;
        const lockSeconds = getRemainingLockoutSeconds(failure?.lockedUntil);
        if (lockSeconds > 0) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `Alcanzaste ${MAX_PASSWORD_FAILURES} intentos fallidos. Espera ${lockSeconds || PASSWORD_LOCKOUT_SECONDS} segundos antes de volver a intentarlo.` });
        throw new TRPCError({ code: "UNAUTHORIZED", message: "La contraseña actual no es correcta." });
      }
      await clearLocalAccountPasswordFailures(account.id);
      setAccountSession(ctx.req, ctx.res, account.id, session.remembered);
      return { success: true, message: "Identidad verificada. Puedes continuar." };
    }),

  logout: publicProcedure.mutation(({ ctx }) => {
    clearAccountSession(ctx.req, ctx.res);
    return { success: true };
  }),

  updateProfile: publicProcedure
    .input(z.object({
      name: personNameSchema,
      lastName: personNameSchema,
      dni: identityDocumentNumberSchema,
      documentType: identityDocumentTypeSchema.default("dni_peru"),
      phone: internationalPhoneSchema,
      biography: z.string().trim().max(1000, "La biografía no puede superar 1000 caracteres.").optional().default(""),
    }).superRefine((input, ctx) => {
      if (!isIdentityDocumentValid(input.dni, input.documentType)) ctx.addIssue({ code: "custom", path: ["dni"], message: identityDocumentValidationMessage(input.documentType) });
    }))
    .mutation(async ({ input, ctx }) => {
      const session = await requireFreshAccountSession(ctx.req, "actualizar tu perfil");
      const previousAccount = await getLocalAccountById(session.accountId);
      const phone = normalizePhone(input.phone);
      const account = await updateLocalAccountProfile(session.accountId, input.name, input.lastName, input.dni, phone, input.documentType, input.biography);
      if (!account) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cuenta no encontrada." });
      }
      await upsertClient({ ownerAdminId: null, name: input.name, lastName: input.lastName, dni: input.dni, documentType: input.documentType, phone, email: account.email });
      const changedFields = [
        previousAccount?.name !== input.name ? "nombre" : null,
        previousAccount?.lastName !== input.lastName ? "apellidos" : null,
        previousAccount?.dni !== input.dni || previousAccount?.documentType !== input.documentType ? "documento de identidad" : null,
        previousAccount?.phone !== phone ? "celular" : null,
        previousAccount?.biography !== input.biography ? "biografía" : null,
      ].filter((field): field is string => Boolean(field));
      await notifyAccountEvent({ accountId: account.id, title: "Datos del cliente actualizados", message: "Se actualizaron tus datos personales.", kind: "account_updated", actor: { actorType: "account", actorId: account.id, actorLabel: `${input.name} ${input.lastName}`.trim() }, details: changedFields.length ? `Campos modificados: ${changedFields.join(", ")}.` : "No se detectaron cambios adicionales." });
      return { success: true, account };
    }),

  myShipments: publicProcedure.query(async ({ ctx }) => {
    const session = getAccountSession(ctx.req);
    if (!session) return [];
    if (session.reauthRequired) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: ACCOUNT_REAUTH_REQUIRED_MESSAGE });
    }
    const shipmentsList = await getShipmentsByAccountId(session.accountId);
    return shipmentsList.map(s => ({
      ...s,
      events: JSON.parse(s.events),
    }));
  }),

  myDeletedShipments: publicProcedure.query(async ({ ctx }) => {
    const session = await requireFreshAccountSession(ctx.req, "ver tus envíos eliminados");
    const deleted = await getDeletedShipments();
    const visible = deleted.filter(shipment => shipment.accountId === session.accountId && shipment.deletedByType === "account" && shipment.deletedById === session.accountId);
    await recordInteractionEvent({ actorType: "account", actorId: session.accountId, eventName: "trash_viewed", surface: "account", metadata: { count: visible.length } });
    return visible.map(s => ({ ...s, events: JSON.parse(s.events) }));
  }),

  deleteMyShipment: publicProcedure
    .input(z.object({ shipmentId: z.number(), reason: z.string().trim().max(500).optional() }))
    .mutation(async ({ input, ctx }) => {
      const session = await requireFreshAccountSession(ctx.req, "eliminar un envío");
      const shipment = await getShipmentById(input.shipmentId);
      if (!shipment || shipment.accountId !== session.accountId) throw new TRPCError({ code: "NOT_FOUND", message: "Envío no encontrado." });
      const deleted = await deleteShipment(input.shipmentId, { actorType: "account", actorId: session.accountId, actorLabel: "Cliente" }, input.reason || "Eliminación solicitada por el cliente");
      if (!deleted) throw new TRPCError({ code: "CONFLICT", message: "El envío no pudo enviarse a la papelera." });
      await recordInteractionEvent({ actorType: "account", actorId: session.accountId, eventName: "trash_deleted", surface: "account", metadata: { shipmentId: input.shipmentId } });
      return { success: true };
    }),

  restoreMyShipment: publicProcedure
    .input(z.object({ shipmentId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const session = await requireFreshAccountSession(ctx.req, "restaurar un envío");
      const deleted = await getDeletedShipments();
      const shipment = deleted.find(item => item.id === input.shipmentId && item.accountId === session.accountId && item.deletedByType === "account" && item.deletedById === session.accountId);
      if (!shipment) throw new TRPCError({ code: "NOT_FOUND", message: "El envío no está disponible para restauración." });
      const restored = await restoreShipment(input.shipmentId, { actorType: "account", actorId: session.accountId, actorLabel: "Cliente" });
      if (!restored) throw new TRPCError({ code: "CONFLICT", message: "El envío no pudo restaurarse." });
      await recordInteractionEvent({ actorType: "account", actorId: session.accountId, eventName: "trash_restored", surface: "account", metadata: { shipmentType: shipment.shipmentType } });
      return { success: true };
    }),

  uploadMyShipmentPhoto: publicProcedure
    .input(z.object({ shipmentId: z.number().int().positive(), name: z.string().trim().min(1).max(255), mimeType: z.string().regex(/^image\/(jpeg|png|webp|heic)$/i, "Solo se permiten imágenes JPG, PNG, WebP o HEIC."), dataBase64: z.string().min(16).max(11_000_000) }))
    .mutation(async ({ input, ctx }) => {
      const session = await requireFreshAccountSession(ctx.req, "cargar una foto");
      const shipment = await getShipmentById(input.shipmentId);
      if (!shipment || shipment.accountId !== session.accountId) throw new TRPCError({ code: "NOT_FOUND", message: "Envío no encontrado." });
      const bytes = Buffer.from(input.dataBase64, "base64");
      if (bytes.length === 0 || bytes.length > 8 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "La foto debe pesar menos de 8 MB." });
      const safeName = input.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const saved = await storagePut(`accounts/${session.accountId}/shipments/${input.shipmentId}/photos/${Date.now()}-${safeName}`, bytes, input.mimeType);
      let photos: unknown[] = [];
      try { photos = shipment.photoMetadata ? JSON.parse(shipment.photoMetadata) : []; } catch { photos = []; }
      const metadata = { key: saved.key, url: saved.url, name: input.name, mimeType: input.mimeType, sizeBytes: bytes.length, createdAt: new Date().toISOString(), uploadedBy: session.accountId };
      photos = [...photos.filter(item => item && typeof item === "object"), metadata].slice(-20);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de datos no disponible." });
      await db.update(shipments).set({ photoMetadata: JSON.stringify(photos) }).where(eq(shipments.id, input.shipmentId));
      return { success: true, photo: metadata };
    }),

  createMyShipment: publicProcedure
    .input(clientShipmentInputSchema)
    .mutation(async ({ input, ctx }) => {
      const session = await requireFreshAccountSession(ctx.req, "registrar un envío");
      const account = await getLocalAccountById(session.accountId);
      // Generación automática: orden de 8 dígitos y código de 4 caracteres (1 dígito + 3 letras)
      const orderNumber = generateShipmentOrderNumber();
      const code = generateShipmentCode();
      
      const docType = input.docType || 'apostillado';
      const sheetCount = input.sheetCount || 1;

      if (docType === 'simple' && sheetCount > 8) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Límite excedido para documentos simples (máximo 8 hojas). Debe crear otra encomienda." });
      }
      if (docType === 'apostillado' && sheetCount > 10) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Límite excedido para documentos apostillados (máximo 10 hojas). Debe crear otra encomienda." });
      }

      let totalEur = 50;
      let tariffDesc = '';
      if (docType === 'simple') {
        totalEur = sheetCount <= 4 ? 45 : 45 + (sheetCount - 4) * 2;
        tariffDesc = `Documento Simple (${sheetCount} hoja${sheetCount > 1 ? 's' : ''}): ${totalEur} EUR`;
      } else {
        totalEur = sheetCount <= 5 ? 50 : 50 + 10;
        tariffDesc = `Documento Apostillado (${sheetCount} hoja${sheetCount > 1 ? 's' : ''}): ${totalEur} EUR`;
      }
      const apostilleEur = input.requiresApostilleService && input.route === "Torino - Lima" ? 40 : 0;
      const apostilleSoles = input.requiresApostilleService && input.route === "Torino - Lima" ? 160 : 0;
      const translationEur = input.requiresTranslationService && input.route === "Torino - Lima" ? 50 : 0;
      const translationSoles = input.requiresTranslationService && input.route === "Torino - Lima" ? 200 : 0;
      totalEur += apostilleEur + translationEur;
      const serviceNotes = `${apostilleEur ? ` Apostilla: +${apostilleEur.toFixed(2)} EUR (${apostilleSoles.toFixed(2)} soles de referencia); plazo estimado: 7 días hábiles.` : ""}${translationEur ? ` Traducción: +${translationEur.toFixed(2)} EUR (${translationSoles.toFixed(2)} soles de referencia); plazo estimado: 7 días hábiles.` : ""}`;
      const calculatedNotes = `Tarifa: ${tariffDesc}.${serviceNotes} ${input.notes || ""}`.trim();

      const result = await createShipment(
        ...buildClientShipmentPersistenceArgs(input, orderNumber, code, calculatedNotes, session.accountId, totalEur, account?.email),
      );
      if (!result) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No se pudo registrar el envío." });
      }
      const shipment = await getShipmentByOrderAndCode(orderNumber, code);
      await recordInteractionEvent({ actorType: "account", actorId: session.accountId, eventName: "shipment_create_completed", surface: "account", metadata: { shipmentType: "documento", deliveryMode: input.deliveryMode } });
      return {
        success: true,
        message: "Envío registrado correctamente con orden y código automáticos.",
        orderNumber,
        code,
        shipment: shipment ? { ...shipment, events: JSON.parse(shipment.events) } : null,
      };
    }),

  uploadProfilePhoto: publicProcedure
    .input(z.object({
      name: z.string().trim().min(1).max(255),
      mimeType: z.string().regex(/^image\/(jpeg|png|webp|heic)$/i, "Solo se permiten imágenes JPG, PNG, WebP o HEIC."),
      dataBase64: z.string().min(16).max(11_000_000),
    }))
    .mutation(async ({ input, ctx }) => {
      const session = await requireFreshAccountSession(ctx.req, "subir una foto personal");
      const bytes = Buffer.from(input.dataBase64, "base64");
      if (bytes.length === 0 || bytes.length > 8 * 1024 * 1024) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "La foto debe pesar menos de 8 MB." });
      }
      const safeName = input.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const saved = await storagePut(`accounts/${session.accountId}/profile/${Date.now()}-${safeName}`, bytes, input.mimeType);
      const account = await getLocalAccountById(session.accountId);
      const previousPhotos = parseProfilePhotos(account?.profilePhotoMetadata);
      const photo = { key: saved.key, url: saved.url, name: input.name, mimeType: input.mimeType, sizeBytes: bytes.length, createdAt: new Date().toISOString() };
      const photos = [...previousPhotos, photo].slice(-6);
      const updated = await updateLocalAccountProfilePhotos(session.accountId, JSON.stringify(photos));
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Cuenta no encontrada." });
      return { success: true, photo, photos };
    }),

  changePassword: publicProcedure
    .input(z.object({ currentPassword: z.string().min(1), newPassword: passwordSchema }))
    .mutation(async ({ input, ctx }) => {
      const session = await requireFreshAccountSession(ctx.req, "cambiar tu contraseña");
      const account = await getLocalAccountById(session.accountId);
      if (!account || !(await verifyPassword(input.currentPassword, account.passwordHash))) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "La contraseña actual no es correcta." });
      }
      if (await verifyPassword(input.newPassword, account.passwordHash)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "La nueva contraseña no puede ser igual a la contraseña vigente." });
      }
      await updateLocalAccountPassword(account.id, await hashPassword(input.newPassword), "email");
      return { success: true, message: "Contraseña cambiada correctamente." };
    }),

  requestPasswordReset: publicProcedure
    .input(z.object({ email: emailSchema, channel: passwordResetChannelSchema }))
    .mutation(async ({ input }) => {
      const email = normalizeEmail(input.email);
      const account = await getLocalAccountByEmail(email);

      // Respuesta genérica para no revelar si existe una cuenta.
      if (!account) {
        return { success: true, message: "Si los datos existen, recibirás un código de verificación." };
      }

      const destination = account.email;
      const code = generateVerificationCode();
      try {
        await sendVerificationEmail(destination, code);
      } catch (error) {
        console.error("[Account] Verification delivery failed", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No se pudo enviar el código de verificación." });
      }

      await createVerificationCode(
        account.id,
        input.channel,
        destination,
        hashVerificationCode(code),
        verificationExpiry(),
      );

      return { success: true, message: "Si los datos existen, recibirás un código de verificación." };
    }),

  resetPassword: publicProcedure
    .input(z.object({
      email: emailSchema,
      channel: passwordResetChannelSchema,
      code: z.string().regex(/^\d{6}$/, "El código debe tener 6 dígitos."),
      newPassword: passwordSchema,
    }))
    .mutation(async ({ input }) => {
      const account = await getLocalAccountByEmail(normalizeEmail(input.email));
      if (!account) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "El código no es válido o ya venció." });
      }

      const verification = await getActiveVerificationCode(account.id, input.channel);
      if (!verification || verification.expiresAt.getTime() < Date.now() || verification.attempts >= 5) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "El código no es válido o ya venció." });
      }

      if (hashVerificationCode(input.code) !== verification.codeHash) {
        await incrementVerificationAttempts(verification.id);
        throw new TRPCError({ code: "BAD_REQUEST", message: "El código no es válido o ya venció." });
      }

      if (await verifyPassword(input.newPassword, account.passwordHash)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "La nueva contraseña no puede ser igual a la contraseña vigente." });
      }

      await updateLocalAccountPassword(account.id, await hashPassword(input.newPassword), input.channel);
      await consumeVerificationCode(verification.id);
      return { success: true, message: "Contraseña actualizada correctamente." };
    }),
});
