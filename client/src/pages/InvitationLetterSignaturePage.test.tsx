// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const letterQuery = vi.hoisted(() => ({ data: { id: 41, status: "pending", inviterName: "ANA ROSSI", inviteeName: "MARIA BIANCHI", signedAt: null } as any, isLoading: false, refetch: vi.fn() }));
const completeMutation = vi.hoisted(() => ({ isPending: false, mutateAsync: vi.fn().mockResolvedValue({ success: true }) }));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    invitationSignature: {
      get: { useQuery: () => letterQuery },
      complete: { useMutation: () => completeMutation },
    },
  },
}));

vi.mock("@/components/ElectronicSignatureDialog", () => ({
  default: ({ open, onSubmit }: { open: boolean; onSubmit: (value: { signatureStrokes: string }) => void }) => open ? <button type="button" onClick={() => onSubmit({ signatureStrokes: "[[0,0],[10,10]]" })}>Confirmar firma simulada</button> : null,
}));

import InvitationLetterSignaturePage from "./InvitationLetterSignaturePage";

describe("InvitationLetterSignaturePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    letterQuery.data = { id: 41, status: "pending", inviterName: "ANA ROSSI", inviteeName: "MARIA BIANCHI", signedAt: null };
    letterQuery.isLoading = false;
    window.history.replaceState({}, "", "/carta-firma?letter=41&token=abcdefghijklmnopqrstuvwxyz123456");
  });
  afterEach(() => cleanup());

  it("muestra la Carta pendiente y completa la firma electrónica", async () => {
    render(<InvitationLetterSignaturePage />);
    expect(screen.getByText("Antes: Carta pendiente de firma")).toBeTruthy();
    expect(screen.getByText("ANA ROSSI")).toBeTruthy();
    expect(screen.getByText("MARIA BIANCHI")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Firmar ahora" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar firma simulada" }));
    await waitFor(() => expect(completeMutation.mutateAsync).toHaveBeenCalledWith({ letterId: 41, token: "abcdefghijklmnopqrstuvwxyz123456", signatureStrokes: "[[0,0],[10,10]]" }));
    expect(letterQuery.refetch).toHaveBeenCalledTimes(1);
  });

  it("muestra un estado claro cuando el enlace no tiene credenciales válidas", () => {
    window.history.replaceState({}, "", "/carta-firma?letter=41&token=corto");
    render(<InvitationLetterSignaturePage />);
    expect(screen.getByText("Enlace de firma no válido")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Firmar ahora" })).toBeNull();
  });
});
