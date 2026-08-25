const ARGENPER_RATE_URL = "https://www.argenper.com.pe/servicios/cambio-moneda";
const QUOTE_TTL_MS = 60_000;

type ArgenperQuote = {
  eurPurchaseRate: number;
  eurSaleRate: number;
  adjustedPenPerEur: number;
  fetchedAt: number;
  sourceUrl: string;
};

let cachedQuote: ArgenperQuote | null = null;

export function parseArgenperEuroQuote(html: string) {
  const euroSection = html.match(/Euros[\s\S]{0,900}?Compra:\s*([\d,.]+)[\s\S]{0,250}?Venta:\s*([\d,.]+)/i);
  if (!euroSection) return null;
  const parseRate = (value: string) => {
    const compact = value.replace(/\s/g, "");
    const lastDot = compact.lastIndexOf(".");
    const lastComma = compact.lastIndexOf(",");
    if (lastDot >= 0 && lastComma >= 0) return Number(lastComma > lastDot ? compact.replace(/\./g, "").replace(",", ".") : compact.replace(/,/g, ""));
    if (lastComma >= 0) return Number(compact.replace(",", "."));
    return Number(compact);
  };
  const eurPurchaseRate = parseRate(euroSection[1]);
  const eurSaleRate = parseRate(euroSection[2]);
  if (!Number.isFinite(eurPurchaseRate) || !Number.isFinite(eurSaleRate) || eurSaleRate <= 0) return null;
  return { eurPurchaseRate, eurSaleRate };
}

export async function getArgenperEuroQuote(): Promise<ArgenperQuote> {
  if (cachedQuote && Date.now() - cachedQuote.fetchedAt < QUOTE_TTL_MS) return cachedQuote;
  const response = await fetch(ARGENPER_RATE_URL, { headers: { Accept: "text/html", "User-Agent": "Servicom-Transfer-Quote/1.0" }, signal: AbortSignal.timeout(7000) });
  if (!response.ok) throw new Error(`Argemper respondió ${response.status}`);
  const parsed = parseArgenperEuroQuote(await response.text());
  if (!parsed) throw new Error("No se encontró la cotización EUR en Argemper.");
  cachedQuote = { ...parsed, adjustedPenPerEur: Number((parsed.eurSaleRate + 0.15).toFixed(4)), fetchedAt: Date.now(), sourceUrl: ARGENPER_RATE_URL };
  return cachedQuote;
}
