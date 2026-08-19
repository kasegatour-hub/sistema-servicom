// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { ManualDateField, parseManualDate } from "./ManualDateField";

afterEach(() => cleanup());

describe("ManualDateField", () => {
  it("admite una fecha escrita manualmente en formato peruano", () => {
    const onChange = vi.fn();
    render(<ManualDateField id="birth-date" label="Fecha de nacimiento" value="" onChange={onChange} required />);
    const input = screen.getByRole("textbox", { name: /Fecha de nacimiento/ }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "19/07/2026" } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith("2026-07-19");
  });

  it("muestra una guía cuando la fecha manual no es válida", () => {
    render(<ManualDateField id="birth-date" label="Fecha de nacimiento" value="" onChange={vi.fn()} />);
    const input = screen.getByRole("textbox", { name: /Fecha de nacimiento/ });
    fireEvent.change(input, { target: { value: "31/02/2026" } });
    fireEvent.blur(input);
    expect(screen.getByRole("alert").textContent).toContain("DD/MM/AAAA");
  });

  it("presenta controles anuales amplios en el calendario", () => {
    render(<ManualDateField id="birth-date" label="Fecha de nacimiento" value="2000-01-01" onChange={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("Abrir calendario de Fecha de nacimiento"));
    expect(screen.getByLabelText("Año de Fecha de nacimiento")).toBeTruthy();
    expect(screen.getByLabelText("Año anterior")).toBeTruthy();
    expect(parseManualDate("19/07/2026")).toBe("2026-07-19");
  });
});
