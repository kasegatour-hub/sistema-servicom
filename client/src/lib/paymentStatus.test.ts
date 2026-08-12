import { describe, expect, it } from "vitest";
import { getPaymentStatusUi } from "./paymentStatus";

describe("AccountPage payment status UI", () => {
  it("shows pending payment in red", () => {
    expect(getPaymentStatusUi("Falta cancelar", "Pagará en Italia (Torino)")).toEqual({
      label: "No cancelado",
      badgeClass: "bg-rose-100 text-rose-800",
      isPaid: false,
      paidInLima: false,
    });
  });

  it("shows paid payment in plain black outside Lima", () => {
    expect(getPaymentStatusUi("Pagado", "Pagará en Italia (Torino)")).toEqual({
      label: "Pagado",
      badgeClass: "text-black",
      isPaid: true,
      paidInLima: false,
    });
  });

  it("shows paid in Lima payment in green", () => {
    expect(getPaymentStatusUi("Pagado", "Pagado en Lima (Jr. de la Unión 518)")).toEqual({
      label: "Pagado",
      badgeClass: "bg-emerald-100 text-emerald-800",
      isPaid: true,
      paidInLima: true,
    });
  });
});
