import { describe, expect, it } from "vitest";
import { deriveHubPath, deriveLegacyShipmentRoute, normalizeIndependentEndpoints, SHIPMENT_ENDPOINTS } from "./shipmentEndpoints";

describe("modelo de origen y destino independientes", () => {
  it.each([
    [SHIPMENT_ENDPOINTS.LIMA, SHIPMENT_ENDPOINTS.TORINO, "Lima - Torino"],
    [SHIPMENT_ENDPOINTS.TORINO, SHIPMENT_ENDPOINTS.LIMA, "Torino - Lima"],
    [SHIPMENT_ENDPOINTS.TORINO, SHIPMENT_ENDPOINTS.PROVINCIA, "Torino - Lima + provincia"],
    [SHIPMENT_ENDPOINTS.PROVINCIA, SHIPMENT_ENDPOINTS.TORINO, "Provincia - Lima - Torino"],
    [SHIPMENT_ENDPOINTS.LIMA, SHIPMENT_ENDPOINTS.PROVINCIA, "Lima - Provincia"],
    [SHIPMENT_ENDPOINTS.PROVINCIA, SHIPMENT_ENDPOINTS.LIMA, "Provincia - Lima"],
    [SHIPMENT_ENDPOINTS.PROVINCIA, SHIPMENT_ENDPOINTS.PROVINCIA, "Provincia - Lima - Provincia"],
  ])("deriva la ruta técnica %s → %s", (originPoint, destinationPoint, route) => {
    expect(deriveLegacyShipmentRoute({ originPoint, destinationPoint })).toBe(route);
  });

  it("mantiene el tránsito por Lima para provincia", () => {
    expect(deriveHubPath({ originPoint: SHIPMENT_ENDPOINTS.TORINO, destinationPoint: SHIPMENT_ENDPOINTS.PROVINCIA })).toEqual(["Torino", "Lima", "Provincia (Perú)"]);
    expect(deriveHubPath({ originPoint: SHIPMENT_ENDPOINTS.PROVINCIA, destinationPoint: SHIPMENT_ENDPOINTS.TORINO })).toEqual(["Provincia (Perú)", "Lima", "Torino"]);
  });

  it("normaliza registros históricos al nuevo modelo", () => {
    expect(normalizeIndependentEndpoints({ route: "Torino - Lima + provincia" })).toEqual({ originPoint: "Torino", destinationPoint: "Provincia (Perú)" });
    expect(normalizeIndependentEndpoints({ route: "Lima - Torino" })).toEqual({ originPoint: "Lima", destinationPoint: "Torino" });
  });
});
