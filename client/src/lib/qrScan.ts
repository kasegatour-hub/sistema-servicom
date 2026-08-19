export const QR_SCAN_MAX_DIMENSION = 640;

export function getQrScanFrameSize(sourceWidth: number, sourceHeight: number, maxDimension = QR_SCAN_MAX_DIMENSION) {
  const width = Math.max(0, Math.floor(sourceWidth));
  const height = Math.max(0, Math.floor(sourceHeight));
  if (!width || !height) return { width: 0, height: 0 };
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
