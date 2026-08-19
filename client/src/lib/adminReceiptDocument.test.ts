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
});
