import React, { useEffect, useRef, useState } from "react";
import { Building2, ChevronDown, ExternalLink, MapPin, Phone, Search, Store, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapView } from "@/components/Map";
import { trpc } from "@/lib/trpc";
import { REGIONAL_TRANSPORT_BY_ID, REGIONAL_TRANSPORT_DIRECTORY, REGIONAL_TRANSPORT_IDS, type RegionalTransportProvider } from "@/lib/regionalTransportDirectory";

const SERVICOM_LIMA = "SERVICOM INTERNACIONAL — Jr. de la Unión Nro. 518 Int. S101, Cercado de Lima";
const SERVICOM_TORINO = "SERVICOM INTERNACIONAL — Corso Peschiera 162A, Torino, Italia";
const DIRECTORY_URLS = { olva: "https://www.olvacourier.com/ubicanos/", shalom: "https://shalom.com.pe/agencias/", fedex: "https://local.fedex.com/en", dhl: "https://locator.dhl.com/?l=en" } as const;
export type AgencyProvider = "olva" | "shalom" | "fedex" | "dhl" | RegionalTransportProvider;
type ProviderFilter = AgencyProvider;
type Agency = { id: string; provider: string; name: string; address: string; department: string; province: string; district: string; kind: string; latitude: number | null; longitude: number | null; phone?: string; businessHours?: string; sundayHours?: string; sourceUrl: string };

function defaultDestination(route: string) { return route === "Torino - Lima" ? SERVICOM_LIMA : SERVICOM_TORINO; }
function formatDestination(provider: string, name: string, address: string) { return `${provider} — ${name}${address && address !== name ? ` · ${address}` : ""}`; }

export function normalizeCarrierPlace(result: google.maps.places.PlaceResult, provider: "fedex" | "dhl"): Agency | null {
  if (!result.place_id || !result.name || !result.formatted_address) return null;
  return {
    id: `${provider}-${result.place_id}`,
    provider: provider.toUpperCase() as Agency["provider"],
    name: result.name,
    address: result.formatted_address,
    department: "",
    province: "",
    district: "",
    kind: "UBICACIÓN EN MAPA",
    latitude: result.geometry?.location?.lat() ?? null,
    longitude: result.geometry?.location?.lng() ?? null,
    sourceUrl: DIRECTORY_URLS[provider],
  };
}

function AgencyDirectoryExplorer({ onSelect, onMessage, onClose, providerValue, onProviderChange }: { onSelect: (value: string) => void; onMessage: (value: string) => void; onClose: () => void; providerValue: ProviderFilter; onProviderChange: (value: ProviderFilter) => void }) {
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState<ProviderFilter>(providerValue);
  useEffect(() => { setProvider(providerValue); }, [providerValue]);
  const [visibleCount, setVisibleCount] = useState(25);
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [carrierAgencies, setCarrierAgencies] = useState<Agency[]>([]);
  const [carrierLoading, setCarrierLoading] = useState(false);
  const [carrierError, setCarrierError] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const directoryMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const olvaQuery = trpc.agencies.olva.useQuery({ query: query.trim() }, { enabled: provider === "olva", staleTime: 5 * 60 * 1000 });
  const shalomQuery = trpc.agencies.shalom.useQuery({ query: query.trim() }, { enabled: provider === "shalom", staleTime: 5 * 60 * 1000 });
  const currentQuery = provider === "olva" ? olvaQuery : provider === "shalom" ? shalomQuery : { data: undefined, isLoading: false, isError: false };
  const regionalEntry = REGIONAL_TRANSPORT_BY_ID[provider as RegionalTransportProvider];
  const isRegionalTransport = REGIONAL_TRANSPORT_IDS.includes(provider as RegionalTransportProvider);
  const providerName = isRegionalTransport ? regionalEntry.name : provider === "olva" ? "Olva Courier" : provider === "shalom" ? "Shalom" : provider === "fedex" ? "FedEx" : "DHL";
  const isGlobalCarrier = provider === "fedex" || provider === "dhl";
  const directoryUrl = DIRECTORY_URLS[provider as keyof typeof DIRECTORY_URLS] || "https://www.google.com/maps/search/empresas+de+transporte+Per%C3%BA";
  useEffect(() => {
    if (!isGlobalCarrier) {
      setCarrierAgencies([]);
      setCarrierLoading(false);
      setCarrierError(false);
      return;
    }
    let active = true;
    setCarrierLoading(true);
    setCarrierError(false);
    const timer = window.setTimeout(() => {
      if (!active) return;
      const service = new google.maps.places.PlacesService(document.createElement("div"));
      const searchTerm = query.trim() || "Perú";
      service.textSearch({ query: `${providerName} ${searchTerm}` }, (results, status) => {
      if (!active) return;
      if (status !== google.maps.places.PlacesServiceStatus.OK || !results?.length) {
        setCarrierAgencies([]);
        setCarrierError(status !== google.maps.places.PlacesServiceStatus.ZERO_RESULTS);
        setCarrierLoading(false);
        return;
      }
      setCarrierAgencies(results.map(result => normalizeCarrierPlace(result, provider as "fedex" | "dhl")).filter((agency): agency is Agency => Boolean(agency)));
        setCarrierLoading(false);
      });
    }, query.trim() ? 350 : 50);
    return () => { active = false; window.clearTimeout(timer); };
  }, [isGlobalCarrier, provider, providerName, query]);
  const regionalAgencies: Agency[] = regionalEntry?.destinations.map((destination, index) => ({ id: `${regionalEntry.id}-${index}`, provider: regionalEntry.name, name: destination, address: `Destino disponible: Lima → ${destination}`, department: "", province: destination, district: "", kind: "DESTINO REGIONAL", latitude: null, longitude: null, sourceUrl: directoryUrl })) || [];
  const agencies = (isRegionalTransport ? regionalAgencies : isGlobalCarrier ? carrierAgencies : currentQuery.data?.agencies || []) as Agency[];
  const normalizedAgencyQuery = query.trim().toLocaleLowerCase();
  const visibleAgencies = normalizedAgencyQuery && isRegionalTransport ? agencies.filter(agency => `${agency.name} ${agency.address} ${regionalEntry?.coverage || ""}`.toLocaleLowerCase().includes(normalizedAgencyQuery)) : agencies;
  const directoryLoading = isRegionalTransport ? false : isGlobalCarrier ? carrierLoading : currentQuery.isLoading;
  const directoryError = isRegionalTransport ? false : isGlobalCarrier ? carrierError : currentQuery.isError;

  useEffect(() => {
    setVisibleCount(25);
    setSelectedAgency(null);
    setShowMap(provider === "fedex" || provider === "dhl");
    mapRef.current = null;
    setMapReady(false);
  }, [provider, query]);
  useEffect(() => {
    if (!mapRef.current) return;
    directoryMarkersRef.current.forEach(marker => { marker.map = null; });
    directoryMarkersRef.current = visibleAgencies.slice(0, 180).filter(agency => agency.latitude !== null && agency.longitude !== null).map(agency => new google.maps.marker.AdvancedMarkerElement({ map: mapRef.current!, position: { lat: agency.latitude!, lng: agency.longitude! }, title: `${agency.name} — ${agency.address}` }));
  }, [visibleAgencies]);
  const setLocationMarker = (agency: Agency) => {
    if (!mapRef.current || agency.latitude === null || agency.longitude === null) return;
    mapRef.current.panTo({ lat: agency.latitude, lng: agency.longitude }); mapRef.current.setZoom(16);
    if (markerRef.current) markerRef.current.map = null;
    markerRef.current = new google.maps.marker.AdvancedMarkerElement({ map: mapRef.current, position: { lat: agency.latitude, lng: agency.longitude }, title: agency.name });
  };
  const selectAgency = (agency: Agency) => { const destination = formatDestination(agency.provider, agency.name, agency.address); setSelectedAgency(agency); onSelect(destination); onMessage(`${agency.provider} seleccionada como agencia de destino.`); setLocationMarker(agency); onClose(); };
  const selectManual = () => {
    const address = manualAddress.trim(); if (!address) return;
    const destination = formatDestination("SEDE MANUAL", manualName.trim() || "Sede de destino", address);
    onSelect(destination); onMessage("La sede manual se guardó como destino del envío."); onClose();
  };
  const detailLocation = selectedAgency ? [selectedAgency.district, selectedAgency.province, selectedAgency.department].filter(Boolean).join(" / ") : "";

  return <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 bg-slate-50 px-4 py-3"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant={provider === "olva" ? "default" : "outline"} onClick={() => { setProvider("olva"); onProviderChange("olva"); }} className={provider === "olva" ? "bg-[#0B2B5E] text-white" : "border-slate-300"}>Olva Courier</Button><Button type="button" size="sm" variant={provider === "shalom" ? "default" : "outline"} onClick={() => { setProvider("shalom"); onProviderChange("shalom"); }} className={provider === "shalom" ? "bg-[#dc2626] text-white hover:bg-[#b91c1c]" : "border-slate-300"}>Shalom</Button><Button type="button" size="sm" variant={provider === "fedex" ? "default" : "outline"} onClick={() => { setProvider("fedex"); onProviderChange("fedex"); }} className={provider === "fedex" ? "bg-[#4d148c] text-white hover:bg-[#35105f]" : "border-slate-300"}>FedEx</Button><Button type="button" size="sm" variant={provider === "dhl" ? "default" : "outline"} onClick={() => { setProvider("dhl"); onProviderChange("dhl"); }} className={provider === "dhl" ? "bg-[#ffcc00] text-[#111827] hover:bg-[#eab308]" : "border-slate-300"}>DHL</Button><label className="flex items-center gap-2 text-xs font-semibold text-slate-700"><span className="sr-only">Empresas regionales</span><select aria-label="Empresas regionales" value={isRegionalTransport ? provider : ""} onChange={event => { const next = event.target.value as RegionalTransportProvider; if (!next) return; setProvider(next); onProviderChange(next); }} className="h-9 max-w-[230px] rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-[#0B2B5E]"><option value="">Más empresas regionales</option>{(["Norte", "Centro y Selva Central", "Sur"] as const).map(zone => <optgroup key={zone} label={zone}>{REGIONAL_TRANSPORT_DIRECTORY.filter(entry => entry.zone === zone).map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</optgroup>)}</select></label><Button type="button" size="sm" variant={manualMode ? "default" : "outline"} onClick={() => setManualMode(open => !open)} className={manualMode ? "bg-slate-700 text-white" : "border-slate-300"}>{manualMode ? "Cerrar sede manual" : "Escribir sede manual"}</Button></div><a className="inline-flex items-center gap-1 text-xs font-semibold text-[#0B2B5E] underline" href={directoryUrl} target="_blank" rel="noreferrer">{isGlobalCarrier ? "Buscador mundial oficial" : "Directorio oficial"} <ExternalLink className="h-3 w-3" /></a></div></div>{manualMode ? <div className="grid gap-3 border-b border-slate-200 bg-amber-50 p-4 md:grid-cols-[1fr_2fr_auto]"><div><label htmlFor="manual-agency-name" className="text-xs font-semibold text-slate-700">Nombre de sede (opcional)</label><Input id="manual-agency-name" value={manualName} onChange={event => setManualName(event.target.value)} placeholder="Ej.: Agencia Lima Centro" className="mt-1 bg-white" /></div><div><label htmlFor="manual-agency-address" className="text-xs font-semibold text-slate-700">Dirección de sede *</label><Input id="manual-agency-address" value={manualAddress} onChange={event => setManualAddress(event.target.value)} placeholder="Ej.: Av. / Jr. / distrito / ciudad" className="mt-1 bg-white" /></div><Button type="button" onClick={selectManual} disabled={!manualAddress.trim()} className="self-end bg-[#0B2B5E] text-white">Usar esta sede</Button></div> : <div className="grid lg:grid-cols-[minmax(0,410px)_1fr]"><aside className="border-b border-slate-100 p-4 lg:max-h-[500px] lg:overflow-y-auto lg:border-b-0 lg:border-r"><label htmlFor="agency-directory-search" className="block text-sm font-semibold text-slate-800">{isRegionalTransport ? `Busca un destino de ${providerName}` : isGlobalCarrier ? `Busca en el localizador mundial de ${providerName}` : "Busca por departamento, provincia, distrito, dirección o sede"}</label><div className="relative mt-2"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input id="agency-directory-search" value={query} onChange={event => setQuery(event.target.value)} placeholder={provider === "olva" ? "Ej.: Lima, Breña, Chachapoyas" : "Ej.: Lima, La Victoria, Raymondi"} className="h-11 bg-white pl-9 pr-9" autoComplete="off" />{query && <button type="button" aria-label="Limpiar búsqueda de agencias" onClick={() => setQuery("")} className="absolute right-2 top-2 rounded p-1 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>}</div><p className="mt-2 text-xs leading-5 text-slate-500">{isRegionalTransport ? `${regionalEntry?.coverage || "Esta empresa"} Elige un destino para completar el envío, o utiliza «Escribir sede manual» si la empresa te indica otra agencia.` : isGlobalCarrier ? `${providerName} mantiene sus sedes en un localizador mundial dinámico. Usa el buscador oficial para elegir una ubicación vigente y copia aquí sus datos, o utiliza «Escribir sede manual».` : `${providerName}: directorio oficial con selección directa. Al elegir una sede, el destino se completa automáticamente.`}</p>{isGlobalCarrier && <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-semibold text-slate-800">Consulta todas las sedes actuales</p><p className="mt-1 text-xs leading-5 text-slate-600">La red mundial cambia continuamente y el buscador oficial permite filtrar por país, ciudad, código postal y servicios.</p><a href={directoryUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#0B2B5E] px-3 py-2 text-sm font-semibold text-white hover:bg-[#123d78]">Abrir localizador de {providerName} <ExternalLink className="h-4 w-4" /></a></div>}{directoryLoading && <p className="mt-4 text-sm text-slate-500">Consultando ubicaciones oficiales…</p>}{directoryError && <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><strong>El directorio oficial no está disponible ahora.</strong><br />Puedes intentar otra vez o usar «Escribir sede manual» para continuar con los datos que te indique la agencia.</div>}{!directoryLoading && !directoryError && <><p className="mt-3 text-xs font-semibold text-slate-600">{visibleAgencies.length} destino{visibleAgencies.length === 1 ? "" : "s"} encontrado{visibleAgencies.length === 1 ? "" : "s"}</p><div className="mt-2 space-y-2">{visibleAgencies.slice(0, visibleCount).map(agency => <button key={agency.id} type="button" onClick={() => selectAgency(agency)} className={`w-full rounded-xl border p-3 text-left transition hover:border-blue-400 hover:bg-blue-50 ${selectedAgency?.id === agency.id ? "border-[#0B2B5E] bg-blue-50 ring-1 ring-[#0B2B5E]" : "border-slate-200 bg-white"}`}><span className="flex items-start gap-2"><Store className={`mt-0.5 h-4 w-4 shrink-0 ${provider === "shalom" ? "text-red-600" : "text-[#0B2B5E]"}`} /><span><span className="block text-sm font-bold text-slate-800">{agency.name}</span><span className="mt-1 block text-xs leading-5 text-slate-600">{agency.address}</span><span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{agency.kind}{agency.district ? ` · ${agency.district}` : ""}</span></span></span></button>)}</div>{visibleAgencies.length > visibleCount && <Button type="button" variant="outline" onClick={() => setVisibleCount(count => count + 25)} className="mt-3 w-full border-slate-300 text-slate-700">Ver 25 sedes más <ChevronDown className="ml-1 h-4 w-4" /></Button>}{!visibleAgencies.length && <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-600">No hay coincidencias. Prueba con otro distrito, ciudad o parte de la dirección.</p>}</>}</aside><div className="space-y-3 p-3">{showMap ? <MapView initialCenter={{ lat: -12.0464, lng: -77.0428 }} initialZoom={6} className="h-72 overflow-hidden rounded-xl" onMapReady={map => { mapRef.current = map; setMapReady(true); }} /> : <button type="button" onClick={() => setShowMap(true)} className="flex min-h-16 w-full items-center justify-between rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 text-left text-sm text-slate-600 transition hover:border-[#0B2B5E] hover:bg-blue-50"><span><strong className="block text-[#0B2B5E]">Ver mapa de sedes</strong><span>El mapa se carga solo cuando lo necesitas.</span></span><MapPin className="h-5 w-5 text-[#0B2B5E]" /></button>}{selectedAgency ? <div className="rounded-xl border border-blue-200 bg-blue-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-[#0B2B5E]">Sede seleccionada</p><h5 className="mt-1 text-lg font-bold text-[#0B2B5E]">{selectedAgency.name}</h5><p className="mt-1 text-sm text-slate-700">{selectedAgency.address}</p>{detailLocation && <p className="mt-1 text-xs text-slate-600">{detailLocation}</p>}<div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">{selectedAgency.phone && <span className="flex items-center gap-2"><Phone className="h-4 w-4 text-[#0B2B5E]" />{selectedAgency.phone}</span>}{selectedAgency.businessHours && <span><strong>Horario:</strong> {selectedAgency.businessHours}</span>}{selectedAgency.sundayHours && <span><strong>Domingo:</strong> {selectedAgency.sundayHours}</span>}</div></div> : <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">Elige una sede de la lista para ver sus datos y completar el destino.</div>}</div></div>}</div>;
}

export function AgencyDestinationPicker({ route, value, onChange, provider, onProviderChange }: { route: string; value: string; onChange: (value: string) => void; provider?: AgencyProvider; onProviderChange?: (provider: AgencyProvider) => void }) {
  const [showExplorer, setShowExplorer] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<ProviderFilter>(provider || "olva");
  useEffect(() => { if (provider) setSelectedProvider(provider); }, [provider]);
  useEffect(() => { if (!value.trim()) onChange(defaultDestination(route)); }, [route, value, onChange]);
  const selectProvider = (nextProvider: ProviderFilter) => { setSelectedProvider(nextProvider); onProviderChange?.(nextProvider); setShowExplorer(true); };
  const selectServicom = () => { onProviderChange?.(selectedProvider); onChange(defaultDestination(route)); setMessage("Se seleccionó la sede propia de Servicom Internacional."); setShowExplorer(false); };
  return <section className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-slate-50 p-4 shadow-sm md:col-span-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h4 className="flex items-center gap-2 font-semibold text-[#0B2B5E]"><Building2 className="h-4 w-4" />Agencia de destino</h4><p className="mt-1 max-w-3xl text-xs text-slate-600">Primero selecciona el operador: <strong>Olva Courier</strong>, <strong>Shalom</strong>, <strong>FedEx</strong> o <strong>DHL</strong>; después elige una sede o registra una dirección manual.</p></div><Button type="button" size="sm" variant="outline" onClick={() => setShowExplorer(open => !open)} className="border-[#0B2B5E] bg-white text-[#0B2B5E]"><MapPin className="mr-1 h-4 w-4" />{showExplorer ? "Cerrar directorio" : "Elegir agencia"}</Button></div><div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/70 p-2"><span className="px-1 text-xs font-bold uppercase tracking-wide text-[#0B2B5E]">Operador:</span>{([['olva','Olva'],['shalom','Shalom'],['fedex','FedEx'],['dhl','DHL']] as const).map(([key, label]) => <Button key={key} type="button" size="sm" variant={selectedProvider === key ? "default" : "outline"} onClick={() => selectProvider(key)} className={selectedProvider === key ? "bg-[#0B2B5E] text-white" : "border-blue-200 bg-white text-[#0B2B5E]"}>{label}</Button>)}</div><div className="mt-3 flex flex-col gap-2 sm:flex-row"><Button type="button" size="sm" variant="outline" onClick={selectServicom} className="border-blue-300 bg-white text-[#0B2B5E]">Usar sede Servicom</Button><output aria-live="polite" className="min-h-9 flex-1 rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">{value || defaultDestination(route)}</output></div>{showExplorer && <AgencyDirectoryExplorer providerValue={selectedProvider} onProviderChange={selectProvider} onSelect={onChange} onMessage={setMessage} onClose={() => setShowExplorer(false)} />}{message && <p role="status" className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-[#0B2B5E]">{message}</p>}</section>;
}
