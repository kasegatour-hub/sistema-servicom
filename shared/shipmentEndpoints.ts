export const SHIPMENT_ENDPOINTS = {
  TORINO: "Torino",
  LIMA: "Lima",
  PROVINCIA: "Provincia (Perú)",
} as const;

export type ShipmentEndpoint = (typeof SHIPMENT_ENDPOINTS)[keyof typeof SHIPMENT_ENDPOINTS];

export type IndependentShipmentEndpoints = {
  originPoint: ShipmentEndpoint;
  destinationPoint: ShipmentEndpoint;
};

/**
 * Rutas técnicas históricas que siguen persistidas en shipments.route.
 * Las nuevas pantallas trabajan con origen/destino y solo generan esta ruta
 * para mantener compatibilidad con precios, contabilidad, filtros y documentos.
 */
export const LEGACY_ROUTE_BY_ENDPOINTS: Record<string, string> = {
  [`${SHIPMENT_ENDPOINTS.LIMA}|${SHIPMENT_ENDPOINTS.TORINO}`]: "Lima - Torino",
  [`${SHIPMENT_ENDPOINTS.TORINO}|${SHIPMENT_ENDPOINTS.LIMA}`]: "Torino - Lima",
  [`${SHIPMENT_ENDPOINTS.TORINO}|${SHIPMENT_ENDPOINTS.PROVINCIA}`]: "Torino - Lima + provincia",
  [`${SHIPMENT_ENDPOINTS.PROVINCIA}|${SHIPMENT_ENDPOINTS.TORINO}`]: "Provincia - Lima - Torino",
  [`${SHIPMENT_ENDPOINTS.PROVINCIA}|${SHIPMENT_ENDPOINTS.LIMA}`]: "Provincia - Lima",
  [`${SHIPMENT_ENDPOINTS.LIMA}|${SHIPMENT_ENDPOINTS.PROVINCIA}`]: "Lima - Provincia",
  [`${SHIPMENT_ENDPOINTS.PROVINCIA}|${SHIPMENT_ENDPOINTS.PROVINCIA}`]: "Provincia - Lima - Provincia",
};

export function deriveLegacyShipmentRoute({ originPoint, destinationPoint }: IndependentShipmentEndpoints) {
  return LEGACY_ROUTE_BY_ENDPOINTS[`${originPoint}|${destinationPoint}`] || `${originPoint} - ${destinationPoint}`;
}

export function endpointRequiresAgency(endpoint?: string | null) {
  return endpoint === SHIPMENT_ENDPOINTS.PROVINCIA;
}

export function deriveHubPath({ originPoint, destinationPoint }: IndependentShipmentEndpoints) {
  if (originPoint === SHIPMENT_ENDPOINTS.TORINO && destinationPoint === SHIPMENT_ENDPOINTS.LIMA) return [SHIPMENT_ENDPOINTS.TORINO, SHIPMENT_ENDPOINTS.LIMA];
  if (originPoint === SHIPMENT_ENDPOINTS.LIMA && destinationPoint === SHIPMENT_ENDPOINTS.TORINO) return [SHIPMENT_ENDPOINTS.LIMA, SHIPMENT_ENDPOINTS.TORINO];
  const path: ShipmentEndpoint[] = [originPoint];
  if (originPoint !== SHIPMENT_ENDPOINTS.LIMA && destinationPoint !== SHIPMENT_ENDPOINTS.LIMA) path.push(SHIPMENT_ENDPOINTS.LIMA);
  if (destinationPoint !== originPoint) path.push(destinationPoint);
  return path;
}

export function normalizeIndependentEndpoints(input: Partial<IndependentShipmentEndpoints> & { route?: string | null; isProvinceDelivery?: boolean | null }): IndependentShipmentEndpoints {
  if (input.originPoint && input.destinationPoint) return { originPoint: input.originPoint, destinationPoint: input.destinationPoint };
  switch (input.route) {
    case "Lima - Torino": return { originPoint: SHIPMENT_ENDPOINTS.LIMA, destinationPoint: SHIPMENT_ENDPOINTS.TORINO };
    case "Torino - Lima": return { originPoint: SHIPMENT_ENDPOINTS.TORINO, destinationPoint: SHIPMENT_ENDPOINTS.LIMA };
    case "Torino - Lima + provincia": return { originPoint: SHIPMENT_ENDPOINTS.TORINO, destinationPoint: SHIPMENT_ENDPOINTS.PROVINCIA };
    case "Provincia - Lima - Torino": return { originPoint: SHIPMENT_ENDPOINTS.PROVINCIA, destinationPoint: SHIPMENT_ENDPOINTS.TORINO };
    default:
      return input.isProvinceDelivery ? { originPoint: SHIPMENT_ENDPOINTS.TORINO, destinationPoint: SHIPMENT_ENDPOINTS.PROVINCIA } : { originPoint: SHIPMENT_ENDPOINTS.LIMA, destinationPoint: SHIPMENT_ENDPOINTS.TORINO };
  }
}
