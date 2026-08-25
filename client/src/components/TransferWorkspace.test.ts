import { describe, expect, it } from "vitest";
import { validateTransferForm, type TransferForm } from "./TransferWorkspace";

const validTransfer: TransferForm = {
  senderName: "Gisella Velásquez",
  senderPhone: "+39 389 766 3723",
  senderDocument: "YA1234567",
  senderDocumentType: "pasaporte",
  senderCity: "TORINO",
  senderPaymentMethod: "Agencia",
  recipientName: "Maruja Cárdenas",
  recipientPhone: "+51 970 188 447",
  recipientDocument: "74410344",
  recipientDocumentType: "dni_peru",
  recipientBank: "",
  recipientIban: "",
  recipientCci: "",
  amountSent: "100",
  exchangeRate: "1",
  currency: "EUR",
  destinationCurrency: "EUR",
  exchangeRateSource: "paridad",
  status: "Registrada",
  notes: "",
};

describe("validación de transferencias", () => {
  it("acepta cliente completo aunque no se hayan informado datos bancarios", () => {
    expect(validateTransferForm(validTransfer)).toEqual({});
  });

  it("exige nombre, documento, teléfono e importe", () => {
    const errors = validateTransferForm({
      ...validTransfer,
      senderName: "",
      senderDocument: "",
      senderPhone: "+39",
      recipientName: "",
      recipientDocument: "",
      recipientPhone: "",
      amountSent: "",
    });

    expect(errors.senderName).toContain("nombre");
    expect(errors.senderDocument).toContain("pasaporte");
    expect(errors.senderPhone).toContain("teléfono");
    expect(errors.recipientName).toContain("nombre");
    expect(errors.recipientDocument).toContain("DNI");
    expect(errors.recipientPhone).toContain("teléfono");
    expect(errors.amountSent).toContain("importe");
  });
});
