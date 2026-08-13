import { describe, expect, it } from "vitest";
import { buildReceiptTicketHtml, buildReceiptPrintStyles, buildReceiptUrl, getPaymentStatusPresentation, resolveReceiptAssetUrl } from "./userReceipt";

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
    });
    const styles = buildReceiptPrintStyles();

    expect(ticket).toContain('class="ticket"');
    expect(ticket).toContain("CONTROL DE ENTREGA — TORINO, ITALIA");
    expect(ticket).toContain("CELULAR DESTINATARIA:");
    expect(styles).toContain(".ticket{break-inside:avoid;page-break-inside:avoid");
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
