import { describe, expect, it } from "vitest";
import { getRoutePresentation } from "./routeDetails";

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
});
