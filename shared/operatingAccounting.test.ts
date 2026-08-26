import { describe, expect, it } from "vitest";
import { calculateOperatingStatement, getAccountingPeriodLabel } from "./operatingAccounting";

describe("operating accounting", () => {
  const shipments = [
    { id: 1, orderNumber: "0826-0001", code: "1ABC", shipmentType: "encomienda", paymentStatus: "Pagado", finalPriceEur: "120", provinceOperationalCostSoles: "20", isProvinceDelivery: 1, createdAt: new Date("2026-08-04T12:00:00.000Z") },
    { id: 2, orderNumber: "0826-0002", code: "2ABC", shipmentType: "documento", paymentStatus: "Falta cancelar", finalPriceEur: "50", createdAt: new Date("2026-08-08T12:00:00.000Z") },
    { id: 3, orderNumber: "0726-0001", code: "3ABC", shipmentType: "encomienda", paymentStatus: "Pagado", finalPriceEur: "90", createdAt: new Date("2026-07-10T12:00:00.000Z") },
  ];
  const expenses = [
    { id: 1, category: "transporte", amount: "10", currency: "EUR" as const, description: "Recojo", expenseDate: new Date("2026-08-09T12:00:00.000Z") },
    { id: 2, category: "agencia_provincial", amount: "30", currency: "PEN" as const, description: "Despacho", expenseDate: new Date("2026-08-10T12:00:00.000Z") },
    { id: 3, category: "operativo", amount: "9", currency: "EUR" as const, description: "Julio", expenseDate: new Date("2026-07-10T12:00:00.000Z") },
  ];

  it("separa ingresos cobrados, costos provinciales y gastos manuales del mes", () => {
    const statement = calculateOperatingStatement({ shipments, expenses, period: { year: 2026, month: 8 } });
    expect(statement.revenueEur).toBe(120);
    expect(statement.manualExpenseEur).toBe(10);
    expect(statement.provinceCostPen).toBe(20);
    expect(statement.manualExpensePen).toBe(30);
    expect(statement.expensePen).toBe(50);
    expect(statement.netEur).toBe(110);
    expect(statement.isNetEurConsolidated).toBe(false);
    expect(statement.parcelCount).toBe(1);
  });

  it("consolida costos PEN solo cuando se informa un tipo de cambio explícito", () => {
    const statement = calculateOperatingStatement({ shipments, expenses, period: { year: 2026, month: 8 }, penPerEur: 4 });
    expect(statement.expensePenConvertedEur).toBe(12.5);
    expect(statement.expenseEur).toBe(22.5);
    expect(statement.netEur).toBe(97.5);
    expect(statement.isNetEurConsolidated).toBe(true);
  });

  it("identifica el periodo anual sin mezclar meses fuera del año", () => {
    expect(getAccountingPeriodLabel({ year: 2026, month: 8 })).toContain("2026");
    expect(calculateOperatingStatement({ shipments, expenses, period: { year: 2026 } }).shipmentCount).toBe(3);
  });
});
