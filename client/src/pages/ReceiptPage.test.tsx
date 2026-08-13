/** @vitest-environment jsdom */
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const currentRoute = vi.hoisted(() => ({ value: "Lima - Torino" }));

const shipment = {
  orderNumber: "3520992723",
  code: "CA06721WB",
  status: "Por entregar en agencia",
  paymentStatus: "Falta cancelar",
  senderName: "Ana",
  senderLastName: "Pérez",
  recipientName: "Marco",
  recipientLastName: "Rossi",
  recipientPhone: "+39 351 000 000",
};

vi.mock("@/lib/trpc", () => ({
  trpc: {
    shipment: {
      search: {
        useQuery: () => ({ data: { ...shipment, route: currentRoute.value }, isLoading: false, error: null }),
      },
    },
  },
}));

vi.mock("@/lib/userReceipt", () => ({
  printUserShipmentReceipt: vi.fn(),
}));

import ReceiptPage from "./ReceiptPage";

afterEach(() => cleanup());

describe("ReceiptPage", () => {
  it("renders the requested shipment receipt route with a print action", () => {
    window.history.replaceState({}, "", "/recibo?order=3520992723&code=CA06721WB");
    render(<ReceiptPage />);

    expect(screen.getByRole("heading", { name: "Recibo de envío" })).toBeTruthy();
    expect(screen.getByText("3520992723")).toBeTruthy();
    expect(screen.getByText("CA06721WB")).toBeTruthy();
    expect(screen.getByText("No cancelado")).toBeTruthy();
    expect(screen.getByText("Lima - Torino")).toBeTruthy();
    expect(screen.getByText(/TORINO, ITALIA · Corso Peschiera/)).toBeTruthy();
    expect(screen.getByText(/Corso Peschiera, 162A/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Imprimir recibo/ })).toBeTruthy();
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
