import React from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CatalogDocumentItem,
  DOCUMENT_CATALOG,
  DOCUMENT_TREATMENT_LABELS,
  DocumentTreatment,
  getDocumentCatalogLabel,
  matchesDocumentCatalogSearch,
} from "@/lib/documentCatalog";

type DocumentCatalogSelectorProps = {
  value: CatalogDocumentItem[];
  onChange: (items: CatalogDocumentItem[]) => void;
  idPrefix: string;
  error?: string;
};

const catalogOptions = [...DOCUMENT_CATALOG, { id: "otro-simple", label: "Otro documento simple" }];
const treatments = Object.entries(DOCUMENT_TREATMENT_LABELS) as Array<[DocumentTreatment, string]>;

export function DocumentCatalogSelector({ value, onChange, idPrefix, error = "" }: DocumentCatalogSelectorProps) {
  const [search, setSearch] = React.useState("");
  const selectedItem = (id: string) => value.find(item => item.id === id);
  const matchingOptions = catalogOptions.filter(option => matchesDocumentCatalogSearch(option.label, search));
  const visibleOptions = catalogOptions.filter(option => Boolean(selectedItem(option.id)) || (Boolean(search.trim()) && matchingOptions.some(match => match.id === option.id)));
  const hasNoSearchMatches = Boolean(search.trim()) && matchingOptions.length === 0;

  const selectDocument = (id: string, selected: boolean) => {
    if (!selected) {
      onChange(value.filter(item => item.id !== id));
      return;
    }
    onChange([...value, { id, quantity: 1, treatments: id === "otro-simple" ? ["simple"] : [] }]);
  };

  const updateItem = (id: string, updater: (item: CatalogDocumentItem) => CatalogDocumentItem) => {
    onChange(value.map(item => item.id === id ? updater(item) : item));
  };

  return (
    <fieldset className={`rounded-xl border bg-amber-50 p-4 ${error ? "border-rose-500 ring-1 ring-rose-200" : "border-amber-200"}`} aria-invalid={Boolean(error)} aria-describedby={error ? `${idPrefix}-documents-error` : undefined}>
      <legend className="px-1 text-sm font-semibold text-[#0B2B5E]">Lista de documentos <span className="text-red-600">*</span></legend>
      <p className="mb-3 text-xs text-slate-600">Marca cada documento. Al seleccionarlo inicia en cantidad 1; usa los controles <strong>−</strong> y <strong>+</strong> para ajustarlo. Las notas son opcionales.</p>
      <div className="mb-3">
        <label htmlFor={`${idPrefix}-document-search`} className="sr-only">Buscar documento</label>
        <Input id={`${idPrefix}-document-search`} type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar documento: ej. matrimonio, nacimento, predios…" aria-invalid={Boolean(error)} className={`bg-white ${error ? "border-rose-500 bg-rose-50 ring-1 ring-rose-200" : ""}`} />
        <p role="status" className="mt-1 text-xs text-slate-600">{search.trim() ? `${matchingOptions.length} resultado(s). Los documentos seleccionados se mantienen visibles.` : "Escribe para buscar por nombre, palabras parciales, sin tildes o con pequeños errores."}</p>
      </div>
      {error && <p id={`${idPrefix}-documents-error`} role="alert" className="mb-3 text-sm font-semibold text-rose-700">{error}</p>}
      <div className="space-y-2">
        {visibleOptions.map(option => {
          const item = selectedItem(option.id);
          const checkboxId = `${idPrefix}-${option.id}`;
          return (
            <div key={option.id} className={`rounded-lg border p-3 transition-colors ${item ? "border-[#0B2B5E]/30 bg-white shadow-sm" : "border-slate-200 bg-white/70"}`}>
              <div className="flex items-start gap-3">
                <input
                  id={checkboxId}
                  type="checkbox"
                  checked={Boolean(item)}
                  onChange={event => selectDocument(option.id, event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-400 accent-[#0B2B5E]"
                />
                <label htmlFor={checkboxId} className="min-w-0 flex-1 cursor-pointer text-sm font-medium text-slate-800">{option.label}</label>
                {item && (
                  <div className="flex shrink-0 items-center gap-1" aria-label={`Cantidad de ${getDocumentCatalogLabel(item)}`}>
                    <Button type="button" size="icon" variant="outline" className="h-8 w-8" aria-label={`Disminuir cantidad de ${option.label}`} disabled={item.quantity <= 1} onClick={() => updateItem(option.id, current => ({ ...current, quantity: Math.max(1, current.quantity - 1) }))}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="min-w-7 text-center text-sm font-bold text-[#0B2B5E]" aria-live="polite">{item.quantity}</span>
                    <Button type="button" size="icon" variant="outline" className="h-8 w-8 border-[#0B2B5E] text-[#0B2B5E]" aria-label={`Aumentar cantidad de ${option.label}`} onClick={() => updateItem(option.id, current => ({ ...current, quantity: current.quantity + 1 }))}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              {item && (
                <div className="ml-7 mt-3 space-y-3 border-t border-slate-100 pt-3">
                  {option.id === "otro-simple" && (
                    <Input
                      aria-label="Nombre de otro documento simple"
                      value={item.customLabel || ""}
                      onChange={event => updateItem(option.id, current => ({ ...current, customLabel: event.target.value }))}
                      placeholder="Especifica el otro documento simple"
                      maxLength={160}
                      required
                    />
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {treatments.map(([treatment, label]) => {
                      const treatmentId = `${checkboxId}-${treatment}`;
                      return <label key={treatment} htmlFor={treatmentId} className="flex cursor-pointer items-center gap-2 text-xs text-slate-700">
                        <input
                          id={treatmentId}
                          type="checkbox"
                          checked={item.treatments.includes(treatment)}
                          onChange={event => updateItem(option.id, current => ({
                            ...current,
                            treatments: event.target.checked
                              ? [...current.treatments, treatment]
                              : current.treatments.filter(currentTreatment => currentTreatment !== treatment),
                          }))}
                          className="h-4 w-4 rounded border-slate-400 accent-[#F28C00]"
                        />
                        {label}
                      </label>;
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {search.trim() && visibleOptions.length === 0 && <p className="rounded-lg border border-dashed border-slate-300 bg-white/70 p-4 text-center text-sm text-slate-600">No se encontraron documentos. Prueba con otra palabra o revisa la ortografía.</p>}
        {hasNoSearchMatches && visibleOptions.length > 0 && <p className="rounded-lg border border-dashed border-slate-300 bg-white/70 p-4 text-center text-sm text-slate-600">No se encontraron documentos nuevos. Se mantienen visibles los que ya seleccionaste.</p>}
      </div>
    </fieldset>
  );
}
