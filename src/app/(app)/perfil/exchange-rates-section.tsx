"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { CURRENCIES } from "@/lib/domain/currencies";
import { exchangeRateSchema, type ExchangeRateInput } from "@/lib/validation/exchange-rate";
import {
  createExchangeRateAction,
  deleteExchangeRateAction,
} from "@/lib/actions/exchange-rate-actions";

export interface ExchangeRateRow {
  id: string;
  baseCurrency: string;
  quoteCurrency: string;
  rate: string;
  asOfDate: string;
}

export function ExchangeRatesSection({
  rates,
  defaultCurrency,
}: {
  rates: ExchangeRateRow[];
  defaultCurrency: string;
}) {
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const form = useForm<ExchangeRateInput>({
    resolver: zodResolver(exchangeRateSchema),
    defaultValues: {
      baseCurrency: defaultCurrency,
      quoteCurrency: defaultCurrency === "USD" ? "DOP" : "USD",
      rate: "",
      asOfDate: new Date().toISOString().slice(0, 10),
    },
  });

  function onSubmit(values: ExchangeRateInput) {
    startTransition(async () => {
      const result = await createExchangeRateAction(values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Tasa de cambio agregada");
      form.reset({ ...values, rate: "" });
    });
  }

  function handleDelete(id: string) {
    setDeletingId(id);
    startTransition(async () => {
      const result = await deleteExchangeRateAction(id);
      setDeletingId(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Tasa de cambio eliminada");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Alert>
        <AlertTitle>Tasas manuales</AlertTitle>
        <AlertDescription>
          Estas tasas las ingresas tú y no se actualizan automáticamente. Cualquier total convertido
          a partir de ellas es una estimación.
        </AlertDescription>
      </Alert>

      {rates.length === 0 ? (
        <Empty className="border py-8">
          <EmptyTitle>Sin tasas registradas</EmptyTitle>
          <EmptyDescription>Agrega una tasa de cambio manual abajo.</EmptyDescription>
        </Empty>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Par</TableHead>
                <TableHead>Tasa</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    {r.baseCurrency} → {r.quoteCurrency}
                  </TableCell>
                  <TableCell>{r.rate}</TableCell>
                  <TableCell>{new Date(r.asOfDate).toLocaleDateString("es-DO")}</TableCell>
                  <TableCell>Manual</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={deletingId === r.id}
                      onClick={() => handleDelete(r.id)}
                      aria-label={`Eliminar tasa ${r.baseCurrency} a ${r.quoteCurrency}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid gap-3 rounded-lg border p-3 sm:grid-cols-5 sm:items-end"
      >
        <Field data-invalid={!!form.formState.errors.baseCurrency}>
          <FieldLabel htmlFor="rate-base">De</FieldLabel>
          <Select
            value={form.watch("baseCurrency")}
            onValueChange={(v) => form.setValue("baseCurrency", v, { shouldValidate: true })}
          >
            <SelectTrigger id="rate-base" className="w-full">
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
          <FieldError errors={[form.formState.errors.baseCurrency]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.quoteCurrency}>
          <FieldLabel htmlFor="rate-quote">A</FieldLabel>
          <Select
            value={form.watch("quoteCurrency")}
            onValueChange={(v) => form.setValue("quoteCurrency", v, { shouldValidate: true })}
          >
            <SelectTrigger id="rate-quote" className="w-full">
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
          <FieldError errors={[form.formState.errors.quoteCurrency]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.rate}>
          <FieldLabel htmlFor="rate-value">Tasa</FieldLabel>
          <Input
            id="rate-value"
            inputMode="decimal"
            placeholder="1.00"
            {...form.register("rate")}
            aria-invalid={!!form.formState.errors.rate}
          />
          <FieldError errors={[form.formState.errors.rate]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.asOfDate}>
          <FieldLabel htmlFor="rate-date">Fecha</FieldLabel>
          <Input
            id="rate-date"
            type="date"
            {...form.register("asOfDate")}
            aria-invalid={!!form.formState.errors.asOfDate}
          />
          <FieldError errors={[form.formState.errors.asOfDate]} />
        </Field>

        <Button type="submit" disabled={pending}>
          <Plus className="size-4" />
          Agregar
        </Button>
      </form>
    </div>
  );
}
