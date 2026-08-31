import { describe, expect, it } from "vitest";
import { getShipmentStatusUi, isExceptionShipmentStatus, SHIPMENT_STATUSES } from "./shipmentStatus";

describe("shipment status presentation", () => {
  it("includes the alert and return states", () => {
    expect(SHIPMENT_STATUSES).toContain("Alerta");
    expect(SHIPMENT_STATUSES).toContain("Devolución");
  });

  it("marks alert and return in red", () => {
    expect(isExceptionShipmentStatus("Alerta")).toBe(true);
    expect(isExceptionShipmentStatus("Devolución")).toBe(true);
    expect(getShipmentStatusUi("Alerta").className).toContain("text-red-800");
    expect(getShipmentStatusUi("Devolución").className).toContain("bg-red-50");
  });

  it("does not mark normal shipment states as exceptions", () => {
    expect(isExceptionShipmentStatus("En tránsito")).toBe(false);
    expect(getShipmentStatusUi("En tránsito").tone).toBe("normal");
  });
});
