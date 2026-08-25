import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getAccountSession } from "./localSession";
import { getAdminSession } from "./adminSession";
import { createPlatformFeedback, getAccountFeedbackWorkspace, getAdminById, getAdminWorkspaceContext, getLocalAccountById, listPlatformFeedback, listShipmentFeedbackForAdmin } from "./db";
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

async function resolveFeedbackAuthor(req: Parameters<typeof getAdminSession>[0]) {
  const adminSession = getAdminSession(req);
  const accountSession = getAccountSession(req);
  if (adminSession && !adminSession.reauthRequired) {
    const admin = await getAdminById(adminSession.adminId);
    const workspace = getAdminWorkspaceContext(adminSession.adminId, adminSession.isWorkspaceIsolated, admin?.email);
    return {
      type: "admin" as const,
      id: adminSession.adminId,
      label: admin ? `${admin.name} (${admin.email})` : adminSession.role === "superadmin" ? "Master Admin" : "Registrador",
      email: admin?.email ?? null,
      role: adminSession.role,
      workspace,
      workspaceKey: workspace.key,
      workspaceAdminId: adminSession.isWorkspaceIsolated ? adminSession.adminId : null,
      canReviewAll: true,
      isAdmin: true,
    };
  }
  if (accountSession && !accountSession.reauthRequired) {
    const account = await getLocalAccountById(accountSession.accountId);
    const workspace = await getAccountFeedbackWorkspace(accountSession.accountId);
    return {
      type: "account" as const,
      id: accountSession.accountId,
      label: account ? `${[account.name, account.lastName].filter(Boolean).join(" ") || "Cliente"} (${account.email})` : "Cliente",
      email: account?.email ?? null,
      role: "client",
      workspace,
      workspaceKey: workspace.key,
      workspaceAdminId: null,
      canReviewAll: false,
      isAdmin: false,
    };
  }
  throw new TRPCError({ code: "UNAUTHORIZED", message: "Inicia sesión para enviar o consultar comentarios." });
}

const adminFeedbackFilters = z.object({
  authorType: z.enum(["admin", "account"]).optional(),
  authorId: z.number().int().positive().optional(),
  search: z.string().trim().max(120).optional(),
  limit: z.number().int().min(1).max(500).optional(),
}).optional();

export const feedbackRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    const author = await resolveFeedbackAuthor(ctx.req);
    return listPlatformFeedback(author);
  }),
  listAdmin: publicProcedure.input(adminFeedbackFilters).query(async ({ input, ctx }) => {
    const author = await resolveFeedbackAuthor(ctx.req);
    if (!author.isAdmin || author.role !== "superadmin") throw new TRPCError({ code: "FORBIDDEN", message: "Solo el Master Admin puede consultar la bandeja de feedback." });
    const [general, shipment] = await Promise.all([
      listPlatformFeedback(author, input),
      listShipmentFeedbackForAdmin({ workspaceKey: author.workspaceKey, workspaceAdminId: author.workspaceAdminId, filters: input }),
    ]);
    return [...general.map(item => ({ ...item, source: "general" as const, shipmentId: null, orderNumber: null, code: null, shipmentType: null })), ...shipment].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()).slice(0, input?.limit ?? 300);
  }),
  create: publicProcedure.input(feedbackInput).mutation(async ({ input, ctx }) => {
    const author = await resolveFeedbackAuthor(ctx.req);
    let attachment: { key: string; url: string; name: string; mimeType: string; sizeBytes: number } | null = null;
    if (input.attachment) {
      let validated;
      try { validated = validateFeedbackAttachment(input.attachment); } catch (error: any) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error.message || "El adjunto no es válido." });
      }
      const saved = await storagePut(`platform-feedback/${author.type}-${author.id}/${Date.now()}-${validated.safeName}`, validated.bytes, input.attachment.mimeType);
      attachment = { ...saved, name: validated.safeName, mimeType: input.attachment.mimeType, sizeBytes: validated.sizeBytes };
    }
    const result = await createPlatformFeedback({ authorType: author.type, authorId: author.id, authorLabel: author.label, authorEmail: author.email, authorRole: author.role, workspaceKey: author.workspace.key, workspaceLabel: author.workspace.label, message: input.message, attachment });
    if (!result) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No se pudo guardar la retroalimentación." });
    return { success: true };
  }),
});
