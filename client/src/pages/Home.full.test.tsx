/** @vitest-environment jsdom */
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const trackedShipment = {
  id: 1,
  orderNumber: "3520992723",
  code: "CA06721WB",
  status: "Entregado",
  paymentStatus: "Pagado",
  events: [],
  createdAt: new Date("2026-08-12T12:00:00Z"),
  updatedAt: new Date("2026-08-12T12:00:00Z"),
};

vi.mock("@/lib/trpc", () => ({
  trpc: {
    shipment: {
      search: {
        useQuery: () => ({ data: trackedShipment, isLoading: false, error: null }),
      },
    },
  },
}));

vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,test") },
}));

vi.mock("@/components/QRScanner", () => ({
  QRScanner: () => null,
}));

vi.mock("@/components/ShipmentTimeline", () => ({
  ShipmentTimeline: () => null,
}));

import Home from "./Home";

afterEach(() => cleanup());

describe("Home public page", () => {
  it("renders Ubícanos with both office cards and all visible contact details", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { name: "Ubícanos" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Jr. de la Unión 518" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Corso Peschiera" })).toBeTruthy();
    expect(screen.getByText(/Jr\. de la Unión Nro\. 518 Int\. S101/)).toBeTruthy();
    expect(screen.getByText(/Corso Peschiera, 162A/)).toBeTruthy();
    expect(screen.getByText("Lunes a sábado, de 10:00 a. m. a 8:30 p. m.")).toBeTruthy();
    expect(screen.getByText("Lunes a sábado, de 9:00 a. m. a 8:30 p. m.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Teléfono fijo 01 390 7269" })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "WhatsApp +51 970 188 447" }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByRole("link", { name: "WhatsApp +51 908 722 617" }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByRole("link", { name: "WhatsApp Torino +39 351 278 7962" }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByRole("link", { name: "WhatsApp Torino +39 350 902 5271" }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("link", { name: /Abrir Lima en Google Maps/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Abrir Torino en Google Maps/ })).toBeTruthy();
  });

  it("shows the persisted payment status after the client tracks a shipment", async () => {
    render(<Home />);

    expect(await screen.findByText("Estado de Pago")).toBeTruthy();
    expect(screen.getByText("Pagado")).toBeTruthy();
  });
});
