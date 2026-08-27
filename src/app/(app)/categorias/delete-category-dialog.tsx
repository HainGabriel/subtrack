"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { deleteCategoryAction } from "@/lib/actions/category-actions";

export interface DeletableCategory {
  id: string;
  name: string;
  subscriptionCount: number;
  budgetCount: number;
}

export function DeleteCategoryDialog({
  open,
  onOpenChange,
  category,
  otherCategories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: DeletableCategory | null;
  otherCategories: Array<{ id: string; name: string }>;
}) {
  const [pending, startTransition] = useTransition();
  const [reassignTo, setReassignTo] = useState<string>("");

  const hasSubscriptions = (category?.subscriptionCount ?? 0) > 0;

  function handleConfirm() {
    if (!category) return;
    if (hasSubscriptions && !reassignTo) {
      toast.error("Elige una categoría de destino");
      return;
    }
    startTransition(async () => {
      const result = await deleteCategoryAction({
        categoryId: category.id,
        reassignToCategoryId: hasSubscriptions ? reassignTo : undefined,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Categoría eliminada");
      setReassignTo("");
      onOpenChange(false);
    });
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setReassignTo("");
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar “{category?.name}”</AlertDialogTitle>
          <AlertDialogDescription>
            {hasSubscriptions ? (
              <>
                Esta categoría tiene {category?.subscriptionCount}{" "}
                {category?.subscriptionCount === 1 ? "suscripción" : "suscripciones"} asociadas.
                Elige a qué categoría reasignarlas antes de eliminarla.
              </>
            ) : (
              "Esta acción no se puede deshacer."
            )}
            {(category?.budgetCount ?? 0) > 0 && (
              <> También se eliminará su presupuesto asociado.</>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {hasSubscriptions && (
          <Field>
            <FieldLabel htmlFor="reassign-category">Reasignar a</FieldLabel>
            <Select value={reassignTo} onValueChange={setReassignTo}>
              <SelectTrigger id="reassign-category" className="w-full">
                <SelectValue placeholder="Elige una categoría" />
              </SelectTrigger>
              <SelectContent>
                {otherCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {otherCategories.length === 0 && (
              <FieldDescription>
                No tienes otra categoría disponible. Crea una nueva antes de eliminar esta.
              </FieldDescription>
            )}
          </Field>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={pending || (hasSubscriptions && otherCategories.length === 0)}
            className="bg-destructive/10 text-destructive hover:bg-destructive/20"
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
