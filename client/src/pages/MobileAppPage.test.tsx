// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const { searchMock } = vi.hoisted(() => ({ searchMock: vi.fn() }));

vi.mock("@/lib/trpc", () => ({
  trpc: { shipment: { search: { useQuery: searchMock } } },
}));

vi.mock("@/components/QRScanner", () => ({ QRScanner: () => null }));

import MobileAppPage from "./MobileAppPage";

afterEach(() => cleanup());

describe("MobileAppPage", () => {
  it("presenta rastreo, lectura QR y solo los accesos permitidos para un usuario común", () => {
    searchMock.mockReturnValue({ data: undefined, isLoading: false, error: null });
    render(<MobileAppPage />);

    expect(screen.getByRole("heading", { name: "Rastrear envío" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Escanear QR/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Mi cuenta" }).getAttribute("href")).toBe("/cuenta");
    expect(screen.getByRole("link", { name: "Admin" }).getAttribute("href")).toBe("/admin");
    expect(screen.queryByText("Operador")).toBeNull();
    expect(screen.queryByText("Cartas")).toBeNull();
  });

  it("inicia una consulta de rastreo con orden y código desde móvil", () => {
    searchMock.mockReturnValue({ data: undefined, isLoading: false, error: null });
    render(<MobileAppPage />);
    fireEvent.change(screen.getByLabelText("Número de orden móvil"), { target: { value: "3520992723" } });
    fireEvent.change(screen.getByLabelText("Código de envío móvil"), { target: { value: "ca06721wb" } });
    fireEvent.click(screen.getByRole("button", { name: "Rastrear envío" }));

    expect(searchMock).toHaveBeenLastCalledWith({ orderNumber: "3520992723", code: "CA06721WB" }, { enabled: true });
  });
});
