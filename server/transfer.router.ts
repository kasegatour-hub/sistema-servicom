import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { getAdminSession } from "./adminSession";
import { createTransfer, listTransfersByAdmin } from "./db";
import { getArgenperEuroQuote } from "./argenper";
import { calculateTransferAmount as calculateConvertedTransferAmount, calculateTransferFee, getTransferCommissionPercent, type TransferCurrency } from "../shared/transferCalculation";

const personName = z.string().trim().min(2, "Ingresa el nombre completo.").max(255);
const requiredIdentity = z.string().trim().min(1, "Ingresa el DNI o documento de identidad.").max(64);
const requiredPhone = z.string().trim().min(7, "Ingresa un teléfono válido.").max(32);
const optionalText = z.string().trim().max(255).optional().or(z.literal(""));
const money = z.number().finite().min(0).max(10_000_000);
const transferCurrency = z.enum(["EUR", "PEN"]);
const identityDocumentType = z.enum(["dni_peru", "pasaporte", "carta_identita_italia"]);

const transferInput = z.object({
  originOffice: z.string().trim().min(1).max(255).default("Servicom Internacional — Lima"),
  destinationOffice: optionalText,
  senderName: personName,
  senderPhone: requiredPhone,
  senderDocument: requiredIdentity,
  senderDocumentType: identityDocumentType.default("dni_peru"),
  senderPassport: optionalText,
  senderCity: optionalText,
  senderPaymentMethod: optionalText,
  recipientName: personName,
  recipientPhone: requiredPhone,
  recipientDocument: requiredIdentity,
  recipientDocumentType: identityDocumentType.default("dni_peru"),
  recipientPassport: optionalText,
  recipientBank: optionalText,
  recipientIban: optionalText,
  recipientCci: optionalText,
  amountSent: money,
  transferFee: money.default(0),
  exchangeRate: z.number().finite().positive().max(1_000_000).default(1),
  currency: transferCurrency.default("EUR"),
  destinationCurrency: transferCurrency.default("EUR"),
  exchangeRateSource: z.enum(["paridad", "argenper", "manual"]).default("paridad"),
  status: z.enum(["Registrada", "Pagada", "Cancelada"]).default("Registrada"),
  notes: z.string().trim().max(2000).optional(),
});

export function calculateTransferAmount(amountSent: number, transferFee: number, exchangeRate: number, sourceCurrency: TransferCurrency = "EUR", destinationCurrency: TransferCurrency = "EUR") {
  return calculateConvertedTransferAmount(amountSent, transferFee, exchangeRate, sourceCurrency, destinationCurrency);
}

function transferNumber() {
  return `TR-${Date.now().toString().slice(-8)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

export const transferRouter = router({
  argenperQuote: publicProcedure.query(async ({ ctx }) => {
    const session = getAdminSession(ctx.req);
    if (!session || session.reauthRequired) throw new TRPCError({ code: "UNAUTHORIZED", message: "Sesión administrativa requerida." });
    try {
      return await getArgenperEuroQuote();
    } catch (error) {
      throw new TRPCError({ code: "BAD_GATEWAY", message: "No se pudo obtener la cotización de Argemper. Ingresa un tipo de cambio manual." , cause: error });
    }
  }),
  list: publicProcedure.query(async ({ ctx }) => {
    const session = getAdminSession(ctx.req);
    if (!session || session.reauthRequired) throw new TRPCError({ code: "UNAUTHORIZED", message: "Sesión administrativa requerida." });
    return listTransfersByAdmin(session.adminId);
  }),
  create: publicProcedure.input(transferInput).mutation(async ({ ctx, input }) => {
    const session = getAdminSession(ctx.req);
    if (!session || session.reauthRequired) throw new TRPCError({ code: "UNAUTHORIZED", message: "Solo Admin y Usuario pueden registrar transferencias." });
    const commissionPercent = getTransferCommissionPercent(input.currency, input.destinationCurrency);
    const transferFee = calculateTransferFee(input.amountSent, commissionPercent);
    let exchangeRate = input.exchangeRate;
    let exchangeRateSource = input.exchangeRateSource;
    if (input.currency === "PEN" && input.destinationCurrency === "EUR" && input.exchangeRateSource === "argenper") {
      try {
        exchangeRate = (await getArgenperEuroQuote()).adjustedPenPerEur;
      } catch (error) {
        throw new TRPCError({ code: "BAD_GATEWAY", message: "No se pudo confirmar la cotización de Argemper. Selecciona tipo de cambio manual e ingresa el valor acordado.", cause: error });
      }
    }
    if (input.currency === "EUR" && input.destinationCurrency === "EUR" && input.exchangeRateSource === "paridad") exchangeRate = 1;
    if (input.exchangeRateSource === "manual") exchangeRateSource = "manual";
    const amountReceived = calculateTransferAmount(input.amountSent, transferFee, exchangeRate, input.currency, input.destinationCurrency);
    const saved = await createTransfer({
      ...input,
      transferNumber: transferNumber(),
      createdByAdminId: session.adminId,
      createdByAdminLabel: session.role,
      amountSent: input.amountSent.toFixed(2),
      transferFee: transferFee.toFixed(2),
      exchangeRate: exchangeRate.toFixed(4),
      amountReceived: amountReceived.toFixed(2),
      commissionPercent: commissionPercent.toFixed(2),
      exchangeRateSource,
    });
    return saved;
  }),
});
