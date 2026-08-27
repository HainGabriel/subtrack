"use client";

import { cn } from "@/lib/utils";
import { COLOR_SWATCHES } from "@/lib/validation/category";

/**
 * Reutiliza la misma paleta curada de 10 colores que categorías y métodos
 * de pago (`COLOR_SWATCHES`) para que el lenguaje visual de la app sea
 * consistente en todas las entidades que tienen `color`.
 */
export function ColorPicker({
  value,
  onChange,
  id,
  disabled,
}: {
  value: string;
  onChange: (color: string) => void;
  id?: string;
  disabled?: boolean;
}) {
  return (
    <div
      id={id}
      role="radiogroup"
      aria-label="Color"
      className="flex flex-wrap gap-2"
      data-disabled={disabled}
    >
      {COLOR_SWATCHES.map((swatch) => (
        <button
          key={swatch}
          type="button"
          role="radio"
          aria-checked={value === swatch}
          aria-label={swatch}
          disabled={disabled}
          onClick={() => onChange(swatch)}
          className={cn(
            "focus-visible:ring-ring/50 size-7 shrink-0 rounded-full border-2 transition-transform outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50",
            value === swatch ? "border-foreground scale-110" : "border-transparent hover:scale-105"
          )}
          style={{ backgroundColor: swatch }}
        />
      ))}
    </div>
  );
}
