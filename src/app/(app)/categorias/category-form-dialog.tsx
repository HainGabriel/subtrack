"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ICON_NAMES, resolveIcon } from "@/lib/icon-map";
import { COLOR_SWATCHES, categorySchema, type CategoryInput } from "@/lib/validation/category";
import { createCategoryAction, updateCategoryAction } from "@/lib/actions/category-actions";

export interface CategoryFormValue {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: CategoryFormValue | null;
}) {
  const isEdit = !!category;
  const [pending, startTransition] = useTransition();

  const form = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name ?? "",
      color: category?.color ?? COLOR_SWATCHES[0],
      icon: category?.icon ?? ICON_NAMES[0],
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: category?.name ?? "",
        color: category?.color ?? COLOR_SWATCHES[0],
        icon: category?.icon ?? ICON_NAMES[0],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, category]);

  const selectedColor = form.watch("color");
  const selectedIcon = form.watch("icon");

  function onSubmit(values: CategoryInput) {
    startTransition(async () => {
      const result = isEdit
        ? await updateCategoryAction(category!.id, values)
        : await createCategoryAction(values);

      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(isEdit ? "Categoría actualizada" : "Categoría creada");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
          <DialogDescription>
            Elige un nombre, color e ícono para identificar la categoría.
          </DialogDescription>
        </DialogHeader>

        <form
          id="category-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <Field data-invalid={!!form.formState.errors.name}>
            <FieldLabel htmlFor="category-name">Nombre</FieldLabel>
            <Input
              id="category-name"
              autoFocus
              {...form.register("name")}
              aria-invalid={!!form.formState.errors.name}
            />
            <FieldError errors={[form.formState.errors.name]} />
          </Field>

          <Field data-invalid={!!form.formState.errors.color}>
            <FieldLabel htmlFor="category-color">Color</FieldLabel>
            <FieldContent>
              <div
                id="category-color"
                role="radiogroup"
                aria-label="Color"
                className="flex flex-wrap gap-2"
              >
                {COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    role="radio"
                    aria-checked={selectedColor === swatch}
                    aria-label={swatch}
                    onClick={() => form.setValue("color", swatch, { shouldValidate: true })}
                    className={cn(
                      "focus-visible:ring-ring/50 size-7 rounded-full border-2 transition-transform outline-none focus-visible:ring-3",
                      selectedColor === swatch
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: swatch }}
                  />
                ))}
              </div>
            </FieldContent>
            <FieldError errors={[form.formState.errors.color]} />
          </Field>

          <Field data-invalid={!!form.formState.errors.icon}>
            <FieldLabel htmlFor="category-icon">Ícono</FieldLabel>
            <FieldContent>
              <ScrollArea className="h-40 rounded-lg border">
                <div
                  id="category-icon"
                  role="radiogroup"
                  aria-label="Ícono"
                  className="grid grid-cols-6 gap-1 p-2"
                >
                  {ICON_NAMES.map((name) => {
                    const Icon = resolveIcon(name);
                    const active = selectedIcon === name;
                    return (
                      <button
                        key={name}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        aria-label={name}
                        onClick={() => form.setValue("icon", name, { shouldValidate: true })}
                        className={cn(
                          "focus-visible:ring-ring/50 flex size-9 items-center justify-center rounded-lg border outline-none focus-visible:ring-3",
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
            </FieldContent>
            <FieldError errors={[form.formState.errors.icon]} />
          </Field>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="category-form" disabled={pending}>
            {isEdit ? "Guardar cambios" : "Crear categoría"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
