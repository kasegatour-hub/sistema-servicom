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
      requiresApostilleService: true,
      contentChecklist: ["Documento principal"],
    });
    const args = buildClientShipmentPersistenceArgs(input, "1234567890", "DOC-2026-ABCDE", "Documento Simple (1 hoja): 45 EUR.", 42);

    expect(args[2]).toBe("Por entregar en agencia");
    expect(args[7]).toBe("María");
    expect(args[8]).toBe("López");
    expect(args[9]).toBe("71234567");
    expect(args[13]).toBe("documento");
    expect(args[16]).toBe(0);
    expect(args[17]).toBe("Falta cancelar");
    expect(args[18]).toBe("Torino - Lima");
    expect(args[32]).toBe("simple");
    expect(args[33]).toBe(1);
    expect(args[34]).toBe(true);
  });

  it("only accepts the apostille service for Torino - Lima", () => {
    expect(() => clientShipmentInputSchema.parse({
      recipientName: "María",
      recipientLastName: "López",
      recipientDni: "71234567",
      route: "Lima - Torino",
      requiresApostilleService: true,
      contentChecklist: ["Documento principal"],
    })).toThrow(/Torino - Lima/);
  });

  it("rejects incomplete shipments from the client input", () => {
    expect(() => clientShipmentInputSchema.parse({
      recipientName: "María",
      recipientLastName: "López",
      recipientDni: "71234567",
      isIncomplete: true,
      contentChecklist: ["Documento principal"],
    })).toThrow();
  });

  it("accepts both document services only on Torino - Lima", () => {
    const input = clientShipmentInputSchema.parse({
      recipientName: "María",
      recipientLastName: "López",
      recipientDni: "71234567",
      route: "Torino - Lima",
      requiresApostilleService: true,
      requiresTranslationService: true,
      contentChecklist: ["Documento principal"],
    });
    expect(input.requiresApostilleService).toBe(true);
    expect(input.requiresTranslationService).toBe(true);
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

  it("rechaza campos operativos de recogida que solo corresponden a Admin y Usuario", () => {
    expect(() => clientShipmentInputSchema.parse({ route: "Lima - Torino", limaTorinoTransferMode: "dhl_recogida", contentChecklist: ["Documento principal"] })).toThrow(/Unrecognized key|limaTorinoTransferMode/);
    const input = clientShipmentInputSchema.parse({ route: "Lima - Torino", contentChecklist: ["Documento principal"] });
    const args = buildClientShipmentPersistenceArgs(input, "1234567890", "DOC-2026-ABCD", "Documento", 42);
    expect(args[49]).toBeNull();
  });

  it("rechaza datos de persona autorizada y aeropuerto que solo administra el operador", () => {
    expect(() => clientShipmentInputSchema.parse({ route: "Lima - Torino", limaTorinoTransferMode: "persona_autorizada", deliveryPersonName: "Ana", deliveryPersonLastName: "Pérez", deliveryPersonDni: "71234567", deliveryPersonPhone: "+51 970188447", deliveryLocationType: "aeropuerto_jorge_chavez", deliveryLocationAddress: "Nuevo Aeropuerto Internacional Jorge Chávez", contentChecklist: ["Documento principal"] })).toThrow(/Unrecognized key|limaTorinoTransferMode/);
  });
