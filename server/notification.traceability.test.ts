import { describe, expect, it } from "vitest";
import { buildShipmentNotificationMessage, getShipmentChangedFields, getShipmentNotificationTitle } from "./db";

describe("trazabilidad de notificaciones de envío", () => {
  it("incluye envío, orden, código, destinatario, actor y transición de estado", () => {
    const message = buildShipmentNotificationMessage({
      shipmentType: "encomienda",
      orderNumber: "35209927",
      code: "7ABC",
      senderName: "Gian",
      senderLastName: "Arteaga",
      senderDni: "74410344",
      senderPhone: "+51970188447",
      recipientName: "Carola Alexandra",
      recipientLastName: "Cajacuri Michi",
      changedFields: ["recipientDni", "recipientPhone", "destinationAddress"],
      action: "updated",
      actor: { role: "Usuario registrador", label: "Gian Arteaga" },
      previousStatus: "En agencia",
      currentStatus: "En destino",
      details: "Se actualizó la sede de entrega.",
    });

    expect(message).toContain("Encomienda actualizada: DNI del destinatario, teléfono del destinatario, sede o destino");
    expect(message).toContain("Envío: Encomienda");
    expect(message).toContain("Orden: 35209927");
    expect(message).toContain("Código: 7ABC");
    expect(message).toContain("Remitente / cliente: Gian Arteaga");
    expect(message).toContain("Documento del remitente: 74410344");
    expect(message).toContain("Teléfono del remitente: +51970188447");
    expect(message).toContain("Destinatario: Carola Alexandra Cajacuri Michi");
    expect(message).toContain("Campos actualizados: DNI del destinatario, teléfono del destinatario, sede o destino");
    expect(message).toContain("Usuario registrador: Gian Arteaga");
    expect(message).toContain("Estado: En agencia → En destino");
    expect(message).toContain("Detalle: Se actualizó la sede de entrega.");
  });

  it("declara al cliente y el estado inicial cuando crea un envío", () => {
    const message = buildShipmentNotificationMessage({
      shipmentType: "documento",
      orderNumber: "74828979",
      code: "2XYZ",
      recipientName: "Marco",
      recipientLastName: "Rossi",
      action: "created",
      actor: { role: "Cliente", label: "Ana Pérez" },
      currentStatus: "Por entregar en agencia",
    });

    expect(message).toContain("Nuevo documento creado");
    expect(message).toContain("Cliente: Ana Pérez");
    expect(message).toContain("Estado: Por entregar en agencia");
  });

  it("usa títulos exactos por tipo de envío y acción", () => {
    expect(getShipmentNotificationTitle({ shipmentType: "documento", action: "created" })).toBe("Nuevo documento creado");
    expect(getShipmentNotificationTitle({ shipmentType: "encomienda", action: "created" })).toBe("Nueva encomienda creada");
    expect(getShipmentNotificationTitle({ shipmentType: "documento", action: "signature_requested" })).toBe("Enlace creado para firmar");
    expect(getShipmentNotificationTitle({ shipmentType: "encomienda", action: "signature_completed" })).toBe("Firma completada");
  });

  it("detecta solo campos operativos que realmente cambiaron", () => {
    expect(getShipmentChangedFields({ recipientDni: "11111111", recipientPhone: "+51911111111", status: "En agencia" }, { recipientDni: "22222222", recipientPhone: "+51911111111", status: "En destino" })).toEqual(["recipientDni", "status"]);
  });
});
