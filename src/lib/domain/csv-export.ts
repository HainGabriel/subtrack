import { stringify } from "csv-stringify/sync";
import { CSV_IMPORT_COLUMNS } from "@/lib/validation/csv-import";

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Suscripción "aplanada" para exportar a CSV — ya con el nombre de la
 * categoría y el alias del método de pago resueltos (no sus ids), para
 * que el archivo sea legible y, cruzado con `parseSubscriptionsCsv`,
 * reimportable.
 */
export interface ExportableSubscription {
  name: string;
  provider: string | null;
  categoryName: string | null;
  amount: string;
  currency: string;
  billingFrequency: string;
  customIntervalCount: number | null;
  customIntervalUnit: string | null;
  startDate: Date;
  subscriptionType: string;
  autoRenew: boolean;
  paymentMethodAlias: string | null;
  notes: string | null;
}

/**
 * Exporta suscripciones con EXACTAMENTE las mismas columnas y el mismo
 * orden que `CSV_IMPORT_COLUMNS` (ver `src/lib/validation/csv-import.ts`)
 * para que el CSV resultante se pueda reimportar sin transformarlo.
 */
export function exportSubscriptionsCsv(subscriptions: ExportableSubscription[]): string {
  const records = subscriptions.map((sub) => ({
    nombre: sub.name,
    proveedor: sub.provider ?? "",
    categoria: sub.categoryName ?? "",
    importe: sub.amount,
    moneda: sub.currency,
    frecuencia: sub.billingFrequency,
    cantidad_intervalo_custom: sub.customIntervalCount ?? "",
    unidad_intervalo_custom: sub.customIntervalUnit ?? "",
    fecha_inicio: formatDateOnly(sub.startDate),
    tipo: sub.subscriptionType,
    renovacion_automatica: sub.autoRenew ? "si" : "no",
    metodo_pago: sub.paymentMethodAlias ?? "",
    notas: sub.notes ?? "",
  }));

  return stringify(records, { header: true, columns: [...CSV_IMPORT_COLUMNS] });
}

export const PAYMENTS_EXPORT_COLUMNS = [
  "suscripcion",
  "fecha_prevista",
  "fecha_pago",
  "importe",
  "moneda",
  "estado",
  "metodo_pago",
  "nota",
] as const;

export interface ExportablePayment {
  subscriptionName: string;
  dueDate: Date;
  paidDate: Date | null;
  amount: string;
  currency: string;
  status: string;
  paymentMethodLabel: string | null;
  note: string | null;
}

export function exportPaymentsCsv(payments: ExportablePayment[]): string {
  const records = payments.map((payment) => ({
    suscripcion: payment.subscriptionName,
    fecha_prevista: formatDateOnly(payment.dueDate),
    fecha_pago: payment.paidDate ? formatDateOnly(payment.paidDate) : "",
    importe: payment.amount,
    moneda: payment.currency,
    estado: payment.status,
    metodo_pago: payment.paymentMethodLabel ?? "",
    nota: payment.note ?? "",
  }));

  return stringify(records, { header: true, columns: [...PAYMENTS_EXPORT_COLUMNS] });
}
