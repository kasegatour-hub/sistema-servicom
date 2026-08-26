// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const shipmentQuery = vi.hoisted(() => ({ data: { id: 81, orderNumber: "0826-0019", code: "7ABC", status: "Por entregar en agencia", shipmentType: "documento", deliveryMode: "remoto", accountId: 42, registeredById: 210001, registeredByEmail: "magda.barreto.alv@gmail.com", senderName: "CARLOS", senderLastName: "ROSSI", recipientName: "MARÍA", recipientLastName: "BIANCHI", route: "Lima - Torino", destinationAddress: "", signature: { status: "pending", signedAt: null } } as any, isLoading: false, refetch: vi.fn() }));
const accountQuery = vi.hoisted(() => ({ data: { id: 42 } as any }));
const completeMutation = vi.hoisted(() => ({ isPending: false, mutateAsync: vi.fn().mockResolvedValue({ success: true }) }));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    shipment: { search: { useQuery: () => shipmentQuery }, completeSignature: { useMutation: () => completeMutation } },
    account: { me: { useQuery: () => accountQuery } },
  },
}));
vi.mock("@/components/ElectronicSignatureDialog", () => ({
  default: ({ open, onSubmit }: { open: boolean; onSubmit: (value: { signatureStrokes: string }) => void }) => open ? <button type="button" onClick={() => onSubmit({ signatureStrokes: "[[0,0],[10,10]]" })}>Confirmar firma simulada</button> : null,
}));

import ShipmentSignaturePage from "./ShipmentSignaturePage";

describe("ShipmentSignaturePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    shipmentQuery.data = { id: 81, orderNumber: "0826-0019", code: "7ABC", status: "Por entregar en agencia", shipmentType: "documento", deliveryMode: "remoto", accountId: 42, registeredById: 210001, registeredByEmail: "magda.barreto.alv@gmail.com", senderName: "CARLOS", senderLastName: "ROSSI", recipientName: "MARÍA", recipientLastName: "BIANCHI", route: "Lima - Torino", destinationAddress: "", signature: { status: "pending", signedAt: null } };
    accountQuery.data = { id: 42 };
    shipmentQuery.isLoading = false;
    window.history.replaceState({}, "", "/envio-firma?order=0826-0019&code=7ABC&token=abcdefghijklmnopqrstuvwxyz123456");
  });
  afterEach(() => cleanup());

  it("muestra Antes y abre la firma igual que Carta de invitación", async () => {
    render(<ShipmentSignaturePage />);
    expect(screen.getByText("Antes: Declaración pendiente de firma")).toBeTruthy();
    expect(screen.getByText("KASEGA TOUR EIRL")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Firmar ahora" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar firma simulada" }));
    await waitFor(() => expect(completeMutation.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ orderNumber: "0826-0019", code: "7ABC", token: "abcdefghijklmnopqrstuvwxyz123456", signatureStrokes: "[[0,0],[10,10]]" })));
    expect(shipmentQuery.refetch).toHaveBeenCalledTimes(1);
  });

  it("permite un enlace manual sin cuenta cuando el envío no tiene accountId", () => {
    shipmentQuery.data = { ...shipmentQuery.data, accountId: null, registeredById: 90001, registeredByEmail: "servicom@example.com" };
    render(<ShipmentSignaturePage />);
    expect(screen.getByRole("button", { name: "Firmar ahora" })).toBeTruthy();
    expect(screen.getAllByText("SERVICOM INTERNACIONAL").length).toBeGreaterThan(0);
  });

  it("bloquea la firma si el enlace corresponde a otra cuenta Cliente", () => {
    accountQuery.data = { id: 99 };
    render(<ShipmentSignaturePage />);
    expect(screen.queryByRole("button", { name: "Firmar ahora" })).toBeNull();
    expect(screen.getByText(/requiere la cuenta Cliente vinculada/)).toBeTruthy();
  });
});
