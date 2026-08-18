// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
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
});
