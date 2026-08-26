import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getAdminById: vi.fn(),
  getAllShipments: vi.fn(),
  listOperatingExpenses: vi.fn(),
  createOperatingExpense: vi.fn(),
  recordInteractionEvent: vi.fn(),
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, ...dbMocks };
});

import { appRouter } from "./routers";
import { createAdminSession } from "./adminSession";
import type { TrpcContext } from "./_core/context";

function createAdminContext(role: "registrador" | "superadmin" = "registrador", isolated = false): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: { cookie: `servicom_admin_session=${encodeURIComponent(createAdminSession(9, role, false, Date.now(), isolated))}` } } as TrpcContext["req"],
    res: { cookie: () => {}, clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("accounting router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getAdminById.mockResolvedValue({ id: 9, email: "registrador@servicom.pe" });
    dbMocks.getAllShipments.mockResolvedValue([
      { id: 33, orderNumber: "0826-0001", code: "1ABC", shipmentType: "encomienda", paymentStatus: "Pagado", finalPriceEur: "100", provinceOperationalCostSoles: "20", isProvinceDelivery: 1, createdAt: new Date("2026-08-05T12:00:00.000Z") },
    ]);
    dbMocks.listOperatingExpenses.mockResolvedValue([
      { id: 1, shipmentId: 33, category: "transporte", amount: "10", currency: "EUR", description: "Recojo", expenseDate: new Date("2026-08-06T12:00:00.000Z"), createdByLabel: "Usuario registrador" },
    ]);
    dbMocks.createOperatingExpense.mockResolvedValue({ id: 11, amount: "12.50", currency: "PEN" });
    dbMocks.recordInteractionEvent.mockResolvedValue(true);
  });

  it("permite al Registrador consultar su estado de resultados y separa monedas", async () => {
    const caller = appRouter.createCaller(createAdminContext("registrador"));
    const result = await caller.accounting.summary({ year: 2026, month: 8, penPerEur: 4 });

    expect(result.workspace.key).toBe("servicom");
    expect(result.revenueEur).toBe(100);
    expect(result.provinceCostPen).toBe(20);
    expect(result.manualExpenseEur).toBe(10);
    expect(result.netEur).toBe(85);
    expect(dbMocks.getAllShipments).toHaveBeenCalledWith(undefined, expect.objectContaining({ excludeHiddenForRegistradores: true, excludeIsolatedWorkspaces: true }));
  });

  it("rechaza consultas sin sesión administrativa", async () => {
    const caller = appRouter.createCaller({ user: null, req: { headers: {} }, res: {} } as TrpcContext);
    await expect(caller.accounting.summary({ year: 2026, month: 8 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("registra un gasto solo cuando el envío pertenece al espacio contable", async () => {
    const caller = appRouter.createCaller(createAdminContext("registrador"));
    await caller.accounting.createExpense({ shipmentId: 33, category: "transporte", amount: 12.5, currency: "PEN", description: "Despacho provincial", expenseDate: new Date("2026-08-07T12:00:00.000Z") });

    expect(dbMocks.createOperatingExpense).toHaveBeenCalledWith(expect.objectContaining({ workspaceKey: "servicom", shipmentId: 33, amount: 12.5, currency: "PEN" }));
    expect(dbMocks.recordInteractionEvent).toHaveBeenCalledWith(expect.objectContaining({ eventName: "operating_expense_created" }));
  });

  it("impide vincular gastos a un envío fuera del espacio del usuario", async () => {
    const caller = appRouter.createCaller(createAdminContext("registrador"));
    await expect(caller.accounting.createExpense({ shipmentId: 99, category: "operativo", amount: 5, currency: "EUR", description: "Gasto ajeno", expenseDate: new Date("2026-08-07T12:00:00.000Z") })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(dbMocks.createOperatingExpense).not.toHaveBeenCalled();
  });
});
