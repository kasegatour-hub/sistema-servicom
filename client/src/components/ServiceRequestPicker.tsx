import React, { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

const SERVICE_OPTIONS = [
  "Recepción en agencia",
  "Entrega a domicilio",
  "Embalaje reforzado",
  "Seguro de envío",
  "Seguimiento prioritario",
  "Recojo en agencia",
  "Entrega en terminal terrestre",
  "Coordinación con courier",
  "Verificación de documentos",
  "Otro servicio solicitado",
] as const;

export function ServiceRequestPicker({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const normalized = query.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().trim();
    if (!normalized) return [];
    return SERVICE_OPTIONS.filter((service) => service.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().includes(normalized));
  }, [query]);
  const toggle = (service: string) => onChange(value.includes(service) ? value.filter((item) => item !== service) : [...value, service]);
  return <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4" aria-label="Servicios solicitados">
    <p className="text-sm font-bold text-violet-950">Servicios solicitados</p>
    <p className="mt-1 text-xs text-violet-900">Busca y selecciona los servicios para esta sede. Se guardarán en el envío y aparecerán en notas y documentos.</p>
    <Input className="mt-3 bg-white" aria-label="Buscar servicio solicitado" placeholder="Buscar servicio…" value={query} onChange={(event) => setQuery(event.target.value)} />
    {query.trim() && <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {filtered.map((service) => <label key={service} className="flex cursor-pointer items-center gap-2 rounded-lg border border-white bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm">
        <input type="checkbox" checked={value.includes(service)} onChange={() => toggle(service)} className="h-4 w-4" aria-label={service} />
        <span>{service}</span>
      </label>)}
      {filtered.length === 0 && <p className="rounded-lg border border-dashed border-violet-200 bg-white/70 p-3 text-sm text-violet-900 sm:col-span-2">No se encontraron servicios. Prueba con otra palabra.</p>}
    </div>}
    {value.length > 0 && <p className="mt-3 text-xs font-semibold text-violet-900">Seleccionados: {value.join(", ")}</p>}
  </div>;
}
