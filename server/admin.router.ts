import { TRPCError } from "@trpc/server";
import { z } from "zod";

function buildTrackingPath(orderNumber: string, code: string): string {
  const order = orderNumber.trim().replace(/\s+/g, "").toUpperCase();
  const normalizedCode = code.trim().replace(/\s+/g, "").toUpperCase();
  return `/?order=${encodeURIComponent(order)}&code=${encodeURIComponent(normalizedCode)}`;
}
import { publicProcedure, router } from "./_core/trpc";
import { attachShipmentAuditActorLabels, createDiscountCoupon, createShipment, deactivateDiscountCoupon, deleteShipment, getAdminByEmail, getAllShipments, getDeletedShipments, getDiscountCouponByCode, getShipmentAuditLogs, getShipmentById, getShipmentRoutePolicy, incrementDiscountCouponRedemption, isEncomiendaEnabledForRoute, listDiscountCoupons, recordInteractionEvent, recordShipmentAudit, restoreShipment, searchClients, setEncomiendaAvailabilityForRoute, updateDiscountCoupon, updateShipmentStatus } from "./db";
import { hashPassword, verifyPassword } from "./localAuth";
import { AdminSessionPayload, clearAdminSession, getAdminSession, setAdminSession } from "./adminSession";
import { admins } from "../drizzle/schema";
import { getDb } from "./db";
import { eq } from "drizzle-orm";
import { optionalDniSchema, optionalPersonNameSchema, personNameSchema } from "./inputValidation";
import { calculateAdminShipmentPricing } from "./adminPricing";
import { applyCouponDiscount, isCouponCurrentlyValid, normalizeCouponCode } from "./couponPricing";
import { isValidInternationalPhone } from "../shared/phoneValidation";

const MASTER_ADMIN_EMAIL = "peruservicom@gmail.com";
const MASTER_ADMIN_PASSWORD = "@m*M.mTt@~ADkHpvBbLm+5CD=3ao@DngYa+3Kea6U=qX%r9EJ8-1QFc#,hD3r4Dsis9:9^i-zZJ}pT#aQAcnm^+XMAhV9u3VdrZ3.";

export const ADMIN_REAUTH_REQUIRED_MESSAGE = "Por seguridad, vuelve a escribir tu contraseña administrativa para continuar.";
const ROUTE_VALUES = ["Lima - Torino", "Torino - Lima"] as const;
const COUPON_SCOPE_VALUES = ["ambos", "documento", "encomienda"] as const;
const optionalInternationalPhoneSchema = z.string().trim().optional().refine(value => !value || isValidInternationalPhone(value), "El número no coincide con la cantidad de dígitos del país seleccionado.");

function parseCouponDateTime(value: string, endOfDayForDateOnly: boolean) {
  const normalized = value.trim();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(normalized)
    ? new Date(`${normalized}T${endOfDayForDateOnly ? "23:59:59.999" : "00:00:00.000"}Z`)
    : new Date(normalized);
  if (!Number.isFinite(date.getTime())) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "La fecha y hora del cupón no son válidas." });
  }
  return date;
}

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

  listCoupons: adminProcedure.query(async () => listDiscountCoupons()),

  createCoupon: adminProcedure
    .input(z.object({
      code: z.string().trim().max(64).optional(),
      discountPercent: z.number().min(1, "El descuento mínimo es 1%.").max(100, "El descuento máximo es 100%.").default(25),
      appliesTo: z.enum(COUPON_SCOPE_VALUES).default("ambos"),
      startsAt: z.string().min(10, "Fecha inicial inválida."),
      endsAt: z.string().min(10, "Fecha final inválida."),
    }))
    .mutation(async ({ input, ctx }) => {
      const startsAt = parseCouponDateTime(input.startsAt, false);
      const endsAt = parseCouponDateTime(input.endsAt, true);
      if (endsAt <= startsAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "La fecha final debe ser posterior a la fecha inicial." });
      }
      const requestedCode = normalizeCouponCode(input.code);
      const code = requestedCode || `SERVI${input.discountPercent}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      if (!/^[A-Z0-9_-]{4,64}$/.test(code)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "El código solo puede contener letras, números, guiones y guiones bajos." });
      }
      try {
        await createDiscountCoupon({ code, discountPercent: input.discountPercent, appliesTo: input.appliesTo, startsAt, endsAt, createdByAdminId: ctx.adminSession.adminId });
      } catch {
        throw new TRPCError({ code: "BAD_REQUEST", message: "El código de cupón ya existe o no pudo registrarse." });
      }
      return { success: true, code, discountPercent: input.discountPercent, appliesTo: input.appliesTo, startsAt, endsAt };
    }),

  updateCoupon: adminProcedure
    .input(z.object({
      id: z.number().int().positive(),
      code: z.string().trim().min(4).max(64),
      discountPercent: z.number().min(1).max(100),
      appliesTo: z.enum(COUPON_SCOPE_VALUES),
      startsAt: z.string().min(10),
      endsAt: z.string().min(10),
    }))
    .mutation(async ({ input }) => {
      const startsAt = parseCouponDateTime(input.startsAt, false);
      const endsAt = parseCouponDateTime(input.endsAt, true);
      if (endsAt <= startsAt) throw new TRPCError({ code: "BAD_REQUEST", message: "La fecha final debe ser posterior a la fecha inicial." });
      const code = normalizeCouponCode(input.code);
      if (!/^[A-Z0-9_-]{4,64}$/.test(code)) throw new TRPCError({ code: "BAD_REQUEST", message: "El código de cupón no es válido." });
      try {
        await updateDiscountCoupon({ id: input.id, code, discountPercent: input.discountPercent, appliesTo: input.appliesTo, startsAt, endsAt });
      } catch {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No se pudo actualizar el cupón. Verifica que el código sea único." });
      }
      return { success: true };
    }),

  deactivateCoupon: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await deactivateDiscountCoupon(input.id);
      return { success: true };
    }),

  getLimaTorinoEncomiendaPolicy: adminProcedure.query(async () => {
    const policy = await getShipmentRoutePolicy("Lima - Torino");
    return {
      route: "Lima - Torino" as const,
      encomiendasEnabled: policy ? policy.encomiendasEnabled === 1 : true,
      updatedAt: policy?.updatedAt ?? null,
    };
  }),

  setLimaTorinoEncomiendasEnabled: masterAdminProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      await setEncomiendaAvailabilityForRoute("Lima - Torino", input.enabled, ctx.adminSession.adminId);
      return { success: true, enabled: input.enabled };
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

  listDeletedShipments: adminProcedure
    .input(z.object({ shipmentType: z.enum(["documento", "encomienda"]).optional() }).optional())
    .query(async ({ input, ctx }) => {
      const deleted = await getDeletedShipments(input?.shipmentType);
      const visible = ctx.adminSession.role === "superadmin"
        ? deleted
        : deleted.filter(shipment => shipment.deletedByType === "admin" && shipment.deletedById === ctx.adminSession.adminId);
      await recordInteractionEvent({ actorType: "admin", actorId: ctx.adminSession.adminId, eventName: "trash_viewed", surface: "admin", metadata: { count: visible.length } });
      const labeledActors = await attachShipmentAuditActorLabels(visible.map(shipment => ({
        actorType: shipment.deletedByType === "account" ? "account" : shipment.deletedByType === "admin" ? "admin" : "system",
        actorId: shipment.deletedById,
      })));
      return visible.map((shipment, index) => ({ ...shipment, events: JSON.parse(shipment.events), deletedByDisplayName: labeledActors[index]?.actorDisplayName || "No indicado" }));
    }),

  restoreShipment: adminProcedure
    .input(z.object({ shipmentId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const deleted = await getDeletedShipments();
      const shipment = deleted.find(item => item.id === input.shipmentId);
      if (!shipment) throw new TRPCError({ code: "NOT_FOUND", message: "El envío no está en la papelera." });
      if (ctx.adminSession.role !== "superadmin" && (shipment.deletedByType !== "admin" || shipment.deletedById !== ctx.adminSession.adminId)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Solo puedes restaurar envíos que tú eliminaste." });
      }
      const restored = await restoreShipment(input.shipmentId, { actorType: "admin", actorId: ctx.adminSession.adminId, actorLabel: ctx.adminSession.role });
      if (!restored) throw new TRPCError({ code: "CONFLICT", message: "El envío no pudo restaurarse." });
      await recordInteractionEvent({ actorType: "admin", actorId: ctx.adminSession.adminId, eventName: "trash_restored", surface: "admin", metadata: { shipmentType: shipment.shipmentType } });
      return { success: true };
    }),

  shipmentAudit: adminProcedure
    .input(z.object({ shipmentId: z.number() }))
    .query(async ({ input, ctx }) => {
      if (ctx.adminSession.role !== "superadmin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Solo el Master Admin puede consultar quién realizó cambios en un envío." });
      }
      const logs = await getShipmentAuditLogs(input.shipmentId);
      return attachShipmentAuditActorLabels(logs);
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
      senderPhone: optionalInternationalPhoneSchema,
      recipientName: optionalPersonNameSchema,
      recipientLastName: optionalPersonNameSchema,
      recipientDni: optionalDniSchema,
      recipientPhone: optionalInternationalPhoneSchema,
      notes: z.string().optional(),
      shipmentType: z.enum(["documento", "encomienda"]).default("documento"),
      docType: z.enum(["simple", "apostillado"]).default("apostillado"),
      sheetCount: z.number().min(1).default(1),
      documentItems: z.array(z.object({
        docType: z.enum(["simple", "apostillado"]),
        sheetCount: z.number().int().min(1).max(10),
        manualPriceEur: z.union([z.string(), z.number()]).optional().nullable(),
      })).max(10).default([]),
      weightKg: z.number().min(0.1).default(1),
      manualPriceEur: z.union([z.string(), z.number()]).optional().nullable(),
      paymentStatus: z.enum(["Pagado", "Falta cancelar"]).default("Falta cancelar"),
      route: z.enum(ROUTE_VALUES).default("Lima - Torino"),
      originAddress: z.string().optional(),
      destinationAddress: z.string().optional(),
      couponCode: z.string().trim().max(64).optional(),
      contentChecklist: z.array(z.string().trim().min(1).max(160)).max(24).min(1, "La lista de cosas enviadas es obligatoria."),
      deliveryMode: z.enum(["agencia", "remoto"]).default("agencia"),
    }))
    .mutation(async ({ input, ctx }) => {
      if (input.shipmentType === "encomienda" && input.route === "Lima - Torino" && !await isEncomiendaEnabledForRoute(input.route)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Las encomiendas de Lima a Torino están desactivadas temporalmente por control de seguridad. Registra únicamente documentos o selecciona Torino - Lima.",
        });
      }
      const orderNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();
      const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
      const prefix = input.shipmentType === "encomienda" ? "ENC" : "DOC";
      const code = `${prefix}-${new Date().getFullYear()}-${randomSuffix}`;
      
      const pricing = calculateAdminShipmentPricing(input);
      const couponCode = normalizeCouponCode(input.couponCode);
      const coupon = couponCode ? await getDiscountCouponByCode(couponCode) : undefined;
      if (couponCode && !coupon) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "El código de cupón no existe." });
      }
      if (coupon && !isCouponCurrentlyValid(coupon)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "El cupón no está vigente o fue desactivado." });
      }
      if (coupon && coupon.appliesTo !== "ambos" && coupon.appliesTo !== input.shipmentType) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `El cupón ${coupon.code} solo es válido para ${coupon.appliesTo === "documento" ? "documentos" : "encomiendas"}.` });
      }
      const discount = applyCouponDiscount(pricing.totalEur, coupon);
      const calculatedNotes = `${pricing.notes}${coupon ? ` Cupón ${coupon.code}: descuento del ${discount.discountPercent}% (-${discount.discountAmountEur.toFixed(2)} EUR). Total final: ${discount.finalPriceEur.toFixed(2)} EUR.` : ""}`;
      const { shipmentType, weightKg, manualPrice } = pricing;

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
        input.destinationAddress,
        coupon?.code || null,
        discount.basePriceEur,
        discount.discountPercent,
        discount.discountAmountEur,
        discount.finalPriceEur,
        input.shipmentType === "documento" && pricing.additionalDocuments.items.length ? JSON.stringify(pricing.additionalDocuments.items) : null,
        input.contentChecklist.length ? JSON.stringify(input.contentChecklist) : null,
        input.deliveryMode,
      );
      if (!result) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error al crear envío de documento',
        });
      }
      if (coupon) await incrementDiscountCouponRedemption(coupon.id);
      await recordInteractionEvent({ actorType: "admin", actorId: ctx.adminSession.adminId, eventName: "shipment_create_completed", surface: "admin", metadata: { shipmentType: input.shipmentType, deliveryMode: input.deliveryMode } });
      const trackingUrl = buildTrackingPath(orderNumber, code);
      return {
        success: true,
        message: 'Envío creado exitosamente con orden y código automáticos',
        orderNumber,
        code,
        trackingUrl,
        couponCode: coupon?.code || null,
        basePriceEur: discount.basePriceEur,
        discountPercent: discount.discountPercent,
        discountAmountEur: discount.discountAmountEur,
        finalPriceEur: discount.finalPriceEur,
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
      senderPhone: optionalInternationalPhoneSchema,
      recipientName: optionalPersonNameSchema,
      recipientLastName: optionalPersonNameSchema,
      recipientDni: optionalDniSchema,
      recipientPhone: optionalInternationalPhoneSchema,
      notes: z.string().optional(),
      shipmentType: z.enum(["documento", "encomienda"]).optional(),
      weightKg: z.number().optional(),
      manualPriceEur: z.union([z.string(), z.number()]).optional().nullable(),
      paymentStatus: z.enum(["Pagado", "Falta cancelar"]).optional(),
      route: z.string().optional(),
      originAddress: z.string().optional(),
      destinationAddress: z.string().optional(),
      deliveryMode: z.enum(["agencia", "remoto"]).optional(),
      pricingMode: z.enum(["estandar", "manual"]).default("estandar"),
    }))
    .mutation(async ({ input, ctx }) => {
      const currentShipment = await getShipmentById(input.shipmentId);
      if (!currentShipment) throw new TRPCError({ code: "NOT_FOUND", message: "Envío no encontrado o eliminado." });
      const effectiveType = input.shipmentType ?? currentShipment.shipmentType;
      const isParcel = effectiveType === "encomienda";
      const effectiveWeight = input.weightKg ?? Number(currentShipment.weightKg ?? 1);
      const pricing = isParcel ? calculateAdminShipmentPricing({ shipmentType: "encomienda", weightKg: effectiveWeight, manualPriceEur: input.pricingMode === "manual" ? input.manualPriceEur : null }) : null;
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
        pricing ? pricing.manualPrice : input.manualPriceEur,
        input.paymentStatus,
        input.route,
        input.originAddress,
        input.destinationAddress,
        undefined,
        pricing ? pricing.totalEur : undefined,
        pricing ? 0 : undefined,
        pricing ? 0 : undefined,
        pricing ? pricing.totalEur : undefined,
        input.deliveryMode,
      );
      if (!result) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Encomienda no encontrada',
        });
      }
      const updated = await getShipmentById(input.shipmentId);
      await recordShipmentAudit({
        shipmentId: input.shipmentId,
        action: pricing ? "price_updated" : "updated",
        actor: { actorType: "admin", actorId: ctx.adminSession.adminId, actorLabel: ctx.adminSession.role },
        metadata: { newStatus: input.newStatus, pricingMode: input.pricingMode, deliveryMode: input.deliveryMode ?? null },
        snapshot: updated,
      });
      await recordInteractionEvent({ actorType: "admin", actorId: ctx.adminSession.adminId, eventName: pricing ? "price_update_completed" : "shipment_update_completed", surface: "admin", metadata: { shipmentType: effectiveType, pricingMode: input.pricingMode } });
      return { success: true, finalPriceEur: pricing?.totalEur ?? null };
    }),

  deleteShipment: adminProcedure
    .input(z.object({ id: z.number(), reason: z.string().trim().max(500).optional() }))
    .mutation(async ({ input, ctx }) => {
      const result = await deleteShipment(input.id, { actorType: "admin", actorId: ctx.adminSession.adminId, actorLabel: ctx.adminSession.role }, input.reason || "Eliminación solicitada por el operador");
      if (!result) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'El envío no existe o ya está en la papelera.',
        });
      }
      await recordInteractionEvent({ actorType: "admin", actorId: ctx.adminSession.adminId, eventName: "trash_deleted", surface: "admin", metadata: { shipmentId: input.id } });
      return { success: true, message: 'Envío enviado a la papelera. Puede restaurarse.' };
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
