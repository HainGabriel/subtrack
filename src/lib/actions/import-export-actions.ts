"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import { createSubscription } from "@/lib/domain/subscriptions";
import {
  parseSubscriptionsCsv,
  detectDuplicates,
  type ParsedImportRow,
  type ImportRowError,
} from "@/lib/domain/csv-import";
import {
  exportSubscriptionsCsv,
  exportPaymentsCsv,
  type ExportableSubscription,
  type ExportablePayment,
} from "@/lib/domain/csv-export";
import { exportRenewalsIcs } from "@/lib/domain/ics-export";

type Ok<T> = { success: true; data: T };
type Err = { success: false; error: string };
export type ActionResult<T = undefined> = Ok<T> | Err;

const SUBSCRIPTIONS_PATH = "/suscripciones";

/**
 * Estados de suscripción incluidos en el calendario `.ics` de próximos
 * cobros: además de ACTIVE se incluyen TRIAL (el fin de la prueba es un
 * evento relevante) y PENDING_CANCELLATION (sigue cobrando hasta la
 * fecha de cancelación) — no solo el estado literal "ACTIVE".
 */
const ICS_STATUSES = ["ACTIVE", "TRIAL", "PENDING_CANCELLATION"] as const;

// ────────────────────────────────────────────────────────────────
// Importar
// ────────────────────────────────────────────────────────────────

/**
 * Descarga la plantilla CSV vacía (solo encabezado) con las mismas
 * columnas que espera `parseSubscriptionsCsv`.
 */
export async function downloadTemplateAction(): Promise<ActionResult<{ csv: string }>> {
  await requireUser();
  return { success: true, data: { csv: exportSubscriptionsCsv([]) } };
}

export interface PreviewImportData {
  rows: ParsedImportRow[];
  errors: ImportRowError[];
  duplicateCount: number;
}

/**
 * Parsea el CSV subido y cruza con las suscripciones existentes del
 * usuario para marcar duplicados — NO guarda nada todavía. Alimenta la
 * vista previa donde el usuario decide qué importar.
 */
export async function previewImportAction(
  fileContent: string
): Promise<ActionResult<PreviewImportData>> {
  const user = await requireUser();

  const { rows: parsedRows, errors } = parseSubscriptionsCsv(fileContent);

  const existingSubscriptions = await prisma.subscription.findMany({
    where: { userId: user.id, deletedAt: null },
    select: { name: true, startDate: true },
  });

  const rows = detectDuplicates(parsedRows, existingSubscriptions);
  const duplicateCount = rows.filter((row) => row.duplicate).length;

  return { success: true, data: { rows, errors, duplicateCount } };
}

export interface ConfirmImportRowError {
  row: number;
  message: string;
}

export interface ConfirmImportData {
  imported: number;
  skipped: number;
  errors: ConfirmImportRowError[];
}

/**
 * Confirma la importación de las filas ya previsualizadas.
 *
 * Nota de diseño: `createSubscription` abre su propia transacción
 * (`prisma.$transaction`) internamente y su firma exige el `PrismaClient`
 * de nivel superior — un `Prisma.TransactionClient` (el `tx` de una
 * transacción envolvente) NO expone `$transaction` y por tanto no es
 * compatible con esa firma (ni Prisma soporta transacciones anidadas en
 * la misma conexión). Envolver TODO el lote en una única transacción
 * externa rompería `createSubscription` o exigiría tocar su firma, fuera
 * de nuestro alcance. En su lugar, cada fila se procesa de forma
 * secuencial y cada suscripción se crea de forma atómica por sí misma
 * (vía `createSubscription`); si una fila falla, no revierte las
 * anteriores — se reporta en `errors` con su número de fila, igual que
 * hace `parseSubscriptionsCsv` con los errores de validación. Esto evita
 * que un solo registro problemático descarte un lote entero de filas
 * válidas.
 */
export async function confirmImportAction(
  rows: ParsedImportRow[],
  opts: { skipDuplicates: boolean }
): Promise<ActionResult<ConfirmImportData>> {
  const user = await requireUser();

  let imported = 0;
  let skipped = 0;
  const errors: ConfirmImportRowError[] = [];

  for (const row of rows) {
    if (!row.valid || !row.data) {
      skipped += 1;
      continue;
    }
    if (row.duplicate && opts.skipDuplicates) {
      skipped += 1;
      continue;
    }

    try {
      const category = await prisma.category.upsert({
        where: { userId_name: { userId: user.id, name: row.data.categoryName } },
        create: { userId: user.id, name: row.data.categoryName },
        update: {},
      });

      let paymentMethodId: string | null = null;
      if (row.data.paymentMethodAlias) {
        const paymentMethod = await prisma.paymentMethod.findFirst({
          where: {
            userId: user.id,
            alias: { equals: row.data.paymentMethodAlias, mode: "insensitive" },
          },
        });
        paymentMethodId = paymentMethod?.id ?? null;
      }

      const subscription = await createSubscription(prisma, user.id, {
        name: row.data.name,
        provider: row.data.provider ?? null,
        notes: row.data.notes ?? null,
        categoryId: category.id,
        color: "#6366f1",
        icon: "box",
        amount: row.data.amount,
        currency: row.data.currency,
        taxIncluded: true,
        billingFrequency: row.data.billingFrequency,
        customIntervalCount: row.data.customIntervalCount ?? null,
        customIntervalUnit: row.data.customIntervalUnit ?? null,
        startDate: row.data.startDate,
        subscriptionType: row.data.subscriptionType,
        autoRenew: row.data.autoRenew,
        paymentMethodId,
      });

      await prisma.activityLog.create({
        data: {
          userId: user.id,
          subscriptionId: subscription.id,
          action: "IMPORTED",
          metadata: { row: row.row, name: row.data.name },
        },
      });

      imported += 1;
    } catch (error) {
      console.error("confirmImportAction: fila", row.row, error);
      errors.push({ row: row.row, message: "No se pudo crear esta suscripción." });
    }
  }

  if (imported > 0) {
    revalidatePath(SUBSCRIPTIONS_PATH);
  }

  return { success: true, data: { imported, skipped, errors } };
}

// ────────────────────────────────────────────────────────────────
// Exportar
// ────────────────────────────────────────────────────────────────

function decimalToString(value: unknown): string {
  return value == null ? "" : String(value);
}

export type ExportDataResult =
  | { format: "csv"; subscriptionsCsv: string; paymentsCsv: string }
  | { format: "json"; json: ExportJsonPayload };

export interface ExportJsonPayload {
  subscriptions: Record<string, unknown>[];
  payments: Record<string, unknown>[];
  categories: Record<string, unknown>[];
  paymentMethods: Record<string, unknown>[];
  budgets: Record<string, unknown>[];
}

/**
 * Exporta todos los datos del usuario, en CSV (dos archivos: suscripciones
 * y pagos) o en un único objeto JSON (portabilidad de datos completa).
 */
export async function exportDataAction(
  format: "csv" | "json"
): Promise<ActionResult<ExportDataResult>> {
  const user = await requireUser();

  if (format === "csv") {
    const subscriptions = await prisma.subscription.findMany({
      where: { userId: user.id, deletedAt: null },
      include: { category: true, paymentMethod: true },
      orderBy: { createdAt: "asc" },
    });

    const payments = await prisma.payment.findMany({
      where: { userId: user.id },
      include: { subscription: true },
      orderBy: { dueDate: "asc" },
    });

    const exportableSubscriptions: ExportableSubscription[] = subscriptions.map((sub) => ({
      name: sub.name,
      provider: sub.provider,
      categoryName: sub.category?.name ?? null,
      amount: decimalToString(sub.amount),
      currency: sub.currency,
      billingFrequency: sub.billingFrequency,
      customIntervalCount: sub.customIntervalCount,
      customIntervalUnit: sub.customIntervalUnit,
      startDate: sub.startDate,
      subscriptionType: sub.subscriptionType,
      autoRenew: sub.autoRenew,
      paymentMethodAlias: sub.paymentMethod?.alias ?? null,
      notes: sub.notes,
    }));

    const exportablePayments: ExportablePayment[] = payments.map((payment) => ({
      subscriptionName: payment.subscription.name,
      dueDate: payment.dueDate,
      paidDate: payment.paidDate,
      amount: decimalToString(payment.amount),
      currency: payment.currency,
      status: payment.status,
      paymentMethodLabel: payment.paymentMethodLabel,
      note: payment.note,
    }));

    return {
      success: true,
      data: {
        format: "csv",
        subscriptionsCsv: exportSubscriptionsCsv(exportableSubscriptions),
        paymentsCsv: exportPaymentsCsv(exportablePayments),
      },
    };
  }

  const [subscriptions, payments, categories, paymentMethods, budgets] = await Promise.all([
    prisma.subscription.findMany({ where: { userId: user.id, deletedAt: null } }),
    prisma.payment.findMany({ where: { userId: user.id } }),
    prisma.category.findMany({ where: { userId: user.id } }),
    prisma.paymentMethod.findMany({ where: { userId: user.id } }),
    prisma.budget.findMany({ where: { userId: user.id } }),
  ]);

  const json: ExportJsonPayload = {
    subscriptions: subscriptions.map((sub) => ({
      ...sub,
      amount: decimalToString(sub.amount),
      taxAmount: sub.taxAmount == null ? null : decimalToString(sub.taxAmount),
      costPerSeat: sub.costPerSeat == null ? null : decimalToString(sub.costPerSeat),
    })),
    payments: payments.map((payment) => ({ ...payment, amount: decimalToString(payment.amount) })),
    categories,
    paymentMethods,
    budgets: budgets.map((budget) => ({ ...budget, amount: decimalToString(budget.amount) })),
  };

  return { success: true, data: { format: "json", json } };
}

/**
 * Genera el calendario `.ics` con los próximos cobros de las
 * suscripciones activas (ver `ICS_STATUSES`).
 */
export async function exportIcsAction(): Promise<ActionResult<{ ics: string }>> {
  const user = await requireUser();

  const subscriptions = await prisma.subscription.findMany({
    where: { userId: user.id, deletedAt: null, status: { in: [...ICS_STATUSES] } },
    select: { id: true, name: true, amount: true, currency: true, nextBillingDate: true },
    orderBy: { nextBillingDate: "asc" },
  });

  const ics = exportRenewalsIcs(
    subscriptions.map((sub) => ({
      id: sub.id,
      name: sub.name,
      amount: decimalToString(sub.amount),
      currency: sub.currency,
      nextBillingDate: sub.nextBillingDate,
    }))
  );

  return { success: true, data: { ics } };
}
