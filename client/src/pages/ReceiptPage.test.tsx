/** @vitest-environment jsdom */
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const currentRoute = vi.hoisted(() => ({ value: "Lima - Torino" }));
const signatureMocks = vi.hoisted(() => ({
  request: vi.fn().mockResolvedValue({ status: "pending", token: "signature-token-12345678901234567890", expiresAt: new Date("2026-08-15T16:30:00.000Z") }),
  complete: vi.fn(),
  refetch: vi.fn(),
}));

const shipment = {
  orderNumber: "3520992723",
  code: "CA06721WB",
  status: "Por entregar en agencia",
  paymentStatus: "Falta cancelar",
  senderName: "Ana",
  senderLastName: "Pérez",
  senderPhone: "51970188447",
  recipientName: "Marco",
  recipientLastName: "Rossi",
  recipientPhone: "+39 351 000 000",
  deliveryMode: "remoto",
};

vi.mock("@/lib/trpc", () => ({
  trpc: {
    shipment: {
      search: {
        useQuery: () => ({ data: { ...shipment, route: currentRoute.value }, isLoading: false, error: null, refetch: signatureMocks.refetch }),
      },
      requestSignature: { useMutation: () => ({ isPending: false, mutateAsync: signatureMocks.request }) },
      completeSignature: { useMutation: () => ({ isPending: false, mutateAsync: signatureMocks.complete }) },
    },
  },
}));

vi.mock("@/lib/userReceipt", () => ({
  printUserShipmentReceipt: vi.fn(),
}));

import ReceiptPage from "./ReceiptPage";

afterEach(() => cleanup());

describe("ReceiptPage", () => {
  it("renders the requested shipment receipt route with a print action", async () => {
    window.history.replaceState({}, "", "/recibo?order=3520992723&code=CA06721WB");
    render(<ReceiptPage />);

    expect(screen.getByRole("heading", { name: "Recibo de envío" })).toBeTruthy();
    expect(screen.getByText("3520992723")).toBeTruthy();
    expect(screen.getByText("CA06721WB")).toBeTruthy();
    expect(screen.getByText("No cancelado")).toBeTruthy();
    expect(screen.getByText("+51 970 188 447")).toBeTruthy();
    expect(screen.getByText("+39 351 000 000")).toBeTruthy();
    expect(screen.getByText("Lima - Torino")).toBeTruthy();
    expect(screen.getByText(/TORINO, ITALIA · Corso Peschiera/)).toBeTruthy();
    expect(screen.getByText(/Corso Peschiera, 162A/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Imprimir recibo/ })).toBeTruthy();
    const signButton = screen.getByRole("button", { name: /Firmar electrónicamente/ });
    expect(signButton).toBeTruthy();
    fireEvent.click(signButton);
    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
    expect(signatureMocks.request).toHaveBeenCalledWith({ orderNumber: "3520992723", code: "CA06721WB" });
    expect(screen.getByRole("heading", { name: "Firma electrónica del cliente" })).toBeTruthy();
  });

  it("renders Lima as the destination for a Torino–Lima receipt", () => {
    currentRoute.value = "Torino - Lima";
    window.history.replaceState({}, "", "/recibo?order=8844027727&code=ENC-2026-75ZRD");
    render(<ReceiptPage />);

    expect(screen.getByText("Torino - Lima")).toBeTruthy();
    expect(screen.getByText("Origen:").parentElement?.textContent).toContain("TORINO, ITALIA · Corso Peschiera");
    expect(screen.getByText("Destino:").parentElement?.textContent).toContain("LIMA, PERÚ · Jr. de la Unión 518");
    expect(screen.getByText(/Jr. de la Unión Nro. 518 Int. S101/)).toBeTruthy();
  });
});
