/** @vitest-environment jsdom */
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

afterEach(() => cleanup());
import userEvent from "@testing-library/user-event";
import { UpdateShipmentModal } from "./UpdateShipmentModal";

function renderUpdateModal(onClose = vi.fn()) {
  render(
    <UpdateShipmentModal
      open
      onClose={onClose}
      onSubmit={vi.fn()}
      paymentStatus="Falta cancelar"
      registerPaymentStatus={() => ({ name: "paymentStatus" })}
    >
      <input aria-label="Campo de prueba" />
    </UpdateShipmentModal>,
  );
  return onClose;
}

describe("UpdateShipmentModal component", () => {
  it("closes when the visible X is clicked", async () => {
    const user = userEvent.setup();
    const onClose = renderUpdateModal();

    await user.click(screen.getByRole("button", { name: "Cerrar actualización" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes when Cancelar is clicked", async () => {
    const user = userEvent.setup();
    const onClose = renderUpdateModal();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders Pagado and No cancelado in the real payment selector", () => {
    renderUpdateModal();

    expect(screen.getByRole("option", { name: "Pagado" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "No cancelado" })).toBeTruthy();
  });
});
