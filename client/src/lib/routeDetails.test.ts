import { describe, expect, it } from "vitest";
import { getDeclarationLegalText, getRoutePresentation, INSTITUTIONAL_DECLARATION_ENTITY } from "./routeDetails";

describe("route presentation", () => {
  it("uses Torino as destination for Lima–Torino", () => {
    const presentation = getRoutePresentation("Lima - Torino");

    expect(presentation.originPrintLabel).toBe("LIMA, PERÚ");
    expect(presentation.destinationPrintLabel).toBe("TORINO, ITALIA");
    expect(presentation.destination.officeLabel).toBe("Corso Peschiera");
    expect(presentation.deliveryTitle).toBe("CONTROL DE ENTREGA — TORINO, ITALIA");
  });

  it("uses Lima as destination for Torino–Lima", () => {
    const presentation = getRoutePresentation("Torino - Lima");

    expect(presentation.originPrintLabel).toBe("TORINO, ITALIA");
    expect(presentation.destinationPrintLabel).toBe("LIMA, PERÚ");
    expect(presentation.destination.officeLabel).toBe("Jr. de la Unión 518");
    expect(presentation.destination.address).toContain("Jr. de la Unión Nro. 518");
    expect(presentation.deliveryTitle).toBe("CONTROL DE ENTREGA — LIMA, PERÚ");
  });

  it("uses Peruvian legal text for Lima-origin shipments", () => {
    const legal = getDeclarationLegalText("Lima - Torino");
    expect(legal.country).toBe("República del Perú");
    expect(legal.guarantee).toContain("Ley N° 28002");
    expect(legal.authorities).toContain("DIRANDRO");
    expect(legal.originLine).toContain("Lima, Perú");
  });

  it("uses Italian legal text for Torino-origin shipments", () => {
    const legal = getDeclarationLegalText("Torino - Lima");
    expect(legal.country).toBe("República Italiana");
    expect(legal.guarantee).toContain("Decreto del Presidente de la República N° 309");
    expect(legal.authorities).toContain("Guardia di Finanza");
    expect(legal.authorities).toContain("Agenzia delle Dogane e dei Monopoli - ADM");
    expect(legal.originLine).toContain("Torino, Italia");
    expect(INSTITUTIONAL_DECLARATION_ENTITY).toContain("KASEGA TOUR EIRL");
  });
});
