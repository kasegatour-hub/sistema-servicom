import { describe, expect, it } from "vitest";
import { buildShipmentNotificationMessage } from "./db";

describe("trazabilidad de notificaciones de envío", () => {
  it("incluye envío, orden, código, destinatario, actor y transición de estado", () => {
    const message = buildShipmentNotificationMessage({
      shipmentType: "encomienda",
      orderNumber: "35209927",
      code: "7ABC",
      recipientName: "Carola Alexandra",
      recipientLastName: "Cajacuri Michi",
      action: "updated",
      actor: { role: "Usuario registrador", label: "Gian Arteaga" },
      previousStatus: "En agencia",
      currentStatus: "En destino",
      details: "Se actualizó la sede de entrega.",
    });

    expect(message).toContain("Envío: Encomienda");
    expect(message).toContain("Orden: 35209927");
    expect(message).toContain("Código: 7ABC");
    expect(message).toContain("Destinatario: Carola Alexandra Cajacuri Michi");
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

    expect(message).toContain("Creación registrada");
    expect(message).toContain("Cliente: Ana Pérez");
    expect(message).toContain("Estado: Por entregar en agencia");
  });
});
