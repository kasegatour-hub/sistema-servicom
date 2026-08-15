// @vitest-environment jsdom
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ElectronicSignatureDialog from "./ElectronicSignatureDialog";

describe("ElectronicSignatureDialog", () => {
  it("requires consent and a drawn signature before submitting", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    const onSubmit = vi.fn();
    render(
      <ElectronicSignatureDialog
        open
        orderNumber="3520992723"
        code="CA06721WB"
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    const submit = screen.getByRole("button", { name: /Firmar electrónicamente/ });
    expect((submit as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Nombre completo del firmante"), { target: { value: "Ana Pérez" } });
    fireEvent.click(screen.getByRole("checkbox"));
    expect((submit as HTMLButtonElement).disabled).toBe(true);

    const canvas = screen.getByLabelText("Área para dibujar la firma electrónica") as HTMLCanvasElement;
    canvas.setPointerCapture = vi.fn();
    fireEvent.pointerDown(canvas, { clientX: 20, clientY: 30, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 80, clientY: 45, pointerId: 1 });
    fireEvent.pointerUp(canvas, { clientX: 120, clientY: 55, pointerId: 1 });

    expect((submit as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(submit);
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ signerName: "Ana Pérez", signatureStrokes: expect.stringContaining("x") }));
  });
});
