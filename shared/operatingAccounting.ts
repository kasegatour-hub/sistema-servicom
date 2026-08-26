import { isTorinoLimaRoute } from "./shipmentRoutes";

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

export type AccountingPeriodMode = "today" | "week" | "month" | "range" | "year";
export type AccountingRouteFilter = "all" | "Lima - Torino" | "Torino - Lima";
export const ACCOUNTING_ROUTE_FILTERS: AccountingRouteFilter[] = ["all", "Lima - Torino", "Torino - Lima"];

export type AccountingPeriodInput = {
  mode?: AccountingPeriodMode;
  year?: number | null;
  month?: number | null;
  /** Semana operativa de un mes: 1=1–7, 2=8–14, 3=15–21, 4=22–fin de mes. */
  weekOfMonth?: 1 | 2 | 3 | 4 | null;
  /** Fecha incluida dentro de la semana solicitada. */
  weekDate?: Date | string | null;
  from?: Date | string | null;
  to?: Date | string | null;
};

export type ResolvedAccountingPeriod = {
  mode: AccountingPeriodMode;
  startsAt: Date;
  endsAt: Date;
  label: string;
  year: number;
  month: number | null;
  weekOfMonth: 1 | 2 | 3 | 4 | null;
};

const positiveMoney = (value: string | number | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const isValidDate = (value: Date) => Number.isFinite(value.getTime());

const utcStartOfDay = (value: Date | string) => {
  const date = new Date(value);
  if (!isValidDate(date)) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

const addUtcDays = (date: Date, days: number) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));

const formatDate = (value: Date, locale = "es-PE") => new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(value);

export function resolveAccountingPeriod(input: AccountingPeriodInput, now = new Date(), locale = "es-PE"): ResolvedAccountingPeriod {
  const current = utcStartOfDay(now) || new Date();
  const mode = input.mode ?? (input.month != null ? "month" : "year");
  const requestedYear = Number(input.year ?? current.getUTCFullYear());
  const requestedMonth = Number(input.month ?? current.getUTCMonth() + 1);
  const validYear = Number.isInteger(requestedYear) ? requestedYear : current.getUTCFullYear();
  const validMonth = requestedMonth >= 1 && requestedMonth <= 12 ? requestedMonth : current.getUTCMonth() + 1;

  if (mode === "today") {
    return { mode, startsAt: current, endsAt: addUtcDays(current, 1), label: `Hoy · ${formatDate(current, locale)}`, year: current.getUTCFullYear(), month: current.getUTCMonth() + 1, weekOfMonth: null };
  }

  if (mode === "week") {
    const selected = utcStartOfDay(input.weekDate || current) || current;
    const mondayOffset = (selected.getUTCDay() + 6) % 7;
    const startsAt = addUtcDays(selected, -mondayOffset);
    const endsAt = addUtcDays(startsAt, 7);
    return { mode, startsAt, endsAt, label: `Semana del ${formatDate(startsAt, locale)} al ${formatDate(addUtcDays(endsAt, -1), locale)}`, year: selected.getUTCFullYear(), month: selected.getUTCMonth() + 1, weekOfMonth: null };
  }

  if (mode === "range") {
    const startsAt = utcStartOfDay(input.from || current) || current;
    const lastDay = utcStartOfDay(input.to || startsAt) || startsAt;
    const endsAt = addUtcDays(lastDay < startsAt ? startsAt : lastDay, 1);
    return { mode, startsAt, endsAt, label: `Del ${formatDate(startsAt, locale)} al ${formatDate(addUtcDays(endsAt, -1), locale)}`, year: startsAt.getUTCFullYear(), month: null, weekOfMonth: null };
  }

  if (mode === "month") {
    const monthStart = new Date(Date.UTC(validYear, validMonth - 1, 1));
    const requestedWeek = input.weekOfMonth ?? null;
    if (requestedWeek) {
      const startsAt = addUtcDays(monthStart, (requestedWeek - 1) * 7);
      const monthEnd = new Date(Date.UTC(validYear, validMonth, 1));
      const endsAt = requestedWeek === 4 || addUtcDays(startsAt, 7) > monthEnd ? monthEnd : addUtcDays(startsAt, 7);
      const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(monthStart);
      return { mode, startsAt, endsAt, label: `${monthLabel} · Semana ${requestedWeek} (${startsAt.getUTCDate()}–${addUtcDays(endsAt, -1).getUTCDate()})`, year: validYear, month: validMonth, weekOfMonth: requestedWeek };
    }
    const endsAt = new Date(Date.UTC(validYear, validMonth, 1));
    const label = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(monthStart);
    return { mode, startsAt: monthStart, endsAt, label, year: validYear, month: validMonth, weekOfMonth: null };
  }

  const startsAt = new Date(Date.UTC(validYear, 0, 1));
  const endsAt = new Date(Date.UTC(validYear + 1, 0, 1));
  return { mode: "year", startsAt, endsAt, label: `Año ${validYear}`, year: validYear, month: null, weekOfMonth: null };
}

const dateInPeriod = (value: Date | string, period: ResolvedAccountingPeriod) => {
  const date = new Date(value);
  return isValidDate(date) && date >= period.startsAt && date < period.endsAt;
};

const rounded = (value: number) => Math.round(value * 100) / 100;

export function getAccountingPeriodLabel(period: AccountingPeriodInput, locale = "es-PE") {
  return resolveAccountingPeriod(period, new Date(), locale).label;
}

export function getAccountingRouteLabel(routeFilter: AccountingRouteFilter | undefined) {
  if (routeFilter === "Lima - Torino") return "Lima–Torino";
  if (routeFilter === "Torino - Lima") return "Torino–Lima";
  return "Todas las rutas";
}

function matchesAccountingRoute(shipment: AccountingShipment, routeFilter: AccountingRouteFilter) {
  if (routeFilter === "all") return true;
  if (routeFilter === "Torino - Lima") return isTorinoLimaRoute(shipment.route);
  return shipment.route === "Lima - Torino";
}

/**
 * No convierte monedas automáticamente. Si se proporciona `penPerEur`, los egresos PEN
 * se convierten de manera explícita para obtener la utilidad neta en EUR.
 */
export function calculateOperatingStatement(input: {
  shipments: AccountingShipment[];
  expenses: AccountingExpense[];
  period: AccountingPeriodInput | ResolvedAccountingPeriod;
  routeFilter?: AccountingRouteFilter;
  penPerEur?: number | null;
}) {
  const period = "startsAt" in input.period ? input.period : resolveAccountingPeriod(input.period);
  const routeFilter = input.routeFilter || "all";
  const shipments = input.shipments.filter(shipment => dateInPeriod(shipment.createdAt, period) && matchesAccountingRoute(shipment, routeFilter));
  const shipmentIds = new Set(shipments.map(shipment => shipment.id));
  const expenses = input.expenses.filter(expense => dateInPeriod(expense.expenseDate, period) && (routeFilter === "all" || (expense.shipmentId != null && shipmentIds.has(expense.shipmentId))));
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
    periodLabel: period.label,
    period,
    routeFilter,
    routeLabel: getAccountingRouteLabel(routeFilter),
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
