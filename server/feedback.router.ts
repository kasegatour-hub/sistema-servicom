import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getAccountSession } from "./localSession";
import { getAdminSession } from "./adminSession";
import { createPlatformFeedback, listPlatformFeedback } from "./db";
import { publicProcedure, router } from "./_core/trpc";
import { storagePut } from "./storage";
import { validateFeedbackAttachment } from "./feedbackMedia";

const feedbackInput = z.object({
  message: z.string().trim().min(1, "Escribe tu retroalimentación.").max(2000),
  attachment: z.object({
    name: z.string().trim().min(1).max(255),
    mimeType: z.string().trim().min(3).max(128),
    dataBase64: z.string().min(4).max(21_000_000),
  }).optional(),
});

function resolveFeedbackAuthor(req: Parameters<typeof getAdminSession>[0]) {
  const adminSession = getAdminSession(req);
  const accountSession = getAccountSession(req);
  if (adminSession && !adminSession.reauthRequired) {
    return { type: "admin" as const, id: adminSession.adminId, label: adminSession.role === "superadmin" ? "Master Admin" : "Registrador", canReviewAll: adminSession.role === "superadmin" };
  }
  if (accountSession && !accountSession.reauthRequired) {
    return { type: "account" as const, id: accountSession.accountId, label: "Cliente", canReviewAll: false };
  }
  throw new TRPCError({ code: "UNAUTHORIZED", message: "Inicia sesión para enviar o consultar comentarios." });
}

export const feedbackRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    const author = resolveFeedbackAuthor(ctx.req);
    return listPlatformFeedback(author);
  }),
  create: publicProcedure.input(feedbackInput).mutation(async ({ input, ctx }) => {
    const author = resolveFeedbackAuthor(ctx.req);
    let attachment: { key: string; url: string; name: string; mimeType: string; sizeBytes: number } | null = null;
    if (input.attachment) {
      let validated;
      try { validated = validateFeedbackAttachment(input.attachment); } catch (error: any) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error.message || "El adjunto no es válido." });
      }
      const saved = await storagePut(`platform-feedback/${author.type}-${author.id}/${Date.now()}-${validated.safeName}`, validated.bytes, input.attachment.mimeType);
      attachment = { ...saved, name: validated.safeName, mimeType: input.attachment.mimeType, sizeBytes: validated.sizeBytes };
    }
    const result = await createPlatformFeedback({ authorType: author.type, authorId: author.id, authorLabel: author.label, message: input.message, attachment });
    if (!result) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No se pudo guardar la retroalimentación." });
    return { success: true };
  }),
});
