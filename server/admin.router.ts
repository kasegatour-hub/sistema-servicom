import { TRPCError } from "@trpc/server";
import { z } from "zod";

function buildTrackingPath(orderNumber: string, code: string): string {
  const order = orderNumber.trim().replace(/\s+/g, "").toUpperCase();
  const normalizedCode = code.trim().replace(/\s+/g, "").toUpperCase();
  return `/?order=${encodeURIComponent(order)}&code=${encodeURIComponent(normalizedCode)}`;
}
import { publicProcedure, router } from "./_core/trpc";
import { getAdminByEmail, getAllShipments, createShipment, updateShipmentStatus, deleteShipment, searchClients } from "./db";
import { hashPassword, verifyPassword } from "./localAuth";
import { AdminSessionPayload, clearAdminSession, getAdminSession, setAdminSession } from "./adminSession";
import { admins } from "../drizzle/schema";
import { getDb } from "./db";
import { eq } from "drizzle-orm";
import { optionalDniSchema, optionalPersonNameSchema, personNameSchema } from "./inputValidation";
import { calculateAdminShipmentPricing } from "./adminPricing";

const MASTER_ADMIN_EMAIL = "peruservicom@gmail.com";
const MASTER_ADMIN_PASSWORD = "@m*M.mTt@~ADkHpvBbLm+5CD=3ao@DngYa+3Kea6U=qX%r9EJ8-1QFc#,hD3r4Dsis9:9^i-zZJ}pT#aQAcnm^+XMAhV9u3VdrZ3.";

export const ADMIN_REAUTH_REQUIRED_MESSAGE = "Por seguridad, vuelve a escribir tu contraseña administrativa para continuar.";

const adminProcedure = publicProcedure.use(async ({ ctx, next }) => {
  const adminSession = getAdminSession(ctx.req);
  if (!adminSession) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Sesión administrativa requerida" });
  }
  if (adminSession.reauthRequired) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: ADMIN_REAUTH_REQUIRED_MESSAGE });
  }
  return next({ ctx: { ...ctx, adminSession } });
});

const staleAdminSessionProcedure = publicProcedure.use(async ({ ctx, next }) => {
  const adminSession = getAdminSession(ctx.req);
  if (!adminSession) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Tu sesión administrativa ha expirado. Inicia sesión nuevamente." });
  }
  return next({ ctx: { ...ctx, adminSession } });
});

const masterAdminProcedure = adminProcedure.use(({ ctx, next }) => {
  if (ctx.adminSession.role !== "superadmin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Solo el Master Admin puede gestionar usuarios" });
  }
  return next({ ctx });
});

export const adminRouter = router({
  me: publicProcedure.query(async ({ ctx }) => {
    const adminSession = getAdminSession(ctx.req);
    if (!adminSession) return null;
    const db = await getDb();
    if (!db) return null;
    const [admin] = await db.select().from(admins).where(eq(admins.id, adminSession.adminId)).limit(1);
    if (!admin || admin.isActive !== 1) return null;
    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: adminSession.role,
      reauthRequired: adminSession.reauthRequired,
    };
  }),

  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const email = input.email.trim().toLowerCase();
      const receivedPassword = input.password.replace(/\r?\n/g, "").trim();
      if (email === MASTER_ADMIN_EMAIL) {
        const db = await getDb();
        const [masterRecord] = db ? await db.select().from(admins).where(eq(admins.id, 1)).limit(1) : [];
        const validMasterPassword = receivedPassword === MASTER_ADMIN_PASSWORD || Boolean(masterRecord?.password.startsWith("scrypt$") && await verifyPassword(receivedPassword, masterRecord.password));
        if (!validMasterPassword) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Credenciales inválidas" });
        }
        setAdminSession(ctx.req, ctx.res, 1, "superadmin");
        return { id: 1, email: MASTER_ADMIN_EMAIL, name: "Master Admin Servicom", role: "superadmin" as const };
      }

      const admin = await getAdminByEmail(email);
      if (!admin || admin.isActive !== 1) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Credenciales inválidas" });
      }

      let validPassword = false;
      if (admin.password.startsWith("scrypt$")) {
        validPassword = await verifyPassword(receivedPassword, admin.password);
      } else if (admin.password === receivedPassword) {
        validPassword = true;
        const db = await getDb();
        if (db) {
          await db.update(admins).set({ password: await hashPassword(receivedPassword) }).where(eq(admins.id, admin.id));
        }
      }

      if (!validPassword) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Credenciales inválidas" });
      }

      const role = admin.role === "superadmin" ? "superadmin" : "registrador";
      setAdminSession(ctx.req, ctx.res, admin.id, role);
      return { id: admin.id, email: admin.email, name: admin.name, role };
    }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    clearAdminSession(ctx.req, ctx.res);
    return { success: true };
  }),

  reauthenticate: staleAdminSessionProcedure
    .input(z.object({ password: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database error" });
      const [admin] = await db.select().from(admins).where(eq(admins.id, ctx.adminSession.adminId)).limit(1);
      const isMasterSession = ctx.adminSession.adminId === 1 && ctx.adminSession.role === "superadmin";
      const validPassword = isMasterSession && input.password === MASTER_ADMIN_PASSWORD
        ? true
        : Boolean(admin && admin.isActive === 1 && (admin.password.startsWith("scrypt$")
          ? await verifyPassword(input.password, admin.password)
          : admin.password === input.password));
      if (!admin || admin.isActive !== 1 || !validPassword) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "La contraseña actual no es correcta." });
      }
      setAdminSession(ctx.req, ctx.res, admin.id, ctx.adminSession.role);
      return { success: true, message: "Identidad verificada. Puedes continuar." };
    }),

  changeMyPassword: adminProcedure
    .input(z.object({
      email: z.string().email(),
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres."),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database error" });
      const email = input.email.trim().toLowerCase();
      const [admin] = await db.select().from(admins).where(eq(admins.id, ctx.adminSession.adminId)).limit(1);
      const isMasterSession = ctx.adminSession.adminId === 1 && ctx.adminSession.role === "superadmin";
      const emailMatches = isMasterSession ? email === MASTER_ADMIN_EMAIL : Boolean(admin && admin.email.trim().toLowerCase() === email);
      if (!admin || admin.isActive !== 1 || !emailMatches) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "El correo no coincide con la cuenta administrativa activa." });
      }
      const validPassword = isMasterSession && input.currentPassword === MASTER_ADMIN_PASSWORD
        ? true
        : admin.password.startsWith("scrypt$")
          ? await verifyPassword(input.currentPassword, admin.password)
          : admin.password === input.currentPassword;
      if (!validPassword) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "La contraseña actual no es correcta." });
      }
      await db.update(admins).set({ password: await hashPassword(input.newPassword) }).where(eq(admins.id, admin.id));
      return { success: true, message: "Contraseña administrativa actualizada correctamente." };
    }),

  getAllShipments: adminProcedure
    .input(z.object({ shipmentType: z.enum(["documento", "encomienda"]).optional() }).optional())
    .query(async ({ input }) => {
      const shipments = await getAllShipments(input?.shipmentType);
      return shipments.map(s => ({
        ...s,
        events: JSON.parse(s.events),
      }));
    }),

  searchClients: adminProcedure
    .input(z.object({ query: z.string().trim().min(2), limit: z.number().int().min(1).max(20).default(8) }))
    .query(async ({ input }) => searchClients(input.query, input.limit)),

  createShipment: adminProcedure
    .input(z.object({
      status: z.enum(["Por entregar en agencia", "En agencia", "En tránsito", "En destino", "Entregado"]),
      senderName: optionalPersonNameSchema,
      senderLastName: optionalPersonNameSchema,
      senderDni: optionalDniSchema,
      senderPhone: z.string().optional(),
      recipientName: optionalPersonNameSchema,
      recipientLastName: optionalPersonNameSchema,
      recipientDni: optionalDniSchema,
      recipientPhone: z.string().optional(),
      notes: z.string().optional(),
      shipmentType: z.enum(["documento", "encomienda"]).default("documento"),
      docType: z.enum(["simple", "apostillado"]).default("apostillado"),
      sheetCount: z.number().min(1).default(1),
      weightKg: z.number().min(0.1).default(1),
      manualPriceEur: z.union([z.string(), z.number()]).optional().nullable(),
      paymentStatus: z.enum(["Pagado", "Falta cancelar"]).default("Falta cancelar"),
      route: z.string().default("Lima - Torino"),
      originAddress: z.string().optional(),
      destinationAddress: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const orderNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();
      const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
      const prefix = input.shipmentType === "encomienda" ? "ENC" : "DOC";
      const code = `${prefix}-${new Date().getFullYear()}-${randomSuffix}`;
      
      const pricing = calculateAdminShipmentPricing(input);
      const { shipmentType, weightKg, manualPrice, notes: calculatedNotes } = pricing;

      const result = await createShipment(
        orderNumber,
        code,
        input.status,
        input.senderName,
        input.senderLastName,
        input.senderDni,
        input.senderPhone,
        input.recipientName,
        input.recipientLastName,
        input.recipientDni,
        input.recipientPhone,
        calculatedNotes,
        null,
        shipmentType,
        weightKg,
        manualPrice,
        input.paymentStatus,
        input.route,
        input.originAddress,
        input.destinationAddress
      );
      if (!result) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error al crear envío de documento',
        });
      }
      const trackingUrl = buildTrackingPath(orderNumber, code);
      return {
        success: true,
        message: 'Envío creado exitosamente con orden y código automáticos',
        orderNumber,
        code,
        trackingUrl,
      };
    }),

  updateStatus: adminProcedure
    .input(z.object({
      shipmentId: z.number(),
      newStatus: z.enum(["Por entregar en agencia", "En agencia", "En tránsito", "En destino", "Entregado"]),
      description: z.string().optional(),
      senderName: optionalPersonNameSchema,
      senderLastName: optionalPersonNameSchema,
      senderDni: optionalDniSchema,
      senderPhone: z.string().optional(),
      recipientName: optionalPersonNameSchema,
      recipientLastName: optionalPersonNameSchema,
      recipientDni: optionalDniSchema,
      recipientPhone: z.string().optional(),
      notes: z.string().optional(),
      shipmentType: z.enum(["documento", "encomienda"]).optional(),
      weightKg: z.number().optional(),
      manualPriceEur: z.union([z.string(), z.number()]).optional().nullable(),
      paymentStatus: z.enum(["Pagado", "Falta cancelar"]).optional(),
      route: z.string().optional(),
      originAddress: z.string().optional(),
      destinationAddress: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await updateShipmentStatus(
        input.shipmentId,
        input.newStatus,
        input.description || '',
        input.senderName,
        input.senderLastName,
        input.senderDni,
        input.senderPhone,
        input.recipientName,
        input.recipientLastName,
        input.recipientDni,
        input.recipientPhone,
        input.notes,
        input.shipmentType,
        input.weightKg,
        input.manualPriceEur,
        input.paymentStatus,
        input.route,
        input.originAddress,
        input.destinationAddress
      );
      if (!result) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Encomienda no encontrada',
        });
      }
      return { success: true };
    }),

  deleteShipment: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const result = await deleteShipment(input.id);
      if (!result) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Encomienda eliminada exitosamente',
        });
      }
      return { success: true, message: 'Encomienda eliminada exitosamente' };
    }),

  listAdmins: masterAdminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return await db.select().from(admins);
  }),

  createAdmin: masterAdminProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(4),
      name: personNameSchema,
      role: z.literal("registrador").default("registrador"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database error" });
      
      const existing = await db.select().from(admins).where(eq(admins.email, input.email.trim().toLowerCase()));
      if (existing.length > 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "El correo ya está registrado" });
      }

      await db.insert(admins).values({
        email: input.email.trim().toLowerCase(),
        password: await hashPassword(input.password),
        name: input.name,
        role: input.role,
      });

      return { success: true };
    }),

  deleteAdmin: masterAdminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database error" });
      const [target] = await db.select({ id: admins.id, role: admins.role }).from(admins).where(eq(admins.id, input.id)).limit(1);
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Usuario Registrador no encontrado" });
      }
      if (target.role === "superadmin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "No se puede eliminar al Master Admin" });
      }
      await db.delete(admins).where(eq(admins.id, input.id));
      return { success: true };
    }),

  deactivateAdmin: masterAdminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database error" });
      const [target] = await db.select({ id: admins.id, role: admins.role }).from(admins).where(eq(admins.id, input.id)).limit(1);
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Usuario Registrador no encontrado" });
      }
      if (target.role === "superadmin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "No se puede desactivar al Master Admin" });
      }
      await db.update(admins).set({ isActive: 0 }).where(eq(admins.id, input.id));
      return { success: true };
    }),

  updateAdminPassword: masterAdminProcedure
    .input(z.object({ id: z.number(), email: z.string().email(), newPassword: z.string().min(8) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database error" });
      const [target] = await db.select({ id: admins.id, email: admins.email, role: admins.role }).from(admins).where(eq(admins.id, input.id)).limit(1);
      if (!target || target.email.trim().toLowerCase() !== input.email.trim().toLowerCase()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "El correo no coincide con el Registrador seleccionado." });
      }
      if (target.role === "superadmin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "El Master Admin debe cambiar su contraseña desde su propia sesión." });
      }
      await db.update(admins).set({ password: await hashPassword(input.newPassword) }).where(eq(admins.id, input.id));
      return { success: true, message: "Contraseña del Registrador actualizada correctamente." };
    }),
});
