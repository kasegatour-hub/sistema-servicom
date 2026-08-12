import { TRPCError } from "@trpc/server";
import { z } from "zod";

function buildTrackingPath(orderNumber: string, code: string): string {
  const order = orderNumber.trim().replace(/\s+/g, "").toUpperCase();
  const normalizedCode = code.trim().replace(/\s+/g, "").toUpperCase();
  return `/?order=${encodeURIComponent(order)}&code=${encodeURIComponent(normalizedCode)}`;
}
import { publicProcedure, router } from "./_core/trpc";
import { getAdminByEmail, getAllShipments, createShipment, updateShipmentStatus, deleteShipment } from "./db";
import { hashPassword, verifyPassword } from "./localAuth";
import { clearAdminSession, getAdminSession, setAdminSession } from "./adminSession";
import { admins } from "../drizzle/schema";
import { getDb } from "./db";
import { eq } from "drizzle-orm";
import { optionalDniSchema, optionalPersonNameSchema, personNameSchema } from "./inputValidation";

const adminProcedure = publicProcedure.use(({ ctx, next }) => {
  const adminSession = getAdminSession(ctx.req);
  if (!adminSession) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Sesión administrativa requerida" });
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
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const email = input.email.trim().toLowerCase();
      const receivedPassword = input.password.replace(/\r?\n/g, "").trim();
      const masterEmail = "peruservicom@gmail.com";
      const masterPassword = "@m*M.mTt@~ADkHpvBbLm+5CD=3ao@DngYa+3Kea6U=qX%r9EJ8-1QFc#,hD3r4Dsis9:9^i-zZJ}pT#aQAcnm^+XMAhV9u3VdrZ3.";

      if (email === masterEmail && receivedPassword === masterPassword) {
        setAdminSession(ctx.req, ctx.res, 1, "superadmin");
        return { id: 1, email: masterEmail, name: "Master Admin Servicom", role: "superadmin" as const };
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

  getAllShipments: adminProcedure
    .query(async () => {
      const shipments = await getAllShipments();
      return shipments.map(s => ({
        ...s,
        events: JSON.parse(s.events),
      }));
    }),

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
      documentCount: z.number().min(1).default(1),
      docType: z.enum(["simple", "apostillado"]).default("apostillado"),
      sheetCount: z.number().min(1).default(1),
      paymentCondition: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
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
        input.paymentCondition
      );
      if (!result) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error al crear envío de documento',
        });
      }
      const trackingUrl = buildTrackingPath(orderNumber, code);
      return { success: true, message: 'Envío de documento creado exitosamente con orden y código automáticos', trackingUrl };
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
      paymentCondition: z.string().optional(),
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
        input.paymentCondition,
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
    .input(z.object({ id: z.number(), newPassword: z.string().min(4) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database error" });
      await db.update(admins).set({ password: await hashPassword(input.newPassword) }).where(eq(admins.id, input.id));
      return { success: true };
    }),
});
