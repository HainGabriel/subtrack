"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Star, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { CURRENCIES } from "@/lib/domain/currencies";
import { computeNextBillingDate, deriveInitialAnchorDay } from "@/lib/domain/recurrence";
import {
  createSubscriptionSchema,
  SUBSCRIPTION_TYPES,
  PRIORITIES,
  type CreateSubscriptionFormInput,
} from "@/lib/validation/subscription";
import {
  createSubscriptionAction,
  updateSubscriptionAction,
} from "@/lib/actions/subscription-actions";
import { FrequencySelect } from "@/components/subscriptions/frequency-select";
import { ColorPicker } from "@/components/subscriptions/color-picker";
import { IconPicker } from "@/components/subscriptions/icon-picker";
import { TagPicker, type TagOption } from "@/components/subscriptions/tag-picker";

const SUBSCRIPTION_TYPE_LABELS: Record<(typeof SUBSCRIPTION_TYPES)[number], string> = {
  RECURRING: "Recurrente",
  FREE_TRIAL: "Prueba gratuita",
  CONTRACT: "Contrato",
  INSTALLMENT: "Pago a plazos",
  RECURRING_PURCHASE: "Compra recurrente",
};

const PRIORITY_LABELS: Record<(typeof PRIORITIES)[number], string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  CRITICAL: "Crítica",
};

export type SubscriptionFormValues = CreateSubscriptionFormInput;

export interface SelectOption {
  id: string;
  name: string;
}

export interface PaymentMethodSelectOption {
  id: string;
  alias: string;
}

export function SubscriptionForm({
  mode,
  subscriptionId,
  defaultValues,
  categories,
  paymentMethods,
  availableTags,
}: {
  mode: "create" | "edit";
  subscriptionId?: string;
  defaultValues: SubscriptionFormValues;
  categories: SelectOption[];
  paymentMethods: PaymentMethodSelectOption[];
  availableTags: TagOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isEdit = mode === "edit";

  // Se usa siempre el esquema de creación para el resolver de RHF (misma
  // forma de campos en ambos modos; en edición los de recurrencia quedan
  // deshabilitados/de solo lectura). La Server Action de edición vuelve a
  // validar en servidor con `updateSubscriptionSchema`, que es la que de
  // verdad decide qué campos se persisten — ver subscription-actions.ts.
  const form = useForm<CreateSubscriptionFormInput>({
    // TypeScript trata la instanciación de `Resolver<T>` de RHF sobre este
    // objeto de ~25 campos (con varios opcionales/anulables) como "no
    // relacionada" con la del propio `useForm<T>` pese a ser el mismo `T`
    // estructural — un límite conocido del checker con tipos condicionales
    // recursivos muy anchos, no un error real de datos. Ver el hilo de
    // react-hook-form/resolvers sobre "Resolver<X> not assignable to
    // Resolver<X>" con esquemas Zod grandes.
    resolver: zodResolver(createSubscriptionSchema) as Resolver<CreateSubscriptionFormInput>,
    defaultValues,
  });

  const billingFrequency = form.watch("billingFrequency");
  const customIntervalCount = form.watch("customIntervalCount");
  const customIntervalUnit = form.watch("customIntervalUnit");
  const startDate = form.watch("startDate");
  const cancelByDate = form.watch("cancelByDate");
  const color = form.watch("color");
  const icon = form.watch("icon");
  const categoryId = form.watch("categoryId");
  const tagIds = form.watch("tagIds");
  const taxIncluded = form.watch("taxIncluded");
  const autoRenew = form.watch("autoRenew");
  const subscriptionType = form.watch("subscriptionType");
  const priority = form.watch("priority");
  const usefulnessRating = form.watch("usefulnessRating");
  const paymentMethodId = form.watch("paymentMethodId");

  const [previewSecondCycle, previewError] = useMemo((): [Date | null, string | null] => {
    if (!startDate) return [null, null];
    try {
      const recurrence = { billingFrequency, customIntervalCount, customIntervalUnit };
      const anchor = deriveInitialAnchorDay(recurrence, startDate);
      const next = computeNextBillingDate({ ...recurrence, billingAnchorDay: anchor }, startDate);
      return [next, null];
    } catch (error) {
      return [null, error instanceof Error ? error.message : "No se pudo calcular"];
    }
  }, [startDate, billingFrequency, customIntervalCount, customIntervalUnit]);

  function onSubmit(values: SubscriptionFormValues) {
    startTransition(async () => {
      const result = isEdit
        ? await updateSubscriptionAction(subscriptionId!, values)
        : await createSubscriptionAction(values);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(isEdit ? "Suscripción actualizada" : "Suscripción creada");
      router.push(`/suscripciones/${isEdit ? subscriptionId : result.id}`);
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-8 pb-24">
      <FieldSet>
        <FieldLegend>Información básica</FieldLegend>
        <FieldGroup>
          <Field data-invalid={!!form.formState.errors.name}>
            <FieldLabel htmlFor="name">Nombre</FieldLabel>
            <Input
              id="name"
              autoFocus
              {...form.register("name")}
              aria-invalid={!!form.formState.errors.name}
            />
            <FieldError errors={[form.formState.errors.name]} />
          </Field>

          <Field data-invalid={!!form.formState.errors.provider}>
            <FieldLabel htmlFor="provider">Proveedor</FieldLabel>
            <Input id="provider" {...form.register("provider")} placeholder="Ej. Netflix Inc." />
            <FieldError errors={[form.formState.errors.provider]} />
          </Field>

          <Field data-invalid={!!form.formState.errors.description}>
            <FieldLabel htmlFor="description">Descripción</FieldLabel>
            <Textarea id="description" rows={2} {...form.register("description")} />
            <FieldError errors={[form.formState.errors.description]} />
          </Field>

          <Field data-invalid={!!form.formState.errors.notes}>
            <FieldLabel htmlFor="notes">Notas</FieldLabel>
            <Textarea id="notes" rows={2} {...form.register("notes")} />
            <FieldError errors={[form.formState.errors.notes]} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!form.formState.errors.categoryId}>
              <FieldLabel htmlFor="categoryId">Categoría</FieldLabel>
              <Select
                value={categoryId ?? "none"}
                onValueChange={(v) =>
                  form.setValue("categoryId", v === "none" ? undefined : v, {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="categoryId" className="w-full">
                  <SelectValue placeholder="Sin categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin categoría</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[form.formState.errors.categoryId]} />
            </Field>

            <Field>
              <FieldLabel>Etiquetas</FieldLabel>
              <FieldContent>
                <TagPicker
                  value={tagIds ?? []}
                  onChange={(ids) => form.setValue("tagIds", ids, { shouldValidate: true })}
                  availableTags={availableTags}
                />
              </FieldContent>
            </Field>
          </div>
        </FieldGroup>
      </FieldSet>

      <Separator />

      <FieldSet>
        <FieldLegend>Apariencia</FieldLegend>
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
            <Field data-invalid={!!form.formState.errors.color}>
              <FieldLabel htmlFor="color">Color</FieldLabel>
              <FieldContent>
                <ColorPicker
                  id="color"
                  value={color}
                  onChange={(value) => form.setValue("color", value, { shouldValidate: true })}
                />
              </FieldContent>
              <FieldError errors={[form.formState.errors.color]} />
            </Field>
          </div>

          <Field data-invalid={!!form.formState.errors.icon}>
            <FieldLabel htmlFor="icon">Ícono</FieldLabel>
            <FieldContent>
              <IconPicker
                id="icon"
                value={icon}
                onChange={(value) => form.setValue("icon", value, { shouldValidate: true })}
              />
            </FieldContent>
            <FieldError errors={[form.formState.errors.icon]} />
          </Field>
        </FieldGroup>
      </FieldSet>

      <Separator />

      <FieldSet>
        <FieldLegend>Importe</FieldLegend>
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!form.formState.errors.amount}>
              <FieldLabel htmlFor="amount">Importe</FieldLabel>
              <Input
                id="amount"
                inputMode="decimal"
                {...form.register("amount")}
                aria-invalid={!!form.formState.errors.amount}
              />
              <FieldError errors={[form.formState.errors.amount]} />
            </Field>

            <Field data-invalid={!!form.formState.errors.currency}>
              <FieldLabel htmlFor="currency">Moneda</FieldLabel>
              <Controller
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="currency" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.code} — {currency.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[form.formState.errors.currency]} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="taxIncluded">Impuestos incluidos</FieldLabel>
                <FieldDescription>El importe de arriba ya incluye los impuestos.</FieldDescription>
              </FieldContent>
              <Switch
                id="taxIncluded"
                checked={taxIncluded}
                onCheckedChange={(checked) => form.setValue("taxIncluded", checked)}
              />
            </Field>

            <Field data-invalid={!!form.formState.errors.taxAmount}>
              <FieldLabel htmlFor="taxAmount">Importe de impuesto (opcional)</FieldLabel>
              <Input id="taxAmount" inputMode="decimal" {...form.register("taxAmount")} />
              <FieldError errors={[form.formState.errors.taxAmount]} />
            </Field>
          </div>
        </FieldGroup>
      </FieldSet>

      <Separator />

      <FieldSet>
        <FieldLegend>Recurrencia</FieldLegend>
        <FieldGroup>
          {isEdit && (
            <FieldDescription>
              La frecuencia y la fecha de inicio no se pueden cambiar tras crear la suscripción —
              afectarían el historial de pagos ya registrado. Si necesitas otra periodicidad,
              cancela esta suscripción y crea una nueva.
            </FieldDescription>
          )}

          <Field data-invalid={!!form.formState.errors.billingFrequency}>
            <FieldLabel htmlFor="billingFrequency">Frecuencia de facturación</FieldLabel>
            <FrequencySelect
              value={billingFrequency}
              onValueChange={(value) =>
                form.setValue("billingFrequency", value, { shouldValidate: true })
              }
              customIntervalCount={customIntervalCount ?? undefined}
              onCustomIntervalCountChange={(value) =>
                form.setValue("customIntervalCount", value, { shouldValidate: true })
              }
              customIntervalUnit={customIntervalUnit}
              onCustomIntervalUnitChange={(value) =>
                form.setValue("customIntervalUnit", value, { shouldValidate: true })
              }
              disabled={isEdit}
              countError={form.formState.errors.customIntervalCount}
              unitError={form.formState.errors.customIntervalUnit}
            />
            <FieldError errors={[form.formState.errors.billingFrequency]} />
          </Field>

          <Field data-invalid={!!form.formState.errors.startDate}>
            <FieldLabel htmlFor="startDate">Fecha de inicio</FieldLabel>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="startDate"
                  type="button"
                  variant="outline"
                  disabled={isEdit}
                  className="w-full justify-start font-normal sm:w-64"
                >
                  <CalendarIcon className="size-4" />
                  {startDate
                    ? format(startDate, "d MMMM yyyy", { locale: es })
                    : "Selecciona una fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) =>
                    date && form.setValue("startDate", date, { shouldValidate: true })
                  }
                  locale={es}
                />
              </PopoverContent>
            </Popover>
            <FieldError errors={[form.formState.errors.startDate]} />
          </Field>

          <div className="bg-muted/50 flex flex-col gap-1 rounded-lg border p-3 text-sm">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Previsualización de cobros
            </p>
            {startDate ? (
              <>
                <p>
                  Primer cobro:{" "}
                  <span className="font-medium">
                    {format(startDate, "d MMMM yyyy", { locale: es })}
                  </span>
                </p>
                <p>
                  Siguiente ciclo:{" "}
                  <span className="font-medium">
                    {previewSecondCycle
                      ? format(previewSecondCycle, "d MMMM yyyy", { locale: es })
                      : (previewError ?? "—")}
                  </span>
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">
                Elige una fecha de inicio para ver la previsualización.
              </p>
            )}
          </div>
        </FieldGroup>
      </FieldSet>

      <Separator />

      <FieldSet>
        <FieldLegend>Tipo y renovación</FieldLegend>
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!form.formState.errors.subscriptionType}>
              <FieldLabel htmlFor="subscriptionType">Tipo</FieldLabel>
              <Select
                value={subscriptionType}
                onValueChange={(v) =>
                  form.setValue(
                    "subscriptionType",
                    v as SubscriptionFormValues["subscriptionType"],
                    {
                      shouldValidate: true,
                    }
                  )
                }
              >
                <SelectTrigger id="subscriptionType" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBSCRIPTION_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {SUBSCRIPTION_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[form.formState.errors.subscriptionType]} />
            </Field>

            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="autoRenew">Renovación automática</FieldLabel>
              </FieldContent>
              <Switch
                id="autoRenew"
                checked={autoRenew}
                onCheckedChange={(checked) => form.setValue("autoRenew", checked)}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="cancelByDate">Fecha límite de cancelación (opcional)</FieldLabel>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="cancelByDate"
                    type="button"
                    variant="outline"
                    className="w-full justify-start font-normal sm:w-64"
                  >
                    <CalendarIcon className="size-4" />
                    {cancelByDate
                      ? format(cancelByDate, "d MMMM yyyy", { locale: es })
                      : "Sin definir"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={cancelByDate ?? undefined}
                    onSelect={(date) => form.setValue("cancelByDate", date ?? null)}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
              {cancelByDate && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Quitar fecha límite de cancelación"
                  onClick={() => form.setValue("cancelByDate", null)}
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>
          </Field>
        </FieldGroup>
      </FieldSet>

      <Separator />

      <FieldSet>
        <FieldLegend>Método de pago y cuenta</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="paymentMethodId">Método de pago</FieldLabel>
            <Select
              value={paymentMethodId ?? "none"}
              onValueChange={(v) => form.setValue("paymentMethodId", v === "none" ? undefined : v)}
            >
              <SelectTrigger id="paymentMethodId" className="w-full">
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
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="accountProfile">Perfil / cuenta</FieldLabel>
              <Input
                id="accountProfile"
                {...form.register("accountProfile")}
                placeholder="Ej. Perfil familiar"
              />
            </Field>
            <Field data-invalid={!!form.formState.errors.managementUrl}>
              <FieldLabel htmlFor="managementUrl">URL de gestión</FieldLabel>
              <Input
                id="managementUrl"
                type="url"
                {...form.register("managementUrl")}
                placeholder="https://..."
              />
              <FieldError errors={[form.formState.errors.managementUrl]} />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="supportContact">Contacto de soporte</FieldLabel>
            <Input id="supportContact" {...form.register("supportContact")} />
          </Field>
        </FieldGroup>
      </FieldSet>

      <Separator />

      <FieldSet>
        <FieldLegend>Asientos</FieldLegend>
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!form.formState.errors.seats}>
              <FieldLabel htmlFor="seats">Asientos</FieldLabel>
              <Input
                id="seats"
                type="number"
                min={1}
                step={1}
                {...form.register("seats", { valueAsNumber: true })}
                aria-invalid={!!form.formState.errors.seats}
              />
              <FieldError errors={[form.formState.errors.seats]} />
            </Field>
            <Field data-invalid={!!form.formState.errors.costPerSeat}>
              <FieldLabel htmlFor="costPerSeat">Costo por asiento (opcional)</FieldLabel>
              <Input id="costPerSeat" inputMode="decimal" {...form.register("costPerSeat")} />
              <FieldError errors={[form.formState.errors.costPerSeat]} />
            </Field>
          </div>
        </FieldGroup>
      </FieldSet>

      <Separator />

      <FieldSet>
        <FieldLegend>Prioridad y utilidad</FieldLegend>
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="priority">Prioridad</FieldLabel>
              <Select
                value={priority}
                onValueChange={(v) =>
                  form.setValue("priority", v as SubscriptionFormValues["priority"], {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="priority" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {PRIORITY_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>Valoración de utilidad</FieldLabel>
              <FieldContent>
                <div
                  role="radiogroup"
                  aria-label="Valoración de utilidad"
                  className="flex items-center gap-1"
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      role="radio"
                      aria-checked={usefulnessRating === star}
                      aria-label={`${star} de 5`}
                      onClick={() =>
                        form.setValue(
                          "usefulnessRating",
                          usefulnessRating === star ? undefined : star
                        )
                      }
                      className="focus-visible:ring-ring/50 rounded outline-none focus-visible:ring-3"
                    >
                      <Star
                        className={cn(
                          "size-5",
                          usefulnessRating && star <= usefulnessRating
                            ? "fill-[var(--status-warning)] text-[var(--status-warning)]"
                            : "text-muted-foreground"
                        )}
                      />
                    </button>
                  ))}
                </div>
              </FieldContent>
            </Field>
          </div>
        </FieldGroup>
      </FieldSet>

      <div className="bg-background/95 sticky bottom-0 flex justify-end gap-2 border-t py-3 backdrop-blur-sm">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {isEdit ? "Guardar cambios" : "Crear suscripción"}
        </Button>
      </div>
    </form>
  );
}
