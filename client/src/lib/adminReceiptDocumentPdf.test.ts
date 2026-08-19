/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";

const html2canvasMock = vi.hoisted(() => vi.fn());
const addPageMock = vi.hoisted(() => vi.fn());
const addImageMock = vi.hoisted(() => vi.fn());
const saveMock = vi.hoisted(() => vi.fn());

vi.mock("qrcode", () => ({ default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,shared-qr") } }));
vi.mock("html2canvas", () => ({ default: html2canvasMock }));
vi.mock("jspdf", () => ({ jsPDF: vi.fn(() => ({ addPage: addPageMock, addImage: addImageMock, save: saveMock })) }));

import { downloadAdminReceiptPdf } from "./adminReceiptDocument";

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

describe("downloadAdminReceiptPdf", () => {
  it("descarga las mismas tres páginas que se imprimen y elimina el contenedor temporal", async () => {
    html2canvasMock.mockImplementation(async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 630;
      canvas.height = 891;
      return canvas;
    });
    const originalComplete = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "complete");
    Object.defineProperty(HTMLImageElement.prototype, "complete", { configurable: true, get: () => true });

    await expect(downloadAdminReceiptPdf({
      origin: "https://servicominternacional.manus.space",
      shipment: { orderNumber: "8582224585", code: "ENC-2026-JVZU4", shipmentType: "encomienda", route: "Torino - Lima", senderName: "Luciana", recipientName: "Alessandro", recipientLastName: "Gallo Moretti", paymentStatus: "Pagado", finalPriceEur: "189", createdAt: new Date("2026-08-19T15:22:00.000Z") },
    })).resolves.toBe("recibo-encomienda-alessandro-gallo-moretti-orden-8582224585.pdf");

    expect(html2canvasMock).toHaveBeenCalledTimes(3);
    expect(addPageMock).toHaveBeenCalledTimes(2);
    expect(addImageMock).toHaveBeenCalledTimes(3);
    expect(saveMock).toHaveBeenCalledWith("recibo-encomienda-alessandro-gallo-moretti-orden-8582224585.pdf");
    expect(document.querySelector(".receipt-page")).toBeNull();
    if (originalComplete) Object.defineProperty(HTMLImageElement.prototype, "complete", originalComplete);
  });
});
