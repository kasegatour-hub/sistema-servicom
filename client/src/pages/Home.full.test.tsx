/** @vitest-environment jsdom */
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const trackedShipment = {
  id: 1,
  orderNumber: "3520992723",
  code: "CA06721WB",
  status: "Entregado",
  paymentStatus: "Pagado",
  finalPriceEur: "65.00",
  shipmentType: "documento",
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

afterEach(() => {
  cleanup();
  delete (trackedShipment as { route?: string }).route;
  (trackedShipment as { shipmentType: string }).shipmentType = "documento";
});

describe("Home public page", () => {
  it("renders the prominent tracking hierarchy and public navigation", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { name: "Sigue tu envío en todo momento" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Rastrear envío/ })).toBeTruthy();
    fireEvent.pointerDown(screen.getByRole("button", { name: "Abrir menú principal" }));
    expect(screen.getByRole("menuitem", { name: "Rastreo" }).getAttribute("href")).toBe("#rastreo");
    expect(screen.getByRole("menuitem", { name: "Ubicación presencial" })).toBeTruthy();
  });

  it("renders large navigation buttons with complete rounded corners", () => {
    render(<Home />);

    fireEvent.pointerDown(screen.getByRole("button", { name: "Abrir menú principal" }));
    for (const label of ["Rastreo", "Ubicación presencial", "App móvil", "Cliente", "Admin"]) {
      const item = screen.getByRole("menuitem", { name: label });
      expect(item.className).toContain("cursor-pointer");
      expect(item.className).toContain("rounded-lg");
      expect(item.className).toContain("font-semibold");
    }
  });

  it("renders Ubícanos with both office cards and all visible contact details", () => {
    render(<Home />);

    fireEvent.pointerDown(screen.getByRole("button", { name: "Abrir menú principal" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Ubicación presencial" }));
    expect(screen.getByRole("heading", { name: "Ubícanos" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Jr. de la Unión 518" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Corso Peschiera" })).toBeTruthy();
    expect(screen.getByText(/Jr\. de la Unión Nro\. 518 Int\. S101/)).toBeTruthy();
    expect(screen.getAllByText(/Corso Peschiera, 162A/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Lunes a sábado, de 10:00 a. m. a 8:30 p. m.")).toBeTruthy();
    expect(screen.getByText("Lunes a sábado, de 9:00 a. m. a 8:30 p. m.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Teléfono fijo 01 390 7269" })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "WhatsApp +51 970 188 447" }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByRole("link", { name: "WhatsApp +51 908 722 617" }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByRole("link", { name: "WhatsApp Torino +39 351 278 7962" }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByRole("link", { name: "WhatsApp Torino +39 350 902 5271" }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByRole("link", { name: "WhatsApp Torino +39 389 766 3723" }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("link", { name: /Abrir Lima en Google Maps/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Abrir Torino en Google Maps/ })).toBeTruthy();
  });

  it("keeps the portada clean while retaining presencial location in the three-dot menu", () => {
    render(<Home />);

    expect(screen.queryByRole("button", { name: "Ver ubicación presencial y más datos" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Ubícanos" })).toBeNull();
    fireEvent.pointerDown(screen.getByRole("button", { name: "Abrir menú principal" }));
    expect(screen.getByRole("menuitem", { name: "Ubicación presencial" })).toBeTruthy();
  });

  it("shows the persisted payment status after the client tracks a shipment", async () => {
    render(<Home />);

    expect(await screen.findByText("Estado de pago")).toBeTruthy();
    expect(screen.getByText("Pagado")).toBeTruthy();
    const paidPrice = screen.getByText("65.00", { exact: false });
    expect(screen.getByText("Precio pagado")).toBeTruthy();
    expect(paidPrice.className).toContain("text-blue-700");
    expect(screen.getByText("Lima - Torino")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Recojo en Torino, Italia" })).toBeTruthy();
    expect(screen.getAllByText(/Corso Peschiera, 162A, Zona Piazza Sabotino/).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByRole("link", { name: /Abrir recibo y firmar/ })).toBeNull();
  });

  it("shows the Lima pickup office for an encomienda that travels from Torino to Lima", () => {
    (trackedShipment as { route?: string }).route = "Torino - Lima";
    (trackedShipment as { shipmentType: string }).shipmentType = "encomienda";
    render(<Home />);

    expect(screen.getByText("Torino - Lima")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Recojo en Lima, Perú" })).toBeTruthy();
    expect(screen.getAllByText(/Jr\. de la Unión Nro\. 518 Int\. S101/).length).toBeGreaterThanOrEqual(1);
  });

  it("limpia orden y código de la URL antes de rastrear otro envío", async () => {
    window.history.replaceState({}, "", "/?order=7482897927&code=DOC-2026-OHU3M");
    render(<Home />);
    fireEvent.click(await screen.findByRole("button", { name: "Buscar otro envío" }));
    expect(window.location.pathname).toBe("/");
    expect(window.location.search).toBe("");
  });
});
