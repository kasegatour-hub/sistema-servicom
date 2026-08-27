export const SHIPMENT_ROUTES = {
  LIMA_TORINO: "Lima - Torino",
  TORINO_LIMA: "Torino - Lima",
  TORINO_LIMA_PROVINCE: "Torino - Lima + provincia",
  PROVINCE_LIMA_TORINO: "Provincia - Lima - Torino",
} as const;

export type ShipmentRoute = (typeof SHIPMENT_ROUTES)[keyof typeof SHIPMENT_ROUTES];

export const LIMA_SERVICOM_ADDRESS = "SERVICOM INTERNACIONAL — Jr. de la Unión Nro. 518 Int. S101, Cercado de Lima";
export const SERVICOM_TORINO_ADDRESS = "SERVICOM INTERNACIONAL — Corso Peschiera, 162A, Zona Piazza Sabotino, Torino, Italia";
export const KASEGA_TORINO_ADDRESS = "KASEGA TOUR — Via Muriaglio 12, Torino, Italia";

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
  return route === SHIPMENT_ROUTES.TORINO_LIMA_PROVINCE || route === SHIPMENT_ROUTES.PROVINCE_LIMA_TORINO;
}

export function isTorinoLimaRoute(route?: string | null) {
  return route === SHIPMENT_ROUTES.TORINO_LIMA || route === SHIPMENT_ROUTES.TORINO_LIMA_PROVINCE;
}

export type ShipmentOperationalEnvironment = "lima" | "torino";

export function getShipmentOperationalEnvironment(route?: string | null): ShipmentOperationalEnvironment | "unknown" {
  if (route === SHIPMENT_ROUTES.TORINO_LIMA || route === SHIPMENT_ROUTES.TORINO_LIMA_PROVINCE) return "torino";
  if (route === SHIPMENT_ROUTES.LIMA_TORINO || route === SHIPMENT_ROUTES.PROVINCE_LIMA_TORINO) return "lima";
  return "unknown";
}

export function isProvinceLimaTorinoRoute(route?: string | null) {
  return route === SHIPMENT_ROUTES.PROVINCE_LIMA_TORINO;
}

export function isLimaTorinoRoute(route?: string | null) {
  return route === SHIPMENT_ROUTES.LIMA_TORINO || route === SHIPMENT_ROUTES.PROVINCE_LIMA_TORINO;
}

/** Devuelve el grupo exacto de ruta usado por listados y filtros. */
export function getShipmentRouteBucket(route?: string | null, isProvinceDelivery?: boolean | null): ShipmentRoute | "unknown" {
  if (route === SHIPMENT_ROUTES.LIMA_TORINO) return SHIPMENT_ROUTES.LIMA_TORINO;
  if (route === SHIPMENT_ROUTES.PROVINCE_LIMA_TORINO) return SHIPMENT_ROUTES.PROVINCE_LIMA_TORINO;
  if (route === SHIPMENT_ROUTES.TORINO_LIMA_PROVINCE || isProvinceDelivery === true) return SHIPMENT_ROUTES.TORINO_LIMA_PROVINCE;
  if (route === SHIPMENT_ROUTES.TORINO_LIMA) return SHIPMENT_ROUTES.TORINO_LIMA;
  return "unknown";
}
