import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import {
  consumeVerificationCode,
  createLocalAccount,
  createVerificationCode,
  getActiveVerificationCode,
  getLocalAccountByEmail,
  getLocalAccountById,
  getShipmentByOrderAndCode,
  incrementVerificationAttempts,
  updateLocalAccountProfile,
  getShipmentsByAccountId,
  createShipment,
  updateLocalAccountPassword,
} from "./db";
import {
  generateVerificationCode,
  hashPassword,
  hashVerificationCode,
  normalizeEmail,
  normalizePhone,
  sendVerificationEmail,
  sendVerificationSms,
  verifyPassword,
  verificationExpiry,
} from "./localAuth";
import { clearAccountSession, getAccountSession, setAccountSession } from "./localSession";

const passwordSchema = z.string().min(8, "La contraseña debe tener al menos 8 caracteres.");
const emailSchema = z.string().email("Correo electrónico inválido.");

export const accountRouter = router({
  register: publicProcedure
    .input(z.object({
      email: emailSchema,
      phone: z.string().min(8).optional(),
      name: z.string().min(1, "Nombres requeridos"),
      lastName: z.string().min(1, "Apellidos requeridos"),
      dni: z.string().min(8, "DNI requerido"),
      password: passwordSchema,
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

      const account = await createLocalAccount(email, phone, await hashPassword(input.password), input.name, input.lastName, input.dni);
      if (!account) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No se pudo crear la cuenta." });
      }

      setAccountSession(ctx.req, ctx.res, account.id);
      return {
        success: true,
        account: {
          id: account.id,
          email: account.email,
          phone: account.phone,
          name: account.name,
          lastName: account.lastName,
          dni: account.dni,
          createdAt: account.createdAt,
        },
      };
    }),

  login: publicProcedure
    .input(z.object({ email: emailSchema, password: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const account = await getLocalAccountByEmail(normalizeEmail(input.email));
      if (!account || !(await verifyPassword(input.password, account.passwordHash))) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Correo o contraseña inválidos." });
      }

      setAccountSession(ctx.req, ctx.res, account.id);
      return {
        success: true,
        account: {
          id: account.id,
          email: account.email,
          phone: account.phone,
          name: account.name,
          lastName: account.lastName,
          dni: account.dni,
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
      createdAt: account.createdAt,
    };
  }),

  logout: publicProcedure.mutation(({ ctx }) => {
    clearAccountSession(ctx.req, ctx.res);
    return { success: true };
  }),

  updateProfile: publicProcedure
    .input(z.object({
      name: z.string().min(1, "Nombre requerido"),
      lastName: z.string().min(1, "Apellido requerido"),
      dni: z.string().min(8, "DNI requerido"),
      phone: z.string().min(8, "Teléfono requerido"),
    }))
    .mutation(async ({ input, ctx }) => {
      const session = getAccountSession(ctx.req);
      if (!session) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Inicia sesión para actualizar tu perfil." });
      }
      const account = await updateLocalAccountProfile(session.accountId, input.name, input.lastName, input.dni, input.phone);
      if (!account) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cuenta no encontrada." });
      }
      return { success: true, account };
    }),

  myShipments: publicProcedure.query(async ({ ctx }) => {
    const session = getAccountSession(ctx.req);
    if (!session) return [];
    const shipmentsList = await getShipmentsByAccountId(session.accountId);
    return shipmentsList.map(s => ({
      ...s,
      events: JSON.parse(s.events),
    }));
  }),

  createMyShipment: publicProcedure
    .input(z.object({
      senderName: z.string().optional(),
      senderLastName: z.string().optional(),
      senderDni: z.string().optional(),
      senderPhone: z.string().optional(),
      recipientName: z.string().optional(),
      recipientLastName: z.string().optional(),
      recipientDni: z.string().optional(),
      recipientPhone: z.string().optional(),
      notes: z.string().optional(),
      documentCount: z.number().min(1).default(1),
      docType: z.enum(["simple", "apostillado"]).default("apostillado"),
      sheetCount: z.number().min(1).default(1),
      paymentCondition: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const session = getAccountSession(ctx.req);
      if (!session) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Inicia sesión para registrar un envío." });
      }
      // Generación automática estricta: Orden de 10 dígitos y código de envío alfanumérico único
      const orderNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();
      const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
      const code = `DOC-${new Date().getFullYear()}-${randomSuffix}`;
      
      const docType = input.docType || 'apostillado';
      const sheetCount = input.sheetCount || 1;
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
        orderNumber,
        code,
        "En agencia",
        input.senderName,
        input.senderLastName,
        input.senderDni,
        input.senderPhone,
        input.recipientName,
        input.recipientLastName,
        input.recipientDni,
        input.recipientPhone,
        calculatedNotes,
        session.accountId,
        input.paymentCondition
      );
      if (!result) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No se pudo registrar el envío." });
      }
      const shipment = await getShipmentByOrderAndCode(orderNumber, code);
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
      const session = getAccountSession(ctx.req);
      if (!session) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Inicia sesión para cambiar tu contraseña." });
      }
      const account = await getLocalAccountById(session.accountId);
      if (!account || !(await verifyPassword(input.currentPassword, account.passwordHash))) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "La contraseña actual no es correcta." });
      }
      await updateLocalAccountPassword(account.id, await hashPassword(input.newPassword), "email");
      return { success: true, message: "Contraseña cambiada correctamente." };
    }),

  requestPasswordReset: publicProcedure
    .input(z.object({ email: emailSchema, channel: z.enum(["email", "sms"]) }))
    .mutation(async ({ input }) => {
      const email = normalizeEmail(input.email);
      const account = await getLocalAccountByEmail(email);

      // Respuesta genérica para no revelar si existe una cuenta.
      if (!account) {
        return { success: true, message: "Si los datos existen, recibirás un código de verificación." };
      }

      const destination = input.channel === "email" ? account.email : account.phone;
      if (!destination) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "La cuenta no tiene un destino configurado para ese canal." });
      }

      const code = generateVerificationCode();
      try {
        if (input.channel === "email") {
          await sendVerificationEmail(destination, code);
        } else {
          await sendVerificationSms(destination, code);
        }
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
      channel: z.enum(["email", "sms"]),
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
