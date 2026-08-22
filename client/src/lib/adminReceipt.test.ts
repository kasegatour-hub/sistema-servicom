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
      route: "Lima - Torino",
      managementUrl: "https://servicom.example/admin?order=3289150504&code=07900824&open=update",
    });
    const styles = buildAdminReceiptPrintStyles();

    expect(html).toContain('class="cut-ticket"');
    expect(html).toContain("CONTROL DE ENTREGA — TORINO, ITALIA");
    expect(html).toContain('SEDE DE ENTREGA:</div><div class="value">Corso Peschiera');
    expect(html).toContain("DESTINATARIO:");
    expect(html).toContain("REMITENTE:");
    expect(html).toContain("NOTAS:");
    expect(html).toContain("CHECKLIST:");
    expect(html).toContain('id="deliveryControlQR"');
    expect(html).toContain("ESCANEAR PARA GESTIONAR");
    expect(html).toContain("1 partida registral");
    expect(html).toContain("1 documento apostillado");
    expect(html).toContain("PRECIO FINAL");
    expect(html).toContain("37.50 EUR");
    expect(styles).toContain(".cut-ticket{break-inside:avoid;page-break-inside:avoid");
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
