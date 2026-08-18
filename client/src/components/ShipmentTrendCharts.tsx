import { BarChart3, TrendingDown, TrendingUp } from "lucide-react";
import { summarizeShipmentTrends, type ShipmentTrendSource, type ShipmentTrendBucket } from "@shared/shipmentTrends";

function TrendBars({ title, rows, tone }: { title: string; rows: ShipmentTrendBucket[]; tone: "blue" | "amber" | "emerald" }) {
  const maximum = Math.max(1, ...rows.map(row => row.count));
  const toneClass = tone === "amber" ? "bg-amber-500" : tone === "emerald" ? "bg-emerald-500" : "bg-[#0B2B5E]";
  return <section className="rounded-xl border border-slate-200 bg-white p-4" aria-label={`Gráfico de ${title}`}>
    <h4 className="text-sm font-bold text-slate-800">{title}</h4>
    {!rows.length ? <p className="mt-3 text-sm text-slate-500">Aún no hay envíos para mostrar.</p> : <div className="mt-3 space-y-3">{rows.map(row => <div key={row.label}><div className="mb-1 flex items-center justify-between gap-3 text-xs"><span className="truncate font-medium text-slate-700">{row.label}</span><span className="shrink-0 font-bold text-slate-900">{row.count}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${toneClass}`} style={{ width: `${Math.max(4, Math.round((row.count / maximum) * 100))}%` }} /></div></div>)}</div>}
  </section>;
}

export function ShipmentTrendCharts({ shipments }: { shipments: ShipmentTrendSource[] | null | undefined }) {
  const trends = summarizeShipmentTrends(shipments);
  return <div className="space-y-4">
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3"><div className="rounded-xl border border-blue-100 bg-blue-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-[#0B2B5E]">Envíos analizados</p><p className="mt-1 text-3xl font-bold text-[#0B2B5E]">{trends.total}</p></div><div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-800"><TrendingUp className="h-4 w-4" /> Más frecuente</div><p className="mt-1 text-sm font-bold text-emerald-900">{trends.mostFrequent ? `${trends.mostFrequent.label} · ${trends.mostFrequent.count}` : "Sin datos"}</p></div><div className="rounded-xl border border-amber-100 bg-amber-50 p-4"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-800"><TrendingDown className="h-4 w-4" /> Menos frecuente</div><p className="mt-1 text-sm font-bold text-amber-900">{trends.leastFrequent ? `${trends.leastFrequent.label} · ${trends.leastFrequent.count}` : "Sin datos"}</p></div></div>
    <div className="flex items-center gap-2 text-sm font-semibold text-[#0B2B5E]"><BarChart3 className="h-4 w-4" /> Tendencias de los envíos registrados</div>
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3"><TrendBars title="Por tipo" rows={trends.byType} tone="blue" /><TrendBars title="Por ruta" rows={trends.byRoute} tone="amber" /><TrendBars title="Por estado" rows={trends.byStatus} tone="emerald" /></div>
  </div>;
}
