import { describe, expect, it } from "vitest";
import { getPaymentPrintPresentation } from "./paymentPrint";

describe("payment print presentation", () => {
  it("colors only No cancelado red when it is selected", () => {
    expect(getPaymentPrintPresentation("Falta cancelar")).toEqual({
      isPaid: false,
      isPending: true,
      paidColor: "#000000",
      paidBackground: "transparent",
      pendingColor: "#e11d48",
      pendingBackground: "#fff1f2",
    });
  });

  it("colors only Pagado green when it is selected", () => {
    expect(getPaymentPrintPresentation("Pagado")).toEqual({
      isPaid: true,
      isPending: false,
      paidColor: "#059669",
      paidBackground: "#ecfdf5",
      pendingColor: "#000000",
      pendingBackground: "transparent",
    });
  });

  it("keeps both options black and transparent when no payment state is marked", () => {
    expect(getPaymentPrintPresentation(undefined)).toEqual({
      isPaid: false,
      isPending: false,
      paidColor: "#000000",
      paidBackground: "transparent",
      pendingColor: "#000000",
      pendingBackground: "transparent",
    });
  });
});
