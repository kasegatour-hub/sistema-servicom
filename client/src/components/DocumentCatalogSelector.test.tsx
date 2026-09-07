// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DocumentCatalogSelector } from "./DocumentCatalogSelector";

describe("DocumentCatalogSelector", () => {
  afterEach(() => cleanup());

  it("starts a selected document at one and supports quantity plus/minus and treatments", () => {
    const onChange = vi.fn();
    const { rerender } = render(<DocumentCatalogSelector value={[]} onChange={onChange} idPrefix="test-doc" />);

    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar documento" }), { target: { value: "nacimiento" } });
    fireEvent.click(screen.getByLabelText("Acta de nacimiento"));
    expect(onChange).toHaveBeenLastCalledWith([{ id: "acta-nacimiento", quantity: 1, treatments: [] }]);

    rerender(<DocumentCatalogSelector value={[{ id: "acta-nacimiento", quantity: 1, treatments: [] }]} onChange={onChange} idPrefix="test-doc" />);
    expect(screen.getByText("1", { selector: "span" })).toBeTruthy();
    expect((screen.getByRole("button", { name: "Disminuir cantidad de Acta de nacimiento" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Aumentar cantidad de Acta de nacimiento" }));
    expect(onChange).toHaveBeenLastCalledWith([{ id: "acta-nacimiento", quantity: 2, treatments: [] }]);

    fireEvent.click(screen.getByLabelText("Traducido"));
    expect(onChange).toHaveBeenLastCalledWith([{ id: "acta-nacimiento", quantity: 1, treatments: ["traducido"] }]);
  });

  it("requires an explicit name when another simple document is selected", () => {
    const onChange = vi.fn();
    const { rerender } = render(<DocumentCatalogSelector value={[]} onChange={onChange} idPrefix="test-custom" />);

    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar documento" }), { target: { value: "otro simple" } });
    fireEvent.click(screen.getByLabelText("Otro documento simple"));
    rerender(<DocumentCatalogSelector value={[{ id: "otro-simple", quantity: 1, treatments: ["simple"] }]} onChange={onChange} idPrefix="test-custom" />);

    expect((screen.getByLabelText("Nombre de otro documento simple") as HTMLInputElement).required).toBe(true);
  });

  it("filters with fuzzy matching while retaining selected documents and explaining empty results", () => {
    const onChange = vi.fn();
    const { rerender } = render(<DocumentCatalogSelector value={[]} onChange={onChange} idPrefix="test-search" />);
    const search = screen.getByRole("searchbox", { name: "Buscar documento" });

    fireEvent.change(search, { target: { value: "matrimonoo" } });
    expect(screen.getByLabelText("Acta negativa de inscripción de matrimonio")).toBeTruthy();
    expect(screen.queryByLabelText("Acta de nacimiento")).toBeNull();

    rerender(<DocumentCatalogSelector value={[{ id: "acta-nacimiento", quantity: 1, treatments: [] }]} onChange={onChange} idPrefix="test-search" />);
    expect(screen.getByLabelText("Acta de nacimiento")).toBeTruthy();

    fireEvent.change(search, { target: { value: "zzzzzz" } });
    expect(screen.getByText(/No se encontraron documentos/)).toBeTruthy();
    expect(screen.getByLabelText("Acta de nacimiento")).toBeTruthy();
  });
});
