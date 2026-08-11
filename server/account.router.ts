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
  incrementVerificationAttempts,
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

      const account = await createLocalAccount(email, phone, await hashPassword(input.password));
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
          createdAt: account.createdAt,
        },
      };
    }),

  me: publicProcedure.query(async ({ ctx }) => {
    const session = getAccountSession(ctx.req);
    if (!session) return null;
    const account = await getLocalAccountById(session.accountId);
    if (!account) return null;
    return { id: account.id, email: account.email, phone: account.phone, createdAt: account.createdAt };
  }),

  logout: publicProcedure.mutation(({ ctx }) => {
    clearAccountSession(ctx.req, ctx.res);
    return { success: true };
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
