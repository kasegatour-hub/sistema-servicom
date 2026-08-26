import { describe, expect, it } from "vitest";
import { getDefaultShipmentAddresses, getShipmentRouteBucket, KASEGA_TORINO_ADDRESS, LIMA_SERVICOM_ADDRESS, SERVICOM_TORINO_ADDRESS, SHIPMENT_ROUTES } from "./shipmentRoutes";

describe("getShipmentRouteBucket", () => {
  it("separa Torino–Lima de Torino–Lima + provincia", () => {
    expect(getShipmentRouteBucket(SHIPMENT_ROUTES.TORINO_LIMA, false)).toBe(SHIPMENT_ROUTES.TORINO_LIMA);
    expect(getShipmentRouteBucket(SHIPMENT_ROUTES.TORINO_LIMA_PROVINCE, true)).toBe(SHIPMENT_ROUTES.TORINO_LIMA_PROVINCE);
  });

  it("clasifica como provincial cuando la marca provincial está activa", () => {
    expect(getShipmentRouteBucket(SHIPMENT_ROUTES.TORINO_LIMA, true)).toBe(SHIPMENT_ROUTES.TORINO_LIMA_PROVINCE);
  });

  it("clasifica Provincia → Lima → Torino como grupo independiente", () => {
    expect(getShipmentRouteBucket(SHIPMENT_ROUTES.PROVINCE_LIMA_TORINO, false)).toBe(SHIPMENT_ROUTES.PROVINCE_LIMA_TORINO);
    expect(getShipmentRouteBucket(SHIPMENT_ROUTES.PROVINCE_LIMA_TORINO, true)).toBe(SHIPMENT_ROUTES.PROVINCE_LIMA_TORINO);
  });

  it("no inventa una ruta para registros sin datos suficientes", () => {
    expect(getShipmentRouteBucket(null, false)).toBe("unknown");
    expect(getShipmentRouteBucket(undefined, undefined)).toBe("unknown");
  });

  it("asigna las sedes Servicom para Lima–Torino y Torino–Lima", () => {
    expect(getDefaultShipmentAddresses(SHIPMENT_ROUTES.LIMA_TORINO, "servicom")).toEqual({ originAddress: LIMA_SERVICOM_ADDRESS, destinationAddress: SERVICOM_TORINO_ADDRESS });
    expect(getDefaultShipmentAddresses(SHIPMENT_ROUTES.TORINO_LIMA, "servicom")).toEqual({ originAddress: SERVICOM_TORINO_ADDRESS, destinationAddress: LIMA_SERVICOM_ADDRESS });
  });

  it("asigna la sede italiana de Kasega sin cambiar la sede peruana", () => {
    expect(getDefaultShipmentAddresses(SHIPMENT_ROUTES.LIMA_TORINO, "kasega").destinationAddress).toBe(KASEGA_TORINO_ADDRESS);
    expect(getDefaultShipmentAddresses(SHIPMENT_ROUTES.TORINO_LIMA, "kasega").destinationAddress).toBe(LIMA_SERVICOM_ADDRESS);
  });

  it("deja libre la agencia provincial y conserva Torino en Provincia–Lima–Torino", () => {
    expect(getDefaultShipmentAddresses(SHIPMENT_ROUTES.TORINO_LIMA_PROVINCE, "servicom").destinationAddress).toBe("");
    expect(getDefaultShipmentAddresses(SHIPMENT_ROUTES.PROVINCE_LIMA_TORINO, "servicom").destinationAddress).toBe(SERVICOM_TORINO_ADDRESS);
  });
});

export {};

