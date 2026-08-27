import { parse } from "csv-parse/sync";
import type {
  BillingFrequency,
  CustomIntervalUnit,
  SubscriptionType,
} from "@/generated/prisma/enums";
import { csvImportRowSchema, type CsvImportRowRaw } from "@/lib/validation/csv-import";

/**
 * Fila de suscripción ya validada y convertida a tipos utilizables por el
 * dominio (números, `Date`, booleanos) — ver el orden de columnas
 * documentado en `src/lib/validation/csv-import.ts`.
 */
export interface ImportSubscriptionRow {
  name: string;
  provider?: string;
  categoryName: string;
  amount: string;
  currency: string;
  billingFrequency: BillingFrequency;
  customIntervalCount?: number;
  customIntervalUnit?: CustomIntervalUnit;
  startDate: Date;
  subscriptionType: SubscriptionType;
  autoRenew: boolean;
  paymentMethodAlias?: string;
  notes?: string;
}

export interface ParsedImportRow {
  /** Número de fila dentro de los datos (1 = primera fila después del encabezado). */
  row: number;
  /** Valores originales tal cual vinieron del CSV, para mostrarlos en la vista previa. */
  raw: Record<string, string>;
  valid: boolean;
  data?: ImportSubscriptionRow;
  /** Mensajes de validación de esta fila (vacío/ausente si `valid` es true). */
  errorMessages?: string[];
  /** Se completa después con `detectDuplicates`. */
  duplicate?: boolean;
}

export interface ImportRowError {
  row: number;
  message: string;
}

function toImportRow(data: CsvImportRowRaw): ImportSubscriptionRow {
  const [year, month, day] = data.fecha_inicio.split("-").map(Number);
  const autoRenew = data.renovacion_automatica === "si" || data.renovacion_automatica === "sí";

  return {
    name: data.nombre,
    provider: data.proveedor,
    categoryName: data.categoria,
    amount: data.importe,
    currency: data.moneda,
    billingFrequency: data.frecuencia as BillingFrequency,
    customIntervalCount: data.cantidad_intervalo_custom
      ? Number(data.cantidad_intervalo_custom)
      : undefined,
    customIntervalUnit: data.unidad_intervalo_custom as CustomIntervalUnit | undefined,
    startDate: new Date(Date.UTC(year, month - 1, day)),
    subscriptionType: data.tipo as SubscriptionType,
    autoRenew,
    paymentMethodAlias: data.metodo_pago,
    notes: data.notas,
  };
}

/**
 * Parsea el contenido de un CSV de suscripciones. Nunca aborta ante una
 * fila inválida: acumula los errores por fila (`errors`) y sigue
 * procesando el resto, para que la vista previa pueda mostrar
 * "fila 7: moneda inválida" y aun así dejar importar las filas válidas.
 */
export function parseSubscriptionsCsv(fileContent: string): {
  rows: ParsedImportRow[];
  errors: ImportRowError[];
} {
  let records: Record<string, string>[];
  try {
    records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });
  } catch (error) {
    return {
      rows: [],
      errors: [
        {
          row: 0,
          message: `No se pudo leer el archivo CSV: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }

  const rows: ParsedImportRow[] = [];
  const errors: ImportRowError[] = [];

  records.forEach((raw, index) => {
    const rowNumber = index + 1;
    const result = csvImportRowSchema.safeParse(raw);

    if (!result.success) {
      const messages = result.error.issues.map((issue) => {
        const field = issue.path.join(".");
        return field ? `${field}: ${issue.message}` : issue.message;
      });
      messages.forEach((message) => errors.push({ row: rowNumber, message }));
      rows.push({ row: rowNumber, raw, valid: false, errorMessages: messages });
      return;
    }

    rows.push({ row: rowNumber, raw, valid: true, data: toImportRow(result.data) });
  });

  return { rows, errors };
}

export interface ExistingSubscriptionKey {
  name: string;
  startDate: Date;
}

function dedupeKey(name: string, date: Date): string {
  const dateOnly = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  return `${name.trim().toLowerCase()}|${dateOnly.toISOString().slice(0, 10)}`;
}

/**
 * Estrategia de deduplicación (explícita, sección de Importar/Exportar):
 * una fila se considera duplicada si YA existe una suscripción del
 * usuario con el mismo `name` (sin distinguir mayúsculas/minúsculas ni
 * espacios al inicio/fin) Y la misma `startDate`. Las filas duplicadas
 * NO se descartan aquí — solo se marcan (`duplicate: true`) para que el
 * usuario decida en la vista previa si omitirlas o crearlas de todas
 * formas.
 */
export function detectDuplicates(
  rows: ParsedImportRow[],
  existingSubscriptions: ExistingSubscriptionKey[]
): ParsedImportRow[] {
  const existingKeys = new Set(existingSubscriptions.map((s) => dedupeKey(s.name, s.startDate)));

  return rows.map((row) => {
    if (!row.valid || !row.data) return row;
    const isDuplicate = existingKeys.has(dedupeKey(row.data.name, row.data.startDate));
    return isDuplicate ? { ...row, duplicate: true } : row;
  });
}
