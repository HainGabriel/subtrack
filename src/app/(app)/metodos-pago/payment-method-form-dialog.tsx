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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ICON_NAMES, resolveIcon } from "@/lib/icon-map";
import {
  COLOR_SWATCHES,
  PAYMENT_METHOD_TYPES,
  PAYMENT_METHOD_TYPE_LABELS,
  paymentMethodSchema,
  type PaymentMethodInput,
} from "@/lib/validation/payment-method";
import {
  createPaymentMethodAction,
  updatePaymentMethodAction,
} from "@/lib/actions/payment-method-actions";

export interface PaymentMethodFormValue {
  id: string;
  type: PaymentMethodInput["type"];
  alias: string;
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
  color: string;
  icon: string;
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 21 }, (_, i) => CURRENT_YEAR + i);

export function PaymentMethodFormDialog({
  open,
  onOpenChange,
  method,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  method: PaymentMethodFormValue | null;
}) {
  const isEdit = !!method;
  const [pending, startTransition] = useTransition();

  const form = useForm<PaymentMethodInput>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: {
      type: method?.type ?? "CARD",
      alias: method?.alias ?? "",
      brand: method?.brand ?? "",
      last4: method?.last4 ?? "",
      expMonth: method?.expMonth ?? null,
      expYear: method?.expYear ?? null,
      color: method?.color ?? COLOR_SWATCHES[0],
      icon: method?.icon ?? "credit-card",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        type: method?.type ?? "CARD",
        alias: method?.alias ?? "",
        brand: method?.brand ?? "",
        last4: method?.last4 ?? "",
        expMonth: method?.expMonth ?? null,
        expYear: method?.expYear ?? null,
        color: method?.color ?? COLOR_SWATCHES[0],
        icon: method?.icon ?? "credit-card",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, method]);

  const type = form.watch("type");
  const selectedColor = form.watch("color");
  const selectedIcon = form.watch("icon");
  const isCard = type === "CARD";

  function onSubmit(values: PaymentMethodInput) {
    startTransition(async () => {
      const result = isEdit
        ? await updatePaymentMethodAction(method!.id, values)
        : await createPaymentMethodAction(values);

      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(isEdit ? "Método de pago actualizado" : "Método de pago creado");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar método de pago" : "Nuevo método de pago"}</DialogTitle>
          <DialogDescription>
            Nunca pidas ni guardes el número completo de tarjeta ni el CVV — solo los últimos 4
            dígitos.
          </DialogDescription>
        </DialogHeader>

        <form
          id="payment-method-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto pr-1"
        >
          <Field data-invalid={!!form.formState.errors.type}>
            <FieldLabel htmlFor="pm-type">Tipo</FieldLabel>
            <Select
              value={type}
              onValueChange={(v) =>
                form.setValue("type", v as PaymentMethodInput["type"], { shouldValidate: true })
              }
            >
              <SelectTrigger id="pm-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHOD_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {PAYMENT_METHOD_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={[form.formState.errors.type]} />
          </Field>

          <Field data-invalid={!!form.formState.errors.alias}>
            <FieldLabel htmlFor="pm-alias">Alias</FieldLabel>
            <Input
              id="pm-alias"
              placeholder="Ej. Tarjeta principal"
              {...form.register("alias")}
              aria-invalid={!!form.formState.errors.alias}
            />
            <FieldError errors={[form.formState.errors.alias]} />
          </Field>

          <Field data-invalid={!!form.formState.errors.brand}>
            <FieldLabel htmlFor="pm-brand">Marca (opcional)</FieldLabel>
            <Input
              id="pm-brand"
              placeholder="Ej. Visa, BHD, Banreservas"
              {...form.register("brand")}
              aria-invalid={!!form.formState.errors.brand}
            />
            <FieldError errors={[form.formState.errors.brand]} />
          </Field>

          {isCard && (
            <>
              <Field data-invalid={!!form.formState.errors.last4}>
                <FieldLabel htmlFor="pm-last4">Últimos 4 dígitos (opcional)</FieldLabel>
                <Input
                  id="pm-last4"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  placeholder="1234"
                  {...form.register("last4", {
                    onChange: (e) => {
                      e.target.value = e.target.value.replace(/\D/g, "").slice(0, 4);
                    },
                  })}
                  aria-invalid={!!form.formState.errors.last4}
                />
                <FieldError errors={[form.formState.errors.last4]} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field data-invalid={!!form.formState.errors.expMonth}>
                  <FieldLabel htmlFor="pm-exp-month">Mes de expiración</FieldLabel>
                  <Select
                    value={form.watch("expMonth")?.toString() ?? ""}
                    onValueChange={(v) =>
                      form.setValue("expMonth", Number(v), { shouldValidate: true })
                    }
                  >
                    <SelectTrigger id="pm-exp-month" className="w-full">
                      <SelectValue placeholder="Mes" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m) => (
                        <SelectItem key={m} value={m.toString()}>
                          {m.toString().padStart(2, "0")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError errors={[form.formState.errors.expMonth]} />
                </Field>

                <Field data-invalid={!!form.formState.errors.expYear}>
                  <FieldLabel htmlFor="pm-exp-year">Año de expiración</FieldLabel>
                  <Select
                    value={form.watch("expYear")?.toString() ?? ""}
                    onValueChange={(v) =>
                      form.setValue("expYear", Number(v), { shouldValidate: true })
                    }
                  >
                    <SelectTrigger id="pm-exp-year" className="w-full">
                      <SelectValue placeholder="Año" />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS.map((y) => (
                        <SelectItem key={y} value={y.toString()}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError errors={[form.formState.errors.expYear]} />
                </Field>
              </div>
            </>
          )}

          <Field data-invalid={!!form.formState.errors.color}>
            <FieldLabel htmlFor="pm-color">Color</FieldLabel>
            <FieldContent>
              <div
                id="pm-color"
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
            <FieldLabel htmlFor="pm-icon">Ícono</FieldLabel>
            <FieldContent>
              <ScrollArea className="h-32 rounded-lg border">
                <div
                  id="pm-icon"
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
          <Button type="submit" form="payment-method-form" disabled={pending}>
            {isEdit ? "Guardar cambios" : "Crear método"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
