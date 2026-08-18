import { describe, expect, it } from "vitest";
import { summarizeShipmentTrends } from "./shipmentTrends";

describe("shipment trends", () => {
  it("identifies the most and least frequent actual shipment patterns", () => {
    const trends = summarizeShipmentTrends([
      { shipmentType: "documento", route: "Lima - Torino", status: "En agencia" },
      { shipmentType: "documento", route: "Lima - Torino", status: "En tránsito" },
      { shipmentType: "encomienda", route: "Torino - Lima", status: "En agencia" },
    ]);
    expect(trends.total).toBe(3);
    expect(trends.byType).toEqual([{ label: "Documentos", count: 2 }, { label: "Encomiendas", count: 1 }]);
    expect(trends.byRoute[0]).toEqual({ label: "Lima - Torino", count: 2 });
    expect(trends.mostFrequent).toEqual({ label: "Documentos", count: 2 });
    expect(trends.leastFrequent?.count).toBe(1);
  });

  it("returns an empty safe baseline when there are no shipments", () => {
    expect(summarizeShipmentTrends([])).toMatchObject({ total: 0, byType: [], byRoute: [], byStatus: [], mostFrequent: null, leastFrequent: null });
  });
});
