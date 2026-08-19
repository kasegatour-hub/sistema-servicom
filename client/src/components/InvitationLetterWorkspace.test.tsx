// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const translationMutation = vi.hoisted(() => ({ isPending: false, mutate: vi.fn(), onSuccess: undefined as undefined | ((value: any) => void) }));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    admin: {
      translateInvitationLetter: { useMutation: (options?: { onSuccess?: (value: any) => void }) => { translationMutation.onSuccess = options?.onSuccess; return translationMutation; } },
    },
  },
}));

import { InvitationLetterWorkspace } from "./InvitationLetterWorkspace";

afterEach(() => cleanup());
beforeEach(() => { vi.clearAllMocks(); translationMutation.onSuccess = undefined; });

describe("InvitationLetterWorkspace", () => {
  it("normalizes searchable places and nationalities to uppercase and requires saving before export", () => {
    render(<InvitationLetterWorkspace />);

    const birthPlace = screen.getAllByLabelText(/Lugar de nacimiento/)[0] as HTMLInputElement;
    const nationality = screen.getAllByLabelText(/Nacionalidad/)[0] as HTMLInputElement;
    fireEvent.change(birthPlace, { target: { value: "lima" } });
    fireEvent.change(nationality, { target: { value: "peruana" } });

    expect(birthPlace.value).toBe("LIMA");
    expect(nationality.value).toBe("PERUANA");
    expect(screen.getByText("PERUANA")).toBeTruthy();
    expect(screen.queryByText("Dirección de hospedaje")).toBeNull();
    expect(screen.queryByText("Otros anexos")).toBeNull();
    expect((screen.getByRole("button", { name: /Descargar carta PDF/ }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: /Imprimir carta/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getAllByText(/Correo \/ E-mail/).length).toBeGreaterThan(0);
  });

  it("enables export actions only after the validated draft is saved", async () => {
    render(<InvitationLetterWorkspace />);
    const fill = (id: string, value: string) => fireEvent.change(document.getElementById(id) as HTMLInputElement, { target: { value } });
    fill("invitante-firstName", "Ana"); fill("invitante-lastName", "Rossi"); fill("invitante-nacimiento", "1970-01-01"); fill("invitante-lugar", "Lima"); fill("invitante-nacionalidad", "Peruana"); fill("invitante-identityCard", "AA12345BB"); fill("invitante-passport", "AB123456"); fill("invitante-residencePermit", "Permiso"); fill("invitante-occupation", "Comerciante"); fill("invitante-address", "Via Muriaglio 12");
    fill("invitado-firstName", "Maria"); fill("invitado-lastName", "Bianchi"); fill("invitado-nacimiento", "1995-01-01"); fill("invitado-lugar", "Lima"); fill("invitado-nacionalidad", "Peruana"); fill("invitado-identityCard", "AA12345BB"); fill("invitado-passport", "AB123456"); fill("invitado-occupation", "Estudiante"); fill("invitado-address", "Lima Peru");
    fireEvent.change(screen.getAllByLabelText("Número de teléfono")[0], { target: { value: "970188447" } });
    fireEvent.change(screen.getAllByLabelText("Número de teléfono")[1], { target: { value: "908722617" } });
    fill("invitation-arrival", "2026-09-01"); fill("invitation-departure", "2026-09-30");

    fireEvent.click(screen.getByRole("button", { name: /Guardar borrador/ }));
    await waitFor(() => expect(translationMutation.mutate).toHaveBeenCalledTimes(1));
    translationMutation.onSuccess?.({ inviter: { birthPlace: "LIMA", nationality: "PERUVIANA", residencePermit: "PERMESSO", address: "VIA MURIAGLIO 12", occupation: "COMMERCIANTE" }, invitee: { birthPlace: "LIMA", nationality: "PERUVIANA", address: "LIMA, PERÙ", occupation: "STUDENTESSA" }, relationship: "FAMILIARE", purpose: "TURISMO", city: "TORINO" });

    await waitFor(() => expect((screen.getByRole("button", { name: /Descargar carta PDF/ }) as HTMLButtonElement).disabled).toBe(false));
    expect((screen.getByRole("button", { name: /Imprimir carta/ }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByRole("status").textContent).toMatch(/Borrador guardado/);
  });
});
