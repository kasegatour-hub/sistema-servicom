export const SHIPMENT_ROUTES = {
  LIMA_TORINO: "Lima - Torino",
  TORINO_LIMA: "Torino - Lima",
  TORINO_LIMA_PROVINCE: "Torino - Lima + provincia",
} as const;

export type ShipmentRoute = (typeof SHIPMENT_ROUTES)[keyof typeof SHIPMENT_ROUTES];

export const LIMA_SERVICOM_ADDRESS = "SERVICOM INTERNACIONAL — Jr. de la Unión Nro. 518 Int. S101, Cercado de Lima";
export const KASEGA_TORINO_ADDRESS = "TORINO, ITALIA · Via Muriaglio 12, Torino, Italia";

export function isProvinceShipmentRoute(route?: string | null) {
  return route === SHIPMENT_ROUTES.TORINO_LIMA_PROVINCE;
}

export function isTorinoLimaRoute(route?: string | null) {
  return route === SHIPMENT_ROUTES.TORINO_LIMA || isProvinceShipmentRoute(route);
}

export function isLimaTorinoRoute(route?: string | null) {
  return route === SHIPMENT_ROUTES.LIMA_TORINO;
}
