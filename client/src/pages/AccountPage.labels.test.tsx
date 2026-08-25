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
      uploadProfilePhoto: { useMutation: mutation },
      changePassword: { useMutation: mutation },
      createMyShipment: { useMutation: mutation },
      uploadMyShipmentPhoto: { useMutation: mutation },
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
  window.history.pushState({}, "", "/cuenta");
  accountMocks.shipments = [];
  accountMocks.deletedShipments = [];
  accountMocks.session = { email: "cliente@example.com", name: "Ana", lastName: "López", dni: "71234567", phone: "+51 970188447", reauthRequired: false };
});

describe("AccountPage client labels", () => {
  it("en modo móvil deja Mi cuenta solo para Perfil y Seguridad", async () => {
    window.history.pushState({}, "", "/cuenta?mobile=1&workspace=perfil");
    render(<AccountPage />);

    expect(await screen.findByRole("button", { name: "Perfil" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Cambiar contraseña" }).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByRole("button", { name: "Mis envíos" })).toBeNull();
    expect(screen.getByText("Fotos personales")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Editar Datos" }));
    expect(screen.getByLabelText("Biografía")).toBeTruthy();
  });

  it("muestra nombre, apellidos y correo del Cliente en la cabecera", () => {
    render(<AccountPage />);
    expect(screen.getByText("Hola, Ana López")).toBeTruthy();
    expect(screen.getAllByText("cliente@example.com").length).toBeGreaterThan(0);
  });

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
    fireEvent.click(screen.getByRole("button", { name: "Limpiar" }));
    expect((search as HTMLInputElement).value).toBe("");
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

  it("muestra el tipo documental seleccionado completo con tarifa destacada", async () => {
    render(<AccountPage />);
    fireEvent.click(screen.getByRole("button", { name: /Registrar Nuevo Documento/ }));

    const documentType = await screen.findByRole("combobox", { name: "Tipo de Documento" });
    expect((documentType as HTMLSelectElement).value).toBe("simple");
    expect(screen.getByText("Tipo seleccionado")).toBeTruthy();
    expect(screen.getAllByText("Documentos simples").length).toBeGreaterThan(0);
    expect(screen.getByText("45 EUR hasta 4 hojas; +2 EUR por hoja adicional")).toBeTruthy();
    fireEvent.change(documentType, { target: { value: "apostillado" } });
    expect(screen.getAllByText("Documentos apostillados").length).toBeGreaterThan(0);
    expect(screen.getByText("50 EUR hasta 5 hojas; +10 EUR por hoja adicional")).toBeTruthy();
  });

  it("divide el registro móvil en tres pasos sin recargar la pantalla", async () => {
    window.history.pushState({}, "", "/cuenta?returnTo=%2Fmovil");
    render(<AccountPage />);
    fireEvent.click(screen.getByRole("button", { name: /Registrar Nuevo Documento/ }));
    expect(screen.getByLabelText("Pasos del registro")).toBeTruthy();
    expect(screen.getByText("1. Sede y tipo")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByRole("combobox", { name: "Ruta de envío" }).parentElement?.className).toContain("hidden");
    expect(screen.getByPlaceholderText("Ej: María").parentElement?.className).not.toContain("hidden");
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("3. Contenido")).toBeTruthy();
    expect(screen.getByText(/Lista de documentos/)).toBeTruthy();
    window.history.pushState({}, "", "/cuenta");
  });

  it("muestra y limpia la opción de apostilla solo al seleccionar Torino – Lima", async () => {
    render(<AccountPage />);
    fireEvent.click(screen.getByRole("button", { name: /Registrar Nuevo Documento/ }));
    const routeSelect = await screen.findByRole("combobox", { name: "Ruta de envío" });

    expect(screen.queryByLabelText("Documentos para apostillar")).toBeNull();
    fireEvent.change(routeSelect, { target: { value: "Torino - Lima" } });
    const apostilleOption = await screen.findByLabelText("Documentos para apostillar") as HTMLInputElement;
    fireEvent.click(apostilleOption);
    expect(apostilleOption.checked).toBe(true);
    expect(screen.getByText("Servicios adicionales opcionales")).toBeTruthy();
    expect(screen.getByText(/Apostillado: \+40,00 EUR \(160,00 soles\) · 7 días hábiles/)).toBeTruthy();
    expect(screen.getByText(/Traducción: no seleccionada/)).toBeTruthy();
    expect(screen.getAllByText(/Plazo estimado: 7 días hábiles/).length).toBeGreaterThanOrEqual(1);

    fireEvent.change(routeSelect, { target: { value: "Lima - Torino" } });
    await waitFor(() => expect(screen.queryByLabelText("Documentos para apostillar")).toBeNull());
  });

  it("marca en rojo los datos y la lista requeridos antes de registrar un documento", async () => {
    render(<AccountPage />);
    fireEvent.click(screen.getByRole("button", { name: /Registrar Nuevo Documento/ }));
    await screen.findByRole("button", { name: "Guardar envío" });

    fireEvent.click(screen.getByRole("button", { name: "Guardar envío" }));

    await waitFor(() => expect((screen.getByPlaceholderText("Ej: María") as HTMLInputElement).getAttribute("aria-invalid")).toBe("true"));
    expect(screen.getByText(/Completa los nombres del destinatario/i)).toBeTruthy();
    expect(screen.getByText(/Agrega al menos un elemento a la lista de cosas enviadas/i)).toBeTruthy();
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
