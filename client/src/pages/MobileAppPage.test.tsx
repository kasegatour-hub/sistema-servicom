// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

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
  },
}));

vi.mock("@/components/QRScanner", () => ({ QRScanner: () => null }));

import MobileAppPage from "./MobileAppPage";

afterEach(() => cleanup());

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
    expect(screen.getByRole("link", { name: "Registrar nuevo envío" }).getAttribute("href")).toBe("/cuenta?mobile=1&workspace=registrar");
  });

  it("habilita rastreo y lectura QR solo después de iniciar sesión", () => {
    accountMocks.session = { id: 7, email: "cliente@servicom.pe", reauthRequired: false };
    render(<MobileAppPage />);

    expect(screen.getByRole("button", { name: "Inicio", current: "page" }).getAttribute("aria-current")).toBe("page");
    fireEvent.click(screen.getByRole("button", { name: "Rastrear" }));
    expect(screen.getByRole("heading", { name: "Encuentra tu envío" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Escanear QR de envío" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Número de orden móvil"), { target: { value: "3520992723" } });
    fireEvent.change(screen.getByLabelText("Código de envío móvil"), { target: { value: "ca06721wb" } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar envío" }));

    expect(searchMock).toHaveBeenLastCalledWith({ orderNumber: "3520992723", code: "CA06721WB" }, { enabled: true });
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

  it("mantiene disponible la entrada administrativa cuando no hay una sesión de Cliente", () => {
    adminMocks.session = { id: 9, email: "admin@servicom.pe", name: "Master", role: "superadmin", reauthRequired: false };
    render(<MobileAppPage />);

    expect(screen.getByRole("link", { name: "Iniciar sesión como Admin" }).getAttribute("href")).toBe("/admin?from=movil");
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

  it("muestra una confirmación visible mientras busca el envío autenticado", () => {
    accountMocks.session = { id: 7, email: "cliente@servicom.pe", reauthRequired: false };
    searchMock.mockReturnValue({ data: undefined, isLoading: true, error: null });
    render(<MobileAppPage />);

    fireEvent.click(screen.getByRole("button", { name: "Rastrear" }));

    expect(screen.getByRole("status").textContent).toContain("Buscando tu envío");
  });
});
