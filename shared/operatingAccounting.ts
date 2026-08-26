export type AccountingCurrency = "EUR" | "PEN";

export type AccountingShipment = {
  id: number;
  orderNumber: string;
  code: string;
  shipmentType?: string | null;
  status?: string | null;
  paymentStatus?: string | null;
  finalPriceEur?: string | number | null;
  basePriceEur?: string | number | null;
  provinceOperationalCostSoles?: string | number | null;
  isProvinceDelivery?: number | boolean | null;
  recipientName?: string | null;
  recipientLastName?: string | null;
  route?: string | null;
  createdAt: Date | string;
};

export type AccountingExpense = {
  id: number;
  shipmentId?: number | null;
  category: string;
  amount: string | number;
  currency: AccountingCurrency;
  description: string;
  expenseDate: Date | string;
  createdByLabel?: string | null;
};

export type AccountingPeriod = { year: number; month?: number | null };

const positiveMoney = (value: string | number | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const dateInPeriod = (value: Date | string, period: AccountingPeriod) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.getUTCFullYear() !== period.year) return false;
  return period.month == null || date.getUTCMonth() + 1 === period.month;
};

const rounded = (value: number) => Math.round(value * 100) / 100;

export function getAccountingPeriodLabel(period: AccountingPeriod, locale = "es-PE") {
  if (period.month == null) return `Año ${period.year}`;
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(period.year, period.month - 1, 1)));
}

/**
 * No convierte monedas automáticamente. Si se proporciona `penPerEur`, los egresos PEN
 * se convierten de manera explícita para obtener la utilidad neta en EUR.
 */
export function calculateOperatingStatement(input: {
  shipments: AccountingShipment[];
  expenses: AccountingExpense[];
  period: AccountingPeriod;
  penPerEur?: number | null;
}) {
  const shipments = input.shipments.filter(shipment => dateInPeriod(shipment.createdAt, input.period));
  const expenses = input.expenses.filter(expense => dateInPeriod(expense.expenseDate, input.period));
  const paidShipments = shipments.filter(shipment => shipment.paymentStatus === "Pagado");
  const parcelRows = shipments.filter(shipment => shipment.shipmentType === "encomienda");
  const revenueEur = paidShipments.reduce((total, shipment) => total + positiveMoney(shipment.finalPriceEur ?? shipment.basePriceEur), 0);
  const provinceCostPen = shipments.reduce((total, shipment) => total + positiveMoney(shipment.provinceOperationalCostSoles), 0);
  const manualExpenseEur = expenses.filter(expense => expense.currency === "EUR").reduce((total, expense) => total + positiveMoney(expense.amount), 0);
  const manualExpensePen = expenses.filter(expense => expense.currency === "PEN").reduce((total, expense) => total + positiveMoney(expense.amount), 0);
  const expensePen = provinceCostPen + manualExpensePen;
  const validRate = Number(input.penPerEur);
  const penPerEur = Number.isFinite(validRate) && validRate > 0 ? validRate : null;
  const expensePenConvertedEur = penPerEur ? expensePen / penPerEur : null;
  const expenseEur = manualExpenseEur + (expensePenConvertedEur ?? 0);
  const netEur = penPerEur ? revenueEur - expenseEur : revenueEur - manualExpenseEur;

  return {
    periodLabel: getAccountingPeriodLabel(input.period),
    shipments,
    parcelRows,
    expenses,
    paidShipmentCount: paidShipments.length,
    shipmentCount: shipments.length,
    parcelCount: parcelRows.length,
    provinceShipmentCount: shipments.filter(shipment => Boolean(shipment.isProvinceDelivery)).length,
    revenueEur: rounded(revenueEur),
    manualExpenseEur: rounded(manualExpenseEur),
    provinceCostPen: rounded(provinceCostPen),
    manualExpensePen: rounded(manualExpensePen),
    expensePen: rounded(expensePen),
    penPerEur,
    expensePenConvertedEur: expensePenConvertedEur == null ? null : rounded(expensePenConvertedEur),
    expenseEur: rounded(expenseEur),
    netEur: rounded(netEur),
    isNetEurConsolidated: Boolean(penPerEur),
  };
}
