// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const { accountingMocks } = vi.hoisted(() => ({
  accountingMocks: {
    summary: { data: null as any, isLoading: false, isFetching: false, error: null as any, refetch: vi.fn() },
    createExpense: { mutate: vi.fn(), isPending: false, error: null as any },
    invalidate: vi.fn(),
  },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ accounting: { summary: { invalidate: accountingMocks.invalidate } } }),
    accounting: {
      summary: { useQuery: () => accountingMocks.summary },
      createExpense: { useMutation: () => accountingMocks.createExpense },
    },
  },
}));

vi.mock("@/lib/accountingReport", () => ({
  downloadAccountingExcel: vi.fn(),
  downloadAccountingPdf: vi.fn(),
}));

import { AccountingWorkspace } from "./AccountingWorkspace";

afterEach(() => cleanup());

describe("AccountingWorkspace", () => {
  it("muestra ingresos, egresos, utilidad y permite registrar un gasto vinculado", () => {
    accountingMocks.createExpense.mutate.mockReset();
    accountingMocks.summary.data = {
      workspace: { label: "Servicom Internacional" },
      periodLabel: "agosto de 2026",
      routeLabel: "Todas las rutas",
      revenueEur: 120,
      manualExpenseEur: 10,
      provinceCostPen: 20,
      manualExpensePen: 30,
      expensePen: 50,
      penPerEur: 4,
      expensePenConvertedEur: 12.5,
      expenseEur: 22.5,
      netEur: 97.5,
      isNetEurConsolidated: true,
      shipmentCount: 2,
      parcelCount: 1,
      paidShipmentCount: 1,
      shipments: [{ id: 18, orderNumber: "0826-0001", code: "1ABC", recipientName: "Ana", recipientLastName: "Rossi", status: "En agencia", finalPriceEur: "120" }],
      parcelRows: [{ id: 18, orderNumber: "0826-0001", code: "1ABC", recipientName: "Ana", recipientLastName: "Rossi", status: "En agencia", finalPriceEur: "120" }],
      expenses: [],
      monthly: [],
    };

    render(<AccountingWorkspace />);

    expect(screen.getByRole("heading", { name: "Ingresos, egresos y utilidad" })).toBeTruthy();
    expect(screen.getByLabelText("Ruta contable")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Lima → Torino" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Torino → Lima + provincia" }).getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "Torino → Lima + provincia" }));
    expect(accountingMocks.summary.data.routeLabel).toBe("Todas las rutas");
    expect(screen.getByLabelText("Semana del mes")).toBeTruthy();
    expect(screen.getByText("Utilidad neta EUR")).toBeTruthy();
    expect(screen.getByText("Encomiendas del periodo")).toBeTruthy();
    fireEvent.click(screen.getByRole("combobox", { name: "Ver envíos de" }));
    fireEvent.click(screen.getByText("Rango de fechas"));
    expect(screen.getByLabelText("Desde")).toBeTruthy();
    expect(screen.getByLabelText("Hasta")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Monto"), { target: { value: "15.50" } });
    fireEvent.change(screen.getByLabelText("Descripción"), { target: { value: "Despacho de encomienda" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar gasto" }));

    expect(accountingMocks.createExpense.mutate).toHaveBeenCalledWith(expect.objectContaining({ amount: 15.5, description: "Despacho de encomienda", shipmentId: null }));
  });
});
