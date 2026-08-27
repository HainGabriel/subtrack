"use client";

import { useState, useTransition } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { CURRENCIES, TIMEZONES } from "@/lib/domain/currencies";
import { completeOnboarding } from "@/lib/actions/onboarding-actions";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

const onboardingFormSchema = z.object({
  baseCurrency: z.string().min(1, "Selecciona una moneda"),
  timezone: z.string().min(1, "Selecciona una zona horaria"),
  weekStartsOn: z.enum(["0", "1"]),
});
type OnboardingFormInput = z.infer<typeof onboardingFormSchema>;

const WEEK_START_LABELS: Record<"0" | "1", string> = {
  "1": "Lunes",
  "0": "Domingo",
};

export function OnboardingWizard() {
  const [step, setStep] = useState<1 | 2>(1);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<OnboardingFormInput>({
    resolver: zodResolver(onboardingFormSchema),
    defaultValues: {
      baseCurrency: "DOP",
      timezone: "America/Santo_Domingo",
      weekStartsOn: "1",
    },
  });

  function goToConfirmation() {
    setStep(2);
  }

  function handleFinish() {
    setServerError(null);
    const values = form.getValues();
    startTransition(async () => {
      const result = await completeOnboarding({
        baseCurrency: values.baseCurrency,
        timezone: values.timezone,
        weekStartsOn: Number(values.weekStartsOn),
      });
      // Si tiene éxito, completeOnboarding redirige en el servidor y esta
      // función nunca resuelve con success: true.
      if (result && !result.success) {
        setServerError(result.error ?? "No pudimos guardar tus preferencias.");
      }
    });
  }

  const watched = useWatch({ control: form.control });
  const baseCurrency = watched.baseCurrency ?? "DOP";
  const timezone = watched.timezone ?? "America/Santo_Domingo";
  const weekStartsOn = watched.weekStartsOn ?? "1";
  const currencyName = CURRENCIES.find((c) => c.code === baseCurrency)?.name ?? baseCurrency;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardDescription>Paso {step} de 2</CardDescription>
        <CardTitle>{step === 1 ? "Configura tus preferencias" : "Confirma y empieza"}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {serverError && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        {step === 1 ? (
          <form
            onSubmit={form.handleSubmit(goToConfirmation)}
            noValidate
            className="flex flex-col gap-5"
          >
            <Field data-invalid={!!form.formState.errors.baseCurrency}>
              <FieldLabel htmlFor="baseCurrency">Moneda principal</FieldLabel>
              <Controller
                control={form.control}
                name="baseCurrency"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="baseCurrency"
                      className="w-full"
                      aria-invalid={!!form.formState.errors.baseCurrency}
                    >
                      <SelectValue placeholder="Selecciona una moneda" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.code} — {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldDescription>
                La usaremos como referencia para tus totales y presupuestos.
              </FieldDescription>
              <FieldError errors={[form.formState.errors.baseCurrency]} />
            </Field>

            <Field data-invalid={!!form.formState.errors.timezone}>
              <FieldLabel htmlFor="timezone">Zona horaria</FieldLabel>
              <Controller
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="timezone"
                      className="w-full"
                      aria-invalid={!!form.formState.errors.timezone}
                    >
                      <SelectValue placeholder="Selecciona una zona horaria" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[form.formState.errors.timezone]} />
            </Field>

            <Field data-invalid={!!form.formState.errors.weekStartsOn}>
              <FieldLabel htmlFor="weekStartsOn">Inicio de semana</FieldLabel>
              <Controller
                control={form.control}
                name="weekStartsOn"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="weekStartsOn" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Lunes</SelectItem>
                      <SelectItem value="0">Domingo</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[form.formState.errors.weekStartsOn]} />
            </Field>

            <Button type="submit" className="mt-2">
              Continuar
              <ArrowRight />
            </Button>
          </form>
        ) : (
          <div className="flex flex-col gap-5">
            <ul className="divide-border flex flex-col divide-y text-sm">
              <li className="flex items-center justify-between py-2.5">
                <span className="text-muted-foreground">Moneda principal</span>
                <span className="font-medium">
                  {currencyName} ({baseCurrency})
                </span>
              </li>
              <li className="flex items-center justify-between py-2.5">
                <span className="text-muted-foreground">Zona horaria</span>
                <span className="font-medium">{timezone}</span>
              </li>
              <li className="flex items-center justify-between py-2.5">
                <span className="text-muted-foreground">Inicio de semana</span>
                <span className="font-medium">{WEEK_START_LABELS[weekStartsOn]}</span>
              </li>
            </ul>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                disabled={isPending}
                className="flex-1"
              >
                <ArrowLeft />
                Atrás
              </Button>
              <Button type="button" onClick={handleFinish} disabled={isPending} className="flex-1">
                {isPending ? <Spinner /> : <Check />}
                Finalizar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
