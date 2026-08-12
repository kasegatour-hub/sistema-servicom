import { describe, expect, it } from "vitest";
import { buildReceiptUrl, resolveReceiptAssetUrl } from "./userReceipt";

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
});
