"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ICON_NAMES, resolveIcon } from "@/lib/icon-map";

export function IconPicker({
  value,
  onChange,
  id,
  disabled,
}: {
  value: string;
  onChange: (icon: string) => void;
  id?: string;
  disabled?: boolean;
}) {
  return (
    <ScrollArea className="h-40 rounded-lg border">
      <div
        id={id}
        role="radiogroup"
        aria-label="Ícono"
        className="grid grid-cols-6 gap-1 p-2 sm:grid-cols-8"
      >
        {ICON_NAMES.map((name) => {
          const Icon = resolveIcon(name);
          const active = value === name;
          return (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={name}
              disabled={disabled}
              onClick={() => onChange(name)}
              className={cn(
                "focus-visible:ring-ring/50 flex size-9 items-center justify-center rounded-lg border outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50",
                active
                  ? "border-primary bg-accent text-accent-foreground"
                  : "hover:bg-muted border-transparent"
              )}
            >
              <Icon className="size-4" />
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
