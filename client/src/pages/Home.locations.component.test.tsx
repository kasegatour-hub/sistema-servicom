/** @vitest-environment jsdom */
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { LocationsSection } from "./Home";

afterEach(() => cleanup());

describe("LocationsSection", () => {
  it("renders both locations with address, reference, schedule, contact, and map links", () => {
    render(<LocationsSection />);

    expect(screen.getByRole("heading", { name: "Ubícanos" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Jr. de la Unión 518" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Corso Peschiera" })).toBeTruthy();
    expect(screen.getByText(/Jr\. de la Unión Nro\. 518 Int\. S101/)).toBeTruthy();
    expect(screen.getByText(/Corso Peschiera, 162A/)).toBeTruthy();
    expect(screen.getByText("Referencia: es una galería y está en el sótano - Frente a Saga Falabella")).toBeTruthy();
    expect(screen.getByText("Referencia: Corso Peschiera")).toBeTruthy();
    expect(screen.getByText("Lunes a sábado, de 10:00 a. m. a 8:30 p. m.")).toBeTruthy();
    expect(screen.getByText("Lunes a sábado, de 9:00 a. m. a 8:30 p. m.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Teléfono fijo 01 390 7269" }).getAttribute("href")).toBe("tel:+51013907269");
    expect(screen.getByRole("link", { name: "WhatsApp +51 970 188 447" }).getAttribute("href")).toBe("https://wa.me/51970188447");
    expect(screen.getByRole("link", { name: "WhatsApp +51 908 722 617" }).getAttribute("href")).toBe("https://wa.me/51908722617");
    expect(screen.getByRole("link", { name: "WhatsApp Torino +39 351 278 7962" }).getAttribute("href")).toBe("https://wa.me/393512787962");
    expect(screen.getByRole("link", { name: "WhatsApp Torino +39 350 902 5271" }).getAttribute("href")).toBe("https://wa.me/393509025271");
    expect(screen.getByRole("link", { name: "WhatsApp Torino +39 389 766 3723" }).getAttribute("href")).toBe("https://wa.me/393897663723");
    expect(screen.getByRole("link", { name: /Abrir Lima en Google Maps/ }).getAttribute("href")).toBe("https://share.google/F5wrStU2oICvKgIWx");
    expect(screen.getByRole("link", { name: /Abrir Torino en Google Maps/ }).getAttribute("href")).toContain("google.com/maps/search");
  });
});
