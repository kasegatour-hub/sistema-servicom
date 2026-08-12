import { describe, expect, it } from "vitest";
import { getKeepTogetherPrintCss, getReceiptTicketPrintCss, KEEP_TOGETHER_PRINT_DECLARATION } from "./printLayout";

describe("print layout", () => {
  it("keeps the delivery ticket together on one printed page", () => {
    expect(getKeepTogetherPrintCss(".cut-ticket")).toBe(`.cut-ticket{${KEEP_TOGETHER_PRINT_DECLARATION}}`);
    expect(KEEP_TOGETHER_PRINT_DECLARATION).toContain("break-inside:avoid");
    expect(KEEP_TOGETHER_PRINT_DECLARATION).toContain("page-break-inside:avoid");
    expect(getReceiptTicketPrintCss(".ticket")).toContain(".ticket{break-inside:avoid;page-break-inside:avoid");
    expect(getReceiptTicketPrintCss(".cut-ticket")).toContain(".cut-ticket{break-inside:avoid;page-break-inside:avoid");
  });
});
