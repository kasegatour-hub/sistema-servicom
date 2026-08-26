import React, { useMemo, useState } from "react";
import { Download, FileSpreadsheet, FileText, Landmark, PlusCircle, RefreshCw, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { downloadAccountingExcel, downloadAccountingPdf } from "@/lib/accountingReport";

const currency = (value: number, code: "EUR" | "PEN") => new Intl.NumberFormat("es-PE", { style: "currency", currency: code }).format(Number(value || 0));
const dateValue = (date = new Date()) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const categoryLabels: Record<string, string> = { transporte: "Transporte", agencia_provincial: "Agencia provincial", embalaje: "Embalaje", operativo: "Operativo", otro: "Otro" };
const periodModeLabels = { today: "Hoy", week: "Semana", month: "Mes", range: "Rango de fechas", year: "Año" } as const;
type PeriodMode = keyof typeof periodModeLabels;
const routeFilterLabels = { all: "Todas las rutas", "Lima - Torino": "Lima–Torino", "Torino - Lima": "Torino–Lima" } as const;

export function AccountingWorkspace() {
  const currentYear = new Date().getFullYear();
  const today = dateValue();
  const [periodMode, setPeriodMode] = useState<PeriodMode>("month");
  const [routeFilter, setRouteFilter] = useState<keyof typeof routeFilterLabels>("Lima - Torino");
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [weekOfMonth, setWeekOfMonth] = useState<string>("all");
  const [weekDate, setWeekDate] = useState(today);
  const [rangeFrom, setRangeFrom] = useState(today);
  const [rangeTo, setRangeTo] = useState(today);
  const [penPerEur, setPenPerEur] = useState("");
  const [expense, setExpense] = useState({ shipmentId: "none", category: "operativo", amount: "", currency: "EUR" as "EUR" | "PEN", description: "", expenseDate: dateValue() });
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);
  const utils = trpc.useUtils();
  const queryInput = useMemo(() => ({
    mode: periodMode,
    year: periodMode === "month" || periodMode === "year" ? year : undefined,
    month: periodMode === "month" ? Number(month) : null,
    weekOfMonth: periodMode === "month" && weekOfMonth !== "all" ? Number(weekOfMonth) as 1 | 2 | 3 | 4 : null,
    weekDate: periodMode === "week" ? new Date(`${weekDate}T12:00:00`) : null,
    from: periodMode === "range" ? new Date(`${rangeFrom}T12:00:00`) : null,
    to: periodMode === "range" ? new Date(`${rangeTo}T12:00:00`) : null,
    routeFilter,
    penPerEur: penPerEur.trim() ? Number(penPerEur) : null,
  }), [periodMode, year, month, weekOfMonth, weekDate, rangeFrom, rangeTo, routeFilter, penPerEur]);
  const summary = trpc.accounting.summary.useQuery(queryInput);
  const addExpense = trpc.accounting.createExpense.useMutation({
    onSuccess: async () => {
      setExpense(current => ({ ...current, shipmentId: "none", amount: "", description: "", expenseDate: dateValue() }));
      await utils.accounting.summary.invalidate();
    },
  });
  const data = summary.data;
  const years = Array.from({ length: 7 }, (_, index) => currentYear - 4 + index);

  const exportReport = async (kind: "pdf" | "excel") => {
    if (!data) return;
    setExporting(kind);
    try {
      if (kind === "pdf") await downloadAccountingPdf(data);
      else await downloadAccountingExcel(data);
    } finally {
      setExporting(null);
    }
  };

  return <section className="mb-8 space-y-5" aria-label="Contabilidad operativa">
    <Card className="overflow-hidden border-0 p-0 shadow-lg">
      <div className="bg-gradient-to-r from-[#0B2B5E] via-[#174a89] to-[#006CB7] p-6 text-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-orange-200"><Landmark className="h-4 w-4" /> Contabilidad operativa</p><h2 className="mt-2 text-2xl font-extrabold">Ingresos, egresos y utilidad</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">Estado de resultados simplificado. Usa envíos cobrados, costos provinciales registrados y gastos manuales de tu espacio operativo.</p></div>
          <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => void exportReport("excel")} disabled={!data || exporting !== null} className="border-white/50 bg-white/10 text-white hover:bg-white/20"><FileSpreadsheet className="mr-2 h-4 w-4" />{exporting === "excel" ? "Preparando…" : "Excel"}</Button><Button type="button" variant="outline" onClick={() => void exportReport("pdf")} disabled={!data || exporting !== null} className="border-white/50 bg-white/10 text-white hover:bg-white/20"><FileText className="mr-2 h-4 w-4" />{exporting === "pdf" ? "Preparando…" : "PDF"}</Button></div>
        </div>
      </div>
      <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
        <div><Label htmlFor="accounting-period-mode">Ver envíos de</Label><Select value={periodMode} onValueChange={value => setPeriodMode(value as PeriodMode)}><SelectTrigger id="accounting-period-mode" className="mt-1 h-11 bg-white"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(periodModeLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
        <div className="sm:col-span-2"><Label>Ruta contable</Label><div className="mt-1 grid gap-2 sm:grid-cols-2" role="group" aria-label="Ruta contable"><Button type="button" aria-pressed={routeFilter === "Lima - Torino"} onClick={() => setRouteFilter("Lima - Torino")} className={routeFilter === "Lima - Torino" ? "min-h-11 bg-[#0B2B5E] text-white" : "min-h-11 border border-blue-200 bg-blue-50 text-[#0B2B5E]"}>Lima → Torino</Button><Button type="button" aria-pressed={routeFilter === "Torino - Lima"} onClick={() => setRouteFilter("Torino - Lima")} className={routeFilter === "Torino - Lima" ? "min-h-11 bg-[#F28C00] text-white" : "min-h-11 border border-orange-200 bg-orange-50 text-[#9A5700]"}>Torino → Lima + provincia</Button></div><p className="mt-1 text-xs text-slate-500">Los ingresos, egresos, utilidad, detalle y exportaciones corresponden únicamente a la ruta elegida.</p></div>
        {(periodMode === "month" || periodMode === "year") && <div><Label htmlFor="accounting-year">Año</Label><Select value={String(year)} onValueChange={value => setYear(Number(value))}><SelectTrigger id="accounting-year" className="mt-1 h-11 bg-white"><SelectValue /></SelectTrigger><SelectContent>{years.map(value => <SelectItem key={value} value={String(value)}>{value}</SelectItem>)}</SelectContent></Select></div>}
        {periodMode === "month" && <div><Label htmlFor="accounting-month">Mes</Label><Select value={month} onValueChange={value => { setMonth(value); setWeekOfMonth("all"); }}><SelectTrigger id="accounting-month" className="mt-1 h-11 bg-white"><SelectValue /></SelectTrigger><SelectContent>{months.map((label, index) => <SelectItem key={label} value={String(index + 1)}>{label}</SelectItem>)}</SelectContent></Select></div>}
        {periodMode === "month" && <div><Label htmlFor="accounting-week-of-month">Semana del mes</Label><Select value={weekOfMonth} onValueChange={setWeekOfMonth}><SelectTrigger id="accounting-week-of-month" className="mt-1 h-11 bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todo el mes</SelectItem><SelectItem value="1">Semana 1 · días 1–7</SelectItem><SelectItem value="2">Semana 2 · días 8–14</SelectItem><SelectItem value="3">Semana 3 · días 15–21</SelectItem><SelectItem value="4">Semana 4 · días 22–fin</SelectItem></SelectContent></Select></div>}
        {periodMode === "week" && <div><Label htmlFor="accounting-week-date">Fecha dentro de la semana</Label><Input id="accounting-week-date" type="date" value={weekDate} onChange={event => setWeekDate(event.target.value)} className="mt-1 h-11" /></div>}
        {periodMode === "range" && <><div><Label htmlFor="accounting-range-from">Desde</Label><Input id="accounting-range-from" type="date" value={rangeFrom} onChange={event => setRangeFrom(event.target.value)} className="mt-1 h-11" /></div><div><Label htmlFor="accounting-range-to">Hasta</Label><Input id="accounting-range-to" type="date" min={rangeFrom} value={rangeTo} onChange={event => setRangeTo(event.target.value)} className="mt-1 h-11" /></div></>}
        <div><Label htmlFor="accounting-rate">Tipo de cambio (PEN por EUR)</Label><Input id="accounting-rate" value={penPerEur} onChange={event => setPenPerEur(event.target.value.replace(/[^0-9.,]/g, "").replace(",", "."))} inputMode="decimal" placeholder="Opcional, ej. 4.10" className="mt-1 h-11" /><p className="mt-1 text-xs text-slate-500">Solo se usa para consolidar costos PEN.</p></div>
        <div className="flex items-end"><Button type="button" variant="outline" onClick={() => void summary.refetch()} className="h-11 w-full border-[#0B2B5E] text-[#0B2B5E]"><RefreshCw className={`mr-2 h-4 w-4 ${summary.isFetching ? "animate-spin" : ""}`} />Actualizar</Button></div>
      </div>
    </Card>

    {summary.isLoading ? <Card className="p-6 text-sm text-slate-600">Calculando el periodo contable…</Card> : summary.error ? <Card role="alert" className="border-rose-200 bg-rose-50 p-5 text-rose-800">No se pudo cargar la contabilidad: {summary.error.message}</Card> : data && <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-emerald-100 bg-emerald-50 p-5"><p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Ingresos cobrados</p><p className="mt-2 text-3xl font-extrabold text-emerald-800">{currency(data.revenueEur, "EUR")}</p><p className="mt-2 text-sm text-emerald-900">{data.paidShipmentCount} envíos pagados</p></Card>
        <Card className="border-rose-100 bg-rose-50 p-5"><p className="text-xs font-bold uppercase tracking-wide text-rose-800">Egresos EUR</p><p className="mt-2 text-3xl font-extrabold text-rose-800">{currency(data.manualExpenseEur, "EUR")}</p><p className="mt-2 text-sm text-rose-900">Gastos manuales en euros</p></Card>
        <Card className="border-amber-100 bg-amber-50 p-5"><p className="text-xs font-bold uppercase tracking-wide text-amber-800">Egresos PEN</p><p className="mt-2 text-3xl font-extrabold text-amber-800">{currency(data.expensePen, "PEN")}</p><p className="mt-2 text-sm text-amber-900">Provincia: {currency(data.provinceCostPen, "PEN")}</p></Card>
        <Card className="border-blue-100 bg-blue-50 p-5"><p className="text-xs font-bold uppercase tracking-wide text-[#0B2B5E]">{data.isNetEurConsolidated ? "Utilidad neta" : "Utilidad EUR parcial"}</p><p className="mt-2 text-3xl font-extrabold text-[#0B2B5E]">{currency(data.netEur, "EUR")}</p><p className="mt-2 text-sm text-slate-700">{data.isNetEurConsolidated ? `Incluye ${currency(data.expensePenConvertedEur || 0, "EUR")} convertidos desde PEN.` : "Ingresa tipo de cambio para descontar costos PEN."}</p></Card>
      </div>

      <Card className="p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="flex items-center gap-2 text-lg font-extrabold text-[#0B2B5E]"><WalletCards className="h-5 w-5 text-[#F28C00]" /> Estado de resultados simplificado</h3><p className="mt-1 text-sm text-slate-600">{data.workspace.label} · {data.periodLabel} · <strong>{data.routeLabel}</strong></p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">{data.shipmentCount} envíos · {data.parcelCount} encomiendas</span></div>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[540px] text-sm"><tbody className="divide-y divide-slate-100"><tr><td className="py-3 font-semibold text-slate-700">Ingresos cobrados</td><td className="py-3 text-right font-bold text-emerald-700">{currency(data.revenueEur, "EUR")}</td></tr><tr><td className="py-3 text-slate-700">Gastos manuales EUR</td><td className="py-3 text-right font-semibold text-rose-700">− {currency(data.manualExpenseEur, "EUR")}</td></tr><tr><td className="py-3 text-slate-700">Costos provinciales PEN</td><td className="py-3 text-right font-semibold text-amber-700">{currency(data.provinceCostPen, "PEN")}</td></tr><tr><td className="py-3 text-slate-700">Gastos manuales PEN</td><td className="py-3 text-right font-semibold text-amber-700">{currency(data.manualExpensePen, "PEN")}</td></tr>{data.penPerEur && <tr><td className="py-3 text-slate-700">Costos PEN convertidos a {data.penPerEur} PEN/EUR</td><td className="py-3 text-right font-semibold text-rose-700">− {currency(data.expensePenConvertedEur || 0, "EUR")}</td></tr>}<tr className="bg-blue-50"><td className="rounded-l-lg px-3 py-4 font-extrabold text-[#0B2B5E]">{data.isNetEurConsolidated ? "Utilidad neta EUR" : "Utilidad EUR antes de costos PEN"}</td><td className="rounded-r-lg px-3 py-4 text-right text-lg font-extrabold text-[#0B2B5E]">{currency(data.netEur, "EUR")}</td></tr></tbody></table></div>
      </Card>

      <Card className="p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="flex items-center gap-2 text-lg font-extrabold text-[#0B2B5E]"><PlusCircle className="h-5 w-5 text-[#F28C00]" /> Registrar gasto operativo</h3><p className="mt-1 text-sm text-slate-600">Registra un gasto general o vincúlalo a una encomienda o documento de tu espacio.</p></div></div>
        <form className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3" onSubmit={event => { event.preventDefault(); addExpense.mutate({ shipmentId: expense.shipmentId === "none" ? null : Number(expense.shipmentId), category: expense.category as any, amount: Number(expense.amount), currency: expense.currency, description: expense.description, expenseDate: new Date(`${expense.expenseDate}T12:00:00`) }); }}>
          <div><Label htmlFor="expense-date">Fecha</Label><Input id="expense-date" type="date" value={expense.expenseDate} onChange={event => setExpense(current => ({ ...current, expenseDate: event.target.value }))} className="mt-1 h-11" required /></div>
          <div><Label htmlFor="expense-category">Categoría</Label><Select value={expense.category} onValueChange={value => setExpense(current => ({ ...current, category: value }))}><SelectTrigger id="expense-category" className="mt-1 h-11"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(categoryLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
          <div><Label htmlFor="expense-shipment">Envío vinculado</Label><Select value={expense.shipmentId} onValueChange={value => setExpense(current => ({ ...current, shipmentId: value }))}><SelectTrigger id="expense-shipment" className="mt-1 h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Gasto general</SelectItem>{data.shipments.map(shipment => <SelectItem key={shipment.id} value={String(shipment.id)}>{shipment.orderNumber} · {shipment.code}</SelectItem>)}</SelectContent></Select></div>
          <div><Label htmlFor="expense-amount">Monto</Label><Input id="expense-amount" value={expense.amount} onChange={event => setExpense(current => ({ ...current, amount: event.target.value.replace(/[^0-9.,]/g, "").replace(",", ".") }))} inputMode="decimal" placeholder="0.00" className="mt-1 h-11" required /></div>
          <div><Label htmlFor="expense-currency">Moneda</Label><Select value={expense.currency} onValueChange={value => setExpense(current => ({ ...current, currency: value as "EUR" | "PEN" }))}><SelectTrigger id="expense-currency" className="mt-1 h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="EUR">EUR</SelectItem><SelectItem value="PEN">PEN (S/)</SelectItem></SelectContent></Select></div>
          <div className="xl:col-span-2"><Label htmlFor="expense-description">Descripción</Label><Textarea id="expense-description" value={expense.description} onChange={event => setExpense(current => ({ ...current, description: event.target.value }))} placeholder="Ej.: despacho de agencia, embalaje o movilidad" className="mt-1 min-h-11" maxLength={500} required /></div>
          <div className="flex items-end"><Button type="submit" disabled={addExpense.isPending || !Number(expense.amount) || expense.description.trim().length < 3} className="min-h-11 w-full bg-[#F28C00] text-white hover:bg-[#d67900]">{addExpense.isPending ? "Guardando…" : "Guardar gasto"}</Button></div>
          {addExpense.error && <p role="alert" className="md:col-span-2 xl:col-span-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">{addExpense.error.message}</p>}
        </form>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="p-5 shadow-sm"><h3 className="text-lg font-extrabold text-[#0B2B5E]">Encomiendas del periodo</h3><p className="mt-1 text-sm text-slate-600">Detalle incluido en PDF y Excel.</p><div className="mt-4 max-h-80 overflow-auto"><table className="w-full min-w-[580px] text-sm"><thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="p-2">Orden</th><th className="p-2">Destinatario</th><th className="p-2">Estado</th><th className="p-2 text-right">Cobrado</th></tr></thead><tbody>{data.parcelRows.map(shipment => <tr key={shipment.id} className="border-t border-slate-100"><td className="p-2 font-semibold text-[#0B2B5E]">{shipment.orderNumber}</td><td className="p-2">{`${shipment.recipientName || ""} ${shipment.recipientLastName || ""}`.trim() || "—"}</td><td className="p-2">{shipment.status}</td><td className="p-2 text-right font-semibold">{currency(Number(shipment.finalPriceEur ?? shipment.basePriceEur ?? 0), "EUR")}</td></tr>)}</tbody></table>{!data.parcelRows.length && <p className="p-5 text-center text-sm text-slate-500">No hay encomiendas en este periodo.</p>}</div></Card>
        <Card className="p-5 shadow-sm"><h3 className="text-lg font-extrabold text-[#0B2B5E]">Gastos manuales</h3><p className="mt-1 text-sm text-slate-600">Cada gasto queda asociado a tu espacio operativo.</p><div className="mt-4 max-h-80 overflow-auto"><table className="w-full min-w-[530px] text-sm"><thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="p-2">Fecha</th><th className="p-2">Detalle</th><th className="p-2">Categoría</th><th className="p-2 text-right">Monto</th></tr></thead><tbody>{data.expenses.map(item => <tr key={item.id} className="border-t border-slate-100"><td className="p-2">{new Date(item.expenseDate).toLocaleDateString("es-PE")}</td><td className="p-2">{item.description}</td><td className="p-2">{categoryLabels[item.category] || item.category}</td><td className="p-2 text-right font-semibold">{currency(Number(item.amount), item.currency)}</td></tr>)}</tbody></table>{!data.expenses.length && <p className="p-5 text-center text-sm text-slate-500">No hay gastos manuales en este periodo.</p>}</div></Card>
      </div>

      {data.monthly.length > 0 && <Card className="p-5 shadow-sm"><h3 className="text-lg font-extrabold text-[#0B2B5E]">Resumen por meses de {year} · {data.routeLabel}</h3><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{data.monthly.map(item => <div key={item.periodLabel} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="font-bold capitalize text-[#0B2B5E]">{item.periodLabel}</p><p className="mt-2 text-sm text-slate-600">Ingresos: <strong>{currency(item.revenueEur, "EUR")}</strong></p><p className="text-sm text-slate-600">Egresos PEN: <strong>{currency(item.expensePen, "PEN")}</strong></p><p className="mt-2 text-base font-extrabold text-[#0B2B5E]">Utilidad: {currency(item.netEur, "EUR")}</p></div>)}</div></Card>}
    </>}
  </section>;
}
