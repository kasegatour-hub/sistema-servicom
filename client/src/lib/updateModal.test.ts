import { describe, expect, it } from "vitest";
import { closeUpdateModal, UPDATE_PAYMENT_OPTIONS } from "./updateModal";

describe("update modal contract", () => {
  it("closes from X or Cancelar by clearing visibility and selection", () => {
    expect(closeUpdateModal()).toEqual({ showUpdateForm: false, selectedShipmentId: null });
  });

  it("exposes the two payment choices shown by the modal", () => {
    expect(UPDATE_PAYMENT_OPTIONS).toEqual([
      { value: "Falta cancelar", label: "No cancelado" },
      { value: "Pagado", label: "Pagado" },
    ]);
  });
});
