const BCRP_EURO_SELL_RATE_URL = "https://estadisticas.bcrp.gob.pe/estadisticas/series/api/PD04648PD/json";
const BCRP_COMMISSION_PEN_PER_EUR = 0.15;
const QUOTE_TTL_MS = 60_000;

type BcrpPeriod = { name?: string; values?: string[] };
type BcrpResponse = { config?: { series?: Array<{ name?: string; dec?: string }> }; periods?: BcrpPeriod[] };

export type BcrpEuroQuote = {
  bcrpRatePenPerEur: number;
  adjustedPenPerEur: number;
  commissionPenPerEur: number;
  fetchedAt: number;
  sourceUrl: string;
  period: string;
};

let cachedQuote: BcrpEuroQuote | null = null;

export function parseBcrpEuroQuote(payload: BcrpResponse | string) {
  const parsed: BcrpResponse = typeof payload === "string" ? JSON.parse(payload) : payload;
  const periods = Array.isArray(parsed.periods) ? parsed.periods : [];
  for (let index = periods.length - 1; index >= 0; index -= 1) {
    const period = periods[index];
    const rawValue = period?.values?.[0]?.replace(",", ".");
    const rate = Number(rawValue);
    if (Number.isFinite(rate) && rate > 0) return { period: period.name || "Último dato disponible", bcrpRatePenPerEur: rate };
  }
  return null;
}

export async function getBcrpEuroQuote(): Promise<BcrpEuroQuote> {
  if (cachedQuote && Date.now() - cachedQuote.fetchedAt < QUOTE_TTL_MS) return cachedQuote;
  try {
    const response = await fetch(BCRP_EURO_SELL_RATE_URL, { headers: { Accept: "application/json", "User-Agent": "Servicom-BCRP-Quote/1.0" }, signal: AbortSignal.timeout(7000) });
    if (!response.ok) throw new Error(`BCRP respondió ${response.status}`);
    const parsed = parseBcrpEuroQuote(await response.json() as BcrpResponse);
    if (!parsed) throw new Error("El BCRP no devolvió un tipo de cambio EUR/PEN válido.");
    cachedQuote = { ...parsed, adjustedPenPerEur: Number((parsed.bcrpRatePenPerEur + BCRP_COMMISSION_PEN_PER_EUR).toFixed(4)), commissionPenPerEur: BCRP_COMMISSION_PEN_PER_EUR, fetchedAt: Date.now(), sourceUrl: BCRP_EURO_SELL_RATE_URL };
    return cachedQuote;
  } catch (error) {
    if (cachedQuote) return cachedQuote;
    throw error;
  }
}

export function convertEurToPen(amountEur: number, adjustedPenPerEur: number) {
  if (!Number.isFinite(amountEur) || amountEur < 0 || !Number.isFinite(adjustedPenPerEur) || adjustedPenPerEur <= 0) return 0;
  return Number((amountEur * adjustedPenPerEur).toFixed(2));
}
