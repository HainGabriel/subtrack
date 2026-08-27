"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURRENCIES, TIMEZONES } from "@/lib/domain/currencies";
import { preferencesSchema, type PreferencesInput } from "@/lib/validation/profile";
import { updatePreferencesAction } from "@/lib/actions/profile-actions";
import { ExchangeRatesSection, type ExchangeRateRow } from "./exchange-rates-section";

const WEEKDAYS = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
];

export function PreferencesForm({
  preferences,
  exchangeRates,
}: {
  preferences: PreferencesInput;
  exchangeRates: ExchangeRateRow[];
}) {
  const [pending, startTransition] = useTransition();

  const form = useForm<PreferencesInput>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: preferences,
  });

  function onSubmit(values: PreferencesInput) {
    startTransition(async () => {
      const result = await updatePreferencesAction(values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Preferencias actualizadas");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Preferencias generales</CardTitle>
          <CardDescription>
            Estas opciones afectan cómo se muestran los montos y fechas en toda la app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!form.formState.errors.baseCurrency}>
                <FieldLabel htmlFor="pref-currency">Moneda base</FieldLabel>
                <Select
                  value={form.watch("baseCurrency")}
                  onValueChange={(v) => form.setValue("baseCurrency", v, { shouldValidate: true })}
                >
                  <SelectTrigger id="pref-currency" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.code} — {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[form.formState.errors.baseCurrency]} />
              </Field>

              <Field data-invalid={!!form.formState.errors.timezone}>
                <FieldLabel htmlFor="pref-timezone">Zona horaria</FieldLabel>
                <Select
                  value={form.watch("timezone")}
                  onValueChange={(v) => form.setValue("timezone", v, { shouldValidate: true })}
                >
                  <SelectTrigger id="pref-timezone" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[form.formState.errors.timezone]} />
              </Field>
            </div>

            <Field data-invalid={!!form.formState.errors.weekStartsOn}>
              <FieldLabel htmlFor="pref-week-start">La semana inicia el</FieldLabel>
              <Select
                value={form.watch("weekStartsOn")?.toString()}
                onValueChange={(v) =>
                  form.setValue("weekStartsOn", Number(v), { shouldValidate: true })
                }
              >
                <SelectTrigger id="pref-week-start" className="w-full sm:w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAYS.map((d) => (
                    <SelectItem key={d.value} value={d.value.toString()}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[form.formState.errors.weekStartsOn]} />
            </Field>

            <Separator />

            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-medium">Notificaciones</h3>

              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor="pref-notify-email">Correo electrónico</FieldLabel>
                  <FieldDescription>Recibe avisos importantes por correo.</FieldDescription>
                </FieldContent>
                <Switch
                  id="pref-notify-email"
                  checked={form.watch("notifyEmail")}
                  onCheckedChange={(v) => form.setValue("notifyEmail", v, { shouldValidate: true })}
                />
              </Field>

              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor="pref-notify-inapp">Dentro de la app</FieldLabel>
                  <FieldDescription>Muestra notificaciones en el panel.</FieldDescription>
                </FieldContent>
                <Switch
                  id="pref-notify-inapp"
                  checked={form.watch("notifyInApp")}
                  onCheckedChange={(v) => form.setValue("notifyInApp", v, { shouldValidate: true })}
                />
              </Field>

              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor="pref-weekly">Resumen semanal</FieldLabel>
                  <FieldDescription>Un correo con tu actividad de la semana.</FieldDescription>
                </FieldContent>
                <Switch
                  id="pref-weekly"
                  checked={form.watch("weeklySummary")}
                  onCheckedChange={(v) =>
                    form.setValue("weeklySummary", v, { shouldValidate: true })
                  }
                />
              </Field>

              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor="pref-monthly">Resumen mensual</FieldLabel>
                  <FieldDescription>Un correo con tu actividad del mes.</FieldDescription>
                </FieldContent>
                <Switch
                  id="pref-monthly"
                  checked={form.watch("monthlySummary")}
                  onCheckedChange={(v) =>
                    form.setValue("monthlySummary", v, { shouldValidate: true })
                  }
                />
              </Field>
            </div>

            <div>
              <Button type="submit" disabled={pending}>
                Guardar preferencias
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tasas de cambio</CardTitle>
          <CardDescription>
            Úsalas para estimar totales entre monedas distintas a tu moneda base.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExchangeRatesSection rates={exchangeRates} defaultCurrency={preferences.baseCurrency} />
        </CardContent>
      </Card>
    </div>
  );
}
