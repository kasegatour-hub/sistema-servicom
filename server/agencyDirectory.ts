export type AgencyDirectoryEntry = {
  id: string;
  provider: "OLVA COURIER";
  name: string;
  address: string;
  department: string;
  province: string;
  district: string;
  kind: "TIENDA" | "AGENTE";
  latitude: number | null;
  longitude: number | null;
  sourceUrl: string;
};

type OlvaStore = {
  office_id?: string | number;
  nombres?: string;
  tipo?: string;
  direccion?: string;
  department?: string;
  province?: string;
  district?: string;
  lat?: string | number;
  lng?: string | number;
};

const OLVA_OFFICIAL_DIRECTORY_URL = "https://www.olvacourier.com/wp-admin/admin-ajax.php?action=get_olva_stores";
const OLVA_SOURCE_PAGE = "https://www.olvacourier.com/ubicanos/";
const CACHE_WINDOW_MS = 30 * 60 * 1000;
let olvaCache: { value: AgencyDirectoryEntry[]; expiresAt: number } | null = null;

function asCoordinate(value: string | number | undefined) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeOlvaStore(store: OlvaStore): AgencyDirectoryEntry | null {
  const name = store.nombres?.replace(/\s+/g, " ").trim();
  const address = store.direccion?.replace(/\s+/g, " ").trim();
  if (!name || !address) return null;
  const type = store.tipo?.toUpperCase() || "";
  return {
    id: `olva-${String(store.office_id || name).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    provider: "OLVA COURIER",
    name,
    address,
    department: store.department?.trim() || "",
    province: store.province?.trim() || "",
    district: store.district?.trim() || "",
    kind: type.includes("AGENT") ? "AGENTE" : "TIENDA",
    latitude: asCoordinate(store.lat),
    longitude: asCoordinate(store.lng),
    sourceUrl: OLVA_SOURCE_PAGE,
  };
}

export function filterAgencies(entries: AgencyDirectoryEntry[], query: string, limit = 120) {
  const normalized = query.trim().toLocaleLowerCase("es-PE");
  const filtered = !normalized ? entries : entries.filter(entry => [entry.name, entry.address, entry.department, entry.province, entry.district, entry.kind].join(" ").toLocaleLowerCase("es-PE").includes(normalized));
  return filtered.slice(0, limit);
}

export async function getOfficialOlvaAgencies() {
  if (olvaCache && olvaCache.expiresAt > Date.now()) return olvaCache.value;
  const response = await fetch(OLVA_OFFICIAL_DIRECTORY_URL, { headers: { Accept: "application/json", "User-Agent": "Servicom-Agency-Directory/1.0" } });
  if (!response.ok) throw new Error(`El directorio oficial de Olva respondió ${response.status}.`);
  const payload = await response.json() as { success?: boolean; data?: { data?: OlvaStore[] } };
  const entries = (payload.data?.data || []).map(normalizeOlvaStore).filter((entry): entry is AgencyDirectoryEntry => Boolean(entry));
  if (!payload.success || entries.length === 0) throw new Error("El directorio oficial de Olva no devolvió agencias utilizables.");
  olvaCache = { value: entries, expiresAt: Date.now() + CACHE_WINDOW_MS };
  return entries;
}

export async function searchOfficialOlvaAgencies(query: string) {
  return filterAgencies(await getOfficialOlvaAgencies(), query);
}
