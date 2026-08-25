import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { getAdminSession } from "./adminSession";
import { getAccountSession } from "./localSession";
import { listNotificationsForRecipient, markAllNotificationsRead, markNotificationRead, type NotificationRecipientType } from "./db";

function getRecipient(req: Parameters<typeof getAdminSession>[0]) {
  const adminSession = getAdminSession(req);
  if (adminSession) return { recipientType: "admin" as const, recipientId: adminSession.adminId, reauthRequired: adminSession.reauthRequired };
  const accountSession = getAccountSession(req);
  if (accountSession) return { recipientType: "account" as const, recipientId: accountSession.accountId, reauthRequired: accountSession.reauthRequired };
  return null;
}

function requireRecipient(req: Parameters<typeof getAdminSession>[0]) {
  const recipient = getRecipient(req);
  if (!recipient) throw new TRPCError({ code: "UNAUTHORIZED", message: "Inicia sesión para consultar tus notificaciones." });
  if (recipient.reauthRequired) throw new TRPCError({ code: "UNAUTHORIZED", message: "Por seguridad, vuelve a verificar tu contraseña para consultar tus notificaciones." });
  return recipient;
}

export const notificationRouter = router({
  list: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(40) }).optional())
    .query(async ({ input, ctx }) => {
      const recipient = requireRecipient(ctx.req);
      return listNotificationsForRecipient({ ...recipient, limit: input?.limit });
    }),

  markRead: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const recipient = requireRecipient(ctx.req);
      const updated = await markNotificationRead({ id: input.id, recipientType: recipient.recipientType, recipientId: recipient.recipientId });
      return { success: updated };
    }),

  markAllRead: publicProcedure.mutation(async ({ ctx }) => {
    const recipient = requireRecipient(ctx.req);
    const updated = await markAllNotificationsRead({ recipientType: recipient.recipientType, recipientId: recipient.recipientId });
    return { success: true, updated };
  }),
});

export type NotificationRecipient = { recipientType: NotificationRecipientType; recipientId: number };
