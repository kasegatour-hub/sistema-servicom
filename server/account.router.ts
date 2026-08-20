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
  getShipmentsByAccountId,
  createShipment,
  deleteShipment,
  getDeletedShipments,
  getShipmentById,
  recordInteractionEvent,
  restoreShipment,
  updateLocalAccountPassword,
  upsertClient,
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
import { isValidInternationalPhone } from "../shared/phoneValidation";
import { isSecurePassword, PASSWORD_REQUIREMENTS_MESSAGE } from "../shared/passwordPolicy";

const passwordSchema = z.string().refine(isSecurePassword, PASSWORD_REQUIREMENTS_MESSAGE);
const emailSchema = z.string().email("Correo electrónico inválido.");
const optionalInternationalPhoneSchema = z.string().trim().optional().refine(value => !value || isValidInternationalPhone(value), "El número no coincide con la cantidad de dígitos del país seleccionado.");
const internationalPhoneSchema = z.string().trim().min(1, "Teléfono requerido").refine(isValidInternationalPhone, "El número no coincide con la cantidad de dígitos del país seleccionado.");
export const passwordResetChannelSchema = z.literal("email");

export const ACCOUNT_REAUTH_REQUIRED_MESSAGE = "Por seguridad, vuelve a escribir tu contraseña para continuar.";

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
  route: z.enum(["Lima - Torino", "Torino - Lima"]).default("Lima - Torino"),
  destinationAddress: z.string().trim().max(1000).optional(),
}).strict().superRefine((input, ctx) => {
  if (input.senderDni && !isIdentityDocumentValid(input.senderDni, input.senderDocumentType)) ctx.addIssue({ code: "custom", path: ["senderDni"], message: identityDocumentValidationMessage(input.senderDocumentType) });
  if (input.recipientDni && !isIdentityDocumentValid(input.recipientDni, input.recipientDocumentType)) ctx.addIssue({ code: "custom", path: ["recipientDni"], message: identityDocumentValidationMessage(input.recipientDocumentType) });
});

export function buildClientShipmentPersistenceArgs(
  input: z.infer<typeof clientShipmentInputSchema>,
  orderNumber: string,
  code: string,
  calculatedNotes: string,
  accountId: number,
  basePriceEur?: number,
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
    { type: "account" as const, id: accountId, label: "Cliente" },
    input.senderDocumentType,
    input.recipientDocumentType,
    input.docType,
    input.sheetCount,
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

await upsertClient({ name: input.name, lastName: input.lastName, dni: input.dni, documentType: input.documentType, phone, email });
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
    }).superRefine((input, ctx) => {
      if (!isIdentityDocumentValid(input.dni, input.documentType)) ctx.addIssue({ code: "custom", path: ["dni"], message: identityDocumentValidationMessage(input.documentType) });
    }))
    .mutation(async ({ input, ctx }) => {
      const session = await requireFreshAccountSession(ctx.req, "actualizar tu perfil");
      const phone = normalizePhone(input.phone);
      const account = await updateLocalAccountProfile(session.accountId, input.name, input.lastName, input.dni, phone, input.documentType);
      if (!account) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cuenta no encontrada." });
      }
      await upsertClient({ name: input.name, lastName: input.lastName, dni: input.dni, documentType: input.documentType, phone, email: account.email });
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

  createMyShipment: publicProcedure
    .input(clientShipmentInputSchema)
    .mutation(async ({ input, ctx }) => {
      const session = await requireFreshAccountSession(ctx.req, "registrar un envío");
      // Generación automática estricta: Orden de 10 dígitos y código de envío alfanumérico único
      const orderNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();
      const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
      const code = `DOC-${new Date().getFullYear()}-${randomSuffix}`;
      
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
      const calculatedNotes = `Tarifa: ${tariffDesc}. ${input.notes || ""}`.trim();

      const result = await createShipment(
        ...buildClientShipmentPersistenceArgs(input, orderNumber, code, calculatedNotes, session.accountId, totalEur),
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

  changePassword: publicProcedure
    .input(z.object({ currentPassword: z.string().min(1), newPassword: passwordSchema }))
    .mutation(async ({ input, ctx }) => {
      const session = await requireFreshAccountSession(ctx.req, "cambiar tu contraseña");
      const account = await getLocalAccountById(session.accountId);
      if (!account || !(await verifyPassword(input.currentPassword, account.passwordHash))) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "La contraseña actual no es correcta." });
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

      await updateLocalAccountPassword(account.id, await hashPassword(input.newPassword), input.channel);
      await consumeVerificationCode(verification.id);
      return { success: true, message: "Contraseña actualizada correctamente." };
    }),
});
