import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildReceiptMarkdown, buildReceiptTicketHtml } from "./userReceipt";

describe("recibos de Cliente con servicio de apostilla", () => {
  beforeAll(() => {
    vi.stubGlobal("window", { location: { origin: "https://servicominternacional.manus.space" } });
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  const shipment = {
    orderNumber: "8582224587",
    code: "DOC-2026-APOSU",
    shipmentType: "documento" as const,
    route: "Torino - Lima",
    recipientName: "Alessandro",
    recipientLastName: "Gallo",
    requiresApostilleService: 1,
  };

  it("muestra el servicio solicitado en Markdown y control de entrega", () => {
    expect(buildReceiptMarkdown(shipment)).toContain("Servicios contratados:** Apostillado");
    expect(buildReceiptTicketHtml({
      order: shipment.orderNumber,
      code: shipment.code,
      recipient: "Alessandro Gallo",
      recipientPhone: "+39 351 864 2795",
      shipmentType: "documento",
      route: shipment.route,
      requiresApostilleService: shipment.requiresApostilleService,
    })).toContain("SERVICIOS CONTRATADOS:</strong> Apostillado");
  });

  it("omite la etiqueta cuando no se solicitó apostilla", () => {
    expect(buildReceiptMarkdown({ ...shipment, requiresApostilleService: 0 })).not.toContain("Documentos para apostillar");
  });
});
