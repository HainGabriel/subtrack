import type { BillingFrequency, CustomIntervalUnit } from "@/generated/prisma/enums";

/**
 * Motor de recurrencia de facturación.
 *
 * Política de fechas (ver docs/RECURRENCE_RULES.md para el detalle y los
 * casos límite probados):
 *
 * 1. Todas las fechas de facturación se modelan como fechas de calendario
 *    puras (año-mes-día en UTC, sin componente horario significativo).
 *    Esto evita por completo los problemas de horario de verano / cambios
 *    de zona horaria al sumar meses o semanas — la zona horaria del
 *    usuario solo se usa para FORMATEAR fechas y decidir "qué día es hoy"
 *    al generar recordatorios, nunca para la aritmética de recurrencia.
 * 2. Cada suscripción con frecuencia basada en meses guarda un
 *    `billingAnchorDay` (el día de mes originalmente pactado, 1-31).
 *    Al avanzar un ciclo, se toma el MES de la fecha de cobro actual, se
 *    le suman los meses del intervalo, y el día se recalcula como
 *    `min(anchorDay, díasEnElMesDestino)`. Como el día objetivo siempre
 *    se deriva del anchor (nunca del día ya recortado del ciclo
 *    anterior), un mes corto no "contamina" los ciclos siguientes:
 *    31 ene → 28/29 feb (recortado) → 31 mar (el anchor de 31 se
 *    recupera). Esta es la política explícita para meses de 28-31 días
 *    y años bisiestos.
 */

export interface RecurrenceInput {
  billingFrequency: BillingFrequency;
  customIntervalCount?: number | null;
  customIntervalUnit?: CustomIntervalUnit | null;
  billingAnchorDay?: number | null;
}

const MONTHS_BY_FREQUENCY: Partial<Record<BillingFrequency, number>> = {
  MONTHLY: 1,
  BIMONTHLY: 2,
  QUARTERLY: 3,
  SEMIANNUAL: 6,
  ANNUAL: 12,
};

export function isMonthBasedFrequency(input: RecurrenceInput): boolean {
  if (input.billingFrequency in MONTHS_BY_FREQUENCY) return true;
  if (input.billingFrequency === "CUSTOM") {
    return input.customIntervalUnit === "MONTH" || input.customIntervalUnit === "YEAR";
  }
  return false;
}

function daysInUtcMonth(year: number, monthIndex0: number): number {
  // Día 0 del mes siguiente = último día del mes actual.
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
}

function toUtcDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addMonthsPreservingAnchor(date: Date, months: number, anchorDay: number): Date {
  const year = date.getUTCFullYear();
  const monthIndex0 = date.getUTCMonth();
  const totalMonthIndex = year * 12 + monthIndex0 + months;
  const targetYear = Math.floor(totalMonthIndex / 12);
  const targetMonthIndex0 = ((totalMonthIndex % 12) + 12) % 12;
  const day = Math.min(anchorDay, daysInUtcMonth(targetYear, targetMonthIndex0));
  return new Date(Date.UTC(targetYear, targetMonthIndex0, day));
}

function addDaysUtc(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * Determina el `billingAnchorDay` inicial a partir de la fecha de inicio,
 * para frecuencias basadas en meses. `null` para semanal/diaria.
 */
export function deriveInitialAnchorDay(input: RecurrenceInput, startDate: Date): number | null {
  if (!isMonthBasedFrequency(input)) return null;
  return toUtcDateOnly(startDate).getUTCDate();
}

/**
 * Calcula la siguiente fecha de cobro a partir de la fecha de cobro
 * actual (o de la fecha de inicio, para el primer ciclo).
 */
export function computeNextBillingDate(input: RecurrenceInput, currentDueDate: Date): Date {
  const current = toUtcDateOnly(currentDueDate);

  switch (input.billingFrequency) {
    case "WEEKLY":
      return addDaysUtc(current, 7);
    case "MONTHLY":
    case "BIMONTHLY":
    case "QUARTERLY":
    case "SEMIANNUAL":
    case "ANNUAL": {
      const months = MONTHS_BY_FREQUENCY[input.billingFrequency]!;
      const anchor = input.billingAnchorDay ?? current.getUTCDate();
      return addMonthsPreservingAnchor(current, months, anchor);
    }
    case "CUSTOM": {
      const count = input.customIntervalCount ?? 1;
      switch (input.customIntervalUnit) {
        case "DAY":
          return addDaysUtc(current, count);
        case "WEEK":
          return addDaysUtc(current, count * 7);
        case "MONTH": {
          const anchor = input.billingAnchorDay ?? current.getUTCDate();
          return addMonthsPreservingAnchor(current, count, anchor);
        }
        case "YEAR": {
          const anchor = input.billingAnchorDay ?? current.getUTCDate();
          return addMonthsPreservingAnchor(current, count * 12, anchor);
        }
        default:
          throw new Error("customIntervalUnit es obligatorio cuando billingFrequency es CUSTOM");
      }
    }
    default:
      throw new Error(`Frecuencia de facturación no soportada: ${input.billingFrequency}`);
  }
}

/** Costo anualizado equivalente, útil para comparar suscripciones entre sí. */
export function annualizedOccurrences(input: RecurrenceInput): number {
  switch (input.billingFrequency) {
    case "WEEKLY":
      return 52;
    case "MONTHLY":
      return 12;
    case "BIMONTHLY":
      return 6;
    case "QUARTERLY":
      return 4;
    case "SEMIANNUAL":
      return 2;
    case "ANNUAL":
      return 1;
    case "CUSTOM": {
      const count = input.customIntervalCount ?? 1;
      switch (input.customIntervalUnit) {
        case "DAY":
          return 365 / count;
        case "WEEK":
          return 52 / count;
        case "MONTH":
          return 12 / count;
        case "YEAR":
          return 1 / count;
        default:
          return 0;
      }
    }
    default:
      return 0;
  }
}
