// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const { jsQrMock } = vi.hoisted(() => ({ jsQrMock: vi.fn() }));
vi.mock("jsqr", () => ({ default: jsQrMock }));
import { QRScanner } from "./QRScanner";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("QRScanner", () => {
  it("informa un fallo de cámara y permite reintentar sin cerrar el lector", async () => {
    const getUserMedia = vi.fn().mockRejectedValue(new Error("Permiso denegado"));
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
    render(<QRScanner isOpen onScan={vi.fn()} onClose={vi.fn()} />);

    await waitFor(() => expect(screen.getByText(/Permiso denegado/)).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Reintentar cámara" }));
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(4));
  });

  it("reinicia el lector desde el control visible durante la vista de cámara", async () => {
    const stream = { getTracks: () => [{ stop: vi.fn() }] } as unknown as MediaStream;
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    render(<QRScanner isOpen onScan={vi.fn()} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Reiniciar cámara" }));
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(2));
  });
});
