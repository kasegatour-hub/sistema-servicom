import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { getAdminSession } from "./adminSession";
import { createOperatingExpense, getAdminById, getAdminWorkspaceContext, getAllShipments, listOperatingExpenses, recordInteractionEvent } from "./db";
import { calculateOperatingStatement, resolveAccountingPeriod } from "../shared/operatingAccounting";

const CATEGORY_VALUES = ["transporte", "agencia_provincial", "embalaje", "operativo", "otro"] as const;
const CURRENCY_VALUES = ["EUR", "PEN"] as const;

const periodSchema = z.object({
  mode: z.enum(["today", "week", "month", "range", "year"]).optional(),
  year: z.number().int().min(2020).max(2100).optional(),
  month: z.number().int().min(1).max(12).nullable().optional(),
  weekOfMonth: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).nullable().optional(),
  weekDate: z.coerce.date().nullable().optional(),
  from: z.coerce.date().nullable().optional(),
  to: z.coerce.date().nullable().optional(),
  penPerEur: z.number().positive().max(100).nullable().optional(),
});

async function getAccountingScope(req: Parameters<typeof getAdminSession>[0]) {
  const adminSession = getAdminSession(req);
  if (!adminSession || adminSession.reauthRequired) throw new TRPCError({ code: "UNAUTHORIZED", message: "Sesión administrativa requerida para abrir Contabilidad." });
  const admin = await getAdminById(adminSession.adminId);
  const workspace = getAdminWorkspaceContext(adminSession.adminId, adminSession.isWorkspaceIsolated, admin?.email);
  const shipmentOptions = {
    excludeHiddenForRegistradores: adminSession.role !== "superadmin",
    ownerAdminId: adminSession.isWorkspaceIsolated ? adminSession.adminId : undefined,
    excludeIsolatedWorkspaces: !adminSession.isWorkspaceIsolated,
  };
  return { adminSession, workspace, shipmentOptions };
}

export const accountingRouter = router({
  summary: publicProcedure.input(periodSchema).query(async ({ input, ctx }) => {
    const scope = await getAccountingScope(ctx.req);
    const period = resolveAccountingPeriod(input);
    const [shipments, expenses] = await Promise.all([
      getAllShipments(undefined, scope.shipmentOptions),
      listOperatingExpenses({ workspaceKey: scope.workspace.key, startsAt: period.startsAt, endsAt: period.endsAt }),
    ]);
    const statement = calculateOperatingStatement({ shipments, expenses, period, penPerEur: input.penPerEur });
    const monthly = period.mode === "year"
      ? Array.from({ length: 12 }, (_, index) => calculateOperatingStatement({ shipments, expenses, period: { mode: "month", year: period.year, month: index + 1 }, penPerEur: input.penPerEur }))
      : [];
    return { workspace: scope.workspace, ...statement, monthly };
  }),

  createExpense: publicProcedure.input(z.object({
    shipmentId: z.number().int().positive().nullable().optional(),
    category: z.enum(CATEGORY_VALUES),
    amount: z.number().positive().max(1_000_000),
    currency: z.enum(CURRENCY_VALUES),
    description: z.string().trim().min(3, "Describe el gasto.").max(500),
    expenseDate: z.coerce.date(),
  })).mutation(async ({ input, ctx }) => {
    const scope = await getAccountingScope(ctx.req);
    if (input.shipmentId) {
      const shipments = await getAllShipments(undefined, scope.shipmentOptions);
      if (!shipments.some(shipment => shipment.id === input.shipmentId)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "La encomienda o documento seleccionado no pertenece a tu espacio contable." });
      }
    }
    const expense = await createOperatingExpense({
      workspaceKey: scope.workspace.key,
      workspaceLabel: scope.workspace.label,
      shipmentId: input.shipmentId ?? null,
      category: input.category,
      amount: input.amount,
      currency: input.currency,
      description: input.description,
      expenseDate: input.expenseDate,
      createdByAdminId: scope.adminSession.adminId,
      createdByLabel: scope.adminSession.role === "superadmin" ? "Master Admin" : "Usuario registrador",
    });
    if (!expense) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No se pudo registrar el gasto." });
    await recordInteractionEvent({ actorType: "admin", actorId: scope.adminSession.adminId, eventName: "operating_expense_created", surface: "accounting", metadata: { currency: input.currency, category: input.category, hasShipment: Boolean(input.shipmentId) } });
    return expense;
  }),
});
