import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { completeInvitationLetterSignature, completeRecipientChangeRequest, completeShipmentSignature, createOrRefreshShipmentSignatureRequest, getInvitationLetterById, getInvitationLetterSignatureByLetterId, getLocalAccountById, getRecipientChangeRequestById, getShipmentByOrderAndCode, getShipmentById, getShipmentSignatureByShipmentId, listInteractionEvents, notifyShipmentEvent, recordInteractionEvent, recordShipmentAudit } from "./db";
import { createSignatureToken, isSignatureTokenExpired, signatureTokenMatches } from "./signatureTokens";
import { parseSignatureStrokes } from "../shared/signature";
import { adminRouter } from "./admin.router";
import { accountRouter } from "./account.router";
import { feedbackRouter } from "./feedback.router";
import { getAdminSession } from "./adminSession";
import { getAccountSession } from "./localSession";
import { deriveInteractionInsights } from "./analytics";
import { sendShipmentSignatureEmail } from "./localAuth";
import { searchOfficialOlvaAgencies, searchOfficialShalomAgencies } from "./agencyDirectory";
import { transferRouter } from "./transfer.router";
import { notificationRouter } from "./notification.router";
import { accountingRouter } from "./accounting.router";

const isKasegaOrMagdaShipment = (shipment: { registeredById?: number | null; registeredByEmail?: string | null }) =>
  [210001, 210002].includes(Number(shipment.registeredById)) || /^(magda\.barreto\.alv@gmail\.com|kasegatour@gmail\.com)$/i.test(String(shipment.registeredByEmail || "").trim());

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
  feedback: feedbackRouter,
  transfers: transferRouter,
  notifications: notificationRouter,
  accounting: accountingRouter,
  agencies: router({
    olva: publicProcedure.input(z.object({ query: z.string().max(120).default("") })).query(async ({ input }) => {
      try {
        const agencies = await searchOfficialOlvaAgencies(input.query);
        return { agencies, sourceUrl: "https://www.olvacourier.com/ubicanos/", refreshedAt: new Date() };
      } catch (error: any) {
        throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: error?.message || "No fue posible consultar las agencias de Olva por el momento." });
      }
    }),
    shalom: publicProcedure.input(z.object({ query: z.string().max(120).default("") })).query(async ({ input }) => {
      try {
        const agencies = await searchOfficialShalomAgencies(input.query);
        return { agencies, sourceUrl: "https://shalom.com.pe/agencias/", refreshedAt: new Date() };
      } catch (error: any) {
        throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: error?.message || "No fue posible consultar las agencias de Shalom por el momento." });
      }
    }),
  }),

  invitationSignature: router({
    get: publicProcedure
      .input(z.object({ letterId: z.number().int().positive(), token: z.string().min(20).max(128) }))
      .query(async ({ input }) => {
        const [letter, signature] = await Promise.all([getInvitationLetterById(input.letterId), getInvitationLetterSignatureByLetterId(input.letterId)]);
        if (!letter || letter.deletedAt || !signature) throw new TRPCError({ code: "NOT_FOUND", message: "La solicitud de firma no existe." });
        if (signature.status !== "signed" && (isSignatureTokenExpired(signature.requestTokenExpiresAt) || !signatureTokenMatches(input.token, signature.requestTokenHash))) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "El enlace de firma expiró o no es válido." });
        }
        const data = JSON.parse(letter.letterData) as { inviter: { firstName: string; lastName: string; email: string }; invitee: { firstName: string; lastName: string } };
        return {
          id: letter.id,
          inviterName: `${data.inviter.firstName} ${data.inviter.lastName}`.trim(),
          inviterEmail: data.inviter.email,
          inviteeName: `${data.invitee.firstName} ${data.invitee.lastName}`.trim(),
          status: signature.status,
          signedAt: signature.signedAt,
          signatureStrokes: signature.signatureStrokes,
        };
      }),

    complete: publicProcedure
      .input(z.object({ letterId: z.number().int().positive(), token: z.string().min(20).max(128), signatureStrokes: z.string().min(20).max(20000) }))
      .mutation(async ({ input }) => {
        const [letter, signature] = await Promise.all([getInvitationLetterById(input.letterId), getInvitationLetterSignatureByLetterId(input.letterId)]);
        if (!letter || letter.deletedAt || !signature) throw new TRPCError({ code: "NOT_FOUND", message: "La solicitud de firma no existe." });
        if (signature.status === "signed") throw new TRPCError({ code: "CONFLICT", message: "La Carta ya fue firmada." });
        if (isSignatureTokenExpired(signature.requestTokenExpiresAt) || !signatureTokenMatches(input.token, signature.requestTokenHash)) throw new TRPCError({ code: "UNAUTHORIZED", message: "El enlace de firma expiró o no es válido." });
        try { parseSignatureStrokes(input.signatureStrokes); } catch (error: any) { throw new TRPCError({ code: "BAD_REQUEST", message: error.message || "La firma no es válida." }); }
        const data = JSON.parse(letter.letterData) as { inviter: { firstName: string; lastName: string; email: string } };
        const saved = await completeInvitationLetterSignature({
          invitationLetterId: letter.id,
          tokenHash: signature.requestTokenHash,
          signerName: `${data.inviter.firstName} ${data.inviter.lastName}`.trim(),
          signerEmail: data.inviter.email,
          consentTextVersion: "servicom-carta-invitacion-v1",
          consentAcceptedAt: new Date(),
          signatureStrokes: input.signatureStrokes,
        });
        if (!saved) throw new TRPCError({ code: "UNAUTHORIZED", message: "La sesión de firma expiró o ya fue utilizada." });
        return { status: "signed" as const, signedAt: saved.signedAt, signerName: saved.signerName };
      }),
  }),

  recipientChangeSignature: router({
    get: publicProcedure
      .input(z.object({ requestId: z.number().int().positive(), token: z.string().min(20).max(128) }))
      .query(async ({ input }) => {
        const request = await getRecipientChangeRequestById(input.requestId);
        if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "La solicitud de cambio de destinatario no existe." });
        if (!signatureTokenMatches(input.token, request.requestTokenHash) || (request.status !== "signed" && isSignatureTokenExpired(request.requestTokenExpiresAt))) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "El enlace de firma expiró o no es válido." });
        }
        const shipment = await getShipmentById(request.shipmentId);
        if (!shipment) throw new TRPCError({ code: "NOT_FOUND", message: "El envío relacionado ya no está disponible." });
        return {
          id: request.id,
          status: request.status,
          route: request.route,
          orderNumber: shipment.orderNumber,
          code: shipment.code,
          senderName: `${request.senderName} ${request.senderLastName || ""}`.trim(),
          previousRecipientName: `${request.previousRecipientName || ""} ${request.previousRecipientLastName || ""}`.trim(),
          previousRecipientDni: request.previousRecipientDni,
          previousRecipientDocumentType: request.previousRecipientDocumentType,
          previousRecipientPhone: request.previousRecipientPhone,
          newRecipientName: `${request.newRecipientName} ${request.newRecipientLastName}`.trim(),
          newRecipientDni: request.newRecipientDni,
          newRecipientDocumentType: request.newRecipientDocumentType,
          newRecipientPhone: request.newRecipientPhone,
          signedAt: request.signedAt,
          signerName: request.signerName,
          signerEmail: request.signerEmail,
          signatureStrokes: request.signatureStrokes,
          registeredByEmail: shipment.registeredByEmail,
          registeredById: shipment.registeredById,
          requiresAccountSession: Boolean(request.accountId),
        };
      }),
    complete: publicProcedure
      .input(z.object({ requestId: z.number().int().positive(), token: z.string().min(20).max(128), signatureStrokes: z.string().min(20).max(20000) }))
      .mutation(async ({ input, ctx }) => {
        const request = await getRecipientChangeRequestById(input.requestId);
        if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "La solicitud de cambio de destinatario no existe." });
        if (request.status === "signed") throw new TRPCError({ code: "CONFLICT", message: "El cambio de destinatario ya fue firmado y aplicado." });
        if (request.status !== "pending") throw new TRPCError({ code: "CONFLICT", message: "La solicitud de cambio ya no está disponible para firma." });
        if (isSignatureTokenExpired(request.requestTokenExpiresAt) || !signatureTokenMatches(input.token, request.requestTokenHash)) throw new TRPCError({ code: "UNAUTHORIZED", message: "El enlace de firma expiró o no es válido." });
        try { parseSignatureStrokes(input.signatureStrokes); } catch (error: any) { throw new TRPCError({ code: "BAD_REQUEST", message: error.message || "La firma no es válida." }); }
        const accountSession = getAccountSession(ctx.req);
        let signerName = `${request.senderName} ${request.senderLastName || ""}`.trim();
        let signerEmail: string | null = null;
        let signerAccountId: number | null = null;
        if (request.accountId) {
          if (!accountSession || accountSession.accountId !== request.accountId) throw new TRPCError({ code: "UNAUTHORIZED", message: "Inicia sesión con la cuenta Cliente del remitente para firmar esta solicitud." });
          const account = await getLocalAccountById(request.accountId);
          if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "La cuenta Cliente vinculada ya no está disponible." });
          signerName = `${account.name || ""} ${account.lastName || ""}`.trim() || signerName;
          signerEmail = account.email;
          signerAccountId = account.id;
        }
        const saved = await completeRecipientChangeRequest({ requestId: request.id, tokenHash: request.requestTokenHash, signerName, signerEmail, signerAccountId, consentTextVersion: "servicom-recipient-change-v1", consentAcceptedAt: new Date(), signatureStrokes: input.signatureStrokes });
        if (!saved) throw new TRPCError({ code: "UNAUTHORIZED", message: "La sesión de firma expiró, ya fue usada o el cambio no se pudo aplicar." });
        const signedShipment = await getShipmentById(request.shipmentId);
        if (signedShipment) {
          await recordShipmentAudit({ shipmentId: signedShipment.id, action: "signature_completed", actor: { actorType: signerAccountId ? "account" : "public", actorId: signerAccountId, actorLabel: saved.signerName }, metadata: { recipientChangeRequestId: request.id, signerEmail, recipientChangedTo: `${request.newRecipientName} ${request.newRecipientLastName}`.trim() } });
          await notifyShipmentEvent({
            shipmentId: signedShipment.id,
            orderNumber: signedShipment.orderNumber,
            code: signedShipment.code,
            shipmentType: signedShipment.shipmentType,
            senderName: signedShipment.senderName,
            senderLastName: signedShipment.senderLastName,
            senderDni: signedShipment.senderDni,
            senderPhone: signedShipment.senderPhone,
            recipientName: request.newRecipientName,
            recipientLastName: request.newRecipientLastName,
            accountId: null,
            registeredByType: signedShipment.registeredByType,
            registeredById: signedShipment.registeredById,
            action: "signature_completed",
            actor: { actorType: signerAccountId ? "account" : "public", actorId: signerAccountId, actorLabel: saved.signerName },
            details: `Firmado electrónicamente por ${saved.signerName}. El cambio de destinatario fue aplicado.`,
            notifyAccount: false,
          });
        }
        return { status: "signed" as const, signedAt: saved.signedAt, signerName: saved.signerName };
      }),
  }),

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
      .mutation(async ({ input, ctx }) => {
        const adminSession = getAdminSession(ctx.req);
        if (!adminSession || adminSession.reauthRequired) throw new TRPCError({ code: "UNAUTHORIZED", message: "Solo un Administrador o Registrador puede enviar una solicitud de firma." });
        const shipment = await getShipmentByOrderAndCode(input.orderNumber, input.code);
        if (!shipment) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Envío no encontrado" });
        }
        const account = shipment.accountId ? await getLocalAccountById(shipment.accountId) : null;
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
        await recordShipmentAudit({ shipmentId: shipment.id, action: "signature_requested", actor: { actorType: "admin", actorId: adminSession.adminId, actorLabel: adminSession.role }, metadata: { deliveryMode: shipment.deliveryMode, consentTextVersion: "servicom-envio-v2", accountId: shipment.accountId } });
        await recordInteractionEvent({ actorType: "admin", actorId: adminSession.adminId, eventName: "signature_started", surface: "admin", metadata: { shipmentType: shipment.shipmentType, deliveryMode: shipment.deliveryMode } });
        if (!saved) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No se pudo preparar la firma" });
        }
        const origin = `${ctx.req.protocol || "https"}://${ctx.req.get?.("host") || ctx.req.headers.host || "localhost"}`;
        const signatureUrl = `${origin}/envio-firma?order=${encodeURIComponent(shipment.orderNumber)}&code=${encodeURIComponent(shipment.code)}&token=${encodeURIComponent(token.token)}`;
        if (account?.email) {
          await sendShipmentSignatureEmail({ email: account.email, signerName: `${account.name || shipment.senderName || "Cliente"} ${account.lastName || shipment.senderLastName || ""}`.trim(), signatureUrl });
        }
        const signerLabel = `${account?.name || shipment.senderName || "el remitente"} ${account?.lastName || shipment.senderLastName || ""}`.trim();
        await notifyShipmentEvent({
          shipmentId: shipment.id,
          orderNumber: shipment.orderNumber,
          code: shipment.code,
          shipmentType: shipment.shipmentType,
          senderName: shipment.senderName,
          senderLastName: shipment.senderLastName,
          senderDni: shipment.senderDni,
          senderPhone: shipment.senderPhone,
          recipientName: shipment.recipientName,
          recipientLastName: shipment.recipientLastName,
          accountId: shipment.accountId,
          registeredByType: shipment.registeredByType,
          registeredById: shipment.registeredById,
          action: "signature_requested",
          actor: { actorType: "admin", actorId: adminSession.adminId, actorLabel: adminSession.role },
          details: `${account?.email ? "Notificación automática enviada" : "Enlace manual creado para compartir"}. Firma electrónica para ${signerLabel}. Enlace: ${signatureUrl}`,
          notifyAccount: Boolean(account?.id),
        });
        return {
          status: "pending" as const,
          signatureUrl,
          expiresAt: token.expiresAt,
          deliveryMode: account?.email ? "automatic" as const : "manual" as const,
          signerName: signerLabel,
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
      .mutation(async ({ input, ctx }) => {
        const accountSession = getAccountSession(ctx.req);
        const shipment = await getShipmentByOrderAndCode(input.orderNumber, input.code);
        if (!shipment) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Envío no encontrado" });
        }
        if (shipment.accountId && !isKasegaOrMagdaShipment(shipment) && (!accountSession || shipment.accountId !== accountSession.accountId)) {
          throw new TRPCError({ code: accountSession ? "FORBIDDEN" : "UNAUTHORIZED", message: accountSession ? "Esta solicitud de firma no corresponde a tu cuenta Cliente." : "Inicia sesión con la cuenta Cliente vinculada para firmar este envío." });
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
          consentTextVersion: "servicom-envio-v2",
          consentAcceptedAt: new Date(),
          signatureStrokes: input.signatureStrokes,
        });
        if (!saved) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "La sesión de firma expiró o ya fue utilizada" });
        }
        await recordShipmentAudit({ shipmentId: shipment.id, action: "signature_completed", actor: { actorType: accountSession ? "account" : "public", actorId: accountSession?.accountId, actorLabel: saved.signerName }, metadata: { deliveryMode: shipment.deliveryMode, consentTextVersion: "servicom-envio-v2", signerEmail: saved.signerEmail } });
        await notifyShipmentEvent({
          shipmentId: shipment.id,
          orderNumber: shipment.orderNumber,
          code: shipment.code,
          shipmentType: shipment.shipmentType,
          senderName: shipment.senderName,
          senderLastName: shipment.senderLastName,
          senderDni: shipment.senderDni,
          senderPhone: shipment.senderPhone,
          recipientName: shipment.recipientName,
          recipientLastName: shipment.recipientLastName,
          accountId: shipment.accountId,
          registeredByType: shipment.registeredByType,
          registeredById: shipment.registeredById,
          action: "signature_completed",
          actor: { actorType: accountSession ? "account" : "public", actorId: accountSession?.accountId, actorLabel: saved.signerName },
          details: `Firmado electrónicamente por ${saved.signerName}. ${accountSession ? "Firma vinculada a la cuenta Cliente." : "Firma realizada mediante enlace manual."}`,
          notifyAccount: Boolean(accountSession),
        });
        await recordInteractionEvent({ actorType: accountSession ? "account" : "anonymous", actorId: accountSession?.accountId, eventName: "signature_completed", surface: "receipt", metadata: { shipmentType: shipment.shipmentType, deliveryMode: shipment.deliveryMode } });
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
