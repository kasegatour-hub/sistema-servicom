// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const translationMutation = vi.hoisted(() => ({ isPending: false, mutate: vi.fn(), onSuccess: undefined as undefined | ((value: any) => void) }));
const saveMutation = vi.hoisted(() => ({ isPending: false, mutate: vi.fn(), onSuccess: undefined as undefined | ((value: any, variables: any) => void) }));
const lettersQuery = vi.hoisted(() => ({ data: [] as any[], isLoading: false, refetch: vi.fn() }));
const deletedLettersQuery = vi.hoisted(() => ({ data: [] as any[], isLoading: false, refetch: vi.fn() }));
const peopleSearchQuery = vi.hoisted(() => ({ data: [] as any[], isFetching: false }));
const deleteMutation = vi.hoisted(() => ({ isPending: false, mutate: vi.fn(), onSuccess: undefined as undefined | ((value: any) => void) }));
const restoreMutation = vi.hoisted(() => ({ isPending: false, mutate: vi.fn(), onSuccess: undefined as undefined | ((value: any) => void) }));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    admin: {
      translateInvitationLetter: { useMutation: (options?: { onSuccess?: (value: any) => void }) => { translationMutation.onSuccess = options?.onSuccess; return translationMutation; } },
      saveInvitationLetter: { useMutation: (options?: { onSuccess?: (value: any, variables: any) => void }) => { saveMutation.onSuccess = options?.onSuccess; return saveMutation; } },
      listInvitationLetters: { useQuery: () => lettersQuery },
      listDeletedInvitationLetters: { useQuery: () => deletedLettersQuery },
      deleteInvitationLetter: { useMutation: (options?: { onSuccess?: (value: any) => void }) => { deleteMutation.onSuccess = options?.onSuccess; return deleteMutation; } },
      restoreInvitationLetter: { useMutation: (options?: { onSuccess?: (value: any) => void }) => { restoreMutation.onSuccess = options?.onSuccess; return restoreMutation; } },
      searchInvitationPeople: { useQuery: () => peopleSearchQuery },
    },
  },
}));

import { InvitationLetterWorkspace } from "./InvitationLetterWorkspace";

afterEach(() => cleanup());
beforeEach(() => { vi.clearAllMocks(); translationMutation.onSuccess = undefined; saveMutation.onSuccess = undefined; deleteMutation.onSuccess = undefined; restoreMutation.onSuccess = undefined; lettersQuery.data = []; deletedLettersQuery.data = []; peopleSearchQuery.data = []; });

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
    expect(screen.getByLabelText(/Otros documentos \/ Altri documenti/)).toBeTruthy();
    expect(screen.getByLabelText(/Anexos de sociedades o entidades/)).toBeTruthy();
    expect((screen.getByRole("button", { name: /Descargar carta PDF/ }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: /Imprimir carta/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getAllByText(/Correo \/ E-mail/).length).toBeGreaterThan(0);
    expect(screen.getByText("Declaro que puedo hospedar / Dichiaro di voler ospitare")).toBeTruthy();
    expect(screen.getByText("En mi domicilio indicado / Presso la mia abitazione")).toBeTruthy();
    expect(screen.getByText("En otra dirección / Al seguente indirizzo")).toBeTruthy();
  });

  it("enables export actions only after the validated draft is saved", async () => {
    render(<InvitationLetterWorkspace />);
    const fill = (id: string, value: string) => fireEvent.change(document.getElementById(id) as HTMLInputElement, { target: { value } });
    const fillDate = (id: string, value: string) => { const input = document.getElementById(id) as HTMLInputElement; fireEvent.change(input, { target: { value } }); fireEvent.blur(input); };
    fill("invitante-firstName", "Ana"); fill("invitante-lastName", "Rossi"); fillDate("invitante-nacimiento", "01/01/1970"); fill("invitante-lugar", "Lima"); fill("invitante-nacionalidad", "Peruana"); fill("invitante-identityCard", "AA12345BB"); fill("invitante-passport", "AB123456"); fill("invitante-residencePermit", "Permiso"); fill("invitante-occupation", "Comerciante"); fill("invitante-address", "Via Muriaglio 12");
    fill("invitado-firstName", "Maria"); fill("invitado-lastName", "Bianchi"); fillDate("invitado-nacimiento", "01/01/1995"); fill("invitado-lugar", "Lima"); fill("invitado-nacionalidad", "Peruana"); fill("invitado-identityCard", "AA12345BB"); fill("invitado-passport", "AB123456"); fill("invitado-occupation", "Estudiante"); fill("invitado-address", "Lima Peru");
    fireEvent.change(screen.getAllByLabelText("Número de teléfono")[0], { target: { value: "970188447" } });
    fireEvent.change(screen.getAllByLabelText("Número de teléfono")[1], { target: { value: "908722617" } });
    fillDate("invitation-arrival", "01/09/2026"); fillDate("invitation-departure", "30/09/2026");

    fireEvent.click(screen.getByRole("button", { name: /Guardar carta/ }));
    await waitFor(() => expect(translationMutation.mutate).toHaveBeenCalledTimes(1));
    translationMutation.onSuccess?.({ inviter: { birthPlace: "LIMA", nationality: "PERUVIANA", residencePermit: "PERMESSO", address: "VIA MURIAGLIO 12", occupation: "COMMERCIANTE" }, invitee: { birthPlace: "LIMA", nationality: "PERUVIANA", address: "LIMA, PERÙ", occupation: "STUDENTESSA" }, relationship: "FAMILIARE", purpose: "TURISMO", city: "TORINO" });
    await waitFor(() => expect(saveMutation.mutate).toHaveBeenCalledTimes(1));
    const savedVariables = saveMutation.mutate.mock.calls[0][0];
    saveMutation.onSuccess?.({ id: 19 }, savedVariables);

    await waitFor(() => expect((screen.getByRole("button", { name: /Descargar carta PDF/ }) as HTMLButtonElement).disabled).toBe(false));
    expect((screen.getByRole("button", { name: /Imprimir carta/ }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByRole("status").textContent).toMatch(/Carta guardada/);
  });

  it("lists saved letters in pages of six and restores a saved record", () => {
    const recordData = { inviter: { firstName: "ANA", lastName: "ROSSI", birthDate: "1970-01-01", birthPlace: "LIMA", nationality: "PERUANA", identityCard: "AA12345BB", passport: "AB123456", residencePermit: "PERMISO", address: "VIA 1", occupation: "COMERCIANTE", phone: "+51 970 188 447", email: "" }, invitee: { firstName: "MARIA", lastName: "BIANCHI", birthDate: "1995-01-01", birthPlace: "LIMA", nationality: "PERUANA", identityCard: "AA12345BB", passport: "AB123456", residencePermit: "", address: "LIMA", occupation: "ESTUDIANTE", phone: "+51 908 722 617", email: "" }, relationship: "FAMILIAR", purpose: "TURISMO", arrivalDate: "2026-09-01", departureDate: "2026-09-30", city: "TORINO", date: "2026-08-19", financialSupport: true, healthInsurance: true, financialGuarantee: false, inviteeIdAttached: true, financialGuaranteeAttached: false };
    const italian = { inviter: { birthPlace: "LIMA", nationality: "PERUVIANA", residencePermit: "PERMESSO", address: "VIA 1", occupation: "COMMERCIANTE" }, invitee: { birthPlace: "LIMA", nationality: "PERUVIANA", address: "LIMA", occupation: "STUDENTESSA" }, relationship: "FAMILIARE", purpose: "TURISMO", city: "TORINO" };
    lettersQuery.data = Array.from({ length: 7 }, (_, index) => ({ id: index + 1, inviterName: "ANA", inviterLastName: "ROSSI", inviteeName: `INVITADO${index + 1}`, inviteeLastName: "BIANCHI", createdAt: new Date(2026, 7, index + 1), letterData: JSON.stringify(recordData), italianData: JSON.stringify(italian) }));
    render(<InvitationLetterWorkspace />);
    expect(screen.getByText(/INVITADO7/)).toBeTruthy();
    expect(screen.queryByText(/INVITADO1/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByText(/INVITADO1/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Abrir" }));
    expect((document.getElementById("invitante-firstName") as HTMLInputElement).value).toBe("ANA");
  });

  it("sends a letter to the reversible trash and restores it from the trash panel", () => {
    const record = { id: 23, inviterName: "ANA", inviterLastName: "ROSSI", inviteeName: "MARIA", inviteeLastName: "BIANCHI", createdAt: new Date(2026, 7, 19), letterData: "{}", italianData: "{}" };
    lettersQuery.data = [record];
    deletedLettersQuery.data = [{ ...record, deletedAt: new Date(2026, 7, 20), deletedByAdminId: 4, deletedByAdminLabel: "OPERADOR TORINO" }];
    render(<InvitationLetterWorkspace />);

    fireEvent.click(screen.getByRole("button", { name: /Enviar a papelera la carta de MARIA BIANCHI/ }));
    expect(deleteMutation.mutate).toHaveBeenCalledWith({ id: 23 });
    deleteMutation.onSuccess?.({ success: true });
    expect(lettersQuery.refetch).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Ver papelera/ }));
    expect(screen.getByText("OPERADOR TORINO")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Restaurar/ }));
    expect(restoreMutation.mutate).toHaveBeenCalledWith({ id: 23 });
    restoreMutation.onSuccess?.({ success: true });
    expect(deletedLettersQuery.refetch).toHaveBeenCalled();
  });

  it("completes inviter and invitee from fuzzy results without requiring a shipment selector", () => {
    peopleSearchQuery.data = [{ key: "ab123456|lucia|sanchez", sources: ["carta", "envio"], firstName: "LUCÍA", lastName: "SÁNCHEZ", identityCard: "", passport: "AB123456", residencePermit: "PERMISO", address: "VIA ROMA 1", occupation: "COMERCIANTE", phone: "+39 351 278 7962", email: "lucia@example.com", birthDate: "1980-01-01", birthPlace: "LIMA", nationality: "PERUANA" }];
    render(<InvitationLetterWorkspace />);

    const search = screen.getByLabelText(/Buscar invitante guardado/) as HTMLInputElement;
    fireEvent.change(search, { target: { value: "sanches" } });
    fireEvent.click(screen.getByText("LUCÍA SÁNCHEZ"));

    expect((document.getElementById("invitante-firstName") as HTMLInputElement).value).toBe("LUCÍA");
    expect((document.getElementById("invitante-passport") as HTMLInputElement).value).toBe("AB123456");
    expect((document.getElementById("invitante-address") as HTMLInputElement).value).toBe("VIA ROMA 1");
    expect(screen.queryByLabelText(/Autocompletar invitado desde un envío/)).toBeNull();
  });
});
