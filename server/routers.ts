import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { completeShipmentSignature, createOrRefreshShipmentSignatureRequest, getShipmentByOrderAndCode, getShipmentById, getShipmentSignatureByShipmentId, listInteractionEvents, recordInteractionEvent, recordShipmentAudit } from "./db";
import { createSignatureToken, isSignatureTokenExpired, signatureTokenMatches } from "./signatureTokens";
import { parseSignatureStrokes } from "../shared/signature";
import { adminRouter } from "./admin.router";
import { accountRouter } from "./account.router";
import { getAdminSession } from "./adminSession";
import { getAccountSession } from "./localSession";
import { deriveInteractionInsights } from "./analytics";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  admin: adminRouter,
  account: accountRouter,

  analytics: router({
    track: publicProcedure
      .input(z.object({
        eventName: z.enum(["tracking_search_started", "tracking_search_completed", "shipment_create_started", "shipment_create_completed", "shipment_update_completed", "price_update_completed", "signature_started", "signature_completed", "receipt_viewed", "trash_viewed", "trash_deleted", "trash_restored", "restore_completed"]),
        surface: z.enum(["home", "account", "admin", "receipt"]),
        sessionKeyHash: z.string().max(128).optional(),
        metadata: z.object({}).catchall(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const adminSession = getAdminSession(ctx.req);
        const accountSession = getAccountSession(ctx.req);
        const actorType = adminSession ? "admin" : accountSession ? "account" : "anonymous";
        const actorId = adminSession?.adminId ?? accountSession?.accountId ?? null;
        await recordInteractionEvent({ actorType, actorId, sessionKeyHash: input.sessionKeyHash, eventName: input.eventName, surface: input.surface, metadata: input.metadata });
        return { success: true };
      }),

    myInsights: publicProcedure.query(async ({ ctx }) => {
      const accountSession = getAccountSession(ctx.req);
      if (!accountSession) return deriveInteractionInsights([], 30);
      const events = await listInteractionEvents(new Date(Date.now() - 30 * 86_400_000));
      return deriveInteractionInsights(events.filter(event => event.actorType === "account" && event.actorId === accountSession.accountId), 30);
    }),

    adminInsights: publicProcedure.query(async ({ ctx }) => {
      const adminSession = getAdminSession(ctx.req);
      if (!adminSession || adminSession.reauthRequired) throw new TRPCError({ code: "UNAUTHORIZED", message: "Sesión administrativa requerida" });
      const events = await listInteractionEvents(new Date(Date.now() - 30 * 86_400_000));
      return deriveInteractionInsights(events, 30);
    }),
  }),

  shipment: router({
    search: publicProcedure
      .input(z.object({
        orderNumber: z.string().min(1, "Número de orden requerido"),
        code: z.string().min(1, "Código requerido"),
      }))
      .query(async ({ input }) => {
        const shipment = await getShipmentByOrderAndCode(input.orderNumber, input.code);
        await recordInteractionEvent({ actorType: "anonymous", eventName: "tracking_search_completed", surface: "home", metadata: { found: Boolean(shipment) } });
        if (!shipment) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Envío no encontrado',
          });
        }
        const signature = await getShipmentSignatureByShipmentId(shipment.id);
        return {
          ...shipment,
          events: JSON.parse(shipment.events),
          signature: signature ? {
            status: signature.status,
            signerName: signature.signerName,
            signerDni: signature.signerDni,
            signedAt: signature.signedAt,
          } : null,
        };
      }),

    requestSignature: publicProcedure
      .input(z.object({
        orderNumber: z.string().min(1, "Número de orden requerido"),
        code: z.string().min(1, "Código requerido"),
      }))
      .mutation(async ({ input }) => {
        const shipment = await getShipmentByOrderAndCode(input.orderNumber, input.code);
        if (!shipment) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Envío no encontrado" });
        }
        if (shipment.deliveryMode !== "remoto") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Este envío se entrega en agencia y no requiere firma remota." });
        }
        const currentSignature = await getShipmentSignatureByShipmentId(shipment.id);
        if (currentSignature?.status === "signed") {
          return {
            status: "signed" as const,
            signedAt: currentSignature.signedAt,
            signerName: currentSignature.signerName,
            signerDni: currentSignature.signerDni,
          };
        }

        const token = createSignatureToken();
        const saved = await createOrRefreshShipmentSignatureRequest({
          shipmentId: shipment.id,
          tokenHash: token.tokenHash,
          expiresAt: token.expiresAt,
        });
        await recordShipmentAudit({ shipmentId: shipment.id, action: "signature_requested", actor: { actorType: "public" }, metadata: { deliveryMode: shipment.deliveryMode, consentTextVersion: "servicom-remoto-v1" } });
        await recordInteractionEvent({ actorType: "anonymous", eventName: "signature_started", surface: "receipt", metadata: { shipmentType: shipment.shipmentType, deliveryMode: shipment.deliveryMode } });
        if (!saved) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No se pudo preparar la firma" });
        }
        return {
          status: "pending" as const,
          token: token.token,
          expiresAt: token.expiresAt,
        };
      }),

    completeSignature: publicProcedure
      .input(z.object({
        orderNumber: z.string().min(1, "Número de orden requerido"),
        code: z.string().min(1, "Código requerido"),
        token: z.string().min(20).max(128),
        signerName: z.string().trim().min(2, "Ingresa el nombre completo del firmante").max(255).regex(/^[A-Za-zÀ-ÿ\s.'-]+$/, "El nombre del firmante solo puede contener letras y espacios"),
        signerDni: z.string().trim().max(20).regex(/^$|^[0-9A-Za-z-]+$/, "El documento del firmante no es válido").optional(),
        signerEmail: z.string().trim().email("El correo del firmante no es válido").optional(),
        signerPhone: z.string().trim().min(8).max(32).optional(),
        signatureStrokes: z.string().min(20, "Dibuja tu firma antes de continuar").max(20000),
      }))
      .mutation(async ({ input }) => {
        const shipment = await getShipmentByOrderAndCode(input.orderNumber, input.code);
        if (!shipment) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Envío no encontrado" });
        }
        if (shipment.deliveryMode !== "remoto") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Este envío se entrega en agencia y no admite firma remota." });
        }
        const signature = await getShipmentSignatureByShipmentId(shipment.id);
        if (!signature || signature.status === "signed") {
          throw new TRPCError({ code: "CONFLICT", message: signature?.status === "signed" ? "Este envío ya tiene una firma electrónica" : "Solicita una nueva sesión de firma" });
        }
        if (isSignatureTokenExpired(signature.requestTokenExpiresAt) || !signatureTokenMatches(input.token, signature.requestTokenHash)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "La sesión de firma expiró. Solicita una nueva firma." });
        }
        try {
          parseSignatureStrokes(input.signatureStrokes);
        } catch (error: any) {
          throw new TRPCError({ code: "BAD_REQUEST", message: error.message || "La firma no es válida" });
        }

        const saved = await completeShipmentSignature({
          shipmentId: shipment.id,
          tokenHash: signature.requestTokenHash,
          signerName: input.signerName.trim(),
          signerDni: input.signerDni?.trim() || null,
          signerEmail: input.signerEmail?.trim() || null,
          signerPhone: input.signerPhone?.trim() || null,
          consentTextVersion: "servicom-remoto-v1",
          consentAcceptedAt: new Date(),
          signatureStrokes: input.signatureStrokes,
        });
        if (!saved) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "La sesión de firma expiró o ya fue utilizada" });
        }
        await recordInteractionEvent({ actorType: "anonymous", eventName: "signature_completed", surface: "receipt", metadata: { shipmentType: shipment.shipmentType, deliveryMode: shipment.deliveryMode } });
        return {
          status: "signed" as const,
          signedAt: saved.signedAt,
          signerName: saved.signerName,
          signerDni: saved.signerDni,
        };
      }),

    getById: publicProcedure
      .input(z.object({
        id: z.number(),
      }))
      .query(async ({ input }) => {
        const shipment = await getShipmentById(input.id);
        if (!shipment) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Envío no encontrado',
          });
        }
        const signature = await getShipmentSignatureByShipmentId(shipment.id);
        return {
          ...shipment,
          events: JSON.parse(shipment.events),
          signature: signature ? {
            status: signature.status,
            signerName: signature.signerName,
            signerDni: signature.signerDni,
            signedAt: signature.signedAt,
          } : null,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
