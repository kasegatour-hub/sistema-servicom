// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const translationMutation = vi.hoisted(() => ({ isPending: false, mutate: vi.fn(), onSuccess: undefined as undefined | ((value: any) => void) }));
const saveMutation = vi.hoisted(() => ({ isPending: false, mutate: vi.fn(), onSuccess: undefined as undefined | ((value: any, variables: any) => void), onError: undefined as undefined | ((error: Error, variables: any) => void) }));
const lettersQuery = vi.hoisted(() => ({ data: [] as any[], isLoading: false, refetch: vi.fn() }));
const deletedLettersQuery = vi.hoisted(() => ({ data: [] as any[], isLoading: false, refetch: vi.fn() }));
const peopleSearchQuery = vi.hoisted(() => ({ data: [] as any[], isFetching: false }));
const deleteMutation = vi.hoisted(() => ({ isPending: false, mutate: vi.fn(), onSuccess: undefined as undefined | ((value: any) => void) }));
const restoreMutation = vi.hoisted(() => ({ isPending: false, mutate: vi.fn(), onSuccess: undefined as undefined | ((value: any) => void) }));
const prepareSignatureMutation = vi.hoisted(() => ({ isPending: false, mutate: vi.fn(), onSuccess: undefined as undefined | ((value: any) => void) }));
const sendSignatureMutation = vi.hoisted(() => ({ isPending: false, mutate: vi.fn(), onSuccess: undefined as undefined | ((value: any) => void) }));
const invitationDocumentMocks = vi.hoisted(() => ({ download: vi.fn(), print: vi.fn() }));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    admin: {
      translateInvitationLetter: { useMutation: (options?: { onSuccess?: (value: any) => void }) => { translationMutation.onSuccess = options?.onSuccess; return translationMutation; } },
      saveInvitationLetter: { useMutation: (options?: { onSuccess?: (value: any, variables: any) => void; onError?: (error: Error, variables: any) => void }) => { saveMutation.onSuccess = options?.onSuccess; saveMutation.onError = options?.onError; return saveMutation; } },
      listInvitationLetters: { useQuery: () => lettersQuery },
      listDeletedInvitationLetters: { useQuery: () => deletedLettersQuery },
      deleteInvitationLetter: { useMutation: (options?: { onSuccess?: (value: any) => void }) => { deleteMutation.onSuccess = options?.onSuccess; return deleteMutation; } },
      restoreInvitationLetter: { useMutation: (options?: { onSuccess?: (value: any) => void }) => { restoreMutation.onSuccess = options?.onSuccess; return restoreMutation; } },
      prepareInvitationLetterSignature: { useMutation: (options?: { onSuccess?: (value: any) => void }) => { prepareSignatureMutation.onSuccess = options?.onSuccess; return prepareSignatureMutation; } },
      sendInvitationLetterSignature: { useMutation: (options?: { onSuccess?: (value: any) => void }) => { sendSignatureMutation.onSuccess = options?.onSuccess; return sendSignatureMutation; } },
      searchInvitationPeople: { useQuery: () => peopleSearchQuery },
    },
  },
}));
vi.mock("@/lib/invitationLetter", () => ({
  downloadInvitationLetterPdf: invitationDocumentMocks.download,
  printInvitationLetter: invitationDocumentMocks.print,
}));

import { InvitationLetterWorkspace } from "./InvitationLetterWorkspace";

afterEach(() => cleanup());
beforeEach(() => { vi.clearAllMocks(); translationMutation.onSuccess = undefined; saveMutation.onSuccess = undefined; saveMutation.onError = undefined; deleteMutation.onSuccess = undefined; restoreMutation.onSuccess = undefined; prepareSignatureMutation.onSuccess = undefined; sendSignatureMutation.onSuccess = undefined; lettersQuery.data = []; deletedLettersQuery.data = []; peopleSearchQuery.data = []; });

describe("InvitationLetterWorkspace", () => {
  it("normalizes searchable places and nationalities to uppercase and requires saving before export", () => {
    render(<InvitationLetterWorkspace />);

    const birthPlace = screen.getAllByLabelText(/Lugar de nacimiento/)[0] as HTMLInputElement;
    const nationality = screen.getAllByLabelText(/Nacionalidad/)[0] as HTMLInputElement;
    fireEvent.change(birthPlace, { target: { value: "lima" } });
    fireEvent.change(nationality, { target: { value: "peruviana" } });

    expect(birthPlace.value).toBe("LIMA");
    expect(nationality.value).toBe("PERUVIANA");
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
    expect(document.getElementById("invitado-identityCard")).toBeNull();
    expect(document.getElementById("invitado-telefono")).toBeNull();
    expect(document.getElementById("invitado-email")).toBeNull();
  });

  it("incluye departamentos peruanos en la búsqueda automática de lugar de nacimiento", () => {
    render(<InvitationLetterWorkspace />);
    const birthPlace = screen.getAllByLabelText(/Lugar de nacimiento/)[0] as HTMLInputElement;
    fireEvent.change(birthPlace, { target: { value: "juni" } });

    expect(birthPlace.value).toBe("JUNI");
    expect(screen.queryByText(/Sin coincidencias/)).toBeNull();
    expect(screen.getByText("JUNÍN")).toBeTruthy();
  });

  it("cierra las sugerencias al pasar a otro campo sin alterar el texto escrito", async () => {
    render(<InvitationLetterWorkspace />);
    const nationality = screen.getAllByLabelText(/Nacionalidad/)[0] as HTMLInputElement;
    fireEvent.change(nationality, { target: { value: "peruviana" } });
    expect(screen.getByText("PERUANA")).toBeTruthy();

    fireEvent.blur(nationality);
    await waitFor(() => expect(screen.queryByText("PERUANA")).toBeNull());
    expect(nationality.value).toBe("PERUVIANA");
  });

  it("enables export actions only after the validated draft is saved", async () => {
    render(<InvitationLetterWorkspace />);
    const fill = (id: string, value: string) => fireEvent.change(document.getElementById(id) as HTMLInputElement, { target: { value } });
    const fillDate = (id: string, value: string) => { const input = document.getElementById(id) as HTMLInputElement; fireEvent.change(input, { target: { value } }); fireEvent.blur(input); };
    fill("invitante-firstName", "Ana"); fill("invitante-lastName", "Rossi"); fillDate("invitante-nacimiento", "01/01/1970"); fill("invitante-lugar", "Lima"); fill("invitante-nacionalidad", "Peruana"); fill("invitante-identityCard", "AA12345BB"); fill("invitante-passport", "AB123456"); fill("invitante-residencePermit", "Permiso"); fill("invitante-occupation", "Comerciante"); fill("invitante-address", "Via Muriaglio 12");
    fill("invitado-firstName", "Maria"); fill("invitado-lastName", "Bianchi"); fillDate("invitado-nacimiento", "01/01/1995"); fill("invitado-lugar", "Lima"); fill("invitado-nacionalidad", "Peruana"); fill("invitado-passport", "CD654321"); fill("invitado-occupation", "Estudiante"); fill("invitado-address", "Lima Peru");
    fireEvent.change(screen.getAllByLabelText("Número de teléfono")[0], { target: { value: "970188447" } });
    fillDate("invitation-arrival", "01/09/2026"); fillDate("invitation-departure", "30/09/2026");

    translationMutation.mutate.mockImplementationOnce((_input: unknown, options?: { onSuccess?: (italian: any) => void }) => options?.onSuccess?.({ inviter: { birthPlace: "LIMA", nationality: "PERUVIANA", residencePermit: "PERMESSO", address: "VIA MURIAGLIO 12", occupation: "COMMERCIANTE" }, invitee: { birthPlace: "LIMA", nationality: "PERUVIANA", address: "LIMA, PERÙ", occupation: "STUDENTESSA" }, relationship: "FAMILIARE", purpose: "TURISMO", city: "TORINO" }));
    fireEvent.click(screen.getByRole("button", { name: "Crear carta" }));
    await waitFor(() => expect(translationMutation.mutate).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(saveMutation.mutate).toHaveBeenCalledTimes(1));
    const savedVariables = saveMutation.mutate.mock.calls[0][0];
    expect(savedVariables.data.inviter.firstName).toBe("ANA");
    expect(savedVariables.data.invitee.firstName).toBe("MARIA");
    saveMutation.onSuccess?.({ id: 19, account: { created: true, email: "ana.rossi@example.com", temporaryPassword: "Si!claveTemporal9a" } }, savedVariables);

    await waitFor(() => expect(screen.getByRole("tab", { name: /Cartas generadas \(0\)/ })).toBeTruthy());
    expect(screen.getByRole("status").textContent).toMatch(/Carta creada/);
    expect(screen.getByText("Acceso temporal creado para el invitante")).toBeTruthy();
    expect(screen.getByText(/Si!claveTemporal9a/)).toBeTruthy();
  });

  it("impide crear una carta cuando la persona invitante y la invitada son la misma", () => {
    render(<InvitationLetterWorkspace />);
    const fill = (id: string, value: string) => fireEvent.change(document.getElementById(id) as HTMLInputElement, { target: { value } });
    const fillDate = (id: string, value: string) => { const input = document.getElementById(id) as HTMLInputElement; fireEvent.change(input, { target: { value } }); fireEvent.blur(input); };
    fill("invitante-firstName", "Ana"); fill("invitante-lastName", "Rossi"); fillDate("invitante-nacimiento", "01/01/1970"); fill("invitante-lugar", "Lima"); fill("invitante-nacionalidad", "Peruana"); fill("invitante-identityCard", "AA12345BB"); fill("invitante-passport", "AB123456"); fill("invitante-residencePermit", "Permiso"); fill("invitante-occupation", "Comerciante"); fill("invitante-address", "Via Muriaglio 12");
    fill("invitado-firstName", "Ana"); fill("invitado-lastName", "Rossi"); fillDate("invitado-nacimiento", "01/01/1970"); fill("invitado-lugar", "Lima"); fill("invitado-nacionalidad", "Peruana"); fill("invitado-passport", "AB123456"); fill("invitado-occupation", "Comerciante"); fill("invitado-address", "Via Muriaglio 12");
    fireEvent.change(screen.getAllByLabelText("Número de teléfono")[0], { target: { value: "970188447" } });
    fillDate("invitation-arrival", "01/09/2026"); fillDate("invitation-departure", "30/09/2026");

    fireEvent.click(screen.getByRole("button", { name: "Crear carta" }));
    expect(translationMutation.mutate).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/deben ser distintas/i);
  });

  it("reconcilia el historial y no muestra un falso error si la Carta ya fue creada", async () => {
    const data = { inviter: { firstName: "ANA", lastName: "ROSSI", passport: "AB123456", identityCard: "AA12345", email: "ana@example.com" }, invitee: { firstName: "MARIA", lastName: "BIANCHI", passport: "AB765432", identityCard: "", email: "" }, date: "2026-08-19" } as any;
    const italian = { inviter: {}, invitee: {} } as any;
    lettersQuery.refetch.mockResolvedValue({ data: [{ id: 31, inviterName: "ANA", inviterLastName: "ROSSI", inviteeName: "MARIA", inviteeLastName: "BIANCHI", createdAt: new Date(), letterData: JSON.stringify(data), italianData: JSON.stringify(italian) }] });
    render(<InvitationLetterWorkspace />);

    saveMutation.onError?.(new Error("respuesta interrumpida"), { data, italian });
    await waitFor(() => expect(screen.getByRole("tab", { name: /Cartas generadas \(0\)/ }).getAttribute("aria-selected")).toBe("true"));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("explica cómo continuar si el servidor no confirma la creación de la carta", async () => {
    const data = { inviter: { firstName: "ANA", lastName: "ROSSI", passport: "AB123456", identityCard: "AA12345", email: "" }, invitee: { firstName: "MARIA", lastName: "BIANCHI", passport: "AB765432", identityCard: "", email: "" }, date: "2026-08-19" } as any;
    lettersQuery.refetch.mockResolvedValue({ data: [] });
    render(<InvitationLetterWorkspace />);

    saveMutation.onError?.(new Error("No se pudo guardar la Carta de invitación."), { data, italian: { inviter: {}, invitee: {} } as any });

    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/no recibió una confirmación de guardado/i));
  });

  it("muestra pestañas visibles, lista cartas por páginas y abre una carta en el formulario", () => {
    const recordData = { inviter: { firstName: "ANA", lastName: "ROSSI", birthDate: "1970-01-01", birthPlace: "LIMA", nationality: "PERUANA", identityCard: "AA12345BB", passport: "AB123456", residencePermit: "PERMISO", address: "VIA 1", occupation: "COMERCIANTE", phone: "+51 970 188 447", email: "" }, invitee: { firstName: "MARIA", lastName: "BIANCHI", birthDate: "1995-01-01", birthPlace: "LIMA", nationality: "PERUANA", identityCard: "AA12345BB", passport: "AB123456", residencePermit: "", address: "LIMA", occupation: "ESTUDIANTE", phone: "+51 908 722 617", email: "" }, relationship: "FAMILIAR", purpose: "TURISMO", arrivalDate: "2026-09-01", departureDate: "2026-09-30", city: "TORINO", date: "2026-08-19", financialSupport: true, healthInsurance: true, financialGuarantee: false, inviteeIdAttached: true, financialGuaranteeAttached: false };
    const italian = { inviter: { birthPlace: "LIMA", nationality: "PERUVIANA", residencePermit: "PERMESSO", address: "VIA 1", occupation: "COMMERCIANTE" }, invitee: { birthPlace: "LIMA", nationality: "PERUVIANA", address: "LIMA", occupation: "STUDENTESSA" }, relationship: "FAMILIARE", purpose: "TURISMO", city: "TORINO" };
    lettersQuery.data = Array.from({ length: 7 }, (_, index) => ({ id: index + 1, inviterName: "ANA", inviterLastName: "ROSSI", inviteeName: `INVITADO${index + 1}`, inviteeLastName: "BIANCHI", createdAt: new Date(2026, 7, index + 1), letterData: JSON.stringify(recordData), italianData: JSON.stringify(italian) }));
    render(<InvitationLetterWorkspace />);
    expect(screen.getByRole("tab", { name: "Crear carta" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Crear carta" })).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: /Cartas generadas \(7\)/ }));
    expect(screen.getByText(/INVITADO7/)).toBeTruthy();
    expect(screen.queryByText(/INVITADO1/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByText(/INVITADO1/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Abrir" }));
    expect((document.getElementById("invitante-firstName") as HTMLInputElement).value).toBe("ANA");
    expect(screen.getByLabelText(/Buscar invitante guardado/)).toBeTruthy();
  });

  it("muestra una pestaña de papelera y permite restaurar una carta eliminada", () => {
    deletedLettersQuery.data = [{ id: 45, inviteeName: "MARÍA", inviteeLastName: "ROSSI", deletedAt: new Date("2026-08-22T12:00:00.000Z"), deletedByAdminLabel: "Operador" }];
    render(<InvitationLetterWorkspace />);

    fireEvent.click(screen.getByRole("tab", { name: "Papelera" }));
    expect(screen.getByText("Papelera de cartas")).toBeTruthy();
    expect(screen.getByText("MARÍA ROSSI")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Restaurar" }));
    expect(restoreMutation.mutate).toHaveBeenCalledWith({ id: 45 });
  });

  it("descarga una carta directamente desde el historial visible", async () => {
    const data = { inviter: { firstName: "ANA", lastName: "ROSSI" }, invitee: { firstName: "MARÍA", lastName: "BIANCHI" } };
    const italian = { inviter: {}, invitee: {} };
    lettersQuery.data = [{ id: 11, inviterName: "ANA", inviterLastName: "ROSSI", inviteeName: "MARÍA", inviteeLastName: "BIANCHI", createdAt: new Date(2026, 7, 19), letterData: JSON.stringify(data), italianData: JSON.stringify(italian) }];
    render(<InvitationLetterWorkspace />);

    fireEvent.click(screen.getByRole("tab", { name: /Cartas generadas \(1\)/ }));
    fireEvent.click(screen.getByRole("button", { name: /Descargar carta de MARÍA BIANCHI/ }));

    await waitFor(() => expect(invitationDocumentMocks.download).toHaveBeenCalledWith(expect.objectContaining(data), italian, null));
  });

  it("muestra el estado pendiente y permite preparar o enviar la firma electrónica", async () => {
    const record = { id: 41, inviterName: "ANA", inviterLastName: "ROSSI", inviteeName: "MARIA", inviteeLastName: "BIANCHI", createdAt: new Date(2026, 7, 19), letterData: "{}", italianData: "{}", signature: { status: "pending" } };
    lettersQuery.data = [record];
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(<InvitationLetterWorkspace />);
    fireEvent.click(screen.getByRole("tab", { name: /Cartas generadas \(1\)/ }));
    expect(screen.getByText("Pendiente")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Firmar ahora" }));
    expect(prepareSignatureMutation.mutate).toHaveBeenCalledWith({ id: 41 });
    prepareSignatureMutation.onSuccess?.({ status: "pending", signatureUrl: "https://firma.test/carta" });
    await waitFor(() => expect(screen.getByText("Enlace de firma preparado")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(sendSignatureMutation.mutate).toHaveBeenCalledWith({ id: 41 });
    open.mockRestore();
  });

  it("sends a letter to the reversible trash and restores it from the trash panel", () => {
    const record = { id: 23, inviterName: "ANA", inviterLastName: "ROSSI", inviteeName: "MARIA", inviteeLastName: "BIANCHI", createdAt: new Date(2026, 7, 19), letterData: "{}", italianData: "{}" };
    lettersQuery.data = [record];
    deletedLettersQuery.data = [{ ...record, deletedAt: new Date(2026, 7, 20), deletedByAdminId: 4, deletedByAdminLabel: "OPERADOR TORINO" }];
    render(<InvitationLetterWorkspace />);
    fireEvent.click(screen.getByRole("tab", { name: /Cartas generadas \(1\)/ }));

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
