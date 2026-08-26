// @vitest-environment jsdom
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

const quoteState = {
  data: { eurPurchaseRate: 3.79, eurSaleRate: 4.02, adjustedPenPerEur: 4.17, fetchedAt: Date.now(), sourceUrl: "https://www.argenper.com.pe/servicios/cambio-moneda" },
  isFetching: false,
  error: null as Error | null,
};

vi.mock("@/lib/trpc", () => ({
  trpc: {
    transfers: {
      list: { useQuery: () => ({ data: [], isLoading: false, refetch: vi.fn() }) },
      create: { useMutation: () => ({ isPending: false, mutate: vi.fn(), error: null }) },
      argenperQuote: { useQuery: () => ({ ...quoteState, refetch: vi.fn() }) },
    },
  },
}));

import { TransferWorkspace } from "./TransferWorkspace";

describe("TransferWorkspace", () => {
  it("usa los mismos controles de identidad y teléfono que los envíos y muestra la comisión EUR a EUR", () => {
    render(<TransferWorkspace />);
    expect(screen.getByText("Ruta de transferencia *")).toBeTruthy();
    expect(screen.getByText("Selecciona la ruta para ver la sede de origen y la sede de destino correctas.")).toBeTruthy();
    expect(screen.queryByText("Sede regular")).toBeNull();
    expect(screen.queryByText("Ciudad de origen")).toBeNull();
    expect(screen.getByLabelText("Modalidad de pago")).toBeTruthy();
    expect(screen.getByLabelText("Documento de identidad del remitente - tipo de identificación")).toBeTruthy();
    expect(screen.getByLabelText("Documento de identidad del destinatario - tipo de identificación")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /Seleccionar país, Perú/i })).toHaveLength(2);
    expect(screen.getByText("Comisión automática")).toBeTruthy();
    expect(screen.getByText("3.00%")).toBeTruthy();
  });

  it("conserva una cotización válida sin mostrar un error de actualización contradictorio", async () => {
    quoteState.error = new Error("fallo transitorio");
    render(<TransferWorkspace initialForm={{ currency: "PEN", destinationCurrency: "EUR", exchangeRateSource: "argenper", exchangeRate: "4.17" }} />);

    expect(screen.getByDisplayValue("4.17")).toBeTruthy();
    expect(screen.getByText("Cotización Argemper aplicada")).toBeTruthy();
    expect(screen.queryByText(/No fue posible actualizar Argenper/)).toBeNull();
    quoteState.error = null;
  });

  it("muestra soles como moneda recibida cuando se selecciona una conversión EUR a PEN", () => {
    const view = render(<TransferWorkspace initialForm={{ currency: "EUR", destinationCurrency: "PEN", amountSent: "100", exchangeRate: "4.15", exchangeRateSource: "manual" }} />);
    const content = within(view.container);
    expect(content.getByLabelText("Moneda que recibe")).toBeTruthy();
    expect(content.getByText("415.00 PEN")).toBeTruthy();
  });

  it("usa identidad verde y divide el registro móvil de transferencias en pasos", () => {
    const { container } = render(<TransferWorkspace mobileRegistrationMode />);
    const view = within(container);

    const transferHeading = view.getAllByText("Transferencia").find(element => element.tagName === "H2");
    expect(transferHeading?.className).toContain("text-emerald-950");
    expect(view.getByRole("region", { name: "Pasos de transferencia móvil" })).toBeTruthy();
    expect(view.getAllByText("Ruta de transferencia *").length).toBeGreaterThan(0);
    expect(view.queryByText("Remitente")).toBeNull();

    fireEvent.click(view.getByRole("button", { name: "Personas" }));
    expect(view.getByText("Remitente")).toBeTruthy();
    expect(view.queryByText("Datos de transferencia")).toBeNull();

    fireEvent.click(view.getByRole("button", { name: "Importe" }));
    expect(view.getByText("Datos de transferencia")).toBeTruthy();
    expect(view.queryByText("Remitente")).toBeNull();
  });
});
