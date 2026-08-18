import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getAccountSession } from "./localSession";
import { getAdminSession } from "./adminSession";
import { createShipmentFeedback, getShipmentById, listShipmentFeedback } from "./db";
import { publicProcedure, router } from "./_core/trpc";
import { storagePut } from "./storage";
import { validateFeedbackAttachment } from "./feedbackMedia";

const feedbackInput = z.object({
  shipmentId: z.number().int().positive(),
  message: z.string().trim().min(1, "Escribe tu retroalimentación.").max(2000),
  attachment: z.object({
    name: z.string().trim().min(1).max(255),
    mimeType: z.string().trim().min(3).max(128),
    dataBase64: z.string().min(4).max(21_000_000),
  }).optional(),
});

async function resolveFeedbackAccess(req: Parameters<typeof getAdminSession>[0], shipmentId: number) {
  const adminSession = getAdminSession(req);
  const accountSession = getAccountSession(req);
  const shipment = await getShipmentById(shipmentId);
  if (!shipment) throw new TRPCError({ code: "NOT_FOUND", message: "El envío no está disponible." });
  if (adminSession && !adminSession.reauthRequired) {
    if (adminSession.role !== "superadmin" && shipment.hiddenFromRegistradoresAt) throw new TRPCError({ code: "FORBIDDEN", message: "Este envío está oculto para tu cuenta." });
    return { shipment, author: { type: "admin" as const, id: adminSession.adminId, label: adminSession.role === "superadmin" ? "Master Admin" : "Registrador" } };
  }
  if (accountSession && !accountSession.reauthRequired && shipment.accountId === accountSession.accountId) {
    return { shipment, author: { type: "account" as const, id: accountSession.accountId, label: "Cliente" } };
  }
  throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para consultar la retroalimentación de este envío." });
}

export const feedbackRouter = router({
  list: publicProcedure.input(z.object({ shipmentId: z.number().int().positive() })).query(async ({ input, ctx }) => {
    await resolveFeedbackAccess(ctx.req, input.shipmentId);
    return listShipmentFeedback(input.shipmentId);
  }),
  create: publicProcedure.input(feedbackInput).mutation(async ({ input, ctx }) => {
    const { shipment, author } = await resolveFeedbackAccess(ctx.req, input.shipmentId);
    let attachment: { key: string; url: string; name: string; mimeType: string; sizeBytes: number } | null = null;
    if (input.attachment) {
      let validated;
      try { validated = validateFeedbackAttachment(input.attachment); } catch (error: any) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error.message || "El adjunto no es válido." });
      }
      const saved = await storagePut(`shipment-feedback/${shipment.id}/${author.type}-${author.id}/${Date.now()}-${validated.safeName}`, validated.bytes, input.attachment.mimeType);
      attachment = { ...saved, name: validated.safeName, mimeType: input.attachment.mimeType, sizeBytes: validated.sizeBytes };
    }
    const result = await createShipmentFeedback({ shipmentId: shipment.id, authorType: author.type, authorId: author.id, authorLabel: author.label, message: input.message, attachment });
    if (!result) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No se pudo guardar la retroalimentación." });
    return { success: true };
  }),
});
