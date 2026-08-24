/** @vitest-environment jsdom */
import { describe, expect, it, vi, afterEach } from "vitest";
import {
  buildReceiptRouteSummaryHtml,
  buildReceiptTicketHtml,
  buildReceiptPrintStyles,
  buildReceiptDownloadFilename,
  buildReceiptMarkdown,
  buildReceiptWordHtml,
  buildReceiptUrl,
  buildElectronicSignatureHtml,
  getPaymentStatusPresentation,
  getReceiptBranding,
  printUserShipmentReceipt,
  resolveReceiptAssetUrl,
} from "./userReceipt";

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,qr"),
  },
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("receipt window helpers", () => {
  it("resolves the logo against the published site origin", () => {
    expect(resolveReceiptAssetUrl("/manus-storage/servicom_logo_final_e7ce35aa.png", "https://servicominternacional.manus.space")).toBe(
      "https://servicominternacional.manus.space/manus-storage/servicom_logo_final_e7ce35aa.png",
    );
  });

  it("opens the receipt on a real application route instead of about:blank", () => {
    expect(buildReceiptUrl("https://servicominternacional.manus.space", "7664444504", "DOC-2026-H2NQU")).toBe(
      "https://servicominternacional.manus.space/recibo?order=7664444504&code=DOC-2026-H2NQU",
    );
  });

  it("uses the recipient name and order in the automatic download filename", () => {
    expect(buildReceiptDownloadFilename({
      recipientName: "María José",
      recipientLastName: "Díaz Ojitos",
      orderNumber: "3289150504",
      shipmentType: "documento",
    })).toBe("recibo-documento-maria-jose-diaz-ojitos-orden-3289150504");
    expect(buildReceiptDownloadFilename({
      recipientDisplayName: "Miguel Díaz Ojitos",
      orderNumber: "3289150504",
      shipmentType: "documento",
    })).toBe("recibo-documento-miguel-diaz-ojitos-orden-3289150504");
  });

  it("builds Word and Markdown exports with the recipient, order and tracking data", () => {
    const shipment = {
      orderNumber: "3289150504",
      code: "DOC-2026-XPF2A",
      shipmentType: "documento",
      route: "Lima - Torino",
      senderName: "Ana",
      senderLastName: "Pérez",
      recipientName: "Miguel",
      recipientLastName: "Díaz Ojitos",
      paymentStatus: "Pagado",
      finalPriceEur: "50",
      contentChecklist: ["1 × Acta de nacimiento"],
      notes: "Entregar en agencia",
    };
    const markdown = buildReceiptMarkdown(shipment);
    const word = buildReceiptWordHtml(shipment);

    expect(markdown).toContain("# SERVICOM INTERNACIONAL");
    expect(markdown).toContain("Miguel Díaz Ojitos");
    expect(markdown).toContain("3289150504");
    expect(markdown).toContain("1 × Acta de nacimiento");
    expect(markdown).toContain("?order=3289150504&code=DOC-2026-XPF2A");
    expect(word).toContain("<!doctype html>");
    expect(word).toContain("Miguel Díaz Ojitos");
  });

  it("includes the complete delivery ticket and anti-split rule in the final receipt output", () => {
    const ticket = buildReceiptTicketHtml({
      order: "3289150504",
      code: "07900824",
      recipient: "MIGUEL DIAZ OJITOS",
      recipientPhone: "+39 333 123 456",
      recipientDni: "72918463",
      sender: "ANA PÉREZ",
      senderPhone: "+51 970 188 447",
      senderDni: "70445566",
      notes: "Registro de propiedad inmueble",
      shipmentType: "documento",
      price: { basePriceEur: 50, finalPriceEur: 37.5, discountPercent: 25, discountAmountEur: 12.5 },
      route: "Lima - Torino",
      contentChecklist: ["1 documento apostillado", "<contenido no ejecutable>"],
    });
    const styles = buildReceiptPrintStyles();

    expect(ticket).toContain('class="ticket"');
    expect(ticket).toContain("CONTROL DE ENTREGA — TORINO, ITALIA");
    expect(ticket).toContain("SEDE DE ENTREGA:</strong> Corso Peschiera");
    expect(ticket).toContain("CELULAR DESTINATARIA:");
    expect(ticket).toContain("REMITENTE:");
    expect(ticket).toContain("NOTAS:");
    expect(ticket).toContain("LISTA DE COSAS ENVIADAS:");
    expect(ticket).toContain("1 documento apostillado");
    expect(ticket).toContain("&lt;contenido no ejecutable&gt;");
    expect(ticket).toContain("PRECIO FINAL");
    expect(ticket).toContain("37.50 EUR");
    expect(styles).toContain(".ticket{break-inside:avoid;page-break-inside:avoid");
  });

  it("prints a persisted remote signature in blue with signer metadata", () => {
    const html = buildElectronicSignatureHtml({
      status: "signed",
      signerName: "Ana Pérez",
      signerDni: "70445566",
      signedAt: new Date("2026-08-15T12:00:00.000Z"),
      signatureStrokes: JSON.stringify([[{ x: 10, y: 20 }, { x: 80, y: 40 }]]),
    }, "Remitente", "00000000");
    expect(html).toContain("FIRMADO ELECTRÓNICAMENTE POR");
    expect(html).toContain("Ana Pérez");
    expect(html).toContain("70445566");
    expect(html).toContain('stroke=\"#0B2B5E\"');
    expect(html).toContain("2026");
  });

  it("prints Lima as destination for the reverse route", () => {
    const ticket = buildReceiptTicketHtml({
      order: "8844027727",
      code: "ENC-2026-75ZRD",
      recipient: "Luis Mendoza Castro",
      recipientPhone: "+39 389 766 3723",
      route: "Torino - Lima",
    });

    expect(ticket).toContain("CONTROL DE ENTREGA — LIMA, PERÚ");
    expect(ticket).toContain("<strong>RUTA:</strong> Torino - Lima");
    expect(ticket).toContain("<strong>DESTINO:</strong> LIMA, PERÚ");
    expect(ticket).toContain("<strong>SEDE DE ENTREGA:</strong> Jr. de la Unión 518");
    expect(ticket).not.toContain("<strong>DESTINO:</strong> TORINO, ITALIA");
    const summary = buildReceiptRouteSummaryHtml("Torino - Lima");
    expect(summary).toContain("LIMA, PERÚ");
    expect(summary).toContain("Jr. de la Unión Nro. 518 Int. S101");
    expect(summary).toContain("+51 970 188 447");
    expect(summary).not.toContain("Destino:</span> <span class=\"line\">TORINO, ITALIA");
  });

  it("renders the Italian legal declaration in the complete client receipt for Torino–Lima", async () => {
    const writes: string[] = [];
    const documentRef = {
      readyState: "complete",
      images: [],
      title: "",
      open: vi.fn(),
      write: vi.fn((html: string) => writes.push(html)),
      close: vi.fn(),
    };
    const printWindow = {
      closed: false,
      document: documentRef,
      focus: vi.fn(),
      print: vi.fn(),
      close: vi.fn(),
    } as unknown as Window;
    vi.spyOn(window, "open").mockReturnValue(printWindow);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));

    await printUserShipmentReceipt({
      orderNumber: "8844027727",
      code: "ENC-2026-75ZRD",
      shipmentType: "encomienda",
      route: "Torino - Lima",
      senderName: "Luis",
      senderLastName: "Mendoza",
      senderDni: "72918463",
      recipientName: "Jorge",
      recipientLastName: "Paredes",
      recipientPhone: "+51 945 612 378",
      paymentStatus: "Falta cancelar",
      status: "Por entregar en agencia",
    });

    const finalHtml = writes.at(-1) ?? "";
    expect(finalHtml).toContain("<title>recibo-encomienda-jorge-paredes-orden-8844027727</title>");
    expect(documentRef.title).toBe("recibo-encomienda-jorge-paredes-orden-8844027727");
    expect(finalHtml).toContain("República Italiana");
    expect(finalHtml).toContain("Decreto del Presidente de la República N° 309");
    expect(finalHtml).toContain("Guardia di Finanza");
    expect(finalHtml).toContain("Agenzia delle Dogane e dei Monopoli - ADM");
    expect(finalHtml).toContain("Suscrito en la sede de origen de Torino, Italia");
    expect(finalHtml).toContain("Servicom Internacional");
    expect(finalHtml).not.toContain("Suscrito en la ciudad de Lima");
    expect(finalHtml).not.toContain("Ley N° 28002");
    expect(typeof (printWindow as any).onafterprint).toBe("function");
    (printWindow as any).onafterprint();
    expect(printWindow.close).toHaveBeenCalled();
  });

  it("uses Kasega branding only for Magda's registered email", () => {
    expect(getReceiptBranding({ registeredByEmail: "magda.barreto.alv@gmail.com", registeredById: 210001, route: "Lima - Torino" })).toMatchObject({
      isKasega: true,
      companyName: "KASEGA TOUR",
      destinationAddress: "Via Muriaglio 12, Torino, Italia",
      destinationPhone: "+39 350 818 1599 · +39 371 373 8550",
    });
    expect(getReceiptBranding({ registeredById: 210001, route: "Lima - Torino" }).isKasega).toBe(false);
    expect(getReceiptBranding({ registeredByEmail: "otra@cuenta.com", registeredById: 210001, route: "Lima - Torino" }).isKasega).toBe(false);
  });

  it("uses green only for Pagado and red only for No cancelado", () => {
    expect(getPaymentStatusPresentation("Pagado")).toMatchObject({
      label: "Pagado",
      color: "#059669",
      background: "#ecfdf5",
      isPaid: true,
      isPending: false,
      isMarked: true,
    });
    expect(getPaymentStatusPresentation("Falta cancelar")).toMatchObject({
      label: "No cancelado",
      color: "#e11d48",
      background: "#fff1f2",
      isPaid: false,
      isPending: true,
      isMarked: true,
    });
  });

  it("leaves both payment options black and transparent when no state is marked", () => {
    expect(getPaymentStatusPresentation(undefined)).toMatchObject({
      label: "Sin marcar",
      color: "#000000",
      background: "transparent",
      isPaid: false,
      isPending: false,
      isMarked: false,
    });
  });
});
