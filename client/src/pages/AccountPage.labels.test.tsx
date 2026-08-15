/** @vitest-environment jsdom */
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mutation = vi.hoisted(() => () => ({ mutate: vi.fn(), isPending: false }));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ account: { me: { invalidate: vi.fn() } } }),
    account: {
      me: { useQuery: () => ({ data: { email: "cliente@example.com", name: "Ana", lastName: "López", dni: "71234567", phone: "+51 970188447", reauthRequired: false }, isLoading: false }) },
      myShipments: { useQuery: () => ({ data: [], refetch: vi.fn() }) },
      myDeletedShipments: { useQuery: () => ({ data: [], refetch: vi.fn() }) },
      deleteMyShipment: { useMutation: mutation },
      restoreMyShipment: { useMutation: mutation },
      register: { useMutation: mutation },
      login: { useMutation: mutation },
      logout: { useMutation: mutation },
      reauthenticate: { useMutation: mutation },
      updateProfile: { useMutation: mutation },
      changePassword: { useMutation: mutation },
      createMyShipment: { useMutation: mutation },
      requestPasswordReset: { useMutation: mutation },
      resetPassword: { useMutation: mutation },
    },
    analytics: {
      myInsights: { useQuery: () => ({ data: null }) },
    },
  },
}));

import AccountPage from "./AccountPage";

afterEach(() => cleanup());

describe("AccountPage client labels", () => {
  it("uses Nuevo Documento instead of Nueva Encomienda", () => {
    render(<AccountPage />);

    expect(screen.getByRole("button", { name: /Registrar Nuevo Documento/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Registrar Nueva Encomienda/ })).toBeNull();
  });

  it("shows the two shipment route options when the client starts a document registration", async () => {
    render(<AccountPage />);
    fireEvent.click(screen.getByRole("button", { name: /Registrar Nuevo Documento/ }));

    await waitFor(() => expect(screen.getByRole("combobox", { name: "Ruta de envío" })).toBeTruthy());
    const routeSelect = screen.getByRole("combobox", { name: "Ruta de envío" });
    expect(routeSelect).toBeTruthy();
    expect(screen.getByRole("option", { name: "Lima – Torino" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Torino – Lima" })).toBeTruthy();
  });
});
