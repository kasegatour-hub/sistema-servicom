/** @vitest-environment jsdom */
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    shipment: {
      search: {
        useQuery: () => ({ data: undefined, isLoading: false, error: null }),
      },
    },
  },
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
    expect(screen.getByRole("link", { name: "01 390 7269" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "WhatsApp general: +51 970 188 447" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Abrir Lima en Google Maps/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Abrir Torino en Google Maps/ })).toBeTruthy();
  });
});
