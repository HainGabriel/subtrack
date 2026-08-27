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
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURRENCIES } from "@/lib/domain/currencies";
import {
  BUDGET_PERIODS,
  BUDGET_PERIOD_LABELS,
  BUDGET_SCOPE_LABELS,
  budgetSchema,
  type BudgetInput,
} from "@/lib/validation/budget";
import { createBudgetAction, updateBudgetAction } from "@/lib/actions/budget-actions";

export interface BudgetFormValue {
  id: string;
  scope: BudgetInput["scope"];
  categoryId: string | null;
  period: BudgetInput["period"];
  amount: string;
  currency: string;
  alertThresholdPercent: number;
}

export function BudgetFormDialog({
  open,
  onOpenChange,
  budget,
  categories,
  defaultCurrency,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: BudgetFormValue | null;
  categories: Array<{ id: string; name: string }>;
  defaultCurrency: string;
}) {
  const isEdit = !!budget;
  const [pending, startTransition] = useTransition();

  const defaults: BudgetInput = {
    scope: budget?.scope ?? "GLOBAL",
    categoryId: budget?.categoryId ?? null,
    period: budget?.period ?? "MONTHLY",
    amount: budget?.amount ?? "",
    currency: budget?.currency ?? defaultCurrency,
    alertThresholdPercent: budget?.alertThresholdPercent ?? 80,
  };

  const form = useForm<BudgetInput>({
    resolver: zodResolver(budgetSchema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (open) {
      form.reset(defaults);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, budget]);

  const scope = form.watch("scope");
  const threshold = form.watch("alertThresholdPercent");

  function onSubmit(values: BudgetInput) {
    startTransition(async () => {
      const result = isEdit
        ? await updateBudgetAction(budget!.id, values)
        : await createBudgetAction(values);

      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(isEdit ? "Presupuesto actualizado" : "Presupuesto creado");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar presupuesto" : "Nuevo presupuesto"}</DialogTitle>
          <DialogDescription>
            Define un límite de gasto global o por categoría y recibe una alerta cuando te acerques
            a él.
          </DialogDescription>
        </DialogHeader>

        <form
          id="budget-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <Field data-invalid={!!form.formState.errors.scope}>
            <FieldLabel>Alcance</FieldLabel>
            <RadioGroup
              value={scope}
              onValueChange={(v) => {
                form.setValue("scope", v as BudgetInput["scope"], { shouldValidate: true });
                if (v === "GLOBAL") form.setValue("categoryId", null);
              }}
              className="grid-cols-2"
            >
              {(["GLOBAL", "CATEGORY"] as const).map((s) => (
                <label
                  key={s}
                  className="border-input has-data-checked:border-primary has-data-checked:bg-primary/5 flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm"
                >
                  <RadioGroupItem value={s} id={`scope-${s}`} />
                  {BUDGET_SCOPE_LABELS[s]}
                </label>
              ))}
            </RadioGroup>
            <FieldError errors={[form.formState.errors.scope]} />
          </Field>

          {scope === "CATEGORY" && (
            <Field data-invalid={!!form.formState.errors.categoryId}>
              <FieldLabel htmlFor="budget-category">Categoría</FieldLabel>
              <Select
                value={form.watch("categoryId") ?? ""}
                onValueChange={(v) => form.setValue("categoryId", v, { shouldValidate: true })}
              >
                <SelectTrigger id="budget-category" className="w-full">
                  <SelectValue placeholder="Elige una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[form.formState.errors.categoryId]} />
            </Field>
          )}

          <Field data-invalid={!!form.formState.errors.period}>
            <FieldLabel htmlFor="budget-period">Período</FieldLabel>
            <Select
              value={form.watch("period")}
              onValueChange={(v) =>
                form.setValue("period", v as BudgetInput["period"], { shouldValidate: true })
              }
            >
              <SelectTrigger id="budget-period" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUDGET_PERIODS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {BUDGET_PERIOD_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={[form.formState.errors.period]} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field data-invalid={!!form.formState.errors.amount}>
              <FieldLabel htmlFor="budget-amount">Importe</FieldLabel>
              <Input
                id="budget-amount"
                inputMode="decimal"
                placeholder="0.00"
                {...form.register("amount")}
                aria-invalid={!!form.formState.errors.amount}
              />
              <FieldError errors={[form.formState.errors.amount]} />
            </Field>

            <Field data-invalid={!!form.formState.errors.currency}>
              <FieldLabel htmlFor="budget-currency">Moneda</FieldLabel>
              <Select
                value={form.watch("currency")}
                onValueChange={(v) => form.setValue("currency", v, { shouldValidate: true })}
              >
                <SelectTrigger id="budget-currency" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[form.formState.errors.currency]} />
            </Field>
          </div>

          <Field data-invalid={!!form.formState.errors.alertThresholdPercent}>
            <FieldLabel htmlFor="budget-threshold">Umbral de alerta ({threshold}%)</FieldLabel>
            <FieldContent>
              <Slider
                id="budget-threshold"
                min={0}
                max={100}
                step={5}
                value={[threshold]}
                onValueChange={([v]) =>
                  form.setValue("alertThresholdPercent", v, { shouldValidate: true })
                }
              />
            </FieldContent>
            <FieldDescription>
              Te avisaremos cuando tu gasto real alcance este porcentaje del presupuesto.
            </FieldDescription>
            <FieldError errors={[form.formState.errors.alertThresholdPercent]} />
          </Field>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="budget-form" disabled={pending}>
            {isEdit ? "Guardar cambios" : "Crear presupuesto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
