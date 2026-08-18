import { describe, expect, it } from "vitest";
import { catalogDocumentsToChecklist, matchesDocumentCatalogSearch, normalizeCatalogDocumentItems } from "./documentCatalog";

describe("document catalog", () => {
  it("formats selected documents with an initial quantity and their treatments", () => {
    expect(catalogDocumentsToChecklist([
      { id: "acta-nacimiento", quantity: 1, treatments: ["apostillado", "traducido"] },
      { id: "registro-predios", quantity: 2, treatments: ["simple"] },
    ])).toEqual([
      "1 × Acta de nacimiento — Apostillado, Traducido",
      "2 × Registro de propiedad inmueble / Registro de predios — Documento simple",
    ]);
  });

  it("keeps only valid, non-empty entries and requires a name for another simple document", () => {
    expect(normalizeCatalogDocumentItems([
      { id: "otro-simple", quantity: 1, treatments: ["simple"], customLabel: "   " },
      { id: "otro-simple", quantity: 2.7, treatments: ["simple", "simple"], customLabel: " Certificado consular " },
      { id: "acta-matrimonio", quantity: 0, treatments: [] },
    ])).toEqual([
      { id: "otro-simple", quantity: 2, treatments: ["simple"], customLabel: "Certificado consular" },
    ]);
  });

  it("matches document labels with partial, accent-insensitive and small typo searches", () => {
    const label = "Acta negativa de inscripción de matrimonio";
    expect(matchesDocumentCatalogSearch(label, "matrimonio")).toBe(true);
    expect(matchesDocumentCatalogSearch(label, "inscripcion")).toBe(true);
    expect(matchesDocumentCatalogSearch(label, "matrimonoo")).toBe(true);
    expect(matchesDocumentCatalogSearch(label, "predios")).toBe(false);
  });
});
