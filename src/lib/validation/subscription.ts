import { z } from "zod";
import { ICON_NAMES } from "@/lib/icon-map";

/**
 * Esquemas Zod para el formulario de suscripciones (crear/editar), el
 * registro de pagos y el editor de reglas de aviso. Los importes viajan
 * como `string` (nunca `number`) para no perder precisión decimal — ver
 * `src/lib/domain/money.ts`.
 */

function emptyToUndefined(value: unknown) {
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
}

const MONEY_REGEX = /^\d+(\.\d{1,4})?$/;

export const moneyAmountSchema = z
  .string()
  .trim()
  .min(1, "El importe es obligatorio")
  .regex(MONEY_REGEX, "Ingresa un importe numérico válido (ej. 9.99)")
  .refine((value) => Number(value) > 0, "El importe debe ser mayor que 0");

const optionalMoneyAmountSchema = z.preprocess(emptyToUndefined, moneyAmountSchema.optional());

export const currencySchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Usa un código de moneda de 3 letras (ej. USD)");

const colorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Usa un color hexadecimal válido (ej. #6366f1)");

const iconSchema = z
  .string()
  .trim()
  .min(1, "Selecciona un ícono")
  .refine((value) => ICON_NAMES.includes(value), "Ícono no reconocido");

const optionalIdSchema = z.preprocess(emptyToUndefined, z.string().min(1).optional());

const optionalTextSchema = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

const optionalUrlSchema = z.preprocess(
  emptyToUndefined,
  z.string().trim().url("Ingresa una URL válida").max(2048).optional()
);

export const BILLING_FREQUENCIES = [
  "WEEKLY",
  "MONTHLY",
  "BIMONTHLY",
  "QUARTERLY",
  "SEMIANNUAL",
  "ANNUAL",
  "CUSTOM",
] as const;

export const CUSTOM_INTERVAL_UNITS = ["DAY", "WEEK", "MONTH", "YEAR"] as const;

export const SUBSCRIPTION_TYPES = [
  "RECURRING",
  "FREE_TRIAL",
  "CONTRACT",
  "INSTALLMENT",
  "RECURRING_PURCHASE",
] as const;

export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

const billingFrequencySchema = z.enum(BILLING_FREQUENCIES);
const customIntervalUnitSchema = z.enum(CUSTOM_INTERVAL_UNITS);
const subscriptionTypeSchema = z.enum(SUBSCRIPTION_TYPES);
const prioritySchema = z.enum(PRIORITIES);

const seatsSchema = z.coerce
  .number({ error: "Ingresa un número de asientos válido" })
  .int("Debe ser un número entero")
  .min(1, "Debe haber al menos 1 asiento");

// El formulario asigna esto con form.setValue(..., star) usando un número
// directo (botones de estrellas), nunca un string — no hace falta coerción.
const usefulnessRatingSchema = z.number().int().min(1).max(5).optional();

/**
 * Campos compartidos entre creación y edición — todo excepto los campos
 * que fijan la recurrencia (esos solo existen en `createSubscriptionSchema`).
 */
const baseSubscriptionFields = {
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(120),
  provider: optionalTextSchema(120),
  description: optionalTextSchema(2000),
  notes: optionalTextSchema(2000),
  categoryId: optionalIdSchema,
  color: colorSchema,
  icon: iconSchema,
  iconUrl: optionalUrlSchema,
  amount: moneyAmountSchema,
  currency: currencySchema,
  taxIncluded: z.boolean(),
  taxAmount: optionalMoneyAmountSchema,
  subscriptionType: subscriptionTypeSchema,
  autoRenew: z.boolean(),
  cancelByDate: z.date().optional().nullable(),
  paymentMethodId: optionalIdSchema,
  accountProfile: optionalTextSchema(120),
  managementUrl: optionalUrlSchema,
  supportContact: optionalTextSchema(200),
  seats: seatsSchema,
  costPerSeat: optionalMoneyAmountSchema,
  priority: prioritySchema,
  usefulnessRating: usefulnessRatingSchema,
  tagIds: z.array(z.string().min(1)),
};

/**
 * Se aplica inline (en vez de una función genérica que envuelva
 * `schema.superRefine(...)`) porque envolver el resultado en un tipo
 * genérico como `z.ZodType<z.infer<T>>` rompe la inferencia de
 * `zodResolver` con react-hook-form más adelante — con Zod 4, el tipo
 * concreto devuelto por `.superRefine()` en el propio objeto es el único
 * que preserva la forma completa que el formulario necesita.
 */
function checkCustomFrequency(
  data: {
    billingFrequency: (typeof BILLING_FREQUENCIES)[number];
    customIntervalCount?: number;
    customIntervalUnit?: (typeof CUSTOM_INTERVAL_UNITS)[number];
  },
  ctx: z.RefinementCtx
) {
  if (data.billingFrequency !== "CUSTOM") return;
  if (!data.customIntervalCount || data.customIntervalCount < 1) {
    ctx.addIssue({
      code: "custom",
      path: ["customIntervalCount"],
      message: "Indica cada cuántas unidades se cobra (mínimo 1)",
    });
  }
  if (!data.customIntervalUnit) {
    ctx.addIssue({
      code: "custom",
      path: ["customIntervalUnit"],
      message: "Selecciona la unidad del intervalo personalizado",
    });
  }
}

export const createSubscriptionSchema = z
  .object({
    ...baseSubscriptionFields,
    billingFrequency: billingFrequencySchema,
    customIntervalCount: z.coerce.number().int().min(1).optional(),
    customIntervalUnit: customIntervalUnitSchema.optional(),
    startDate: z.date({ error: "Selecciona la fecha de inicio" }),
  })
  .superRefine(checkCustomFrequency);
export type CreateSubscriptionFormInput = z.infer<typeof createSubscriptionSchema>;

/**
 * La edición no permite cambiar `billingFrequency`, `customIntervalCount`,
 * `customIntervalUnit`, `startDate` ni `nextBillingDate` — esos campos se
 * muestran deshabilitados en la UI, pero se siguen enviando en el formulario
 * (de solo lectura) para previsualizar el próximo cobro; la Server Action
 * los ignora y nunca los usa para actualizar la base de datos.
 */
export const updateSubscriptionSchema = z.object({
  ...baseSubscriptionFields,
  billingFrequency: billingFrequencySchema,
  customIntervalCount: z.coerce.number().int().min(1).optional(),
  customIntervalUnit: customIntervalUnitSchema.optional(),
  startDate: z.date(),
});
export type UpdateSubscriptionFormInput = z.infer<typeof updateSubscriptionSchema>;

export const recordPaymentSchema = z.object({
  dueDate: z.date({ error: "Selecciona la fecha prevista" }),
  paidDate: z.date({ error: "Selecciona la fecha de pago" }),
  amount: optionalMoneyAmountSchema,
  currency: z.preprocess(emptyToUndefined, currencySchema.optional()),
  paymentMethodId: optionalIdSchema,
  note: optionalTextSchema(1000),
});
export type RecordPaymentFormInput = z.infer<typeof recordPaymentSchema>;

/**
 * Variante para `recordPaymentAction`: `dueDate`/`paidDate` son opcionales
 * porque la Server Action aplica sus propios valores por defecto
 * (`nextBillingDate` de la suscripción / hoy) cuando el cliente no los
 * sobreescribe explícitamente.
 */
export const recordPaymentActionSchema = recordPaymentSchema.partial({
  dueDate: true,
  paidDate: true,
});
export type RecordPaymentActionInput = z.infer<typeof recordPaymentActionSchema>;

export const NON_PAID_STATUSES = ["SKIPPED", "FAILED", "REFUNDED"] as const;

export const markPaymentNonPaidSchema = z.object({
  dueDate: z.date({ error: "Selecciona la fecha prevista" }),
  paidDate: z.date().optional().nullable(),
  status: z.enum(NON_PAID_STATUSES),
  amount: optionalMoneyAmountSchema,
  currency: z.preprocess(emptyToUndefined, currencySchema.optional()),
  paymentMethodId: optionalIdSchema,
  note: optionalTextSchema(1000),
});
export type MarkPaymentNonPaidInput = z.infer<typeof markPaymentNonPaidSchema>;

export const reminderRuleSchema = z.object({
  offsetDays: z.coerce
    .number({ error: "Ingresa un número de días válido" })
    .int("Debe ser un número entero"),
});
export type ReminderRuleInput = z.infer<typeof reminderRuleSchema>;

export const scheduleCancellationSchema = z.object({
  cancelByDate: z.date().optional().nullable(),
});
export type ScheduleCancellationInput = z.infer<typeof scheduleCancellationSchema>;

export const createTagSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(40),
  color: colorSchema.default("#6366f1"),
});
export type CreateTagInput = z.infer<typeof createTagSchema>;

export const bulkArchiveSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "Selecciona al menos una suscripción"),
});
export type BulkArchiveInput = z.infer<typeof bulkArchiveSchema>;
