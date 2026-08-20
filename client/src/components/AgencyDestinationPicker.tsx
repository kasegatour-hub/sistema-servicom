import React, { useEffect, useRef, useState } from "react";
import { Building2, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapView } from "@/components/Map";

const SERVICOM_LIMA = "SERVICOM INTERNACIONAL — Jr. de la Unión Nro. 518 Int. S101, Cercado de Lima";
const SERVICOM_TORINO = "SERVICOM INTERNACIONAL — Corso Peschiera 162A, Torino, Italia";

function defaultDestination(route: string) {
  return route === "Torino - Lima" ? SERVICOM_LIMA : SERVICOM_TORINO;
}

function providerFor(name: string) {
  const normalized = name.toUpperCase();
  if (normalized.includes("OLVA")) return "OLVA COURIER";
  if (normalized.includes("SHALOM")) return "SHALOM";
  return "SERVICOM INTERNACIONAL";
}

export function AgencyDestinationPicker({ route, value, onChange }: { route: string; value: string; onChange: (value: string) => void }) {
  const [showMap, setShowMap] = useState(false);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!value.trim()) onChange(defaultDestination(route));
  }, [route, value, onChange]);

  const selectServicom = () => {
    onChange(defaultDestination(route));
    setMessage("Se seleccionó la sede propia de Servicom Internacional.");
  };

  const applyPlace = (place: google.maps.places.PlaceResult) => {
    const agencyName = place.name || "Agencia seleccionada";
    const provider = providerFor(agencyName);
    const formattedAddress = place.formatted_address || agencyName;
    if (provider === "SERVICOM INTERNACIONAL" && !agencyName.toUpperCase().includes("SERVICOM")) {
      setMessage("Selecciona una agencia de Olva, Shalom o vuelve a la sede de Servicom.");
      return;
    }
    const destination = `${provider} — ${agencyName}${formattedAddress === agencyName ? "" : ` · ${formattedAddress}`}`;
    onChange(destination);
    setMessage(`${provider} seleccionada como agencia de destino.`);
    const location = place.geometry?.location;
    if (location && mapRef.current) {
      mapRef.current.panTo(location);
      mapRef.current.setZoom(16);
      if (markerRef.current) markerRef.current.map = null;
      markerRef.current = new google.maps.marker.AdvancedMarkerElement({ map: mapRef.current, position: location, title: destination });
    }
  };

  const handleMapReady = (map: google.maps.Map) => {
    mapRef.current = map;
    if (!searchRef.current || autocompleteRef.current) return;
    const autocomplete = new google.maps.places.Autocomplete(searchRef.current, {
      fields: ["name", "formatted_address", "geometry"],
      types: ["establishment"],
      componentRestrictions: { country: ["pe", "it"] },
    });
    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place.geometry) {
        setMessage("No se encontró esa agencia. Prueba con Olva Courier, Shalom o el distrito.");
        return;
      }
      applyPlace(place);
    });
    autocompleteRef.current = autocomplete;
  };

  return <section className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 md:col-span-3">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div><h4 className="flex items-center gap-2 font-semibold text-[#0B2B5E]"><Building2 className="h-4 w-4" />Agencia de destino</h4><p className="mt-1 text-xs text-slate-600">Elige Servicom o busca cualquier agencia de <strong>Olva Courier</strong> y <strong>Shalom</strong>. La ubicación elegida se guarda en el envío y se imprime en el comprobante.</p></div>
      <Button type="button" size="sm" variant="outline" onClick={() => setShowMap(open => !open)} className="border-[#0B2B5E] bg-white text-[#0B2B5E]"><MapPin className="mr-1 h-4 w-4" />{showMap ? "Ocultar mapa" : "Seleccionar en mapa"}</Button>
    </div>
    <div className="mt-3 flex flex-col gap-2 sm:flex-row"><Button type="button" size="sm" variant="outline" onClick={selectServicom} className="border-blue-300 bg-white text-[#0B2B5E]">Usar sede Servicom</Button><output aria-live="polite" className="min-h-9 flex-1 rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">{value || defaultDestination(route)}</output></div>
    {showMap && <div className="mt-4 overflow-hidden rounded-lg border border-blue-200 bg-white p-3"><label htmlFor="agency-map-search" className="text-sm font-medium text-slate-800">Buscar agencia Olva, Shalom o Servicom</label><div className="relative mt-2"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input id="agency-map-search" ref={searchRef} value={query} onChange={event => setQuery(event.target.value)} placeholder="Ej.: Olva Courier San Isidro, Shalom Lima Centro" className="h-10 bg-white pl-9" autoComplete="off" /></div><p className="mt-2 text-xs text-slate-500">Selecciona una coincidencia de la lista del mapa para confirmar el destino.</p><MapView initialCenter={route === "Torino - Lima" ? { lat: -12.0464, lng: -77.0428 } : { lat: 45.0703, lng: 7.6869 }} initialZoom={12} className="mt-3 h-72 overflow-hidden rounded-md" onMapReady={handleMapReady} />{message && <p role="status" className="mt-2 text-sm font-medium text-[#0B2B5E]">{message}</p>}</div>}
  </section>;
}
