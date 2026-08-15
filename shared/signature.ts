export type SignaturePoint = { x: number; y: number };
export type SignatureStroke = SignaturePoint[];

const MAX_STROKES = 24;
const MAX_POINTS_PER_STROKE = 1200;
const MAX_TOTAL_POINTS = 6000;
const VIEWBOX_WIDTH = 600;
const VIEWBOX_HEIGHT = 220;

export function serializeSignatureStrokes(strokes: SignatureStroke[]): string {
  return JSON.stringify(strokes);
}

export function parseSignatureStrokes(value: unknown): SignatureStroke[] {
  if (typeof value !== "string" || value.length === 0 || value.length > 20000) {
    throw new Error("La firma electrónica no tiene un formato válido");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("La firma electrónica no tiene un formato válido");
  }

  if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > MAX_STROKES) {
    throw new Error("La firma electrónica está vacía o supera el límite permitido");
  }

  let totalPoints = 0;
  const strokes: SignatureStroke[] = [];
  for (const rawStroke of parsed) {
    if (!Array.isArray(rawStroke) || rawStroke.length < 2 || rawStroke.length > MAX_POINTS_PER_STROKE) {
      throw new Error("Cada trazo de la firma debe contener puntos válidos");
    }

    const stroke: SignatureStroke = [];
    for (const rawPoint of rawStroke) {
      if (!rawPoint || typeof rawPoint !== "object") {
        throw new Error("La firma contiene un punto inválido");
      }
      const point = rawPoint as { x?: unknown; y?: unknown };
      const x = Number(point.x);
      const y = Number(point.y);
      if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > VIEWBOX_WIDTH || y < 0 || y > VIEWBOX_HEIGHT) {
        throw new Error("La firma contiene coordenadas inválidas");
      }
      stroke.push({ x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) });
    }
    totalPoints += stroke.length;
    if (totalPoints > MAX_TOTAL_POINTS) {
      throw new Error("La firma electrónica es demasiado grande");
    }
    strokes.push(stroke);
  }

  return strokes;
}

export function buildSignatureSvgMarkup(value: unknown, className = "electronic-signature-svg"): string {
  const strokes = parseSignatureStrokes(value);
  const polylines = strokes
    .map(stroke => `<polyline points="${stroke.map(point => `${point.x},${point.y}`).join(" ")}" />`)
    .join("");
  return `<svg class="${className}" viewBox="0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}" role="img" aria-label="Firma electrónica del cliente" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="#0B2B5E" stroke-linecap="round" stroke-linejoin="round" stroke-width="4">${polylines}</g></svg>`;
}

export const signatureViewBox = {
  width: VIEWBOX_WIDTH,
  height: VIEWBOX_HEIGHT,
} as const;
