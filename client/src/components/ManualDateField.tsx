import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const pad = (value: number) => String(value).padStart(2, "0");
const toIsoDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

function formatManualDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

function formatManualDateInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseManualDate(value: string): string | null {
  const normalized = value.trim().replace(/[.\-]/g, "/");
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(normalized);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? toIsoDate(date) : null;
}

function fromIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : undefined;
}

export function ManualDateField({ id, label, value, onChange, required = false, minYear = 1900, maxYear = new Date().getFullYear() + 25 }: { id: string; label: string; value: string; onChange: (value: string) => void; required?: boolean; minYear?: number; maxYear?: number }) {
  const selectedDate = fromIsoDate(value);
  const [draft, setDraft] = useState(() => formatManualDate(value));
  const [open, setOpen] = useState(false);
  const [manualError, setManualError] = useState("");
  const [month, setMonth] = useState(() => selectedDate || new Date());
  const years = useMemo(() => Array.from({ length: maxYear - minYear + 1 }, (_, index) => maxYear - index), [minYear, maxYear]);

  useEffect(() => { setDraft(formatManualDate(value)); if (selectedDate) setMonth(selectedDate); }, [value]);

  const commitManualDate = () => {
    if (!draft.trim()) { setManualError(""); onChange(""); return; }
    const parsed = parseManualDate(draft);
    if (!parsed) { setManualError("Usa el formato DD/MM/AAAA."); return; }
    setManualError("");
    onChange(parsed);
  };
  const changeYear = (year: number) => setMonth(current => new Date(year, current.getMonth(), 1));

  return <div><label htmlFor={id} className="text-sm font-medium">{label}{required ? " *" : ""}</label><p className="mt-0.5 text-xs text-slate-500">Escribe DD/MM/AAAA o usa el calendario. / Scrivi GG/MM/AAAA o usa il calendario.</p><div className="relative mt-1"><Input id={id} value={draft} onChange={event => { setDraft(formatManualDateInput(event.target.value)); setManualError(""); }} onBlur={commitManualDate} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); commitManualDate(); } }} placeholder="DD/MM/AAAA" inputMode="numeric" pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}" maxLength={10} required={required} className="h-11 bg-white pr-12" autoComplete="bday" /><Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><Button type="button" variant="ghost" size="icon" aria-label={`Abrir calendario de ${label}`} className="absolute right-1 top-1 h-9 w-9 text-[#0B2B5E] hover:bg-blue-50"><CalendarDays className="h-5 w-5" /></Button></PopoverTrigger><PopoverContent align="end" className="w-[22rem] p-3"><div className="mb-3 rounded-lg border border-blue-100 bg-blue-50 p-2"><p className="text-xs font-semibold text-[#0B2B5E]">Año / Anno</p><div className="mt-1 flex items-center gap-2"><Button type="button" variant="outline" size="icon" aria-label="Año anterior" className="h-11 w-11 shrink-0" onClick={() => changeYear(Math.max(minYear, month.getFullYear() - 1))}><ChevronLeft className="h-5 w-5" /></Button><select aria-label={`Año de ${label}`} value={month.getFullYear()} onChange={event => changeYear(Number(event.target.value))} className="h-11 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 text-base font-semibold text-[#0B2B5E]">{years.map(year => <option key={year} value={year}>{year}</option>)}</select><Button type="button" variant="outline" size="icon" aria-label="Año siguiente" className="h-11 w-11 shrink-0" onClick={() => changeYear(Math.min(maxYear, month.getFullYear() + 1))}><ChevronRight className="h-5 w-5" /></Button></div></div><Calendar mode="single" selected={selectedDate} month={month} onMonthChange={setMonth} onSelect={date => { if (!date) return; onChange(toIsoDate(date)); setDraft(formatManualDate(toIsoDate(date))); setManualError(""); setOpen(false); }} captionLayout="label" fromYear={minYear} toYear={maxYear} className="mx-auto rounded-lg border border-slate-100" /></PopoverContent></Popover></div>{manualError && <p role="alert" className="mt-1 text-xs text-rose-700">{manualError}</p>}</div>;
}

export { formatManualDate, formatManualDateInput, parseManualDate };
