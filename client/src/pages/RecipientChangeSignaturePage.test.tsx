// @vitest-environment jsdom
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  data: null as any,
  isLoading: false,
  complete: { isPending: false, mutateAsync: vi.fn() },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    recipientChangeSignature: {
      get: { useQuery: () => ({ data: mocks.data, isLoading: mocks.isLoading, refetch: vi.fn() }) },
      complete: { useMutation: () => mocks.complete },
    },
  },
}));

vi.mock("@/components/ElectronicSignatureDialog", () => ({ default: () => null }));

import RecipientChangeSignaturePage from "./RecipientChangeSignaturePage";

beforeEach(() => {
  mocks.data = null;
  mocks.isLoading = false;
  window.history.replaceState({}, "", "/cambio-destinatario?solicitud=44&token=cambio-destinatario-token-seguro-1234567890");
});

describe("RecipientChangeSignaturePage", () => {
  it("presenta un error comprensible cuando la solicitud no existe o el enlace venció", () => {
    render(<RecipientChangeSignaturePage />);
    expect(screen.getByRole("heading", { name: "No se pudo abrir la solicitud" })).toBeTruthy();
    expect(screen.getByText("El enlace pudo haber vencido. Solicita uno nuevo a la agencia.")).toBeTruthy();
  });
});
