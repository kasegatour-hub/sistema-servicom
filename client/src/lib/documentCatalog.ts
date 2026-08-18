export type DocumentTreatment = "traducido" | "apostillado" | "simple";

export type CatalogDocumentItem = {
  id: string;
  quantity: number;
  treatments: DocumentTreatment[];
  customLabel?: string;
};

export const DOCUMENT_TREATMENT_LABELS: Record<DocumentTreatment, string> = {
  traducido: "Traducido",
  apostillado: "Apostillado",
  simple: "Documento simple",
};

export const DOCUMENT_CATALOG = [
  { id: "acta-negativa-matrimonio", label: "Acta negativa de inscripción de matrimonio" },
  { id: "acta-nacimiento", label: "Acta de nacimiento" },
  { id: "registro-predios", label: "Registro de propiedad inmueble / Registro de predios" },
  { id: "constancia-no-onp", label: "Constancia de que no pertenece a ONP" },
  { id: "partida-matrimonio", label: "Partida de matrimonio" },
  { id: "constancia-no-ruc-pensionario", label: "Constancia de no RUC / Constancia de pensionario" },
  { id: "certificado-propiedad", label: "Certificado de propiedad" },
  { id: "constancia-no-pensionista", label: "Constancia de no pensionista" },
  { id: "registro-estado-civil", label: "Registro de estado civil" },
  { id: "acta-matrimonio", label: "Acta de matrimonio" },
  { id: "certificado-estudios", label: "Certificado de estudios" },
  { id: "partida-nacimiento", label: "Partida de nacimiento" },
] as const;

const catalogLabels = new Map<string, string>(DOCUMENT_CATALOG.map(item => [item.id, item.label]));

export function normalizeDocumentSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isSubsequence(search: string, candidate: string): boolean {
  let searchIndex = 0;
  for (const character of candidate) {
    if (character === search[searchIndex]) searchIndex += 1;
    if (searchIndex === search.length) return true;
  }
  return search.length === 0;
}

function editDistance(first: string, second: string): number {
  const previous = Array.from({ length: second.length + 1 }, (_, index) => index);
  for (let firstIndex = 1; firstIndex <= first.length; firstIndex += 1) {
    let diagonal = previous[0];
    previous[0] = firstIndex;
    for (let secondIndex = 1; secondIndex <= second.length; secondIndex += 1) {
      const saved = previous[secondIndex];
      previous[secondIndex] = Math.min(
        previous[secondIndex] + 1,
        previous[secondIndex - 1] + 1,
        diagonal + (first[firstIndex - 1] === second[secondIndex - 1] ? 0 : 1),
      );
      diagonal = saved;
    }
  }
  return previous[second.length];
}

function tokenMatchesDocument(token: string, candidateWords: string[]): boolean {
  if (candidateWords.some(word => word.includes(token) || isSubsequence(token, word))) return true;
  const allowedDistance = token.length >= 8 ? 2 : token.length >= 5 ? 1 : 0;
  return allowedDistance > 0 && candidateWords.some(word => Math.abs(word.length - token.length) <= allowedDistance && editDistance(token, word) <= allowedDistance);
}

export function matchesDocumentCatalogSearch(label: string, query: string): boolean {
  const normalizedQuery = normalizeDocumentSearchText(query);
  if (!normalizedQuery) return true;
  const candidateWords = normalizeDocumentSearchText(label).split(" ").filter(Boolean);
  return normalizedQuery.split(" ").filter(Boolean).every(token => tokenMatchesDocument(token, candidateWords));
}

export function getDocumentCatalogLabel(item: CatalogDocumentItem): string {
  if (item.id === "otro-simple") return item.customLabel?.trim() || "Otro documento simple";
  return catalogLabels.get(item.id) || "Documento";
}

export function normalizeCatalogDocumentItems(items: CatalogDocumentItem[]): CatalogDocumentItem[] {
  return items
    .filter(item => Number.isFinite(item.quantity) && item.quantity > 0)
    .map(item => ({
      ...item,
      quantity: Math.max(1, Math.floor(item.quantity)),
      treatments: Array.from(new Set(item.treatments)).filter((treatment): treatment is DocumentTreatment => treatment in DOCUMENT_TREATMENT_LABELS),
      customLabel: item.customLabel?.trim(),
    }))
    .filter(item => item.id !== "otro-simple" || Boolean(item.customLabel));
}

export function catalogDocumentsToChecklist(items: CatalogDocumentItem[]): string[] {
  return normalizeCatalogDocumentItems(items).map(item => {
    const treatmentText = item.treatments.map(treatment => DOCUMENT_TREATMENT_LABELS[treatment]).join(", ");
    return `${item.quantity} × ${getDocumentCatalogLabel(item)}${treatmentText ? ` — ${treatmentText}` : ""}`;
  });
}
