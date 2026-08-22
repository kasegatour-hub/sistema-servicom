// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import KasegaTourPage from "./KasegaTourPage";

describe("KasegaTourPage", () => {
  it("expone una entrada de agencia con acceso a rastreo, cuenta y operación", () => {
    render(<KasegaTourPage />);
    expect(screen.getByRole("heading", { name: /Rastreo y gestión de documentos/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Rastrear envío/i }).getAttribute("href")).toBe("/");
    expect(screen.getAllByRole("link", { name: /Mi cuenta/i }).some(link => link.getAttribute("href") === "/cuenta")).toBe(true);
    expect(screen.getAllByRole("link", { name: /Operación/i }).some(link => link.getAttribute("href") === "/admin")).toBe(true);
  });
});
