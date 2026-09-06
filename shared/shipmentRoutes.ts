export const SHIPMENT_ROUTES = {
  LIMA_TORINO: "Lima - Torino",
  TORINO_LIMA: "Torino - Lima",
  TORINO_LIMA_PROVINCE: "Torino - Lima + provincia",
  PROVINCE_LIMA_TORINO: "Provincia - Lima - Torino",
  LIMA_PROVINCE: "Lima - Provincia",
  PROVINCE_LIMA: "Provincia - Lima",
  PROVINCE_PROVINCE: "Provincia - Lima - Provincia",
} as const;

export type ShipmentRoute = (typeof SHIPMENT_ROUTES)[keyof typeof SHIPMENT_ROUTES];

export const LIMA_SERVICOM_ADDRESS = "SERVICOM INTERNACIONAL — Jr. de la Unión Nro. 518 Int. S101, Cercado de Lima";
export const SERVICOM_TORINO_ADDRESS = "SERVICOM INTERNACIONAL — Corso Peschiera, 162A, Zona Piazza Sabotino, Torino, Italia";
export const KASEGA_TORINO_ADDRESS = "KASEGA TOUR — Via Muriaglio 12, Torino, Italia";

const PRIMARY_LIMA_OFFICE_TERMS = ["jr. de la unión", "jr de la union", "jr. de la unión nro. 518"];
const PRIMARY_TORINO_OFFICE_TERMS = ["corso peschiera", "via muriaglio", "kasega tour"];

function containsOfficeTerm(value: string | null | undefined, terms: string[]) {
  const normalized = String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-PE");
  return terms.some(term => normalized.includes(term.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-PE")));
}

/** Solo el corredor entre las oficinas principales permite los servicios especiales y el traslado a Torino. */
export function isPrimaryInternationalOfficeRoute(route?: string | null, originAddress?: string | null, destinationAddress?: string | null) {
  if (route !== SHIPMENT_ROUTES.LIMA_TORINO && route !== SHIPMENT_ROUTES.TORINO_LIMA) return false;
  // Registros históricos no guardaban dirección exacta: la ruta internacional era suficiente.
  if (!String(originAddress || "").trim() && !String(destinationAddress || "").trim()) return true;
  return (containsOfficeTerm(originAddress, PRIMARY_LIMA_OFFICE_TERMS) && containsOfficeTerm(destinationAddress, PRIMARY_TORINO_OFFICE_TERMS))
    || (containsOfficeTerm(originAddress, PRIMARY_TORINO_OFFICE_TERMS) && containsOfficeTerm(destinationAddress, PRIMARY_LIMA_OFFICE_TERMS));
}

/** Sedes principales reutilizables en formularios, filtros y documentos. */
export const FIXED_SHIPMENT_LOCATIONS = [
  { id: "servicom-lima", label: "Servicom Internacional — Jr. de la Unión 518 Sótano Int. 101, Lima", address: LIMA_SERVICOM_ADDRESS, workspace: "servicom" as const },
  { id: "servicom-torino", label: "Servicom Internacional — Corso Peschiera 162A, Torino", address: SERVICOM_TORINO_ADDRESS, workspace: "servicom" as const },
  { id: "kasega-torino", label: "Kasega Tour — Via Muriaglio 12, Torino", address: KASEGA_TORINO_ADDRESS, workspace: "kasega" as const },
];

export type ShipmentBrand = "servicom" | "kasega";

/**
 * Direcciones automáticas del flujo operativo. La provincia queda vacía a propósito:
 * debe completarse con una agencia concreta mediante AgencyDestinationPicker.
 */
export function getDefaultShipmentAddresses(route?: string | null, brand: ShipmentBrand = "servicom") {
  const torinoAddress = brand === "kasega" ? KASEGA_TORINO_ADDRESS : SERVICOM_TORINO_ADDRESS;
  switch (getShipmentRouteBucket(route)) {
    case SHIPMENT_ROUTES.LIMA_TORINO:
      return { originAddress: LIMA_SERVICOM_ADDRESS, destinationAddress: torinoAddress };
    case SHIPMENT_ROUTES.TORINO_LIMA:
      return { originAddress: torinoAddress, destinationAddress: LIMA_SERVICOM_ADDRESS };
    case SHIPMENT_ROUTES.TORINO_LIMA_PROVINCE:
      return { originAddress: torinoAddress, destinationAddress: "" };
    case SHIPMENT_ROUTES.PROVINCE_LIMA_TORINO:
      return { originAddress: "", destinationAddress: torinoAddress };
    default:
      return { originAddress: "", destinationAddress: "" };
  }
}

export function isProvinceShipmentRoute(route?: string | null) {
  return route === SHIPMENT_ROUTES.TORINO_LIMA_PROVINCE || route === SHIPMENT_ROUTES.PROVINCE_LIMA_TORINO || route === SHIPMENT_ROUTES.LIMA_PROVINCE || route === SHIPMENT_ROUTES.PROVINCE_LIMA || route === SHIPMENT_ROUTES.PROVINCE_PROVINCE;
}

export function isTorinoLimaRoute(route?: string | null) {
  return route === SHIPMENT_ROUTES.TORINO_LIMA || route === SHIPMENT_ROUTES.TORINO_LIMA_PROVINCE || route === SHIPMENT_ROUTES.PROVINCE_LIMA || route === SHIPMENT_ROUTES.PROVINCE_PROVINCE;
}

export type ShipmentOperationalEnvironment = "lima" | "torino";

export function getShipmentOperationalEnvironment(route?: string | null): ShipmentOperationalEnvironment | "unknown" {
  if (route === SHIPMENT_ROUTES.TORINO_LIMA || route === SHIPMENT_ROUTES.TORINO_LIMA_PROVINCE) return "torino";
  if (route === SHIPMENT_ROUTES.LIMA_TORINO || route === SHIPMENT_ROUTES.PROVINCE_LIMA_TORINO || route === SHIPMENT_ROUTES.LIMA_PROVINCE || route === SHIPMENT_ROUTES.PROVINCE_LIMA || route === SHIPMENT_ROUTES.PROVINCE_PROVINCE) return "lima";
  return "unknown";
}

export function isProvinceLimaTorinoRoute(route?: string | null) {
  return route === SHIPMENT_ROUTES.PROVINCE_LIMA_TORINO || route === SHIPMENT_ROUTES.PROVINCE_LIMA || route === SHIPMENT_ROUTES.PROVINCE_PROVINCE;
}

export function isLimaTorinoRoute(route?: string | null) {
  return route === SHIPMENT_ROUTES.LIMA_TORINO || route === SHIPMENT_ROUTES.PROVINCE_LIMA_TORINO;
}

/** Devuelve el grupo exacto de ruta usado por listados y filtros. */
export function getShipmentRouteBucket(route?: string | null, isProvinceDelivery?: boolean | null): ShipmentRoute | "unknown" {
  if (route === SHIPMENT_ROUTES.LIMA_TORINO) return SHIPMENT_ROUTES.LIMA_TORINO;
  if (route === SHIPMENT_ROUTES.PROVINCE_LIMA_TORINO || route === SHIPMENT_ROUTES.PROVINCE_LIMA) return SHIPMENT_ROUTES.PROVINCE_LIMA_TORINO;
  if (route === SHIPMENT_ROUTES.LIMA_PROVINCE) return SHIPMENT_ROUTES.LIMA_PROVINCE;
  if (route === SHIPMENT_ROUTES.PROVINCE_PROVINCE) return SHIPMENT_ROUTES.PROVINCE_PROVINCE;
  if (route === SHIPMENT_ROUTES.TORINO_LIMA_PROVINCE || isProvinceDelivery === true) return SHIPMENT_ROUTES.TORINO_LIMA_PROVINCE;
  if (route === SHIPMENT_ROUTES.TORINO_LIMA) return SHIPMENT_ROUTES.TORINO_LIMA;
  return "unknown";
}
