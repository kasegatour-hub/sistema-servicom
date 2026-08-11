import { describe, expect, it } from "vitest";
import { buildTrackingPath, normalizeTrackingValue, SERVICOM_BRAND, TRACKING_QR_OPTIONS } from "../client/src/lib/tracking";

describe("tracking QR helpers", () => {
  it("normalizes spaces and case before building the tracking path", () => {
    expect(buildTrackingPath(" 352 099 2723 ", " ca06721wb ")).toBe(
      "/?order=3520992723&code=CA06721WB",
    );
    expect(normalizeTrackingValue(" ca 06721wb ")).toBe("CA06721WB");
  });

  it("uses the Servicom brand colors for every QR renderer", () => {
    expect(TRACKING_QR_OPTIONS.color).toEqual({
      dark: SERVICOM_BRAND.navy,
      light: SERVICOM_BRAND.light,
    });
  });
});
