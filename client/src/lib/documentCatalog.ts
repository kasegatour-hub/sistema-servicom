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
