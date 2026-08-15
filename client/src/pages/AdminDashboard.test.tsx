/** @vitest-environment jsdom */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  login: {
    isPending: false,
    mutateAsync: vi.fn().mockResolvedValue({ id: 1, email: "admin@servicom.pe", name: "Operador", role: "registrador" }),
  },
  logout: { isPending: false, mutateAsync: vi.fn() },
  createShipment: { isPending: false, mutateAsync: vi.fn() },
  updateStatus: { isPending: false, mutateAsync: vi.fn() },
  deleteShipment: { isPending: false, mutateAsync: vi.fn() },
  restoreShipment: { isPending: false, mutate: vi.fn() },
  createAdmin: { isPending: false, mutateAsync: vi.fn() },
  deleteAdmin: { isPending: false, mutateAsync: vi.fn() },
  deactivateAdmin: { isPending: false, mutateAsync: vi.fn() },
  listCoupons: { data: [], refetch: vi.fn() },
  createCoupon: { isPending: false, mutateAsync: vi.fn().mockResolvedValue({ code: "SERVI25-TEST", discountPercent: 25 }) },
  updateCoupon: { isPending: false, mutateAsync: vi.fn() },
  deactivateCoupon: { isPending: false, mutateAsync: vi.fn() },
  limaTorinoPolicy: { data: { route: "Lima - Torino", encomiendasEnabled: true, updatedAt: null }, refetch: vi.fn() },
  setLimaTorinoEncomiendasEnabled: { isPending: false, mutateAsync: vi.fn().mockResolvedValue({ success: true, enabled: false }) },
  changeMyPassword: { isPending: false, mutate: vi.fn() },
  reauthenticate: { isPending: false, mutate: vi.fn() },
  refetchAdminSession: vi.fn().mockResolvedValue({ data: null }),
  refetchShipments: vi.fn(),
  refetchAdminUsers: vi.fn(),
  refetchCoupons: vi.fn(),
  searchClients: {
    useQuery: (input: { query?: string }) => ({
      data: input.query?.trim() ? [{ id: 21, name: "Ana", lastName: "Pérez", dni: "71234567", phone: "+51 970188447", email: null }] : [],
      isFetching: false,
    }),
  },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    admin: {
      me: { useQuery: () => ({ data: null, isLoading: false, refetch: mocks.refetchAdminSession }) },
      getAllShipments: { useQuery: () => ({ data: [], isLoading: false, refetch: mocks.refetchShipments }) },
      listDeletedShipments: { useQuery: () => ({ data: [], isLoading: false, refetch: vi.fn() }) },
      listAdmins: { useQuery: () => ({ data: [], isLoading: false, refetch: mocks.refetchAdminUsers }) },
      listCoupons: { useQuery: () => ({ data: mocks.listCoupons.data, isLoading: false, refetch: mocks.refetchCoupons }) },
      getLimaTorinoEncomiendaPolicy: { useQuery: () => ({ data: mocks.limaTorinoPolicy.data, isLoading: false, refetch: mocks.limaTorinoPolicy.refetch }) },
      searchClients: mocks.searchClients,
      login: { useMutation: () => mocks.login },
      logout: { useMutation: () => mocks.logout },
      createShipment: { useMutation: () => mocks.createShipment },
      updateStatus: { useMutation: () => mocks.updateStatus },
      deleteShipment: { useMutation: () => mocks.deleteShipment },
      restoreShipment: { useMutation: () => mocks.restoreShipment },
      createAdmin: { useMutation: () => mocks.createAdmin },
      deleteAdmin: { useMutation: () => mocks.deleteAdmin },
      deactivateAdmin: { useMutation: () => mocks.deactivateAdmin },
      createCoupon: { useMutation: () => mocks.createCoupon },
      updateCoupon: { useMutation: () => mocks.updateCoupon },
      deactivateCoupon: { useMutation: () => mocks.deactivateCoupon },
      setLimaTorinoEncomiendasEnabled: { useMutation: () => mocks.setLimaTorinoEncomiendasEnabled },
      changeMyPassword: { useMutation: () => mocks.changeMyPassword },
      reauthenticate: { useMutation: () => mocks.reauthenticate },
    },
    analytics: {
      adminInsights: { useQuery: () => ({ data: null }) },
    },
  },
}));

import AdminDashboard from "./AdminDashboard";

afterEach(() => cleanup());

beforeEach(() => {
  vi.clearAllMocks();
  mocks.login.mutateAsync.mockResolvedValue({ id: 1, email: "admin@servicom.pe", name: "Operador", role: "registrador" });
});

describe("AdminDashboard Nueva Encomienda", () => {
  it("shows escape links and the administrative password form", async () => {
    render(<AdminDashboard />);
    expect(screen.getByRole("link", { name: /Volver al inicio/ }).getAttribute("href")).toBe("/");

    fireEvent.change(screen.getByPlaceholderText("Ingresa tu correo administrativo"), { target: { value: "admin@servicom.pe" } });
    fireEvent.change(screen.getByPlaceholderText("Contraseña"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar Sesión" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Cambiar contraseña" })).toBeTruthy());

    expect(screen.getByRole("link", { name: "Inicio" }).getAttribute("href")).toBe("/");
    fireEvent.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
    expect(screen.getByRole("heading", { name: "Actualizar contraseña administrativa" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("heading", { name: "Actualizar contraseña administrativa" })).toBeNull();
  });

  it("shows coupon management for an authenticated operator", async () => {
    render(<AdminDashboard />);
    fireEvent.change(screen.getByPlaceholderText("Ingresa tu correo administrativo"), { target: { value: "admin@servicom.pe" } });
    fireEvent.change(screen.getByPlaceholderText("Contraseña"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar Sesión" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Cupones promocionales" })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Nuevo cupón" }));
    expect(screen.getByRole("button", { name: "Generar cupón" })).toBeTruthy();
    expect(screen.getByText("Descuento (%)")).toBeTruthy();
    expect(screen.getByText("Aplica a")).toBeTruthy();
    expect(screen.getByText("Válido desde")).toBeTruthy();
    expect(screen.getByText("Válido hasta")).toBeTruthy();
  });

  it("opens each creation type directly without a redundant selector", async () => {
    render(<AdminDashboard />);

    fireEvent.change(screen.getByPlaceholderText("Ingresa tu correo administrativo"), { target: { value: "admin@servicom.pe" } });
    fireEvent.change(screen.getByPlaceholderText("Contraseña"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar Sesión" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Nuevo documento" })).toBeTruthy());
    expect(screen.getByRole("button", { name: "Nueva encomienda" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Nuevo documento" }));
    expect(screen.getAllByText("Nuevo documento").length).toBeGreaterThan(0);
    expect(screen.queryByText("Tipo de registro")).toBeNull();
    expect(screen.queryByDisplayValue("Documentos")).toBeNull();
    expect(screen.getByText("Tipo de Documento")).toBeTruthy();
    expect(screen.getByText("Precio manual en EUR (opcional)")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Nueva encomienda" }));
    expect(screen.getAllByText("Nueva encomienda").length).toBeGreaterThan(0);
    expect(screen.getByText("Peso de la encomienda (kg)")).toBeTruthy();
    expect(screen.getByText("Total automático: 13.50 €")).toBeTruthy();
    expect(screen.queryByDisplayValue("Documentos")).toBeNull();
  });

  it("fills sender data from a persistent client match by DNI", async () => {
    render(<AdminDashboard />);
    fireEvent.change(screen.getByPlaceholderText("Ingresa tu correo administrativo"), { target: { value: "admin@servicom.pe" } });
    fireEvent.change(screen.getByPlaceholderText("Contraseña"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar Sesión" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Nuevo documento" })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Nuevo documento" }));

    fireEvent.change(screen.getByRole("textbox", { name: "Buscar remitente guardado" }), { target: { value: "71234567" } });
    const match = await screen.findByRole("button", { name: /Ana Pérez/ });
    fireEvent.click(match);

    expect((screen.getAllByPlaceholderText("Nombre")[0] as HTMLInputElement).value).toBe("Ana");
    expect((screen.getAllByPlaceholderText("Apellido")[0] as HTMLInputElement).value).toBe("Pérez");
    expect((screen.getAllByPlaceholderText("DNI")[0] as HTMLInputElement).value).toBe("71234567");
  });

  it("submits document and parcel payloads through the administrative mutation", async () => {
    mocks.createShipment.mutateAsync
      .mockResolvedValueOnce({ orderNumber: "1234567890", code: "DOC-2026-ABCDE", trackingUrl: "/?order=1234567890&code=DOC-2026-ABCDE" })
      .mockResolvedValueOnce({ orderNumber: "1234567891", code: "ENC-2026-ABCDF", trackingUrl: "/?order=1234567891&code=ENC-2026-ABCDF" });

    render(<AdminDashboard />);
    fireEvent.change(screen.getByPlaceholderText("Ingresa tu correo administrativo"), { target: { value: "admin@servicom.pe" } });
    fireEvent.change(screen.getByPlaceholderText("Contraseña"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar Sesión" }));
        await waitFor(() => expect(screen.getByRole("button", { name: "Nuevo documento" })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Nuevo documento" }));
    fireEvent.click(screen.getByRole("button", { name: "Añadir ítem" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Ítem de checklist 1" }), { target: { value: "Documento principal" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear Documento" }));
    await waitFor(() => expect(mocks.createShipment.mutateAsync).toHaveBeenCalledTimes(1));
    expect(mocks.createShipment.mutateAsync.mock.calls[0][0]).toMatchObject({
      shipmentType: "documento",
      docType: "apostillado",
      sheetCount: 1,
      weightKg: 1,
      manualPriceEur: "",
    });

    fireEvent.click(screen.getByRole("button", { name: "Nueva encomienda" }));
    fireEvent.change(screen.getByDisplayValue("1"), { target: { value: "2.5" } });
    fireEvent.change(screen.getByPlaceholderText("Ej. 75.00"), { target: { value: "40" } });
    fireEvent.click(screen.getByRole("button", { name: "Añadir ítem" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Ítem de checklist 1" }), { target: { value: "Paquete sellado" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear Encomienda" }));

    await waitFor(() => expect(mocks.createShipment.mutateAsync).toHaveBeenCalledTimes(2));
    expect(mocks.createShipment.mutateAsync.mock.calls[1][0]).toMatchObject({
      shipmentType: "encomienda",
      weightKg: 2.5,
      manualPriceEur: "40",
    });
  });

  it("separa las vistas de documentos y encomiendas en pestañas", async () => {
    render(<AdminDashboard />);
    fireEvent.change(screen.getByPlaceholderText("Ingresa tu correo administrativo"), { target: { value: "admin@servicom.pe" } });
    fireEvent.change(screen.getByPlaceholderText("Contraseña"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar Sesión" }));

    await waitFor(() => expect(screen.getByRole("tab", { name: /Documentos/ })).toBeTruthy());
    expect(screen.getByRole("heading", { name: "Documentos Registrados" })).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: /Encomiendas/ }));
    expect(screen.getByRole("heading", { name: "Encomiendas Registradas" })).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: /Documentos/ }));
    expect(screen.getByRole("heading", { name: "Documentos Registrados" })).toBeTruthy();
  });
});
