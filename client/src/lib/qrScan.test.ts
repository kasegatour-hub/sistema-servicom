import { describe, expect, it } from "vitest";
import { getQrScanFrameSize, QR_SCAN_MAX_DIMENSION } from "./qrScan";

describe("getQrScanFrameSize", () => {
  it("reduce la imagen de cámara sin deformarla para evitar trabajo redundante de lectura", () => {
    expect(getQrScanFrameSize(1920, 1080)).toEqual({ width: QR_SCAN_MAX_DIMENSION, height: 360 });
    expect(getQrScanFrameSize(640, 480)).toEqual({ width: 640, height: 480 });
  });

  it("rechaza dimensiones de cámara aún no disponibles", () => {
    expect(getQrScanFrameSize(0, 720)).toEqual({ width: 0, height: 0 });
  });
});
