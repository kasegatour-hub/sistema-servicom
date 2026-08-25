import React, { useEffect, useState } from "react";
import { MapView } from "@/components/Map";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type TransferMode = "dhl_recogida" | "persona_autorizada";
type LocationType = "direccion" | "aeropuerto_jorge_chavez";

export type LimaTorinoTransferValue = {
  mode?: TransferMode;
  personName?: string;
  personLastName?: string;
  personDni?: string;
  personPhone?: string;
  locationType?: LocationType;
  locationAddress?: string;
  latitude?: number | null;
  longitude?: number | null;
};

const AIRPORT_ADDRESS = "Nuevo Aeropuerto Internacional Jorge Chávez, Callao, Lima, Perú";
const AIRPORT_COORDS = { latitude: -12.0219, longitude: -77.1143 };

export function LimaTorinoTransferPanel({ value, onChange, error }: { value: LimaTorinoTransferValue; onChange: (value: LimaTorinoTransferValue) => void; error?: string }) {
  const [mapOpen, setMapOpen] = useState(false);
  const mode = value.mode;
  const update = (patch: Partial<LimaTorinoTransferValue>) => onChange({ ...value, ...patch });

  useEffect(() => {
    if (mode !== "persona_autorizada" && (value.personName || value.locationAddress || value.locationType)) {
      onChange({ mode });
    }
  }, [mode]);

  return (
    <section className="rounded-2xl border-2 border-blue-100 bg-blue-50/60 p-4 shadow-sm" aria-labelledby="lima-torino-transfer-title">
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0B2B5E]">Traslado en Lima</p>
        <h3 id="lima-torino-transfer-title" className="mt-1 text-lg font-extrabold text-[#0B2B5E]">¿Cómo se trasladará el documento a Torino?</h3>
        <p className="mt-1 text-sm text-slate-600">Esta selección solo aplica a documentos con ruta Lima – Torino.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" aria-pressed={mode === "dhl_recogida"} onClick={() => update({ mode: "dhl_recogida" })} className={`min-h-16 rounded-xl border-2 p-3 text-left transition active:scale-[.98] ${mode === "dhl_recogida" ? "border-[#F28C00] bg-white shadow-md" : "border-white bg-white/70 hover:border-blue-300"}`}>
          <span className="block text-base font-extrabold text-[#0B2B5E]">DHL recoge el documento</span>
          <span className="mt-1 block text-xs text-slate-600">La agencia DHL coordina la recogida en Lima.</span>
        </button>
        <button type="button" aria-pressed={mode === "persona_autorizada"} onClick={() => update({ mode: "persona_autorizada", locationType: value.locationType || "direccion" })} className={`min-h-16 rounded-xl border-2 p-3 text-left transition active:scale-[.98] ${mode === "persona_autorizada" ? "border-[#F28C00] bg-white shadow-md" : "border-white bg-white/70 hover:border-blue-300"}`}>
          <span className="block text-base font-extrabold text-[#0B2B5E]">Entregar a una persona</span>
          <span className="mt-1 block text-xs text-slate-600">Registra quién llevará el documento y dónde entregarlo.</span>
        </button>
      </div>
      {mode === "persona_autorizada" && <div className="mt-4 grid gap-4 rounded-xl border border-blue-100 bg-white p-4 sm:grid-cols-2">
        <div><Label htmlFor="delivery-person-name">Nombre *</Label><Input id="delivery-person-name" value={value.personName || ""} onChange={e => update({ personName: e.target.value })} className="mt-1 h-11" placeholder="Nombre" /></div>
        <div><Label htmlFor="delivery-person-last-name">Apellido *</Label><Input id="delivery-person-last-name" value={value.personLastName || ""} onChange={e => update({ personLastName: e.target.value })} className="mt-1 h-11" placeholder="Apellido" /></div>
        <div><Label htmlFor="delivery-person-dni">DNI *</Label><Input id="delivery-person-dni" inputMode="numeric" maxLength={8} value={value.personDni || ""} onChange={e => update({ personDni: e.target.value.replace(/\D/g, "").slice(0, 8) })} className="mt-1 h-11" placeholder="8 dígitos" /></div>
        <div><Label htmlFor="delivery-person-phone">Celular *</Label><Input id="delivery-person-phone" inputMode="tel" value={value.personPhone || ""} onChange={e => update({ personPhone: e.target.value })} className="mt-1 h-11" placeholder="Código + número" /></div>
        <div className="sm:col-span-2"><Label htmlFor="delivery-location-type">Lugar de entrega *</Label><select id="delivery-location-type" aria-label="Lugar de entrega" value={value.locationType || "direccion"} onChange={e => { const next = e.target.value as LocationType; update(next === "aeropuerto_jorge_chavez" ? { locationType: next, locationAddress: AIRPORT_ADDRESS, latitude: AIRPORT_COORDS.latitude, longitude: AIRPORT_COORDS.longitude } : { locationType: next }); }} className="mt-1 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-[#0B2B5E]"><option value="direccion">Dirección indicada en el mapa</option><option value="aeropuerto_jorge_chavez">Nuevo Aeropuerto Internacional Jorge Chávez</option></select></div>
        {value.locationType === "direccion" && <div className="sm:col-span-2"><Label htmlFor="delivery-location-address">Dirección de entrega *</Label><Input id="delivery-location-address" value={value.locationAddress || ""} onChange={e => update({ locationAddress: e.target.value })} className="mt-1 h-11" placeholder="Escribe la dirección o selecciónala en el mapa" /><Button type="button" variant="outline" className="mt-2 min-h-11 w-full border-[#0B2B5E] text-[#0B2B5E]" onClick={() => setMapOpen(open => !open)}>{mapOpen ? "Cerrar mapa" : "Elegir dirección en el mapa"}</Button></div>}
        {value.locationType === "aeropuerto_jorge_chavez" && <p className="sm:col-span-2 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-900">Punto seleccionado: {AIRPORT_ADDRESS}</p>}
        {mapOpen && value.locationType === "direccion" && <div className="sm:col-span-2 overflow-hidden rounded-xl border border-slate-200"><MapView className="h-64 w-full" initialCenter={{ lat: value.latitude || -12.0464, lng: value.longitude || -77.0428 }} initialZoom={12} onMapReady={(map) => { map.addListener("click", (event: google.maps.MapMouseEvent) => { const lat = event.latLng?.lat(); const lng = event.latLng?.lng(); if (lat == null || lng == null) return; update({ latitude: lat, longitude: lng, locationAddress: value.locationAddress || `Ubicación seleccionada (${lat.toFixed(6)}, ${lng.toFixed(6)})` }); }); }} /><p className="p-3 text-xs text-slate-600">Toca el mapa para fijar el punto de entrega. Puedes completar o corregir la dirección manualmente.</p></div>}
      </div>}
      {error && <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
    </section>
  );
}
