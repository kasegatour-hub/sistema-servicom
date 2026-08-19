/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";

const addPageMock = vi.hoisted(() => vi.fn());
const addImageMock = vi.hoisted(() => vi.fn());
const saveMock = vi.hoisted(() => vi.fn());
const setFillColorMock = vi.hoisted(() => vi.fn());
const rectMock = vi.hoisted(() => vi.fn());
const setTextColorMock = vi.hoisted(() => vi.fn());
const setFontMock = vi.hoisted(() => vi.fn());
const setFontSizeMock = vi.hoisted(() => vi.fn());
const textMock = vi.hoisted(() => vi.fn());
const splitTextToSizeMock = vi.hoisted(() => vi.fn((value: string) => [value]));
const lineMock = vi.hoisted(() => vi.fn());

vi.mock("qrcode", () => ({ default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,shared-qr") } }));
vi.mock("jspdf", () => ({ jsPDF: vi.fn(() => ({ addPage: addPageMock, addImage: addImageMock, save: saveMock, setFillColor: setFillColorMock, rect: rectMock, setTextColor: setTextColorMock, setFont: setFontMock, setFontSize: setFontSizeMock, text: textMock, splitTextToSize: splitTextToSizeMock, line: lineMock, setDrawColor: vi.fn() })) }));

import { downloadAdminReceiptPdf } from "./adminReceiptDocument";

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("downloadAdminReceiptPdf", () => {
  it("descarga tres páginas directamente sin depender de imágenes o captura HTML", async () => {
    await expect(downloadAdminReceiptPdf({
      origin: "https://servicominternacional.manus.space",
      shipment: { orderNumber: "8582224585", code: "ENC-2026-JVZU4", shipmentType: "encomienda", route: "Torino - Lima", senderName: "Luciana", recipientName: "Alessandro", recipientLastName: "Gallo Moretti", paymentStatus: "Pagado", finalPriceEur: "189", createdAt: new Date("2026-08-19T15:22:00.000Z") },
    })).resolves.toBe("recibo-encomienda-alessandro-gallo-moretti-orden-8582224585.pdf");

    expect(addPageMock).toHaveBeenCalledTimes(2);
    expect(addImageMock).toHaveBeenCalledTimes(2);
    expect(saveMock).toHaveBeenCalledWith("recibo-encomienda-alessandro-gallo-moretti-orden-8582224585.pdf");
    expect(textMock).toHaveBeenCalledWith("SERVICOM INTERNACIONAL", 37, 14);
    expect(textMock).toHaveBeenCalledWith("DECLARACIÓN JURADA DE CONTENIDO", 105, 46, { align: "center" });
  });
});
