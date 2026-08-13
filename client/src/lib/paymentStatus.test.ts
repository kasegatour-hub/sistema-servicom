import { describe, expect, it } from "vitest";
import { getPaymentStatusUi } from "./paymentStatus";

describe("AccountPage payment status UI", () => {
  it("shows pending payment in red", () => {
    expect(getPaymentStatusUi("Falta cancelar")).toEqual({
      label: "No cancelado",
      badgeClass: "bg-rose-100 text-rose-800",
      isPaid: false,
      isPending: true,
      isMarked: true,
    });
  });

  it("shows paid payment in green", () => {
    expect(getPaymentStatusUi("Pagado")).toEqual({
      label: "Pagado",
      badgeClass: "bg-emerald-100 text-emerald-800",
      isPaid: true,
      isPending: false,
      isMarked: true,
    });
  });

  it("leaves an unmarked payment black and without a background", () => {
    expect(getPaymentStatusUi(undefined)).toEqual({
      label: "Sin marcar",
      badgeClass: "bg-transparent text-slate-900",
      isPaid: false,
      isPending: false,
      isMarked: false,
    });
  });
});
