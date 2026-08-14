/** @vitest-environment jsdom */
import { describe, expect, it, vi, afterEach } from "vitest";
import {
  buildReceiptRouteSummaryHtml,
  buildReceiptTicketHtml,
  buildReceiptPrintStyles,
  buildReceiptUrl,
  getPaymentStatusPresentation,
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
    });
    const styles = buildReceiptPrintStyles();

    expect(ticket).toContain('class="ticket"');
    expect(ticket).toContain("CONTROL DE ENTREGA — TORINO, ITALIA");
    expect(ticket).toContain("SEDE DE ENTREGA:</strong> Corso Peschiera");
    expect(ticket).toContain("CELULAR DESTINATARIA:");
    expect(ticket).toContain("REMITENTE:");
    expect(ticket).toContain("NOTAS:");
    expect(ticket).toContain("PRECIO FINAL");
    expect(ticket).toContain("37.50 EUR");
    expect(styles).toContain(".ticket{break-inside:avoid;page-break-inside:avoid");
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
    expect(finalHtml).toContain("República Italiana");
    expect(finalHtml).toContain("Decreto del Presidente de la República N° 309");
    expect(finalHtml).toContain("Guardia di Finanza");
    expect(finalHtml).toContain("Agenzia delle Dogane e dei Monopoli - ADM");
    expect(finalHtml).toContain("Suscrito en la sede de origen de Torino, Italia");
    expect(finalHtml).toContain("Servicom Internacional en colaboración con KASEGA TOUR EIRL (RUC: 20615004708)");
    expect(finalHtml).not.toContain("Suscrito en la ciudad de Lima");
    expect(finalHtml).not.toContain("Ley N° 28002");
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
