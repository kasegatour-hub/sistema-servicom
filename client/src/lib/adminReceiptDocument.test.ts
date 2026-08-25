import { describe, expect, it, vi } from "vitest";

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,shared-qr"),
  },
}));

import { buildAdminReceiptDocument } from "./adminReceiptDocument";

describe("maqueta compartida del comprobante administrativo", () => {
  it("incluye las mismas páginas de recibo, control de entrega y declaración para imprimir o descargar", async () => {
    const document = await buildAdminReceiptDocument({
      origin: "https://servicominternacional.manus.space",
      limaTorinoEncomiendasEnabled: true,
      shipment: {
        orderNumber: "8582224585",
        code: "ENC-2026-JVZU4",
        shipmentType: "encomienda",
        route: "Torino - Lima",
        senderName: "Luciana",
        senderLastName: "Ramirez Soto",
        senderDni: "72481659",
        senderPhone: "+51 967254138",
        recipientName: "Alessandro",
        recipientLastName: "Gallo Moretti",
        recipientDni: "64578192",
        recipientPhone: "+39 3518642795",
        status: "En agencia",
        paymentStatus: "Pagado",
        finalPriceEur: "189",
        notes: "Tarifa: Encomienda por peso",
        contentChecklist: ["Paquete sellado", "Ropa"],
        createdAt: new Date("2026-08-19T15:22:00.000Z"),
      },
    });

    expect(document.filename).toBe("recibo-encomienda-alessandro-gallo-moretti-orden-8582224585");
    expect(document.contentHtml.match(/class="receipt-page"/g)).toHaveLength(3);
    expect(document.contentHtml).toContain("INFORMACIÓN DE ENVÍO DE ENCOMIENDA — Torino - Lima");
    expect(document.contentHtml).toContain("CONTROL DE ENTREGA — LIMA, PERÚ (ENCOMIENDA)");
    expect(document.contentHtml).toContain("DECLARACIÓN JURADA DE CONTENIDO");
    expect(document.contentHtml).toContain("ESCANEAR PARA GESTIONAR");
    expect(document.contentHtml).toContain("data:image/png;base64,shared-qr");
    expect(document.contentHtml).not.toContain('id="deliveryControlQR"');
    expect(document.html).toContain("@media print");
  });

  it("identifies documents requested for apostille in the receipt and delivery control", async () => {
    const document = await buildAdminReceiptDocument({
      origin: "https://servicominternacional.manus.space",
      shipment: {
        orderNumber: "8582224586",
        code: "DOC-2026-APOST",
        shipmentType: "documento",
        route: "Torino - Lima",
        recipientName: "Alessandro",
        recipientLastName: "Gallo",
        requiresApostilleService: 1,
      },
    });

    expect(document.contentHtml).toContain("Servicio solicitado:</strong> Documentos para apostillar");
    expect(document.contentHtml).toContain("SERVICIO:</div><div class=\"value\"><strong>Documentos para apostillar");
  });

  it("usa la identidad Kasega en todo el recibo para una cuenta aislada equivalente", async () => {
    const document = await buildAdminReceiptDocument({
      origin: "https://servicominternacional.manus.space",
      shipment: {
        orderNumber: "86200072",
        code: "7UGK",
        shipmentType: "documento",
        route: "Torino - Lima",
        registeredById: 210002,
        registeredByEmail: "usuario-kasega@example.com",
        senderName: "Carlos",
        senderLastName: "Mendoza Rojas",
        recipientName: "Maria",
        recipientLastName: "Flores Cortez",
        status: "En agencia",
        paymentStatus: "Pagado",
        finalPriceEur: "95",
      },
    });

    expect(document.contentHtml).toContain("KASEGA TOUR EIRL");
    expect(document.contentHtml).toContain("Via Muriaglio 12, Torino, Italia");
    expect(document.contentHtml).toContain("+39 350 818 1599 · +39 371 373 8550");
    expect(document.contentHtml).not.toContain(">SERVICOM INTERNACIONAL</h1>");
    expect(document.contentHtml).not.toContain("Titular:</strong> Servicom Internacional");
  });

  it("muestra la agencia provincial seleccionada en vez de la sede fija de Torino para Kasega", async () => {
    const document = await buildAdminReceiptDocument({
      origin: "https://servicominternacional.manus.space",
      shipment: {
        orderNumber: "86200073",
        code: "7UGL",
        shipmentType: "encomienda",
        route: "Torino - Lima",
        registeredById: 210001,
        isProvinceDelivery: true,
        destinationAddress: "Terminal Terrestre Municipal, Satipo",
        senderName: "Carlos",
        recipientName: "Maria",
      },
    });

    expect(document.contentHtml).toContain("Terminal Terrestre Municipal, Satipo");
    expect(document.contentHtml).toContain("Agencia de destino seleccionada");
  });
});
