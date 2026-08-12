import { describe, expect, it } from "vitest";
import { buildAdminDeliveryTicketHtml, buildAdminReceiptPrintStyles } from "./adminReceipt";

describe("administrative receipt ticket", () => {
  it("includes the complete ticket markup and anti-split print rule", () => {
    const html = buildAdminDeliveryTicketHtml({
      order: "3289150504",
      code: "07900824",
      recipient: "MIGUEL DIAZ OJITOS",
      recipientPhone: "+39 333 123 456",
    });
    const styles = buildAdminReceiptPrintStyles();

    expect(html).toContain('class="cut-ticket"');
    expect(html).toContain("CONTROL DE ENTREGA - TORINO, ITALIA");
    expect(html).toContain("CEL. DESTINATARIA:");
    expect(styles).toContain(".cut-ticket{break-inside:avoid;page-break-inside:avoid");
  });
});
