import { describe, expect, it } from "vitest";
import { getPaymentStatusUi } from "./paymentStatus";

describe("AccountPage payment status UI", () => {
  it("shows pending payment in red", () => {
    expect(getPaymentStatusUi("Falta cancelar")).toEqual({
      label: "Falta cancelar",
      badgeClass: "bg-rose-100 text-rose-800",
      isPaid: false,
    });
  });

  it("shows paid payment in green", () => {
    expect(getPaymentStatusUi("Pagado")).toEqual({
      label: "Pagado",
      badgeClass: "bg-emerald-100 text-emerald-800",
      isPaid: true,
    });
  });
});
