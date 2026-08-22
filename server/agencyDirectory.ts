import { createHmac, randomBytes } from "node:crypto";
import shalomOfficialSnapshot from "./data/shalom-official-agencies-snapshot-2026-08-22.json";

export type AgencyProvider = "OLVA COURIER" | "SHALOM";

export type AgencyDirectoryEntry = {
  id: string;
  provider: AgencyProvider;
  name: string;
  address: string;
  department: string;
  province: string;
  district: string;
  kind: string;
  latitude: number | null;
  longitude: number | null;
  phone?: string;
  businessHours?: string;
  sundayHours?: string;
  sourceUrl: string;
};

type OlvaStore = { office_id?: string | number; nombres?: string; tipo?: string; direccion?: string; department?: string; province?: string; district?: string; lat?: string | number; lng?: string | number; };
type ShalomOffice = { ter_id?: string | number; lugar_over?: string; nombre?: string; zona?: string; provincia?: string; departamento?: string; direccion?: string; telefono?: string; hora_atencion?: string; hora_domingo?: string; ter_estado_agente?: string | number; ter_estado_pro?: string | number; agente?: string | number; puntospro?: string | number; latitud?: string | number; longitud?: string | number; };

const OLVA_OFFICIAL_DIRECTORY_URL = "https://www.olvacourier.com/wp-admin/admin-ajax.php?action=get_olva_stores";
const OLVA_SOURCE_PAGE = "https://www.olvacourier.com/ubicanos/";
const SHALOM_OFFICIAL_DIRECTORY_URL = "https://serviceswebapi.shalomcontrol.com/api/v1/web/agencias/listar";
const SHALOM_SOURCE_PAGE = "https://shalom.com.pe/agencias/";
const CACHE_WINDOW_MS = 30 * 60 * 1000;
const SHALOM_PUBLIC_WEB_SECRET = ".Ov3rsku112024l4r43l.";

let olvaCache: { value: AgencyDirectoryEntry[]; expiresAt: number } | null = null;
let shalomCache: { value: AgencyDirectoryEntry[]; expiresAt: number } | null = null;

function asCoordinate(value: string | number | undefined) { const parsed = typeof value === "number" ? value : Number(value); return Number.isFinite(parsed) ? parsed : null; }
function clean(value: unknown) { return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : ""; }
function slug(value: string | number) { return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"); }

export function normalizeOlvaStore(store: OlvaStore): AgencyDirectoryEntry | null {
  const name = clean(store.nombres); const address = clean(store.direccion);
  if (!name || !address) return null;
  const type = clean(store.tipo).toUpperCase();
  return { id: `olva-${slug(store.office_id || name)}`, provider: "OLVA COURIER", name, address, department: clean(store.department), province: clean(store.province), district: clean(store.district), kind: type.includes("AGENT") ? "AGENTE" : "TIENDA", latitude: asCoordinate(store.lat), longitude: asCoordinate(store.lng), sourceUrl: OLVA_SOURCE_PAGE };
}

export function normalizeShalomOffice(office: ShalomOffice): AgencyDirectoryEntry | null {
  const place = clean(office.lugar_over); const name = clean(office.nombre) || place; const address = clean(office.direccion);
  if (!name || !address) return null;
  const kind = Number(office.ter_estado_pro ?? office.puntospro) === 1 ? "PUNTO PRO" : Number(office.ter_estado_agente ?? office.agente) === 1 ? "AGENTE" : "AGENCIA";
  return { id: `shalom-${slug(office.ter_id || `${name}-${address}`)}`, provider: "SHALOM", name, address, department: clean(office.departamento), province: clean(office.provincia), district: clean(office.zona), kind, latitude: asCoordinate(office.latitud), longitude: asCoordinate(office.longitud), phone: clean(office.telefono), businessHours: clean(office.hora_atencion), sundayHours: clean(office.hora_domingo), sourceUrl: SHALOM_SOURCE_PAGE };
}

export function filterAgencies(entries: AgencyDirectoryEntry[], query: string, limit = 1000) {
  const normalized = query.trim().toLocaleLowerCase("es-PE");
  const filtered = !normalized ? entries : entries.filter(entry => [entry.name, entry.address, entry.department, entry.province, entry.district, entry.kind, entry.phone, entry.businessHours].join(" ").toLocaleLowerCase("es-PE").includes(normalized));
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

function buildShalomAuthorization() {
  const expiresAt = Math.floor(Date.now() / 1000) + 300;
  const token = `web-${randomBytes(8).toString("hex")}@${expiresAt}`;
  const signature = createHmac("sha256", SHALOM_PUBLIC_WEB_SECRET).update(token).digest("hex");
  return `Bearer ${token}@${signature}`;
}

export async function getOfficialShalomAgencies() {
  if (shalomCache && shalomCache.expiresAt > Date.now()) return shalomCache.value;
  let entries: AgencyDirectoryEntry[] = [];
  try {
    const response = await fetch(SHALOM_OFFICIAL_DIRECTORY_URL, { method: "POST", headers: { Accept: "application/json", Authorization: buildShalomAuthorization(), Origin: "https://shalom.com.pe", Referer: SHALOM_SOURCE_PAGE, "User-Agent": "Servicom-Agency-Directory/1.0" } });
    if (!response.ok) throw new Error(`El directorio oficial de Shalom respondió ${response.status}.`);
    const payload = await response.json() as { success?: boolean; data?: ShalomOffice[] };
    entries = (payload.data || []).map(normalizeShalomOffice).filter((entry): entry is AgencyDirectoryEntry => Boolean(entry));
    if (!payload.success || entries.length === 0) throw new Error("El directorio oficial de Shalom no devolvió agencias utilizables.");
  } catch {
    entries = (shalomOfficialSnapshot as ShalomOffice[]).map(normalizeShalomOffice).filter((entry): entry is AgencyDirectoryEntry => Boolean(entry));
  }
  if (!entries.length) throw new Error("No fue posible cargar el respaldo verificado de agencias de Shalom.");
  shalomCache = { value: entries, expiresAt: Date.now() + CACHE_WINDOW_MS };
  return entries;
}

export async function searchOfficialOlvaAgencies(query: string) { return filterAgencies(await getOfficialOlvaAgencies(), query); }
export async function searchOfficialShalomAgencies(query: string) { return filterAgencies(await getOfficialShalomAgencies(), query); }
