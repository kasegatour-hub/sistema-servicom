import { describe, expect, it } from "vitest";
import { buildAdminDeclarationHtml, buildAdminDeliveryTicketHtml, buildAdminReceiptPrintStyles, buildAdminRouteSummaryHtml } from "./adminReceipt";

describe("administrative receipt ticket", () => {
  it("includes the complete ticket markup and anti-split print rule", () => {
    const html = buildAdminDeliveryTicketHtml({
      order: "3289150504",
      code: "07900824",
      recipient: "MIGUEL DIAZ OJITOS",
      recipientPhone: "+39 333 123 456",
      recipientDni: "72918463",
      sender: "ANA PÉREZ",
      senderPhone: "+51 970 188 447",
      senderDni: "70445566",
      notes: "Registro de propiedad inmueble",
      contentChecklist: ["1 partida registral", "1 documento apostillado"],
      shipmentType: "documento",
      price: { basePriceEur: 50, finalPriceEur: 37.5, discountPercent: 25, discountAmountEur: 12.5 },
      paymentStatus: "Pagado",
      route: "Lima - Torino",
      managementUrl: "https://servicom.example/admin?order=3289150504&code=07900824&open=update",
    });
    const styles = buildAdminReceiptPrintStyles();

    expect(html).toContain('class="cut-ticket ticket-delivery-control"');
    expect(html).toContain("CONTROL DE ENTREGA — TORINO, ITALIA");
    expect(html).toContain('SEDE DE ENTREGA:</div><div class="value">Corso Peschiera');
    expect(html).toContain("DESTINATARIO:");
    expect(html).toContain("REMITENTE:");
    expect(html).toContain("NOTAS:");
    expect(html).toContain("CHECKLIST:");
    expect(html).toContain('id="deliveryControlQR"');
    expect(html).toContain('width="174" height="174"');
    expect(html).toContain('class="ticket-qr-zone"');
    expect(html).toContain("ESCANEAR PARA GESTIONAR");
    expect(html).toContain("1 partida registral");
    expect(html).toContain("1 documento apostillado");
    expect(html).toContain("PRECIO FINAL");
    expect(html).toContain("ESTADO DE PAGO:");
    expect(html).toContain(">Pagado</strong>");
    expect(html).toContain("€ 37.50");
    expect(styles).toContain(".cut-ticket{break-inside:avoid;page-break-inside:avoid");
    expect(styles).toContain("min-height:200mm");
    expect(styles).toContain("width:46mm!important;height:46mm!important");
  });

  it("renders No cancelado in the delivery ticket when payment is pending", () => {
    const html = buildAdminDeliveryTicketHtml({
      order: "8844027727",
      code: "ENC-2026-75ZRD",
      recipient: "Luis Mendoza Castro",
      recipientPhone: "+39 389 766 3723",
      shipmentType: "encomienda",
      route: "Torino - Lima",
      paymentStatus: "Falta cancelar",
    });

    expect(html).toContain("ESTADO DE PAGO:");
    expect(html).toContain(">No cancelado</strong>");
  });

  it("prints Lima as delivery destination for a Torino–Lima shipment", () => {
    const html = buildAdminDeliveryTicketHtml({
      order: "8844027727",
      code: "ENC-2026-75ZRD",
      recipient: "Luis Mendoza Castro",
      recipientPhone: "+39 389 766 3723",
      shipmentType: "encomienda",
      route: "Torino - Lima",
    });

    expect(html).toContain("CONTROL DE ENTREGA — LIMA, PERÚ");
    expect(html).toContain('RUTA:</div><div class="value">Torino - Lima');
    expect(html).toContain('DESTINO:</div><div class="value">LIMA, PERÚ');
    expect(html).toContain('SEDE DE ENTREGA:</div><div class="value">Jr. de la Unión 518');
    expect(html).toContain("Jr. de la Unión Nro. 518 Int. S101");
    expect(html).not.toContain('DESTINO:</div><div class="value">TORINO, ITALIA');
    const summary = buildAdminRouteSummaryHtml("Torino - Lima");
    expect(summary).toContain("LIMA, PERÚ");
    expect(summary).toContain("Jr. de la Unión Nro. 518 Int. S101");
    expect(summary).not.toContain("TORINO, ITALIA</div>");
  });

  it("renders the provincial dispatch ticket and the controlled client PIN for Torino–Lima", () => {
    const html = buildAdminDeliveryTicketHtml({
      order: "12345678",
      code: "7ABC",
      recipient: "Teresa Díaz",
      recipientPhone: "+39 389 766 3723",
      shipmentType: "encomienda",
      route: "Torino - Lima",
      destinationAddress: "Av. Principal 123, Chimbote",
      isProvinceDelivery: true,
      provinceCarrier: "olva",
    });
    expect(html).toContain("TICKET PARA ENVÍO A PROVINCIA");
    expect(html).toContain("Olva Courier");
    expect(html).toContain("CLAVE CLIENTE:");
    expect(html).toContain("3723");
    expect(html).toContain("Av. Principal 123, Chimbote");
  });

  it("includes the institutional logo, RUC and provincial sender snapshot", () => {
    const html = buildAdminDeliveryTicketHtml({
      order: "63002265",
      code: "0GBU",
      recipient: "AMADOR GUTIERREZ CORDOVA",
      recipientPhone: "+39 350 902 5271",
      sender: "MAGDA BARRETO",
      senderPhone: "+39 371 373 8550",
      senderDni: "12345678",
      provinceSenderName: "GIAN MARCO ARTEAGA",
      provinceSenderLastName: "ALVAREZ",
      provinceSenderDni: "74410344",
      provinceSenderPhone: "+51 970 188 447",
      shipmentType: "encomienda",
      route: "Torino - Lima",
      isProvinceDelivery: true,
      provinceCarrier: "shalom",
    });
    expect(html).toContain("servicom_logo_final_e7ce35aa.png");
    expect(html).toContain("RUC 20615004708");
    expect(html).toContain("REMITENTE PROVINCIAL:");
    expect(html).toContain("GIAN MARCO ARTEAGA ALVAREZ");
    expect(html).toContain("74410344");
  });

  it("shows the Lima–Torino security restriction when encomiendas are disabled", () => {
    const html = buildAdminDeliveryTicketHtml({
      order: "3289150504",
      code: "DOC-2026-SECURE",
      recipient: "María Rossi",
      recipientPhone: "+39 389 766 3723",
      shipmentType: "documento",
      route: "Lima - Torino",
      limaTorinoEncomiendasEnabled: false,
    });

    expect(html).toContain("AVISO DE SEGURIDAD");
    expect(html).toContain("Las encomiendas Lima – Torino están restringidas temporalmente");
    expect(html).toContain("Esta ruta solo admite documentos");
  });

  it("renders current shipment and payment status in the declaration", () => {
    const html = buildAdminDeclarationHtml({
      sender: "Ana Pérez",
      senderDni: "70445566",
      order: "0926-0001",
      token: "TOKEN-ACTUAL",
      today: "3 de septiembre de 2026",
      route: "Torino - Lima",
      shipmentStatus: "Alerta",
      paymentStatus: "Pagado",
    });

    expect(html).toContain("Estado actual del envío:");
    expect(html).toContain("Alerta");
    expect(html).toContain("Estado de pago:");
    expect(html).toContain("Pagado");
  });

  it("renders the Italian declaration and institutional signature for Torino–Lima", () => {
    const html = buildAdminDeclarationHtml({
      sender: "Luis Mendoza",
      senderDni: "72918463",
      order: "8844027727",
      token: "TOKEN-IT",
      today: "12 de agosto de 2026",
      route: "Torino - Lima",
    });

    expect(html).toContain("República Italiana");
    expect(html).toContain("Decreto del Presidente de la República N° 309");
    expect(html).toContain("Guardia di Finanza");
    expect(html).toContain("Agenzia delle Dogane e dei Monopoli - ADM");
    expect(html).toContain("Suscrito en la sede de origen de Torino, Italia, el 12 de agosto de 2026");
    expect(html).toContain("Servicom Internacional");
    expect(html).not.toContain("Suscrito en la ciudad de Lima");
    expect(html).not.toContain("Ley N° 28002");
  });
});
