import React from "react";
import { Search, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { REGIONAL_TRANSPORT_DIRECTORY } from "@/lib/regionalTransportDirectory";
import { FIXED_SHIPMENT_LOCATIONS } from "@shared/shipmentRoutes";
import { rankFuzzyMatches } from "@shared/fuzzySearch";
import { SHIPMENT_ENDPOINTS, deriveLegacyShipmentRoute, normalizeIndependentEndpoints, type IndependentShipmentEndpoints, type ShipmentEndpoint } from "@shared/shipmentEndpoints";

type ShipmentLocationOption = {
  id: string;
  label: string;
  searchText: string;
  endpoint: ShipmentEndpoint;
  detail?: string;
  provider?: string;
  group?: string;
};

type IndependentEndpointsFieldsProps = {
  route?: string | null;
  className?: string;
  onRouteChange: (route: string, endpoints: { originPoint: ShipmentEndpoint; destinationPoint: ShipmentEndpoint }, locations?: { origin: ShipmentLocationOption; destination: ShipmentLocationOption }) => void;
};

const endpointOptions: ShipmentLocationOption[] = [
  { id: "endpoint-torino", label: "Torino", searchText: "Torino Italia", endpoint: SHIPMENT_ENDPOINTS.TORINO },
  { id: "endpoint-lima", label: "Lima", searchText: "Lima Perú", endpoint: SHIPMENT_ENDPOINTS.LIMA },
  { id: "endpoint-provincia", label: "Provincia (Perú)", searchText: "Provincia Peru provincias agencias courier", endpoint: SHIPMENT_ENDPOINTS.PROVINCIA },
];

const fixedLocationOptions: ShipmentLocationOption[] = FIXED_SHIPMENT_LOCATIONS.map(location => ({
  id: location.id,
  label: location.label,
  searchText: `${location.label} ${location.address}`,
  endpoint: location.id.includes("torino") ? SHIPMENT_ENDPOINTS.TORINO : SHIPMENT_ENDPOINTS.LIMA,
  detail: location.address,
  group: location.id.includes("torino") ? "Italia · Torino" : "Perú · Lima",
}));

const regionalLocationOptions: ShipmentLocationOption[] = REGIONAL_TRANSPORT_DIRECTORY.flatMap(entry => {
  const locations = (entry.locations || []).map(location => ({
    id: `regional-${location.id}`,
    label: `${entry.name} — ${location.name}`,
    searchText: `${entry.name} ${location.name} ${location.address} ${location.department || ""} ${location.province || ""} ${location.district || ""}`,
    endpoint: /torino|italia/i.test(`${location.name} ${location.address}`) ? SHIPMENT_ENDPOINTS.TORINO : /lima/i.test(`${location.name} ${location.address}`) ? SHIPMENT_ENDPOINTS.LIMA : SHIPMENT_ENDPOINTS.PROVINCIA,
    detail: [location.address, location.phone, location.businessHours].filter(Boolean).join(" · "),
    provider: entry.name,
    group: `Perú · ${location.department || location.province || "Sedes provinciales"}`,
  }));
  const destinations = entry.destinations.map(destination => ({
    id: `regional-destination-${entry.id}-${destination}`,
    label: `${entry.name} — ${destination}`,
    searchText: `${entry.name} ${destination} ${entry.coverage}`,
    endpoint: /lima/i.test(destination) ? SHIPMENT_ENDPOINTS.LIMA : SHIPMENT_ENDPOINTS.PROVINCIA,
    detail: `Destino publicado por ${entry.name}; confirma la dirección exacta antes de entregar.`,
    provider: entry.name,
    group: `Perú · ${destination}`,
  }));
  return [...locations, ...destinations];
});

const locationOptions = [...fixedLocationOptions, ...regionalLocationOptions];

function endpointForOption(option: ShipmentLocationOption) {
  return option.endpoint;
}

function compactLocationText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-PE");
}

function findLocationByAllTerms(query: string) {
  const terms = compactLocationText(query).split(/[^a-z0-9]+/).filter(Boolean);
  if (!terms.length) return undefined;
  return locationOptions.find(option => {
    const candidate = compactLocationText(option.searchText);
    return terms.every(term => candidate.includes(term));
  });
}

function optionForEndpoint(endpoint: ShipmentEndpoint): ShipmentLocationOption {
  if (endpoint === SHIPMENT_ENDPOINTS.LIMA) return fixedLocationOptions.find(option => option.id === "servicom-lima") || fixedLocationOptions[0];
  if (endpoint === SHIPMENT_ENDPOINTS.TORINO) return fixedLocationOptions.find(option => option.id === "servicom-torino") || fixedLocationOptions[0];
  return {
    id: `pending-${endpoint}`,
    label: "Selecciona una sede",
    searchText: "sede ciudad departamento país courier dirección",
    endpoint,
    detail: "Escribe una ciudad, courier o dirección para buscar la sede exacta.",
    group: endpoint === SHIPMENT_ENDPOINTS.PROVINCIA ? "Perú · Sedes provinciales" : "Ubicación pendiente",
  };
}

function initialOption(endpoint: ShipmentEndpoint, preferredText?: string | null) {
  if (preferredText) {
    const exact = locationOptions.find(option => option.label === preferredText || option.id === preferredText);
    if (exact) return exact;
  }
  return optionForEndpoint(endpoint);
}

function LocationSearch({
  label,
  value,
  endpoint,
  remoteOptions = [],
  onQueryChange,
  onSelect,
}: {
  label: string;
  value: ShipmentLocationOption;
  endpoint: ShipmentEndpoint;
  remoteOptions?: ShipmentLocationOption[];
  onQueryChange: (query: string) => void;
  onSelect: (option: ShipmentLocationOption) => void;
}) {
  const [query, setQuery] = React.useState(value.label);
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => setQuery(value.label), [value.id, value.label]);

  const matches = React.useMemo(() => {
    const availableOptions = [...locationOptions, ...remoteOptions];
    const ranked = rankFuzzyMatches(availableOptions, query, option => `${option.searchText} ${option.detail || ""}`);
    return ranked.slice(0, 8);
  }, [endpoint, query, remoteOptions]);

  const choose = (option: ShipmentLocationOption) => {
    setQuery(option.label);
    setOpen(false);
    onSelect(option);
  };

  const handleChange = (nextValue: string) => {
    setQuery(nextValue);
    onQueryChange(nextValue);
    setOpen(true);
    const normalized = nextValue.trim().toLocaleLowerCase("es-PE");
    if (!normalized) return;
    const exactLocation = locationOptions.find(option => option.label.toLocaleLowerCase("es-PE") === normalized);
    const fuzzyLocation = findLocationByAllTerms(nextValue);
    if (exactLocation) choose(exactLocation);
    else if (fuzzyLocation && normalized.split(/\s+/).filter(Boolean).length >= 2) choose(fuzzyLocation);
  };

  return (
    <div className="relative">
      <label className="block text-sm font-bold text-[#0B2B5E]">
        {label}
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" aria-hidden="true" />
          <input
            role="combobox"
            aria-label={label}
            aria-expanded={open && matches.length > 0}
            aria-autocomplete="list"
            value={query}
            onFocus={() => setOpen(true)}
            onChange={event => handleChange(event.target.value)}
            onKeyDown={event => {
              if (event.key === "Enter") {
                event.preventDefault();
                const currentQuery = (event.currentTarget as HTMLInputElement).value;
                const bestMatch = matches[0] || rankFuzzyMatches([...locationOptions, ...remoteOptions], currentQuery, option => `${option.searchText} ${option.detail || ""}`)[0] || findLocationByAllTerms(currentQuery);
                if (bestMatch) choose(bestMatch);
              }
              if (event.key === "Escape") setOpen(false);
            }}
            onBlur={() => window.setTimeout(() => setOpen(false), 120)}
            placeholder={`Busca ${label.toLocaleLowerCase("es-PE")} por ciudad, sede o dirección`}
            autoComplete="off"
            className="min-h-12 w-full rounded-lg border-2 border-slate-200 bg-white px-10 pr-10 text-base font-semibold text-slate-800 focus:border-[#0B2B5E] focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          {query && <button type="button" aria-label={`Limpiar ${label.toLocaleLowerCase("es-PE")}`} onMouseDown={event => event.preventDefault()} onClick={() => { setQuery(""); setOpen(true); }} className="absolute right-2 top-2 rounded p-1 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>}
        </div>
      </label>
      {open && matches.length > 0 && (
        <div role="listbox" aria-label={`Resultados de ${label.toLocaleLowerCase("es-PE")}`} className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
          {matches.map((option, index) => (
            <React.Fragment key={option.id}>
              {(index === 0 || option.group !== matches[index - 1]?.group) && <p className="px-3 pb-1 pt-2 text-[11px] font-black uppercase tracking-wide text-slate-400">{option.group || "Ubicaciones"}</p>}
              <button type="button" role="option" aria-selected={option.id === value.id} onMouseDown={event => event.preventDefault()} onClick={() => choose(option)} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-blue-50">
                <span className="block text-sm font-semibold text-[#0B2B5E]">{option.label}</span>
                {option.detail && <span className="block text-xs font-normal text-slate-500">{option.detail}</span>}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
      <p className="mt-1 text-xs font-normal text-slate-500">Escribe ciudad, courier, sede o dirección; se aceptan pequeñas diferencias y tildes.</p>
    </div>
  );
}

function remoteAgencyOptions(data: { agencies?: Array<{ id: string; provider: string; name: string; address: string; department?: string; province?: string; district?: string; kind?: string; phone?: string; businessHours?: string }> } | undefined): ShipmentLocationOption[] {
  return (data?.agencies || []).map(agency => ({
    id: `official-${agency.id}`,
    label: `${agency.provider} — ${agency.name}`,
    searchText: `${agency.provider} ${agency.name} ${agency.address} ${agency.department || ""} ${agency.province || ""} ${agency.district || ""}`,
    endpoint: /lima/i.test(`${agency.department} ${agency.province} ${agency.district} ${agency.address}`) ? SHIPMENT_ENDPOINTS.LIMA : SHIPMENT_ENDPOINTS.PROVINCIA,
    detail: [agency.address, agency.district, agency.province, agency.phone, agency.businessHours].filter(Boolean).join(" · "),
    provider: agency.provider,
    group: `Perú · ${agency.department || agency.province || "Sedes provinciales"}`,
  }));
}

export function IndependentEndpointsFields({ route, className = "", onRouteChange }: IndependentEndpointsFieldsProps) {
  const initial = React.useMemo(() => normalizeIndependentEndpoints({ route }), [route]);
  const [originQuery, setOriginQuery] = React.useState("");
  const [destinationQuery, setDestinationQuery] = React.useState("");
  const originOlva = trpc.agencies.olva.useQuery({ query: originQuery }, { enabled: originQuery.trim().length >= 2, staleTime: 5 * 60 * 1000 });
  const originShalom = trpc.agencies.shalom.useQuery({ query: originQuery }, { enabled: originQuery.trim().length >= 2, staleTime: 5 * 60 * 1000 });
  const destinationOlva = trpc.agencies.olva.useQuery({ query: destinationQuery }, { enabled: destinationQuery.trim().length >= 2, staleTime: 5 * 60 * 1000 });
  const destinationShalom = trpc.agencies.shalom.useQuery({ query: destinationQuery }, { enabled: destinationQuery.trim().length >= 2, staleTime: 5 * 60 * 1000 });
  const originRemoteOptions = React.useMemo(() => [...remoteAgencyOptions(originOlva.data), ...remoteAgencyOptions(originShalom.data)], [originOlva.data, originShalom.data]);
  const destinationRemoteOptions = React.useMemo(() => [...remoteAgencyOptions(destinationOlva.data), ...remoteAgencyOptions(destinationShalom.data)], [destinationOlva.data, destinationShalom.data]);
  const [selectedEndpoints, setSelectedEndpoints] = React.useState<IndependentShipmentEndpoints>(initial);
  const [originLocation, setOriginLocation] = React.useState(() => initialOption(initial.originPoint));
  const [destinationLocation, setDestinationLocation] = React.useState(() => initialOption(initial.destinationPoint));

  React.useEffect(() => {
    const next = normalizeIndependentEndpoints({ route });
    setSelectedEndpoints(next);
    setOriginLocation(current => current.endpoint === next.originPoint ? current : initialOption(next.originPoint));
    setDestinationLocation(current => current.endpoint === next.destinationPoint ? current : initialOption(next.destinationPoint));
  }, [route]);

  const update = (key: "originPoint" | "destinationPoint", option: ShipmentLocationOption) => {
    const next = { ...selectedEndpoints, [key]: endpointForOption(option) };
    setSelectedEndpoints(next);
    if (key === "originPoint") setOriginLocation(option);
    else setDestinationLocation(option);
    onRouteChange(deriveLegacyShipmentRoute(next), next, key === "originPoint" ? { origin: option, destination: destinationLocation } : { origin: originLocation, destination: option });
  };

  return (
    <div className={`grid gap-4 rounded-xl border-2 border-slate-200 bg-white p-4 md:grid-cols-2 ${className}`} aria-label="Origen y destino independientes">
      <LocationSearch label="Punto de origen" value={originLocation} endpoint={selectedEndpoints.originPoint} remoteOptions={originRemoteOptions} onQueryChange={setOriginQuery} onSelect={option => update("originPoint", option)} />
      <LocationSearch label="Punto de destino" value={destinationLocation} endpoint={selectedEndpoints.destinationPoint} remoteOptions={destinationRemoteOptions} onQueryChange={setDestinationQuery} onSelect={option => update("destinationPoint", option)} />
    </div>
  );
}

export default IndependentEndpointsFields;
