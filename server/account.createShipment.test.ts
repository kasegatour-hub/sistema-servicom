import { describe, expect, it } from "vitest";
import { buildClientShipmentPersistenceArgs, clientShipmentInputSchema } from "./account.router";

describe("account.createMyShipment persistence policy", () => {
  it("uses the real client persistence contract with pending payment", () => {
    const input = clientShipmentInputSchema.parse({
      recipientName: "María",
      recipientLastName: "López",
      recipientDni: "71234567",
      docType: "simple",
      sheetCount: 1,
      route: "Torino - Lima",
      contentChecklist: ["Documento principal"],
    });
    const args = buildClientShipmentPersistenceArgs(input, "1234567890", "DOC-2026-ABCDE", "Documento Simple (1 hoja): 45 EUR.", 42);

    expect(args[2]).toBe("Por entregar en agencia");
    expect(args[7]).toBe("María");
    expect(args[8]).toBe("López");
    expect(args[9]).toBe("71234567");
    expect(args[13]).toBe("documento");
    expect(args[16]).toBe("Falta cancelar");
    expect(args[17]).toBe("Torino - Lima");
  });

  it("rejects payment condition from the client input", () => {
    expect(() => clientShipmentInputSchema.parse({
      recipientName: "María",
      recipientLastName: "López",
      recipientDni: "71234567",
      paymentCondition: "Pagado en Lima",
    })).toThrow(/Unrecognized key|paymentCondition/);
  });
});
