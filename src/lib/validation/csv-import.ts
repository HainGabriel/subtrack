import { z } from "zod";
import {
  BILLING_FREQUENCIES,
  CUSTOM_INTERVAL_UNITS,
  SUBSCRIPTION_TYPES,
} from "@/lib/validation/subscription";

/**
 * Esquema y columnas de la plantilla CSV de importación/exportación de
 * suscripciones (sección "Importar/Exportar" del encargo).
 *
 * ORDEN EXACTO de columnas (también es el orden de exportación, para que
 * el CSV exportado sea reimportable tal cual):
 *
 *   1. nombre                       — texto, obligatorio
 *   2. proveedor                    — texto, opcional
 *   3. categoria                    — texto, obligatorio (se resuelve/crea por nombre al confirmar)
 *   4. importe                      — número decimal (ej. "9.99"), obligatorio
 *   5. moneda                       — código ISO de 3 letras (ej. "USD")
 *   6. frecuencia                   — WEEKLY|MONTHLY|BIMONTHLY|QUARTERLY|SEMIANNUAL|ANNUAL|CUSTOM
 *   7. cantidad_intervalo_custom    — entero, obligatorio SOLO si frecuencia=CUSTOM
 *   8. unidad_intervalo_custom      — DAY|WEEK|MONTH|YEAR, obligatorio SOLO si frecuencia=CUSTOM
 *   9. fecha_inicio                 — YYYY-MM-DD
 *  10. tipo                         — RECURRING|FREE_TRIAL|CONTRACT|INSTALLMENT|RECURRING_PURCHASE
 *  11. renovacion_automatica        — "si" | "no"
 *  12. metodo_pago                  — alias de un método de pago existente del usuario, opcional
 *  13. notas                        — texto libre, opcional
 */
export const CSV_IMPORT_COLUMNS = [
  "nombre",
  "proveedor",
  "categoria",
  "importe",
  "moneda",
  "frecuencia",
  "cantidad_intervalo_custom",
  "unidad_intervalo_custom",
  "fecha_inicio",
  "tipo",
  "renovacion_automatica",
  "metodo_pago",
  "notas",
] as const;

const MONEY_REGEX = /^\d+(\.\d{1,4})?$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function blankToUndefined(value: unknown) {
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
}

const optionalTrimmed = (max: number) =>
  z.preprocess(blankToUndefined, z.string().trim().max(max).optional());

/**
 * Valida una fila cruda del CSV (todos los valores llegan como `string`
 * desde `csv-parse`, incluso los numéricos). Los campos condicionales de
 * CUSTOM se validan en `superRefine` para poder señalar el campo exacto.
 */
export const csvImportRowSchema = z
  .object({
    nombre: z.string().trim().min(1, "El nombre es obligatorio").max(120),
    proveedor: optionalTrimmed(120),
    categoria: z.string().trim().min(1, "La categoría es obligatoria").max(60),
    importe: z
      .string()
      .trim()
      .min(1, "El importe es obligatorio")
      .regex(MONEY_REGEX, "Importe inválido (usa un número como 9.99)")
      .refine((v) => Number(v) > 0, "El importe debe ser mayor que 0"),
    moneda: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, "Usa un código de moneda de 3 letras (ej. USD)"),
    frecuencia: z.preprocess(
      (v) => (typeof v === "string" ? v.trim().toUpperCase() : v),
      z.enum(BILLING_FREQUENCIES, "Frecuencia inválida")
    ),
    cantidad_intervalo_custom: optionalTrimmed(10),
    unidad_intervalo_custom: z.preprocess(
      blankToUndefined,
      z
        .preprocess(
          (v) => (typeof v === "string" ? v.trim().toUpperCase() : v),
          z.enum(CUSTOM_INTERVAL_UNITS)
        )
        .optional()
    ),
    fecha_inicio: z
      .string()
      .trim()
      .regex(DATE_REGEX, "Usa el formato de fecha YYYY-MM-DD")
      .refine((v) => !Number.isNaN(Date.parse(v)), "La fecha de inicio no es válida"),
    tipo: z.preprocess(
      (v) => (typeof v === "string" ? v.trim().toUpperCase() : v),
      z.enum(SUBSCRIPTION_TYPES, "Tipo de suscripción inválido")
    ),
    renovacion_automatica: z
      .string()
      .trim()
      .toLowerCase()
      .refine((v) => ["si", "sí", "no"].includes(v), "Usa 'si' o 'no'"),
    metodo_pago: optionalTrimmed(120),
    notas: optionalTrimmed(2000),
  })
  .superRefine((data, ctx) => {
    if (data.frecuencia === "CUSTOM") {
      const count = Number(data.cantidad_intervalo_custom);
      if (!data.cantidad_intervalo_custom || !Number.isInteger(count) || count < 1) {
        ctx.addIssue({
          code: "custom",
          path: ["cantidad_intervalo_custom"],
          message:
            "Indica cada cuántas unidades se cobra (entero mayor a 0) cuando frecuencia=CUSTOM",
        });
      }
      if (!data.unidad_intervalo_custom) {
        ctx.addIssue({
          code: "custom",
          path: ["unidad_intervalo_custom"],
          message: "Indica la unidad del intervalo (DAY|WEEK|MONTH|YEAR) cuando frecuencia=CUSTOM",
        });
      }
    }
  });

export type CsvImportRowRaw = z.infer<typeof csvImportRowSchema>;
