import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { completeShipmentSignature, createOrRefreshShipmentSignatureRequest, getShipmentByOrderAndCode, getShipmentById, getShipmentSignatureByShipmentId } from "./db";
import { createSignatureToken, isSignatureTokenExpired, signatureTokenMatches } from "./signatureTokens";
import { parseSignatureStrokes } from "../shared/signature";
import { adminRouter } from "./admin.router";
import { accountRouter } from "./account.router";

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

  shipment: router({
    search: publicProcedure
      .input(z.object({
        orderNumber: z.string().min(1, "Número de orden requerido"),
        code: z.string().min(1, "Código requerido"),
      }))
      .query(async ({ input }) => {
        const shipment = await getShipmentByOrderAndCode(input.orderNumber, input.code);
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
        signatureStrokes: z.string().min(20, "Dibuja tu firma antes de continuar").max(20000),
      }))
      .mutation(async ({ input }) => {
        const shipment = await getShipmentByOrderAndCode(input.orderNumber, input.code);
        if (!shipment) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Envío no encontrado" });
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
          signatureStrokes: input.signatureStrokes,
        });
        if (!saved) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "La sesión de firma expiró o ya fue utilizada" });
        }
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
