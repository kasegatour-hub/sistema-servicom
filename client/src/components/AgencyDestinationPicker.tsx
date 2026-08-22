import React, { useEffect, useRef, useState } from "react";
import { Building2, ExternalLink, MapPin, Search, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapView } from "@/components/Map";
import { trpc } from "@/lib/trpc";

const SERVICOM_LIMA = "SERVICOM INTERNACIONAL — Jr. de la Unión Nro. 518 Int. S101, Cercado de Lima";
const SERVICOM_TORINO = "SERVICOM INTERNACIONAL — Corso Peschiera 162A, Torino, Italia";
const SHALOM_DIRECTORY_URL = "https://shalom.com.pe/agencias/";
type ProviderFilter = "olva" | "shalom";
type OlvaAgency = { id: string; provider: "OLVA COURIER"; name: string; address: string; department: string; province: string; district: string; kind: "TIENDA" | "AGENTE"; latitude: number | null; longitude: number | null; sourceUrl: string };

function defaultDestination(route: string) { return route === "Torino - Lima" ? SERVICOM_LIMA : SERVICOM_TORINO; }
function providerFor(name: string) { const normalized = name.toUpperCase(); return normalized.includes("OLVA") ? "OLVA COURIER" : normalized.includes("SHALOM") ? "SHALOM" : "SERVICOM INTERNACIONAL"; }
function formatDestination(provider: string, name: string, address: string) { return `${provider} — ${name}${address && address !== name ? ` · ${address}` : ""}`; }

function AgencyDirectoryExplorer({ onSelect, onMessage }: { onSelect: (value: string) => void; onMessage: (value: string) => void }) {
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState<ProviderFilter>("olva");
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const directoryMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const olvaQuery = trpc.agencies.olva.useQuery({ query: query.trim() }, { enabled: provider === "olva", staleTime: 5 * 60 * 1000 });
  const olvaAgencies = (olvaQuery.data?.agencies || []) as OlvaAgency[];

  useEffect(() => {
    if (!mapRef.current || provider !== "olva") return;
    directoryMarkersRef.current.forEach(marker => { marker.map = null; });
    directoryMarkersRef.current = olvaAgencies.filter(agency => agency.latitude !== null && agency.longitude !== null).map(agency => new google.maps.marker.AdvancedMarkerElement({ map: mapRef.current!, position: { lat: agency.latitude!, lng: agency.longitude! }, title: `${agency.name} — ${agency.district || agency.province}` }));
  }, [olvaAgencies, provider]);

  const setLocationMarker = (location: google.maps.LatLng | google.maps.LatLngLiteral, title: string) => {
    if (!mapRef.current) return;
    mapRef.current.panTo(location); mapRef.current.setZoom(16);
    if (markerRef.current) markerRef.current.map = null;
    markerRef.current = new google.maps.marker.AdvancedMarkerElement({ map: mapRef.current, position: location, title });
  };
  const selectOlva = (agency: OlvaAgency) => {
    const destination = formatDestination(agency.provider, agency.name, agency.address);
    onSelect(destination); onMessage(`${agency.provider} seleccionada como agencia de destino.`);
    if (agency.latitude !== null && agency.longitude !== null) setLocationMarker({ lat: agency.latitude, lng: agency.longitude }, destination);
  };
  const applyPlace = (place: google.maps.places.PlaceResult) => {
    const agencyName = place.name || "Agencia seleccionada";
    const selectedProvider = providerFor(agencyName);
    const formattedAddress = place.formatted_address || agencyName;
    if (selectedProvider === "SERVICOM INTERNACIONAL") { onMessage("Selecciona una agencia de Olva o Shalom, o vuelve a la sede de Servicom."); return; }
    const destination = formatDestination(selectedProvider, agencyName, formattedAddress);
    onSelect(destination); onMessage(`${selectedProvider} seleccionada como agencia de destino.`);
    if (place.geometry?.location) setLocationMarker(place.geometry.location, destination);
  };
  const handleMapReady = (map: google.maps.Map) => {
    mapRef.current = map;
    if (!searchRef.current || autocompleteRef.current) return;
    const autocomplete = new google.maps.places.Autocomplete(searchRef.current, { fields: ["name", "formatted_address", "geometry"], types: ["establishment"], componentRestrictions: { country: ["pe", "it"] } });
    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place.geometry) { onMessage("No se encontró esa agencia. Prueba con Olva Courier, Shalom o el distrito."); return; }
      applyPlace(place);
    });
    autocompleteRef.current = autocomplete;
  };

  return <div className="mt-4 overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm"><div className="grid lg:grid-cols-[minmax(0,360px)_1fr]"><aside className="border-b border-slate-100 p-4 lg:max-h-[420px] lg:overflow-y-auto lg:border-b-0 lg:border-r"><div className="flex items-center gap-2"><Button type="button" size="sm" variant={provider === "olva" ? "default" : "outline"} onClick={() => setProvider("olva")} className={provider === "olva" ? "bg-[#0B2B5E] text-white" : "border-slate-300"}>Olva Courier</Button><Button type="button" size="sm" variant={provider === "shalom" ? "default" : "outline"} onClick={() => setProvider("shalom")} className={provider === "shalom" ? "bg-[#dc2626] text-white hover:bg-[#b91c1c]" : "border-slate-300"}>Shalom</Button></div><label htmlFor="agency-map-search" className="mt-4 block text-sm font-semibold text-slate-800">Busca por distrito, provincia, dirección o sede</label><div className="relative mt-2"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input id="agency-map-search" ref={searchRef} value={query} onChange={event => setQuery(event.target.value)} placeholder={provider === "olva" ? "Ej.: Breña, Chachapoyas o Lima Centro" : "Ej.: Shalom Lima Centro"} className="h-10 bg-white pl-9" autoComplete="off" /></div>{provider === "olva" ? <><p className="mt-2 text-xs text-slate-500">Catálogo oficial de Olva Courier. Muestra hasta 120 coincidencias; escribe para acotar.</p>{olvaQuery.isLoading && <p className="mt-4 text-sm text-slate-500">Consultando sedes oficiales…</p>}{olvaQuery.isError && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">No se pudo consultar el directorio oficial de Olva. Puedes usar la búsqueda del mapa o intentarlo nuevamente.</p>}<div className="mt-3 space-y-2">{olvaAgencies.map(agency => <button key={agency.id} type="button" onClick={() => selectOlva(agency)} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-blue-400 hover:bg-blue-50"><span className="flex items-start gap-2"><Store className="mt-0.5 h-4 w-4 shrink-0 text-[#0B2B5E]" /><span><span className="block text-sm font-bold text-slate-800">{agency.name}</span><span className="mt-1 block text-xs leading-5 text-slate-600">{agency.address}</span><span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{agency.kind} · {agency.district || agency.province || agency.department}</span></span></span></button>)}</div>{!olvaQuery.isLoading && !olvaAgencies.length && <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-600">No hay coincidencias oficiales. Prueba otro distrito o dirección.</p>}<a className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#0B2B5E] underline" href="https://www.olvacourier.com/ubicanos/" target="_blank" rel="noreferrer">Ver directorio oficial de Olva <ExternalLink className="h-3 w-3" /></a></> : <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-slate-700"><p className="font-bold text-red-700">Sedes de Shalom</p><p className="mt-1 leading-5">Escribe una ciudad, distrito o el nombre de la sede y selecciona la coincidencia que aparezca en el mapa. Así se confirma una ubicación vigente antes de guardarla.</p><a className="mt-3 inline-flex items-center gap-1 font-semibold text-red-700 underline" href={SHALOM_DIRECTORY_URL} target="_blank" rel="noreferrer">Abrir directorio oficial de Shalom <ExternalLink className="h-3 w-3" /></a></div>}</aside><div className="p-3"><MapView initialCenter={{ lat: -12.0464, lng: -77.0428 }} initialZoom={provider === "olva" ? 6 : 12} className="h-80 overflow-hidden rounded-lg" onMapReady={handleMapReady} /></div></div></div>;
}

export function AgencyDestinationPicker({ route, value, onChange }: { route: string; value: string; onChange: (value: string) => void }) {
  const [showMap, setShowMap] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { if (!value.trim()) onChange(defaultDestination(route)); }, [route, value, onChange]);
  const selectServicom = () => { onChange(defaultDestination(route)); setMessage("Se seleccionó la sede propia de Servicom Internacional."); };
  return <section className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-slate-50 p-4 shadow-sm md:col-span-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h4 className="flex items-center gap-2 font-semibold text-[#0B2B5E]"><Building2 className="h-4 w-4" />Agencia de destino</h4><p className="mt-1 max-w-3xl text-xs text-slate-600">Encuentra la sede a la que deseas llevar el envío. El catálogo de <strong>Olva Courier</strong> se consulta desde su directorio público vigente; para <strong>Shalom</strong>, la búsqueda se confirma con su coincidencia actual en el mapa.</p></div><Button type="button" size="sm" variant="outline" onClick={() => setShowMap(open => !open)} className="border-[#0B2B5E] bg-white text-[#0B2B5E]"><MapPin className="mr-1 h-4 w-4" />{showMap ? "Cerrar explorador" : "Buscar agencias"}</Button></div><div className="mt-3 flex flex-col gap-2 sm:flex-row"><Button type="button" size="sm" variant="outline" onClick={selectServicom} className="border-blue-300 bg-white text-[#0B2B5E]">Usar sede Servicom</Button><output aria-live="polite" className="min-h-9 flex-1 rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">{value || defaultDestination(route)}</output></div>{showMap && <AgencyDirectoryExplorer onSelect={onChange} onMessage={setMessage} />}{message && <p role="status" className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-[#0B2B5E]">{message}</p>}</section>;
}
