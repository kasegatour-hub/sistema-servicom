// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const { searchMock, accountMocks, adminMocks } = vi.hoisted(() => ({
  searchMock: vi.fn(),
  accountMocks: { session: null as any, isLoading: false },
  adminMocks: { session: null as any },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    account: { me: { useQuery: () => ({ data: accountMocks.session, isLoading: accountMocks.isLoading }) } },
    admin: { me: { useQuery: () => ({ data: adminMocks.session, isLoading: false }) } },
    shipment: { search: { useQuery: searchMock } },
    notifications: {
      list: { useQuery: () => ({ data: { items: [], unreadCount: 0 }, isLoading: false, refetch: vi.fn() }) },
      markRead: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      markAllRead: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
  },
}));

vi.mock("@/components/QRScanner", () => ({ QRScanner: () => null }));

import MobileAppPage from "./MobileAppPage";

afterEach(() => { cleanup(); window.history.replaceState({}, "", "/movil"); });

beforeEach(() => {
  accountMocks.session = null;
  accountMocks.isLoading = false;
  adminMocks.session = null;
  searchMock.mockReset();
  searchMock.mockReturnValue({ data: undefined, isLoading: false, error: null });
});

describe("MobileAppPage", () => {
  it("muestra instalación e inicio de sesión, sin exponer rastreo a visitantes sin sesión", () => {
    render(<MobileAppPage />);

    expect(screen.getByRole("heading", { name: "Tu oficina de envíos, en el bolsillo." })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Instalar aplicación" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Iniciar sesión como Cliente" }).getAttribute("href")).toBe("/cuenta?returnTo=%2Fmovil");
    expect(screen.getByRole("link", { name: "Crear cuenta de Cliente" }).getAttribute("href")).toBe("/cuenta?returnTo=%2Fmovil");
    expect(screen.getByRole("link", { name: "Iniciar sesión como Admin" }).getAttribute("href")).toBe("/admin?from=movil");
    expect(screen.queryByRole("heading", { name: "Rastrear envío" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Escanear QR/ })).toBeNull();
  });

  it("explica cómo instalar en Android y iPhone cuando el navegador no ofrece el aviso nativo", () => {
    render(<MobileAppPage />);
    fireEvent.click(screen.getByRole("button", { name: "Instalar aplicación" }));

    expect(screen.getByText(/Android:/)).toBeTruthy();
    expect(screen.getByText(/iPhone\/iPad:/)).toBeTruthy();
  });

  it("muestra en Inicio las acciones grandes de Rastrear y Registrar", () => {
    accountMocks.session = { id: 7, email: "cliente@servicom.pe", name: "Cliente", reauthRequired: false };
    render(<MobileAppPage />);

    expect(screen.getByRole("button", { name: "Rastrear envío" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Escanear QR de rastreo" })).toBeNull();
    expect(screen.getByRole("link", { name: "Registrar nuevo envío" }).getAttribute("href")).toBe("/cuenta?mobile=1&workspace=registrar");
    fireEvent.click(screen.getByRole("button", { name: "Rastrear envío" }));
    expect(screen.getByRole("button", { name: "Escanear QR de envío" })).toBeTruthy();
  });

  it("habilita rastreo y lectura QR solo después de iniciar sesión", () => {
    accountMocks.session = { id: 7, email: "cliente@servicom.pe", reauthRequired: false };
    render(<MobileAppPage />);

    expect(screen.getByRole("button", { name: "Inicio", current: "page" }).getAttribute("aria-current")).toBe("page");
    fireEvent.click(screen.getByRole("button", { name: "Rastrear" }));
    expect(screen.getByRole("heading", { name: "Encuentra tu envío" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Escanear QR de envío" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Número de orden móvil"), { target: { value: "35209927" } });
    fireEvent.change(screen.getByLabelText("Código de envío móvil"), { target: { value: "7abc" } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar envío" }));

    expect(searchMock).toHaveBeenLastCalledWith({ orderNumber: "3520-9927", code: "7ABC" }, { enabled: true });
  });

  it("detecta errores de orden y código antes de buscar y limita la longitud", () => {
    accountMocks.session = { id: 7, email: "cliente@servicom.pe", reauthRequired: false };
    render(<MobileAppPage />);
    fireEvent.click(screen.getByRole("button", { name: "Rastrear" }));
    const orderInput = screen.getByLabelText("Número de orden móvil") as HTMLInputElement;
    const codeInput = screen.getByLabelText("Código de envío móvil") as HTMLInputElement;

    fireEvent.change(orderInput, { target: { value: "955885566" } });
    fireEvent.change(codeInput, { target: { value: "7AB" } });

    expect(orderInput.maxLength).toBe(9);
    expect(codeInput.maxLength).toBe(4);
    expect(screen.getByText(/debe tener 8 dígitos/)).toBeTruthy();
    expect(screen.getByText(/faltan 1 letras/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Buscar envío" }));
    expect(screen.getByText("Corrige los datos marcados en rojo antes de rastrear.")).toBeTruthy();
  });

  it("acepta el formato mensual MMAA-XXXX de una encomienda sin ocultar el guion", () => {
    accountMocks.session = { id: 7, email: "cliente@servicom.pe", reauthRequired: false };
    render(<MobileAppPage />);

    fireEvent.click(screen.getByRole("button", { name: "Rastrear" }));
    const orderInput = screen.getByLabelText("Número de orden móvil") as HTMLInputElement;
    expect(orderInput.inputMode).toBe("numeric");
    expect(screen.getByText("Encomiendas: MMAA-XXXX. También se aceptan órdenes históricas.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Limpiar" })).toBeTruthy();
    fireEvent.change(orderInput, { target: { value: "0826-0019" } });
    fireEvent.change(screen.getByLabelText("Código de envío móvil"), { target: { value: "7abc" } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar envío" }));

    expect(searchMock).toHaveBeenLastCalledWith({ orderNumber: "0826-0019", code: "7ABC" }, { enabled: true });
  });

  it("mantiene al Cliente dentro de las tres funciones permitidas y no expone administración", () => {
    accountMocks.session = { id: 7, email: "cliente@servicom.pe", name: "Cliente", reauthRequired: false };
    render(<MobileAppPage />);
    fireEvent.click(screen.getByRole("button", { name: "Mi cuenta" }));

    expect(screen.getByText("Solo gestión personal.")).toBeTruthy();
    expect(screen.queryByText("Acceso de operador")).toBeNull();
    expect(screen.queryByRole("link", { name: "Acceso administrativo" })).toBeNull();
    expect(screen.getByRole("link", { name: "Perfil, fotos y biografía" }).getAttribute("href")).toBe("/cuenta?mobile=1&workspace=perfil");
    expect(screen.getByRole("link", { name: "Cambiar contraseña" }).getAttribute("href")).toBe("/cuenta?mobile=1&workspace=seguridad");
  });

  it("oculta Admin de la cabecera del Cliente aunque exista una sesión administrativa secundaria", () => {
    accountMocks.session = { id: 7, email: "cliente@servicom.pe", name: "Cliente", reauthRequired: false };
    adminMocks.session = { id: 9, email: "admin@servicom.pe", role: "registrador", reauthRequired: false };
    render(<MobileAppPage />);

    expect(screen.queryByRole("link", { name: "Acceso administrativo" })).toBeNull();
    expect(screen.getByRole("button", { name: "Inicio", current: "page" })).toBeTruthy();
  });

  it("muestra la sesión administrativa y su perfil amplio en la app móvil", () => {
    adminMocks.session = { id: 9, email: "admin@servicom.pe", name: "Master", role: "superadmin", reauthRequired: false, profilePhoto: { url: "https://cdn.example/admin.jpg", name: "admin.jpg" }, profilePhotos: [{ url: "https://cdn.example/admin.jpg", name: "admin.jpg" }] };
    render(<MobileAppPage />);

    expect(screen.getByText("Perfil administrativo móvil")).toBeTruthy();
    expect(screen.getByText("Hola, Master")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Foto de perfil de Master" }).getAttribute("src")).toBe("https://cdn.example/admin.jpg");
    fireEvent.click(screen.getByRole("button", { name: "Mi cuenta" }));
    expect(screen.getByRole("heading", { name: "Perfil administrativo" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Mi perfil" }).getAttribute("href")).toBe("/admin?from=movil&profile=1");
  });

  it("muestra la foto amplia del cliente en el encabezado y Mi cuenta", () => {
    accountMocks.session = { id: 7, email: "ana@servicom.pe", name: "Ana", lastName: "López", reauthRequired: false, profilePhotos: [{ url: "https://cdn.example/ana.jpg", name: "ana.jpg" }] };
    render(<MobileAppPage />);

    expect(screen.getByRole("img", { name: "Foto de perfil de Ana López" }).getAttribute("src")).toBe("https://cdn.example/ana.jpg");
    fireEvent.click(screen.getByRole("button", { name: "Mi cuenta" }));
    expect(screen.getAllByRole("img", { name: "Foto de perfil de Ana López" }).length).toBeGreaterThanOrEqual(2);
  });

  it("muestra la orden y el código claramente en el resultado móvil", () => {
    accountMocks.session = { id: 7, email: "cliente@servicom.pe", name: "Ana", lastName: "López", reauthRequired: false };
    searchMock.mockImplementation((input: { orderNumber: string }) => input.orderNumber ? { data: { orderNumber: "35209927", code: "7ABC", status: "En agencia", paymentStatus: "Falta cancelar", recipientName: "María", recipientLastName: "Ramos", route: "Lima - Torino", destinationAddress: "Jr. de la Unión 518" }, isLoading: false, error: null } : { data: undefined, isLoading: false, error: null });
    render(<MobileAppPage />);
    fireEvent.click(screen.getByRole("button", { name: "Rastrear" }));
    fireEvent.change(screen.getByLabelText("Número de orden móvil"), { target: { value: "35209927" } });
    fireEvent.change(screen.getByLabelText("Código de envío móvil"), { target: { value: "7abc" } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar envío" }));

    expect(screen.getAllByText("Número de orden").length).toBeGreaterThan(0);
    expect(screen.getAllByText("35209927").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Código de envío").length).toBeGreaterThan(0);
    expect(screen.getAllByText("7ABC").length).toBeGreaterThan(0);
  });

  it("mantiene los enlaces de rastreo dentro de /movil al abrir un envío por URL", async () => {
    accountMocks.session = { id: 7, email: "cliente@servicom.pe", name: "Ana", reauthRequired: false };
    searchMock.mockImplementation((input: { orderNumber: string; code: string }) => input.orderNumber && input.code ? { data: { orderNumber: input.orderNumber, code: input.code, status: "En agencia", paymentStatus: "Falta cancelar", route: "Lima - Torino", destinationAddress: "Jr. de la Unión 518" }, isLoading: false, error: null } : { data: undefined, isLoading: false, error: null });
    window.history.replaceState({}, "", "/movil?order=35209927&code=7abc");
    render(<MobileAppPage />);

    await waitFor(() => expect(screen.getByRole("heading", { name: "Encuentra tu envío" })).toBeTruthy());
    expect((screen.getByLabelText("Número de orden móvil") as HTMLInputElement).value).toBe("3520-9927");
    expect((screen.getByLabelText("Código de envío móvil") as HTMLInputElement).value).toBe("7ABC");
    expect(screen.queryByRole("link", { name: "Ver seguimiento completo" })).toBeNull();
    expect(searchMock).toHaveBeenLastCalledWith({ orderNumber: "35209927", code: "7ABC" }, { enabled: true });
  });

  it("muestra una confirmación visible mientras busca el envío autenticado", () => {
    accountMocks.session = { id: 7, email: "cliente@servicom.pe", reauthRequired: false };
    searchMock.mockReturnValue({ data: undefined, isLoading: true, error: null });
    render(<MobileAppPage />);

    fireEvent.click(screen.getByRole("button", { name: "Rastrear" }));

    expect(screen.getByRole("status").textContent).toContain("Buscando tu envío");
  });
});
