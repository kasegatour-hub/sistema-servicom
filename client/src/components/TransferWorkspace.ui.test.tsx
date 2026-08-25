// @vitest-environment jsdom
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

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
});
