// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DocumentPricePreview } from "./DocumentPricePreview";

describe("DocumentPricePreview", () => {
  it("visually updates the total and surcharge after the included simple-document sheets", () => {
    const view = render(<DocumentPricePreview docType="simple" sheetCount={4} />);
    expect(screen.getByTestId("document-price-total").textContent).toBe("45.00 €");
    expect(screen.getByText(/Sin recargo por hojas todavía/)).toBeTruthy();

    view.rerender(<DocumentPricePreview docType="simple" sheetCount={6} />);
    expect(screen.getByTestId("document-price-total").textContent).toBe("49.00 €");
    expect(screen.getByText(/Recargo por hojas: \+4.00 €/)).toBeTruthy();
  });

  it("explica el bloque adicional de hasta cinco hojas apostilladas sin cambiar el cálculo", () => {
    const view = render(<DocumentPricePreview docType="apostillado" sheetCount={5} />);
    expect(screen.getByText(/Las hojas 6 a 10 forman un bloque adicional de hasta 5 hojas del mismo tipo/)).toBeTruthy();

    cleanup();
    render(<DocumentPricePreview docType="apostillado" sheetCount={6} />);
    expect(screen.getByTestId("document-price-total").textContent).toBe("60.00 €");
    expect(screen.getByText(/Recargo por hojas: \+10.00 € \(bloque adicional de hasta 5 hojas del mismo tipo\)/)).toBeTruthy();
  });
});
