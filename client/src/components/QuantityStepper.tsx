import React, { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface QuantityStepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
  description?: string;
  id?: string;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function QuantityStepper({ value, min, max, onChange, label, description, id }: QuantityStepperProps) {
  const [draft, setDraft] = useState(() => String(clamp(value, min, max)));

  useEffect(() => {
    setDraft(String(clamp(value, min, max)));
  }, [value, min, max]);

  const commit = (rawValue: string) => {
    const numericText = rawValue.replace(/\D/g, "");
    setDraft(numericText);
    if (!numericText) return;
    onChange(clamp(Number(numericText), min, max));
  };

  const normalizeOnBlur = () => {
    const nextValue = clamp(Number(draft) || min, min, max);
    setDraft(String(nextValue));
    onChange(nextValue);
  };

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold text-slate-800">{label}</label>
      <div className="flex items-stretch gap-2" role="group" aria-label={label}>
        <Button
          type="button"
          variant="outline"
          aria-label={`Disminuir ${label}`}
          onClick={() => onChange(clamp(value - 1, min, max))}
          disabled={value <= min}
          className="h-12 w-12 shrink-0 rounded-lg border-2 border-[#0B2B5E] bg-white p-0 text-2xl font-bold text-[#0B2B5E] hover:bg-blue-50 disabled:opacity-40"
        >
          <Minus className="h-6 w-6" strokeWidth={3} aria-hidden="true" />
        </Button>
        <Input
          id={id}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={draft}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => commit(event.target.value)}
          onBlur={normalizeOnBlur}
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          className="h-12 min-w-0 flex-1 border-2 border-[#0B2B5E] bg-white text-center text-xl font-bold text-[#0B2B5E] shadow-sm focus-visible:ring-2 focus-visible:ring-[#F28C00]"
        />
        <Button
          type="button"
          variant="outline"
          aria-label={`Aumentar ${label}`}
          onClick={() => onChange(clamp(value + 1, min, max))}
          disabled={value >= max}
          className="h-12 w-12 shrink-0 rounded-lg border-2 border-[#0B2B5E] bg-white p-0 text-2xl font-bold text-[#0B2B5E] hover:bg-blue-50 disabled:opacity-40"
        >
          <Plus className="h-6 w-6" strokeWidth={3} aria-hidden="true" />
        </Button>
      </div>
      {description && <p className="text-[10px] text-gray-500">{description}</p>}
    </div>
  );
}
