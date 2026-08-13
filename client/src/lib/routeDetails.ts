export const ROUTES = {
  LIMA_TORINO: "Lima - Torino",
  TORINO_LIMA: "Torino - Lima",
} as const;

export type ShipmentRoute = (typeof ROUTES)[keyof typeof ROUTES];

const LIMA = {
  shortLabel: "Lima, Perú",
  printLabel: "LIMA, PERÚ",
  officeLabel: "Jr. de la Unión 518",
  address: "Jr. de la Unión Nro. 518 Int. S101, Cercado de Lima, Lima-Lima-Lima",
  phone: "+51 970 188 447 / +51 908 722 617 · 01 390 7269",
};

const TORINO = {
  shortLabel: "Torino, Italia",
  printLabel: "TORINO, ITALIA",
  officeLabel: "Corso Peschiera",
  address: "Corso Peschiera, 162A, Zona Piazza Sabotino, Torino, Italia",
  phone: "+39 351 278 7962 / +39 350 902 5271 / +39 389 766 3723",
};

export function getRoutePresentation(route?: string | null) {
  const isTorinoToLima = route === ROUTES.TORINO_LIMA;
  const origin = isTorinoToLima ? TORINO : LIMA;
  const destination = isTorinoToLima ? LIMA : TORINO;
  return {
    route: isTorinoToLima ? ROUTES.TORINO_LIMA : ROUTES.LIMA_TORINO,
    origin,
    destination,
    originLabel: origin.shortLabel,
    destinationLabel: destination.shortLabel,
    originPrintLabel: origin.printLabel,
    destinationPrintLabel: destination.printLabel,
    originCity: isTorinoToLima ? "Torino" : "Lima",
    destinationCity: isTorinoToLima ? "Lima" : "Torino",
    deliveryTitle: `CONTROL DE ENTREGA — ${destination.printLabel}`,
  };
}
