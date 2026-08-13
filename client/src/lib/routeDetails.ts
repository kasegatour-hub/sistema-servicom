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

export function getDeclarationLegalText(route?: string | null) {
  const { originCity, origin } = getRoutePresentation(route);
  const isItalyOrigin = originCity === "Torino";

  if (isItalyOrigin) {
    return {
      country: "República Italiana",
      guarantee: "Garantizo formalmente que los documentos entregados a la agencia no ocultan, no camuflan, ni se encuentran impregnados de sustancias estupefacientes, alcaloides, dinero en efectivo no declarado, ni ningún material prohibido por la legislación penal de la República Italiana —incluyendo de forma explícita el Decreto del Presidente de la República N° 309 del 9 de octubre de 1990 (Texto Único sobre Estupefacientes), las normas sobre blanqueo de capitales y los convenios aduaneros internacionales vigentes en la Unión Europea.",
      authorities: "Mediante mi firma y huella dactilar estampada en el presente documento, asumo la responsabilidad penal, civil y administrativa absoluta e indelegable ante las autoridades italianas competentes, específicamente la Guardia di Finanza, la Agencia de Aduanas y Monopolios (Agenzia delle Dogane e dei Monopoli - ADM), la Fiscalía de la República (Procura della Repubblica) y cualquier otra autoridad judicial o policial de la Unión Europea o extranjera en caso de detectarse alteraciones, camuflajes o sustancias ilícitas en mi envío.",
      originLine: `Suscrito en la sede de origen de ${origin.shortLabel}, el`,
    };
  }

  return {
    country: "República del Perú",
    guarantee: "Garantizo formalmente que los documentos entregados a la agencia no ocultan, no camuflan, ni se encuentran impregnados de sustancias estupefacientes, alcaloides, dinero en efectivo no declarado, ni ningún material prohibido por la legislación penal de la República del Perú (incluyendo de forma explícita la Ley N° 28002 - Ley que penaliza el Tráfico Ilícito de Drogas) y los convenios aduaneros internacionales vigentes.",
    authorities: "Mediante mi firma y huella dactilar estampada en el presente documento, asumo la responsabilidad penal, civil y administrativa absoluta e indelegable ante la Policía Nacional del Perú (DIRANDRO), SUNAT/Aduanas, Ministerio Público y cualquier autoridad judicial nacional o extranjera en caso de detectarse alteraciones, camuflajes o sustancias ilícitas en mi envío.",
    originLine: `Suscrito en la sede de origen de ${origin.shortLabel}, el`,
  };
}

export const INSTITUTIONAL_DECLARATION_ENTITY = "Servicom Internacional en colaboración con KASEGA TOUR EIRL (RUC: 20615004708)";
