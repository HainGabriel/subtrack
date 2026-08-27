"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import type { BillingFrequency, CustomIntervalUnit } from "@/generated/prisma/enums";
import { BILLING_FREQUENCIES, CUSTOM_INTERVAL_UNITS } from "@/lib/validation/subscription";

export const FREQUENCY_LABELS: Record<BillingFrequency, string> = {
  WEEKLY: "Semanal",
  MONTHLY: "Mensual",
  BIMONTHLY: "Bimestral",
  QUARTERLY: "Trimestral",
  SEMIANNUAL: "Semestral",
  ANNUAL: "Anual",
  CUSTOM: "Personalizada",
};

export const CUSTOM_UNIT_LABELS: Record<CustomIntervalUnit, { singular: string; plural: string }> =
  {
    DAY: { singular: "día", plural: "días" },
    WEEK: { singular: "semana", plural: "semanas" },
    MONTH: { singular: "mes", plural: "meses" },
    YEAR: { singular: "año", plural: "años" },
  };

export function FrequencySelect({
  value,
  onValueChange,
  customIntervalCount,
  onCustomIntervalCountChange,
  customIntervalUnit,
  onCustomIntervalUnitChange,
  disabled,
  countError,
  unitError,
}: {
  value: BillingFrequency;
  onValueChange: (value: BillingFrequency) => void;
  customIntervalCount?: number;
  onCustomIntervalCountChange: (value: number) => void;
  customIntervalUnit?: CustomIntervalUnit;
  onCustomIntervalUnitChange: (value: CustomIntervalUnit) => void;
  disabled?: boolean;
  countError?: { message?: string };
  unitError?: { message?: string };
}) {
  return (
    <div className="flex flex-col gap-3">
      <Select
        value={value}
        onValueChange={(v) => onValueChange(v as BillingFrequency)}
        disabled={disabled}
      >
        <SelectTrigger
          id="billingFrequency"
          className="w-full"
          aria-label="Frecuencia de facturación"
        >
          <SelectValue placeholder="Selecciona una frecuencia" />
        </SelectTrigger>
        <SelectContent>
          {BILLING_FREQUENCIES.map((frequency) => (
            <SelectItem key={frequency} value={frequency}>
              {FREQUENCY_LABELS[frequency]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {value === "CUSTOM" && (
        <div className="grid grid-cols-2 gap-3">
          <Field data-invalid={!!countError}>
            <FieldLabel htmlFor="customIntervalCount">Cada</FieldLabel>
            <Input
              id="customIntervalCount"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              disabled={disabled}
              value={customIntervalCount ?? ""}
              onChange={(event) => onCustomIntervalCountChange(Number(event.target.value))}
              aria-invalid={!!countError}
            />
            <FieldError errors={[countError]} />
          </Field>
          <Field data-invalid={!!unitError}>
            <FieldLabel htmlFor="customIntervalUnit">Unidad</FieldLabel>
            <Select
              value={customIntervalUnit}
              onValueChange={(v) => onCustomIntervalUnitChange(v as CustomIntervalUnit)}
              disabled={disabled}
            >
              <SelectTrigger id="customIntervalUnit" className="w-full" aria-invalid={!!unitError}>
                <SelectValue placeholder="Unidad" />
              </SelectTrigger>
              <SelectContent>
                {CUSTOM_INTERVAL_UNITS.map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {CUSTOM_UNIT_LABELS[unit].plural}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={[unitError]} />
          </Field>
        </div>
      )}
    </div>
  );
}
