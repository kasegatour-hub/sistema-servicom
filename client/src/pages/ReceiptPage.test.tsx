/** @vitest-environment jsdom */
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

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
        useQuery: () => ({ data: shipment, isLoading: false, error: null }),
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
    expect(screen.getByRole("button", { name: /Imprimir recibo/ })).toBeTruthy();
  });
});
