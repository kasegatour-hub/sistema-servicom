import { describe, expect, it } from "vitest";
import { buildShipmentDeliveryStatusPath, buildShipmentManagementPath, buildTrackingPath, normalizeTrackingValue, SERVICOM_BRAND, TRACKING_QR_OPTIONS } from "./tracking";

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

  it("builds a management path that preserves normalized shipment identifiers", () => {
    expect(buildShipmentManagementPath(" 352 099 2723 ", " ca06721wb ")).toBe(
      "/admin?order=3520992723&code=CA06721WB&open=update",
    );
  });

  it("builds a status-first control path that preserves only the scanned shipment identifiers", () => {
    expect(buildShipmentDeliveryStatusPath(" 858 222 4585 ", " enc-2026-jvzu4 ")).toBe(
      "/admin?order=8582224585&code=ENC-2026-JVZU4&open=status",
    );
  });
});
