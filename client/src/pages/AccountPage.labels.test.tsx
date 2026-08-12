/** @vitest-environment jsdom */
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const mutation = vi.hoisted(() => () => ({ mutate: vi.fn(), isPending: false }));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ account: { me: { invalidate: vi.fn() } } }),
    account: {
      me: { useQuery: () => ({ data: { email: "cliente@example.com", name: "Ana", lastName: "López", dni: "71234567", phone: "+51 970188447" }, isLoading: false }) },
      myShipments: { useQuery: () => ({ data: [], refetch: vi.fn() }) },
      register: { useMutation: mutation },
      login: { useMutation: mutation },
      logout: { useMutation: mutation },
      updateProfile: { useMutation: mutation },
      changePassword: { useMutation: mutation },
      createMyShipment: { useMutation: mutation },
      requestPasswordReset: { useMutation: mutation },
      resetPassword: { useMutation: mutation },
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
});
