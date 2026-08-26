import { describe, expect, it } from "vitest";
import { getShipmentRouteBucket, SHIPMENT_ROUTES } from "./shipmentRoutes";

describe("getShipmentRouteBucket", () => {
  it("separa Torino–Lima de Torino–Lima + provincia", () => {
    expect(getShipmentRouteBucket(SHIPMENT_ROUTES.TORINO_LIMA, false)).toBe(SHIPMENT_ROUTES.TORINO_LIMA);
    expect(getShipmentRouteBucket(SHIPMENT_ROUTES.TORINO_LIMA_PROVINCE, true)).toBe(SHIPMENT_ROUTES.TORINO_LIMA_PROVINCE);
  });

  it("clasifica como provincial cuando la marca provincial está activa", () => {
    expect(getShipmentRouteBucket(SHIPMENT_ROUTES.TORINO_LIMA, true)).toBe(SHIPMENT_ROUTES.TORINO_LIMA_PROVINCE);
  });

  it("no inventa una ruta para registros sin datos suficientes", () => {
    expect(getShipmentRouteBucket(null, false)).toBe("unknown");
    expect(getShipmentRouteBucket(undefined, undefined)).toBe("unknown");
  });
});

export {};

