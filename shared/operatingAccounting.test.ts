import { describe, expect, it } from "vitest";
import { calculateOperatingStatement, getAccountingPeriodLabel, resolveAccountingPeriod } from "./operatingAccounting";

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

  it("resuelve hoy y una semana calendario con límites de inicio y fin excluyente", () => {
    const today = resolveAccountingPeriod({ mode: "today" }, new Date("2026-08-12T18:00:00.000Z"));
    const week = resolveAccountingPeriod({ mode: "week", weekDate: "2026-08-12T12:00:00.000Z" });
    expect(today.startsAt.toISOString()).toBe("2026-08-12T00:00:00.000Z");
    expect(today.endsAt.toISOString()).toBe("2026-08-13T00:00:00.000Z");
    expect(week.startsAt.toISOString()).toBe("2026-08-10T00:00:00.000Z");
    expect(week.endsAt.toISOString()).toBe("2026-08-17T00:00:00.000Z");
  });

  it("divide un mes en cuatro semanas operativas y deja el saldo al tramo cuatro", () => {
    const first = resolveAccountingPeriod({ mode: "month", year: 2026, month: 8, weekOfMonth: 1 });
    const fourth = resolveAccountingPeriod({ mode: "month", year: 2026, month: 8, weekOfMonth: 4 });
    expect(first.startsAt.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(first.endsAt.toISOString()).toBe("2026-08-08T00:00:00.000Z");
    expect(fourth.startsAt.toISOString()).toBe("2026-08-22T00:00:00.000Z");
    expect(fourth.endsAt.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("usa un rango inclusivo y corrige un rango ingresado en orden inverso", () => {
    const range = resolveAccountingPeriod({ mode: "range", from: "2026-08-12T12:00:00.000Z", to: "2026-08-10T12:00:00.000Z" });
    expect(range.startsAt.toISOString()).toBe("2026-08-12T00:00:00.000Z");
    expect(range.endsAt.toISOString()).toBe("2026-08-13T00:00:00.000Z");
  });

  it("separa Lima–Torino y Torino–Lima, incluyendo solo gastos vinculados a la ruta elegida", () => {
    const routedShipments = [
      { id: 11, orderNumber: "0826-0001", code: "1ABC", shipmentType: "encomienda", paymentStatus: "Pagado", finalPriceEur: "100", route: "Lima - Torino", createdAt: new Date("2026-08-04T12:00:00.000Z") },
      { id: 12, orderNumber: "0826-0002", code: "2ABC", shipmentType: "encomienda", paymentStatus: "Pagado", finalPriceEur: "140", route: "Torino - Lima + provincia", provinceOperationalCostSoles: "20", createdAt: new Date("2026-08-05T12:00:00.000Z") },
    ];
    const routedExpenses = [
      { id: 11, shipmentId: 11, category: "operativo", amount: "8", currency: "EUR" as const, description: "Lima Torino", expenseDate: new Date("2026-08-06T12:00:00.000Z") },
      { id: 12, shipmentId: 12, category: "operativo", amount: "12", currency: "EUR" as const, description: "Torino Lima", expenseDate: new Date("2026-08-06T12:00:00.000Z") },
      { id: 13, category: "operativo", amount: "5", currency: "EUR" as const, description: "General", expenseDate: new Date("2026-08-06T12:00:00.000Z") },
    ];
    const limaTorino = calculateOperatingStatement({ shipments: routedShipments, expenses: routedExpenses, period: { year: 2026, month: 8 }, routeFilter: "Lima - Torino" });
    const torinoLima = calculateOperatingStatement({ shipments: routedShipments, expenses: routedExpenses, period: { year: 2026, month: 8 }, routeFilter: "Torino - Lima" });

    expect(limaTorino).toMatchObject({ routeLabel: "Lima–Torino", revenueEur: 100, manualExpenseEur: 8, netEur: 92, provinceCostPen: 0 });
    expect(torinoLima).toMatchObject({ routeLabel: "Torino–Lima", revenueEur: 140, manualExpenseEur: 12, netEur: 128, provinceCostPen: 20 });
  });
});


describe("ingresos por moneda de la tarifa", () => {
  it("separa un precio manual USD y un precio manual PEN sin convertirlos silenciosamente a EUR", () => {
    const statement = calculateOperatingStatement({
      shipments: [
        { id: 21, orderNumber: "0826-0021", code: "USD1", shipmentType: "encomienda", paymentStatus: "Pagado", finalPriceEur: "80", manualPriceEur: "80", manualPriceCurrency: "USD", pricingCurrency: "EUR", createdAt: new Date("2026-08-12T12:00:00.000Z") },
        { id: 22, orderNumber: "0826-0022", code: "PEN1", shipmentType: "documento", paymentStatus: "Pagado", finalPriceEur: "150", manualPriceEur: "150", manualPriceCurrency: "PEN", pricingCurrency: "EUR", createdAt: new Date("2026-08-12T12:00:00.000Z") },
        { id: 23, orderNumber: "0826-0023", code: "EUR1", shipmentType: "documento", paymentStatus: "Pagado", finalPriceEur: "45", pricingCurrency: "EUR", createdAt: new Date("2026-08-12T12:00:00.000Z") },
      ],
      expenses: [],
      period: { year: 2026, month: 8 },
    });

    expect(statement.revenueEur).toBe(45);
    expect(statement.revenueUsd).toBe(80);
    expect(statement.revenuePen).toBe(150);
    expect(statement.revenueByCurrency).toEqual({ EUR: 45, USD: 80, PEN: 150 });
    expect(statement.netUsd).toBe(80);
    expect(statement.netPen).toBe(150);
  });
});
