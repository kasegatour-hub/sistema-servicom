// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const { searchMock, accountMocks } = vi.hoisted(() => ({
  searchMock: vi.fn(),
  accountMocks: { session: null as any, isLoading: false },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    account: { me: { useQuery: () => ({ data: accountMocks.session, isLoading: accountMocks.isLoading }) } },
    shipment: { search: { useQuery: searchMock } },
  },
}));

vi.mock("@/components/QRScanner", () => ({ QRScanner: () => null }));

import MobileAppPage from "./MobileAppPage";

afterEach(() => cleanup());

beforeEach(() => {
  accountMocks.session = null;
  accountMocks.isLoading = false;
  searchMock.mockReset();
  searchMock.mockReturnValue({ data: undefined, isLoading: false, error: null });
});

describe("MobileAppPage", () => {
  it("muestra instalación e inicio de sesión, sin exponer rastreo a visitantes sin sesión", () => {
    render(<MobileAppPage />);

    expect(screen.getByRole("heading", { name: "App móvil Servicom" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ver cómo instalar" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Iniciar sesión" }).getAttribute("href")).toBe("/cuenta?returnTo=%2Fmovil");
    expect(screen.queryByRole("heading", { name: "Rastrear envío" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Escanear QR/ })).toBeNull();
  });

  it("explica cómo instalar en Android y iPhone cuando el navegador no ofrece el aviso nativo", () => {
    render(<MobileAppPage />);
    fireEvent.click(screen.getByRole("button", { name: "Ver cómo instalar" }));

    expect(screen.getByText(/Android:/)).toBeTruthy();
    expect(screen.getByText(/iPhone\/iPad:/)).toBeTruthy();
  });

  it("habilita rastreo y lectura QR solo después de iniciar sesión", () => {
    accountMocks.session = { id: 7, email: "cliente@servicom.pe", reauthRequired: false };
    render(<MobileAppPage />);

    expect(screen.getByRole("heading", { name: "Rastrear envío" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Escanear QR/ })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Número de orden móvil"), { target: { value: "3520992723" } });
    fireEvent.change(screen.getByLabelText("Código de envío móvil"), { target: { value: "ca06721wb" } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

    expect(searchMock).toHaveBeenLastCalledWith({ orderNumber: "3520992723", code: "CA06721WB" }, { enabled: true });
  });

  it("muestra una confirmación visible mientras busca el envío autenticado", () => {
    accountMocks.session = { id: 7, email: "cliente@servicom.pe", reauthRequired: false };
    searchMock.mockReturnValue({ data: undefined, isLoading: true, error: null });
    render(<MobileAppPage />);

    expect(screen.getByRole("status").textContent).toContain("Buscando tu envío");
  });
});
