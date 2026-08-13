/** @vitest-environment jsdom */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  login: {
    isPending: false,
    mutateAsync: vi.fn().mockResolvedValue({ id: 1, email: "admin@servicom.pe", name: "Operador", role: "registrador" }),
  },
  logout: { isPending: false, mutateAsync: vi.fn() },
  createShipment: { isPending: false, mutateAsync: vi.fn() },
  updateStatus: { isPending: false, mutateAsync: vi.fn() },
  deleteShipment: { isPending: false, mutateAsync: vi.fn() },
  createAdmin: { isPending: false, mutateAsync: vi.fn() },
  deleteAdmin: { isPending: false, mutateAsync: vi.fn() },
  deactivateAdmin: { isPending: false, mutateAsync: vi.fn() },
  refetchShipments: vi.fn(),
  refetchAdminUsers: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    admin: {
      getAllShipments: { useQuery: () => ({ data: [], isLoading: false, refetch: mocks.refetchShipments }) },
      listAdmins: { useQuery: () => ({ data: [], isLoading: false, refetch: mocks.refetchAdminUsers }) },
      login: { useMutation: () => mocks.login },
      logout: { useMutation: () => mocks.logout },
      createShipment: { useMutation: () => mocks.createShipment },
      updateStatus: { useMutation: () => mocks.updateStatus },
      deleteShipment: { useMutation: () => mocks.deleteShipment },
      createAdmin: { useMutation: () => mocks.createAdmin },
      deleteAdmin: { useMutation: () => mocks.deleteAdmin },
      deactivateAdmin: { useMutation: () => mocks.deactivateAdmin },
    },
  },
}));

import AdminDashboard from "./AdminDashboard";

afterEach(() => cleanup());

beforeEach(() => {
  vi.clearAllMocks();
  mocks.login.mutateAsync.mockResolvedValue({ id: 1, email: "admin@servicom.pe", name: "Operador", role: "registrador" });
});

describe("AdminDashboard Nueva Encomienda", () => {
  it("opens without a React loop and switches between document and parcel options", async () => {
    render(<AdminDashboard />);

    fireEvent.change(screen.getByPlaceholderText("Ingresa tu correo administrativo"), { target: { value: "admin@servicom.pe" } });
    fireEvent.change(screen.getByPlaceholderText("Contraseña"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar Sesión" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Nueva Encomienda" })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Nueva Encomienda" }));

    expect(screen.getByText("Tipo de registro")).toBeTruthy();
    expect(screen.getByDisplayValue("Documentos")).toBeTruthy();
    expect(screen.getByText("Tipo de Documento")).toBeTruthy();
    expect(screen.getByText("Precio manual en EUR (opcional)")).toBeTruthy();

    fireEvent.change(screen.getByDisplayValue("Documentos"), { target: { value: "encomienda" } });

    expect(screen.getByText("Peso de la encomienda (kg)")).toBeTruthy();
    expect(screen.getByText("Total automático: 13.50 €")).toBeTruthy();
  });

  it("submits document and parcel payloads through the administrative mutation", async () => {
    mocks.createShipment.mutateAsync
      .mockResolvedValueOnce({ orderNumber: "1234567890", code: "DOC-2026-ABCDE", trackingUrl: "/?order=1234567890&code=DOC-2026-ABCDE" })
      .mockResolvedValueOnce({ orderNumber: "1234567891", code: "ENC-2026-ABCDF", trackingUrl: "/?order=1234567891&code=ENC-2026-ABCDF" });

    render(<AdminDashboard />);
    fireEvent.change(screen.getByPlaceholderText("Ingresa tu correo administrativo"), { target: { value: "admin@servicom.pe" } });
    fireEvent.change(screen.getByPlaceholderText("Contraseña"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar Sesión" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Nueva Encomienda" })).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Nueva Encomienda" }));
    fireEvent.click(screen.getByRole("button", { name: "Crear Encomienda" }));
    await waitFor(() => expect(mocks.createShipment.mutateAsync).toHaveBeenCalledTimes(1));
    expect(mocks.createShipment.mutateAsync.mock.calls[0][0]).toMatchObject({
      shipmentType: "documento",
      docType: "apostillado",
      sheetCount: 1,
      weightKg: 1,
      manualPriceEur: "",
    });

    fireEvent.click(screen.getByRole("button", { name: "Nueva Encomienda" }));
    fireEvent.change(screen.getByDisplayValue("Documentos"), { target: { value: "encomienda" } });
    fireEvent.change(screen.getByDisplayValue("1"), { target: { value: "2.5" } });
    fireEvent.change(screen.getByPlaceholderText("Ej. 75.00"), { target: { value: "40" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear Encomienda" }));

    await waitFor(() => expect(mocks.createShipment.mutateAsync).toHaveBeenCalledTimes(2));
    expect(mocks.createShipment.mutateAsync.mock.calls[1][0]).toMatchObject({
      shipmentType: "encomienda",
      weightKg: 2.5,
      manualPriceEur: "40",
    });
  });
});
