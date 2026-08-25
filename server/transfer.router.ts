import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { getAdminSession } from "./adminSession";
import { createTransfer, listTransfersByAdmin } from "./db";

const personName = z.string().trim().min(2, "Ingresa el nombre completo.").max(255);
const requiredIdentity = z.string().trim().min(1, "Ingresa el DNI o documento de identidad.").max(64);
const requiredPhone = z.string().trim().min(7, "Ingresa un teléfono válido.").max(32);
const optionalText = z.string().trim().max(255).optional().or(z.literal(""));
const money = z.number().finite().min(0).max(10_000_000);

const transferInput = z.object({
  originOffice: z.string().trim().min(1).max(255).default("Servicom Internacional — Lima"),
  destinationOffice: optionalText,
  senderName: personName,
  senderPhone: requiredPhone,
  senderDocument: requiredIdentity,
  senderPassport: optionalText,
  senderCity: optionalText,
  senderPaymentMethod: optionalText,
  recipientName: personName,
  recipientPhone: requiredPhone,
  recipientDocument: requiredIdentity,
  recipientPassport: optionalText,
  recipientBank: optionalText,
  recipientIban: optionalText,
  recipientCci: optionalText,
  amountSent: money,
  transferFee: money.default(0),
  exchangeRate: z.number().finite().positive().max(1_000_000).default(1),
  currency: z.string().trim().min(3).max(8).default("EUR"),
  status: z.enum(["Registrada", "Pagada", "Cancelada"]).default("Registrada"),
  notes: z.string().trim().max(2000).optional(),
});

export function calculateTransferAmount(amountSent: number, transferFee: number, exchangeRate: number) {
  return Math.max(0, (amountSent - transferFee) * exchangeRate);
}

function transferNumber() {
  return `TR-${Date.now().toString().slice(-8)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

export const transferRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    const session = getAdminSession(ctx.req);
    if (!session || session.reauthRequired) throw new TRPCError({ code: "UNAUTHORIZED", message: "Sesión administrativa requerida." });
    return listTransfersByAdmin(session.adminId);
  }),
  create: publicProcedure.input(transferInput).mutation(async ({ ctx, input }) => {
    const session = getAdminSession(ctx.req);
    if (!session || session.reauthRequired) throw new TRPCError({ code: "UNAUTHORIZED", message: "Solo Admin y Usuario pueden registrar transferencias." });
    const amountReceived = calculateTransferAmount(input.amountSent, input.transferFee, input.exchangeRate);
    const saved = await createTransfer({
      ...input,
      transferNumber: transferNumber(),
      createdByAdminId: session.adminId,
      createdByAdminLabel: session.role,
      amountSent: input.amountSent.toFixed(2),
      transferFee: input.transferFee.toFixed(2),
      exchangeRate: input.exchangeRate.toFixed(4),
      amountReceived: amountReceived.toFixed(2),
    });
    return saved;
  }),
});
