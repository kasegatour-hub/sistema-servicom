// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DeliveryReceiptDialog } from "./DeliveryReceiptDialog";

describe("DeliveryReceiptDialog", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => ({ clearRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn() } as any));
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,test");
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("muestra la recepción de documento con fecha, receptor y firma en el dispositivo", () => {
    render(<DeliveryReceiptDialog open operation="documento" reference="0826-0002" order="0826-0002" code="4LRY" recipientName="MARIA" recipientLastName="SAICO" recipientDni="74410344" brand="servicom" onClose={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "Recepción de documento" })).toBeTruthy();
    expect(screen.getByText("SERVICOM INTERNACIONAL")).toBeTruthy();
    expect(screen.getByText("0826-0002 · 4LRY")).toBeTruthy();
    expect(screen.getByDisplayValue("MARIA SAICO")).toBeTruthy();
    expect(screen.getByDisplayValue("74410344")).toBeTruthy();
    expect(screen.getByText("Firma del receptor en el dispositivo")).toBeTruthy();
    expect(document.getElementById("delivery-signature-canvas")).toBeTruthy();
  });

  it("diferencia Kasega y habilita impresión solo después de completar los datos y la firma", () => {
    const print = vi.spyOn(window, "open").mockReturnValue({ document: { write: vi.fn(), close: vi.fn(), title: "" }, focus: vi.fn(), print: vi.fn() } as any);
    render(<DeliveryReceiptDialog open operation="encomienda" reference="EN-1" recipientName="ANA" recipientLastName="TORRES" recipientDni="00000000" brand="kasega" onClose={vi.fn()} />);
    expect(screen.getByText("KASEGA TOUR EIRL")).toBeTruthy();
    const printButton = screen.getByRole("button", { name: "Imprimir comprobante" });
    expect(printButton.hasAttribute("disabled")).toBe(true);
    const canvas = document.getElementById("delivery-signature-canvas") as HTMLCanvasElement;
    fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 40, clientY: 30, pointerId: 1 });
    fireEvent.pointerUp(canvas, { pointerId: 1 });
    expect(printButton.hasAttribute("disabled")).toBe(false);
    fireEvent.click(printButton);
    expect(print).toHaveBeenCalled();
  });
});
