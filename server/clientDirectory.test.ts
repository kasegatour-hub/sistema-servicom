import { describe, expect, it } from "vitest";
import { buildShipmentClientDirectoryRecords } from "./clientDirectory";

describe("shipment client directory", () => {
  it("keeps sender and recipient as independent persistent records", () => {
    const records = buildShipmentClientDirectoryRecords({
      senderName: " Ana ",
      senderLastName: " Pérez ",
      senderDni: " 71234567 ",
      senderPhone: " +51 970188447 ",
      recipientName: "Marco",
      recipientLastName: "Rossi",
      recipientDni: "00112233",
      recipientPhone: "+39 3897663723",
    });

    expect(records).toEqual([
      {
        ownerAdminId: null,
        name: "Ana",
        lastName: "Pérez",
        dni: "71234567",
        documentType: "dni_peru",
        phone: "+51 970188447",
        email: null,
      },
      {
        ownerAdminId: null,
        name: "Marco",
        lastName: "Rossi",
        dni: "00112233",
        documentType: "dni_peru",
        phone: "+39 3897663723",
        email: null,
      },
    ]);
    expect(records.every((record) => !("accountId" in record))).toBe(true);
  });

  it("does not create a directory record for an incomplete person", () => {
    expect(buildShipmentClientDirectoryRecords({ senderName: "Solo nombre" })).toEqual([]);
  });
});
