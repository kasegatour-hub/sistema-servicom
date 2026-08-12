import { describe, expect, it } from "vitest";
import { CLIENT_PAYMENT_DEFAULTS, clientShipmentInputSchema } from "./account.router";

describe("client shipment payment policy", () => {
  it("forces pending payment defaults for every client-created shipment", () => {
    expect(CLIENT_PAYMENT_DEFAULTS).toEqual({
      condition: "Pagará en ITALIA (Torino)",
      status: "Falta cancelar",
    });
  });

  it("does not accept a client-selected payment field in the input contract", () => {
    expect(() => clientShipmentInputSchema.parse({
      recipientName: "María",
      recipientLastName: "López",
      recipientDni: "71234567",
      paymentCondition: "Pagado en Lima (Jr. de la Unión 518)",
    })).toThrow(/Unrecognized key|paymentCondition/);
    expect(CLIENT_PAYMENT_DEFAULTS.status).toBe("Falta cancelar");
  });
});
