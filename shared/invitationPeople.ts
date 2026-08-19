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
const normalizedKey = (value: string) => clean(value).toLocaleLowerCase("es");
const identityKeys = (seed: Pick<InvitationPersonSeed, "identityCard" | "passport">) => [
  seed.passport ? `passport:${normalizedKey(seed.passport)}` : "",
  seed.identityCard ? `documento:${normalizedKey(seed.identityCard)}` : "",
].filter(Boolean);
const fallbackKey = (seed: Pick<InvitationPersonSeed, "firstName" | "lastName" | "phone">) =>
  `persona:${[seed.firstName, seed.lastName, seed.phone].map(normalizedKey).filter(Boolean).join("|")}`;
const candidateSearchText = (candidate: InvitationPersonCandidate) => [candidate.identityCard, candidate.passport, candidate.firstName, candidate.lastName].join(" ");

export function mergeInvitationPeople(seeds: InvitationPersonSeed[]): InvitationPersonCandidate[] {
  const merged = new Map<string, InvitationPersonCandidate>();
  const candidateByIdentity = new Map<string, InvitationPersonCandidate>();
  for (const seed of seeds) {
    const normalized: InvitationPersonSeed = {
      source: seed.source,
      firstName: clean(seed.firstName), lastName: clean(seed.lastName), identityCard: clean(seed.identityCard), passport: clean(seed.passport), residencePermit: clean(seed.residencePermit), address: clean(seed.address), occupation: clean(seed.occupation), phone: clean(seed.phone), email: clean(seed.email), birthDate: clean(seed.birthDate), birthPlace: clean(seed.birthPlace), nationality: clean(seed.nationality),
    };
    if (!normalized.firstName && !normalized.lastName && !normalized.identityCard && !normalized.passport) continue;
    const aliases = identityKeys(normalized);
    const key = aliases[0] || fallbackKey(normalized);
    const matchingCandidates = Array.from(new Set(aliases.map(alias => candidateByIdentity.get(alias)).filter((candidate): candidate is InvitationPersonCandidate => Boolean(candidate))));
    const existing = matchingCandidates[0] || merged.get(fallbackKey(normalized));
    if (!existing) {
      const { source, ...values } = normalized;
      const candidate = { key, sources: [source], ...values };
      merged.set(key, candidate);
      aliases.forEach(alias => candidateByIdentity.set(alias, candidate));
      continue;
    }

    // Cuando una persona llega con varios documentos, todos los identificadores quedan vinculados a la misma ficha.
    matchingCandidates.slice(1).forEach(duplicate => {
      if (duplicate === existing) return;
      duplicate.sources.forEach(source => { if (!existing.sources.includes(source)) existing.sources.push(source); });
      (Object.keys(normalized) as Array<keyof InvitationPersonSeed>).forEach(field => {
        if (field === "source") return;
        const currentField = field as keyof Omit<InvitationPersonCandidate, "key" | "sources">;
        if (!existing[currentField] && duplicate[currentField]) (existing[currentField] as string) = duplicate[currentField] as string;
      });
      merged.delete(duplicate.key);
      candidateByIdentity.forEach((candidate, alias) => { if (candidate === duplicate) candidateByIdentity.set(alias, existing); });
    });
    if (!existing.sources.includes(normalized.source)) existing.sources.push(normalized.source);
    (Object.keys(normalized) as Array<keyof InvitationPersonSeed>).forEach(field => {
      if (field === "source") return;
      const currentField = field as keyof Omit<InvitationPersonCandidate, "key" | "sources">;
      // Las fuentes se entregan desde la más reciente a la más antigua: un campo no vacío posterior solo completa lo que antes faltaba.
      if (!existing[currentField] && normalized[field]) (existing[currentField] as string) = normalized[field] as string;
    });
    aliases.forEach(alias => candidateByIdentity.set(alias, existing));
  }
  return Array.from(merged.values());
}

export function searchInvitationPeople(seeds: InvitationPersonSeed[], query: string, limit = 8): InvitationPersonCandidate[] {
  return rankFuzzyMatches(mergeInvitationPeople(seeds), query, candidateSearchText).slice(0, Math.min(Math.max(limit, 1), 12));
}
