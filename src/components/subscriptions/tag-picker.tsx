"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createTagAction } from "@/lib/actions/subscription-actions";

export interface TagOption {
  id: string;
  name: string;
  color: string;
}

/**
 * Multi-select de etiquetas del usuario. Escribir un nombre que no existe
 * y presionar Enter (o elegir la opción "Crear…") llama a `createTagAction`
 * de verdad — la etiqueta queda persistida en `Tag` y adjunta a la
 * selección local del formulario en el mismo paso.
 */
export function TagPicker({
  value,
  onChange,
  availableTags,
  disabled,
}: {
  value: string[];
  onChange: (tagIds: string[]) => void;
  availableTags: TagOption[];
  disabled?: boolean;
}) {
  const [tags, setTags] = useState<TagOption[]>(availableTags);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const selected = tags.filter((tag) => value.includes(tag.id));
  const query = search.trim().toLowerCase();
  const filteredTags = useMemo(
    () => (query ? tags.filter((tag) => tag.name.toLowerCase().includes(query)) : tags),
    [tags, query]
  );
  const exactMatch = tags.some((tag) => tag.name.toLowerCase() === query);

  function toggle(tagId: string) {
    onChange(value.includes(tagId) ? value.filter((id) => id !== tagId) : [...value, tagId]);
  }

  function handleCreate() {
    const name = search.trim();
    if (!name || pending) return;
    startTransition(async () => {
      const result = await createTagAction(name);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      const tag = result.tag!;
      setTags((prev) => (prev.some((t) => t.id === tag.id) ? prev : [...prev, tag]));
      onChange(value.includes(tag.id) ? value : [...value, tag.id]);
      setSearch("");
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((tag) => (
            <Badge
              key={tag.id}
              variant="outline"
              style={{ borderColor: tag.color, color: tag.color }}
            >
              {tag.name}
              {!disabled && (
                <button
                  type="button"
                  aria-label={`Quitar etiqueta ${tag.name}`}
                  onClick={() => toggle(tag.id)}
                  className="focus-visible:ring-ring/50 -mr-0.5 ml-1 rounded-full outline-none focus-visible:ring-2"
                >
                  <X className="size-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm" disabled={disabled} className="w-fit">
            <Plus className="size-3.5" />
            Agregar etiqueta
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              value={search}
              onValueChange={setSearch}
              placeholder="Buscar o crear etiqueta..."
              onKeyDown={(event) => {
                if (event.key === "Enter" && query && !exactMatch) {
                  event.preventDefault();
                  handleCreate();
                }
              }}
            />
            <CommandList>
              <CommandEmpty>Sin etiquetas todavía.</CommandEmpty>
              <CommandGroup>
                {filteredTags.map((tag) => {
                  const active = value.includes(tag.id);
                  return (
                    <CommandItem key={tag.id} value={tag.id} onSelect={() => toggle(tag.id)}>
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                      {active && <Check className="ml-auto size-4" />}
                    </CommandItem>
                  );
                })}
                {query && !exactMatch && (
                  <CommandItem value={`__create__${query}`} onSelect={handleCreate}>
                    <Plus className="size-4" />
                    Crear &ldquo;{search.trim()}&rdquo;
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
