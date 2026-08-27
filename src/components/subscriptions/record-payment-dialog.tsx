"use client";

import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  moneyAmountSchema,
  currencySchema,
  NON_PAID_STATUSES,
} from "@/lib/validation/subscription";
import { recordPaymentAction, markPaymentNonPaidAction } from "@/lib/actions/subscription-actions";

const PAYMENT_STATUS_OPTIONS = [
  { value: "PAID", label: "Pagado" },
  { value: "SKIPPED", label: "Omitido" },
  { value: "FAILED", label: "Fallido" },
  { value: "REFUNDED", label: "Reembolsado" },
] as const;

const paymentDialogSchema = z.object({
  status: z.enum(["PAID", ...NON_PAID_STATUSES]),
  dueDate: z.date({ error: "Selecciona la fecha prevista" }),
  paidDate: z.date().optional().nullable(),
  amount: moneyAmountSchema,
  currency: currencySchema,
  paymentMethodId: z.string().optional(),
  note: z.string().trim().max(1000).optional(),
});
type PaymentDialogInput = z.infer<typeof paymentDialogSchema>;

export interface PaymentMethodOption {
  id: string;
  alias: string;
}

export function RecordPaymentDialog({
  subscriptionId,
  nextBillingDate,
  defaultAmount,
  defaultCurrency,
  defaultPaymentMethodId,
  paymentMethods,
}: {
  subscriptionId: string;
  nextBillingDate: Date;
  defaultAmount: string;
  defaultCurrency: string;
  defaultPaymentMethodId?: string | null;
  paymentMethods: PaymentMethodOption[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const form = useForm<PaymentDialogInput>({
    resolver: zodResolver(paymentDialogSchema),
    defaultValues: {
      status: "PAID",
      dueDate: nextBillingDate,
      paidDate: new Date(),
      amount: defaultAmount,
      currency: defaultCurrency,
      paymentMethodId: defaultPaymentMethodId ?? undefined,
      note: "",
    },
  });

  const status = form.watch("status");

  function onSubmit(values: PaymentDialogInput) {
    startTransition(async () => {
      const result =
        values.status === "PAID"
          ? await recordPaymentAction(subscriptionId, {
              dueDate: values.dueDate,
              paidDate: values.paidDate ?? new Date(),
              amount: values.amount,
              currency: values.currency,
              paymentMethodId: values.paymentMethodId,
              note: values.note,
            })
          : await markPaymentNonPaidAction(subscriptionId, {
              dueDate: values.dueDate,
              paidDate: values.paidDate ?? undefined,
              status: values.status as (typeof NON_PAID_STATUSES)[number],
              amount: values.amount,
              currency: values.currency,
              paymentMethodId: values.paymentMethodId,
              note: values.note,
            });

      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Pago registrado");
      setOpen(false);
      form.reset({
        status: "PAID",
        dueDate: nextBillingDate,
        paidDate: new Date(),
        amount: defaultAmount,
        currency: defaultCurrency,
        paymentMethodId: defaultPaymentMethodId ?? undefined,
        note: "",
      });
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Registrar pago</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>
            Registra el resultado de este ciclo de cobro. Solo &ldquo;Pagado&rdquo; avanza la
            próxima fecha de cobro.
          </DialogDescription>
        </DialogHeader>

        <form
          id="record-payment-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <Field>
            <FieldLabel htmlFor="payment-status">Estado</FieldLabel>
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="payment-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field data-invalid={!!form.formState.errors.dueDate}>
              <FieldLabel htmlFor="payment-due-date">Fecha prevista</FieldLabel>
              <Controller
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="payment-due-date"
                        type="button"
                        variant="outline"
                        className="w-full justify-start font-normal"
                      >
                        <CalendarIcon className="size-4" />
                        {field.value
                          ? format(field.value, "d MMM yyyy", { locale: es })
                          : "Selecciona"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => date && field.onChange(date)}
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
              <FieldError errors={[form.formState.errors.dueDate]} />
            </Field>

            {status !== "SKIPPED" && (
              <Field>
                <FieldLabel htmlFor="payment-paid-date">Fecha de pago</FieldLabel>
                <Controller
                  control={form.control}
                  name="paidDate"
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="payment-paid-date"
                          type="button"
                          variant="outline"
                          className="w-full justify-start font-normal"
                        >
                          <CalendarIcon className="size-4" />
                          {field.value
                            ? format(field.value, "d MMM yyyy", { locale: es })
                            : "Selecciona"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ?? undefined}
                          onSelect={(date) => field.onChange(date ?? null)}
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
              </Field>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field data-invalid={!!form.formState.errors.amount}>
              <FieldLabel htmlFor="payment-amount">Importe</FieldLabel>
              <Input
                id="payment-amount"
                inputMode="decimal"
                {...form.register("amount")}
                aria-invalid={!!form.formState.errors.amount}
              />
              <FieldError errors={[form.formState.errors.amount]} />
            </Field>
            <Field data-invalid={!!form.formState.errors.currency}>
              <FieldLabel htmlFor="payment-currency">Moneda</FieldLabel>
              <Input
                id="payment-currency"
                maxLength={3}
                className="uppercase"
                {...form.register("currency")}
                aria-invalid={!!form.formState.errors.currency}
              />
              <FieldError errors={[form.formState.errors.currency]} />
            </Field>
          </div>

          {paymentMethods.length > 0 && (
            <Field>
              <FieldLabel htmlFor="payment-method">Método de pago</FieldLabel>
              <Controller
                control={form.control}
                name="paymentMethodId"
                render={({ field }) => (
                  <Select
                    value={field.value ?? "none"}
                    onValueChange={(v) => field.onChange(v === "none" ? undefined : v)}
                  >
                    <SelectTrigger id="payment-method" className="w-full">
                      <SelectValue placeholder="Sin especificar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin especificar</SelectItem>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method.id} value={method.id}>
                          {method.alias}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          )}

          <Field>
            <FieldLabel htmlFor="payment-note">Nota (opcional)</FieldLabel>
            <Textarea id="payment-note" rows={2} {...form.register("note")} />
          </Field>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="record-payment-form" disabled={pending}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
