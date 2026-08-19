import { rankFuzzyMatches } from "./fuzzySearch";

export type InvitationPersonCandidate = {
  key: string;
  sources: Array<"carta" | "directorio" | "envio">;
  firstName: string;
  lastName: string;
  identityCard: string;
  passport: string;
  residencePermit: string;
  address: string;
  occupation: string;
  phone: string;
  email: string;
  birthDate: string;
  birthPlace: string;
  nationality: string;
};

export type InvitationPersonSeed = Omit<InvitationPersonCandidate, "key" | "sources"> & {
  source: "carta" | "directorio" | "envio";
};

const clean = (value?: string | null) => String(value || "").trim();
const keyText = (seed: Pick<InvitationPersonSeed, "identityCard" | "passport" | "firstName" | "lastName" | "phone">) =>
  [seed.identityCard, seed.passport, seed.firstName, seed.lastName, seed.phone].map(clean).filter(Boolean).join("|").toLocaleLowerCase("es");
const candidateSearchText = (candidate: InvitationPersonCandidate) => [candidate.identityCard, candidate.passport, candidate.firstName, candidate.lastName].join(" ");

export function mergeInvitationPeople(seeds: InvitationPersonSeed[]): InvitationPersonCandidate[] {
  const merged = new Map<string, InvitationPersonCandidate>();
  for (const seed of seeds) {
    const normalized: InvitationPersonSeed = {
      source: seed.source,
      firstName: clean(seed.firstName), lastName: clean(seed.lastName), identityCard: clean(seed.identityCard), passport: clean(seed.passport), residencePermit: clean(seed.residencePermit), address: clean(seed.address), occupation: clean(seed.occupation), phone: clean(seed.phone), email: clean(seed.email), birthDate: clean(seed.birthDate), birthPlace: clean(seed.birthPlace), nationality: clean(seed.nationality),
    };
    if (!normalized.firstName && !normalized.lastName && !normalized.identityCard && !normalized.passport) continue;
    const key = keyText(normalized);
    const existing = merged.get(key);
    if (!existing) {
      const { source, ...values } = normalized;
      merged.set(key, { key, sources: [source], ...values });
      continue;
    }
    if (!existing.sources.includes(normalized.source)) existing.sources.push(normalized.source);
    (Object.keys(normalized) as Array<keyof InvitationPersonSeed>).forEach(field => {
      if (field === "source") return;
      const currentField = field as keyof Omit<InvitationPersonCandidate, "key" | "sources">;
      if (!existing[currentField] && normalized[field]) (existing[currentField] as string) = normalized[field] as string;
    });
  }
  return Array.from(merged.values());
}

export function searchInvitationPeople(seeds: InvitationPersonSeed[], query: string, limit = 8): InvitationPersonCandidate[] {
  return rankFuzzyMatches(mergeInvitationPeople(seeds), query, candidateSearchText).slice(0, Math.min(Math.max(limit, 1), 12));
}
