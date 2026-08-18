// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IdentityDocumentField } from "./IdentityDocumentField";

describe("IdentityDocumentField", () => {
  it("switches to CIE and normalizes its number to uppercase alphanumeric input", () => {
    const onDocumentTypeChange = vi.fn();
    const onValueChange = vi.fn();
    const view = render(<IdentityDocumentField id="identity" label="Documento" documentType="dni_peru" onDocumentTypeChange={onDocumentTypeChange} value="" onValueChange={onValueChange} required />);
    fireEvent.change(screen.getByLabelText("Documento - tipo de identificación"), { target: { value: "carta_identita_italia" } });
    expect(onDocumentTypeChange).toHaveBeenCalledWith("carta_identita_italia");
    view.rerender(<IdentityDocumentField id="identity" label="Documento" documentType="carta_identita_italia" onDocumentTypeChange={onDocumentTypeChange} value="" onValueChange={onValueChange} required />);
    fireEvent.change(screen.getByLabelText("Documento - número de identificación"), { target: { value: "ca12-345ab" } });
    expect(onValueChange).toHaveBeenLastCalledWith("CA12345AB");
  });
});
