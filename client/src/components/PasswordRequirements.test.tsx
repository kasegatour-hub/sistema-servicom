// @vitest-environment jsdom
import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PasswordRequirements } from "./PasswordRequirements";

describe("PasswordRequirements", () => {
  it("muestra los cinco requisitos y refleja cuando se cumplen", () => {
    const { rerender } = render(<PasswordRequirements password="corta" />);
    expect(screen.getByLabelText("Requisitos de contraseña")).toBeTruthy();
    expect(screen.getByText("Al menos 12 caracteres")).toBeTruthy();
    expect(screen.getByText("Una letra mayúscula")).toBeTruthy();
    expect(screen.getByText("Una letra minúscula")).toBeTruthy();
    expect(screen.getByText("Un número")).toBeTruthy();
    expect(screen.getByText("Un símbolo")).toBeTruthy();

    rerender(<PasswordRequirements password="ClaveSegura#2026" />);
    expect(screen.getByText("Al menos 12 caracteres").className).toContain("text-emerald-700");
    expect(screen.getByText("Un símbolo").className).toContain("text-emerald-700");
  });
});
