/** @vitest-environment jsdom */
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

afterEach(() => cleanup());
import userEvent from "@testing-library/user-event";
import { UpdateShipmentModal } from "./UpdateShipmentModal";
import { useForm } from "react-hook-form";
import { digitsRegisterOptions, textRegisterOptions } from "@/pages/AdminDashboard";

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

function ValidationModalHarness({ senderName = "", senderLastName = "", senderDni = "" }: { senderName?: string; senderLastName?: string; senderDni?: string }) {
  const form = useForm({ defaultValues: { senderName, senderLastName, senderDni } });

  return (
    <UpdateShipmentModal
      open
      onClose={vi.fn()}
      onSubmit={vi.fn()}
      paymentStatus="Falta cancelar"
      registerPaymentStatus={() => ({ name: "paymentStatus" })}
    >
      <label>
        Nombre del remitente
        <input {...form.register("senderName", textRegisterOptions(form, "senderName", "El nombre"))} />
      </label>
      <label>
        Apellido del remitente
        <input {...form.register("senderLastName", textRegisterOptions(form, "senderLastName", "El apellido"))} />
      </label>
      <label>
        DNI del remitente
        <input {...form.register("senderDni", digitsRegisterOptions(form, "senderDni"))} />
      </label>
      {form.formState.errors.senderName?.message && <p>{String(form.formState.errors.senderName.message)}</p>}
      {form.formState.errors.senderLastName?.message && <p>{String(form.formState.errors.senderLastName.message)}</p>}
      {form.formState.errors.senderDni?.message && <p>{String(form.formState.errors.senderDni.message)}</p>}
    </UpdateShipmentModal>
  );
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

  it("does not show inline errors when the modal opens with valid preloaded identity data", () => {
    render(<ValidationModalHarness senderName="  María José  " senderLastName="  Pérez  " senderDni=" 71234567 " />);

    expect(screen.queryByText("El nombre solo puede contener letras y espacios.")).toBeNull();
    expect(screen.queryByText("El apellido solo puede contener letras y espacios.")).toBeNull();
    expect(screen.queryByText("El DNI solo puede contener números.")).toBeNull();
  });

  it("clears an inline error after the invalid field is corrected", async () => {
    const user = userEvent.setup();
    render(<ValidationModalHarness />);
    const nameInput = screen.getByRole("textbox", { name: "Nombre del remitente" });

    await user.type(nameInput, "Ana3");
    expect(screen.getByText("El nombre solo puede contener letras y espacios.")).toBeTruthy();

    await user.clear(nameInput);
    await user.type(nameInput, "Ana");
    await waitFor(() => expect(screen.queryByText("El nombre solo puede contener letras y espacios.")).toBeNull());
  });
});
