// @vitest-environment jsdom
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    transfers: {
      list: { useQuery: () => ({ data: [], isLoading: false, refetch: vi.fn() }) },
      create: { useMutation: () => ({ isPending: false, mutate: vi.fn(), error: null }) },
      argenperQuote: { useQuery: () => ({ data: { eurPurchaseRate: 3.79, eurSaleRate: 4.02, adjustedPenPerEur: 4.17, fetchedAt: Date.now(), sourceUrl: "https://www.argenper.com.pe/servicios/cambio-moneda" }, isFetching: false, error: null, refetch: vi.fn() }) },
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
    expect(screen.getByLabelText("Documento de identidad del remitente - tipo de identificación")).toBeTruthy();
    expect(screen.getByLabelText("Documento de identidad del destinatario - tipo de identificación")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /Seleccionar país, Perú/i })).toHaveLength(2);
    expect(screen.getByText("Comisión automática")).toBeTruthy();
    expect(screen.getByText("3.00%")).toBeTruthy();
  });
});
