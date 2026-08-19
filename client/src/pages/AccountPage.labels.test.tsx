/** @vitest-environment jsdom */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mutation = vi.hoisted(() => () => ({ mutate: vi.fn(), isPending: false }));
const accountMocks = vi.hoisted(() => ({ shipments: [] as any[], deletedShipments: [] as any[], session: { email: "cliente@example.com", name: "Ana", lastName: "López", dni: "71234567", phone: "+51 970188447", reauthRequired: false } as any }));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ account: { me: { invalidate: vi.fn() } } }),
    account: {
      me: { useQuery: () => ({ data: accountMocks.session, isLoading: false }) },
      myShipments: { useQuery: () => ({ data: accountMocks.shipments, refetch: vi.fn() }) },
      myDeletedShipments: { useQuery: () => ({ data: accountMocks.deletedShipments, refetch: vi.fn() }) },
      deleteMyShipment: { useMutation: mutation },
      restoreMyShipment: { useMutation: mutation },
      register: { useMutation: mutation },
      login: { useMutation: mutation },
      logout: { useMutation: mutation },
      reauthenticate: { useMutation: mutation },
      updateProfile: { useMutation: mutation },
      changePassword: { useMutation: mutation },
      createMyShipment: { useMutation: mutation },
      requestPasswordReset: { useMutation: mutation },
      resetPassword: { useMutation: mutation },
    },
    analytics: {
      myInsights: { useQuery: () => ({ data: null }) },
    },
    feedback: {
      list: { useQuery: () => ({ data: [], isLoading: false, refetch: vi.fn() }) },
      create: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
  },
}));

import AccountPage from "./AccountPage";

afterEach(() => cleanup());

beforeEach(() => {
  accountMocks.shipments = [];
  accountMocks.deletedShipments = [];
  accountMocks.session = { email: "cliente@example.com", name: "Ana", lastName: "López", dni: "71234567", phone: "+51 970188447", reauthRequired: false };
});

describe("AccountPage client labels", () => {
  it("permite al Cliente mostrar u ocultar la contraseña durante el inicio de sesión", () => {
    accountMocks.session = null;
    render(<AccountPage />);
    const password = screen.getByLabelText("Contraseña") as HTMLInputElement;
    expect(password.type).toBe("password");
    fireEvent.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(password.type).toBe("text");
    expect(screen.getByRole("button", { name: "Ocultar contraseña" })).toBeTruthy();
  });

  it("uses Nuevo Documento instead of Nueva Encomienda", () => {
    render(<AccountPage />);

    expect(screen.getByRole("button", { name: /Registrar Nuevo Documento/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Registrar Nueva Encomienda/ })).toBeNull();
  });

  it("explica la búsqueda de envíos y acepta coincidencias difusas del destinatario", () => {
    accountMocks.shipments = [
      { id: 1, orderNumber: "3520992723", code: "DOC-SAN", recipientName: "Lucía", recipientLastName: "Sánchez", recipientDni: "71234567", recipientPhone: "+51 970188447", status: "En agencia", paymentStatus: "Falta cancelar", registeredByLabel: "Cliente", createdAt: new Date("2026-08-17T10:00:00.000Z") },
      { id: 2, orderNumber: "3520992724", code: "DOC-RAM", recipientName: "María", recipientLastName: "Ramos", recipientDni: "71234568", recipientPhone: "+51 970188447", status: "En agencia", paymentStatus: "Falta cancelar", registeredByLabel: "Cliente", createdAt: new Date("2026-08-16T10:00:00.000Z") },
    ];
    render(<AccountPage />);
    const search = screen.getByRole("textbox", { name: "Buscar mis envíos" });
    expect(screen.getByText(/Se aceptan coincidencias parecidas, sin tildes y con pequeños errores/)).toBeTruthy();
    fireEvent.change(search, { target: { value: "sanches" } });
    expect(screen.getByText(/Lucía Sánchez/)).toBeTruthy();
    expect(screen.queryByText(/María Ramos/)).toBeNull();
  });

  it("shows the two shipment route options when the client starts a document registration", async () => {
    render(<AccountPage />);
    fireEvent.click(screen.getByRole("button", { name: /Registrar Nuevo Documento/ }));

    await waitFor(() => expect(screen.getByRole("combobox", { name: "Ruta de envío" })).toBeTruthy());
    const routeSelect = screen.getByRole("combobox", { name: "Ruta de envío" });
    expect(routeSelect).toBeTruthy();
    expect(screen.getByRole("option", { name: "Lima – Torino" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Torino – Lima" })).toBeTruthy();
    expect(screen.getByText(/Lista de documentos/)).toBeTruthy();
    expect(screen.getByLabelText("Acta de nacimiento")).toBeTruthy();
  });

  it("finds a previous recipient by a fuzzy name and completes the recipient fields", async () => {
    accountMocks.shipments = [{ id: 8, orderNumber: "3520992728", code: "DOC-LUC", recipientName: "Lucía", recipientLastName: "Sánchez", recipientDni: "71234567", recipientDocumentType: "dni_peru", recipientPhone: "+51 970188447", status: "En agencia", paymentStatus: "Falta cancelar", createdAt: new Date("2026-08-17T10:00:00.000Z") }];
    render(<AccountPage />);
    fireEvent.click(screen.getByRole("button", { name: /Registrar Nuevo Documento/ }));
    const search = await screen.findByLabelText("Buscar destinatario guardado");
    fireEvent.change(search, { target: { value: "sanches" } });
    const option = await screen.findByRole("button", { name: /Usar Lucía Sánchez/ });
    fireEvent.click(option);

    expect((screen.getByPlaceholderText("Ej: María") as HTMLInputElement).value).toBe("Lucía");
    expect((screen.getByPlaceholderText("Ej: López") as HTMLInputElement).value).toBe("Sánchez");
    expect(screen.queryByRole("button", { name: /Usar Lucía Sánchez/ })).toBeNull();
  });

  it("shows six records per page and keeps the deleted list closed until requested", () => {
    accountMocks.shipments = Array.from({ length: 7 }, (_, index) => ({
      id: index + 1,
      orderNumber: `35209927${index}`,
      code: `DOC-${index}`,
      recipientName: `Cliente ${index + 1}`,
      recipientLastName: "Prueba",
      recipientPhone: "+51 970188447",
      status: index === 6 ? "En destino" : "En agencia",
      paymentStatus: index % 2 === 0 ? "Pagado" : "Falta cancelar",
      registeredByLabel: "Cliente",
      createdAt: new Date(`2026-08-${String(index + 1).padStart(2, "0")}T10:00:00.000Z`),
    }));
    accountMocks.deletedShipments = Array.from({ length: 7 }, (_, index) => ({
      id: index + 20,
      orderNumber: `45209927${index}`,
      code: `DEL-${index}`,
      recipientName: `Eliminado ${index + 1}`,
      recipientLastName: "Prueba",
      recipientDni: `6000000${index}`,
      status: "En agencia",
      paymentStatus: "Falta cancelar",
      deletedAt: new Date(`2026-08-${String(index + 1).padStart(2, "0")}T10:00:00.000Z`),
    }));
    render(<AccountPage />);

    expect(screen.getByText("Mostrando 1–6 de 7 envíos")).toBeTruthy();
    expect(screen.getAllByText("Cliente").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Comentarios" }));
    expect(screen.getByRole("heading", { name: "Enviar comentarios" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByText("Cliente 1 Prueba")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Papelera (7)" }));
    expect(screen.getByRole("button", { name: "Abrir papelera (7)" })).toBeTruthy();
    expect(screen.queryByLabelText("Buscar en mi papelera")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Abrir papelera (7)" }));
    expect(screen.getByLabelText("Buscar en mi papelera")).toBeTruthy();
    expect(screen.getByText("Mostrando 1–6 de 7 eliminados")).toBeTruthy();
  });
});
