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
  it("presenta rastreo, lectura QR y accesos para cuenta y operaciones", () => {
    searchMock.mockReturnValue({ data: undefined, isLoading: false, error: null });
    render(<MobileAppPage />);

    expect(screen.getByRole("heading", { name: "Rastrear envío" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Escanear QR/ })).toBeTruthy();
    expect(screen.getByText("Mi cuenta")).toBeTruthy();
    expect(screen.getByText("Operador")).toBeTruthy();
    expect(screen.getByText("Cartas")).toBeTruthy();
    expect(screen.getByText("Mi cuenta").closest("a")?.getAttribute("href")).toBe("/cuenta");
    expect(screen.getByText("Operador").closest("a")?.getAttribute("href")).toBe("/admin");
    expect(screen.getByText("Cartas").closest("a")?.getAttribute("href")).toBe("/admin");
  });

  it("inicia una consulta de rastreo con orden y código desde móvil", () => {
    searchMock.mockReturnValue({ data: undefined, isLoading: false, error: null });
    render(<MobileAppPage />);
    fireEvent.change(screen.getByLabelText("Número de orden móvil"), { target: { value: "3520992723" } });
    fireEvent.change(screen.getByLabelText("Código de envío móvil"), { target: { value: "ca06721wb" } });
    fireEvent.click(screen.getByRole("button", { name: "Rastrear" }));

    expect(searchMock).toHaveBeenLastCalledWith({ orderNumber: "3520992723", code: "CA06721WB" }, { enabled: true });
  });
});
