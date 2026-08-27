import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Pencil, ExternalLink, Users } from "lucide-react";

import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/domain/money";
import { SubscriptionIconBadge } from "@/components/subscriptions/subscription-icon-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/subscriptions/status-badge";
import { SubscriptionActionsBar } from "@/components/subscriptions/subscription-actions-bar";
import { RecordPaymentDialog } from "@/components/subscriptions/record-payment-dialog";
import { ReminderRulesEditor } from "@/components/subscriptions/reminder-rules-editor";
import { ActivityLogList } from "@/components/subscriptions/activity-log-list";
import type { PaymentStatus } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Detalle de suscripción — SubTrack" };

const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  SCHEDULED: "Prevista",
  PAID: "Pagado",
  SKIPPED: "Omitido",
  FAILED: "Fallido",
  REFUNDED: "Reembolsado",
  CANCELLED: "Cancelado",
};

const PAYMENT_STATUS_CLASS: Record<PaymentStatus, string> = {
  SCHEDULED: "text-muted-foreground",
  PAID: "text-[var(--status-good)]",
  SKIPPED: "text-muted-foreground",
  FAILED: "text-[var(--status-critical)]",
  REFUNDED: "text-[var(--status-serious)]",
  CANCELLED: "text-muted-foreground",
};

export default async function SubscriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const subscription = await prisma.subscription.findFirst({
    where: { id, userId: user.id },
    include: {
      category: true,
      paymentMethod: true,
      tags: { include: { tag: true } },
      reminderRules: { orderBy: { offsetDays: "desc" } },
      payments: { orderBy: { dueDate: "desc" }, take: 25 },
      activityLogs: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  if (!subscription) notFound();

  const paymentMethods = await prisma.paymentMethod.findMany({
    where: { userId: user.id, archivedAt: null },
    orderBy: { alias: "asc" },
    select: { id: true, alias: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex items-start gap-4">
          <SubscriptionIconBadge icon={subscription.icon} color={subscription.color} />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{subscription.name}</h1>
            {subscription.provider && (
              <p className="text-muted-foreground text-sm">{subscription.provider}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={subscription.status} />
              {subscription.category && (
                <Badge
                  variant="outline"
                  style={{
                    borderColor: subscription.category.color,
                    color: subscription.category.color,
                  }}
                >
                  {subscription.category.name}
                </Badge>
              )}
              {subscription.tags.map(({ tag }) => (
                <Badge key={tag.id} variant="secondary">
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/suscripciones/${subscription.id}/editar`}>
              <Pencil className="size-4" />
              Editar
            </Link>
          </Button>
          <RecordPaymentDialog
            subscriptionId={subscription.id}
            nextBillingDate={subscription.nextBillingDate}
            defaultAmount={subscription.amount.toString()}
            defaultCurrency={subscription.currency}
            defaultPaymentMethodId={subscription.paymentMethodId}
            paymentMethods={paymentMethods}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Próximo cobro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-3xl font-semibold tabular-nums">
                {formatMoney({
                  amount: subscription.amount.toString(),
                  currency: subscription.currency,
                })}
              </p>
              <p className="text-muted-foreground text-sm">
                {format(subscription.nextBillingDate, "d 'de' MMMM 'de' yyyy", { locale: es })}
              </p>
            </div>
            <Separator />
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Frecuencia</dt>
                <dd>{subscription.billingFrequency}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Renovación automática</dt>
                <dd>{subscription.autoRenew ? "Sí" : "No"}</dd>
              </div>
              {subscription.cancelByDate && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Cancelar antes de</dt>
                  <dd>{format(subscription.cancelByDate, "d MMM yyyy", { locale: es })}</dd>
                </div>
              )}
              {subscription.paymentMethod && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Método de pago</dt>
                  <dd>{subscription.paymentMethod.alias}</dd>
                </div>
              )}
              {subscription.seats > 1 && (
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground flex items-center gap-1">
                    <Users className="size-3.5" /> Asientos
                  </dt>
                  <dd>{subscription.seats}</dd>
                </div>
              )}
              {subscription.managementUrl && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Gestionar en</dt>
                  <dd>
                    <a
                      href={subscription.managementUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary inline-flex items-center gap-1 hover:underline"
                    >
                      Sitio del proveedor <ExternalLink className="size-3.5" />
                    </a>
                  </dd>
                </div>
              )}
            </dl>
            <Separator />
            <SubscriptionActionsBar id={subscription.id} status={subscription.status} />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Historial de pagos</CardTitle>
            </CardHeader>
            <CardContent>
              {subscription.payments.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Todavía no hay pagos registrados para esta suscripción.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha prevista</TableHead>
                        <TableHead>Fecha de pago</TableHead>
                        <TableHead>Importe</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Nota</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subscription.payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            {format(payment.dueDate, "d MMM yyyy", { locale: es })}
                          </TableCell>
                          <TableCell>
                            {payment.paidDate
                              ? format(payment.paidDate, "d MMM yyyy", { locale: es })
                              : "—"}
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {formatMoney({
                              amount: payment.amount.toString(),
                              currency: payment.currency,
                            })}
                          </TableCell>
                          <TableCell>
                            <span className={PAYMENT_STATUS_CLASS[payment.status]}>
                              {PAYMENT_STATUS_LABEL[payment.status]}
                            </span>
                          </TableCell>
                          <TableCell>{payment.paymentMethodLabel ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground max-w-40 truncate">
                            {payment.note ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Avisos de renovación</CardTitle>
            </CardHeader>
            <CardContent>
              <ReminderRulesEditor
                subscriptionId={subscription.id}
                rules={subscription.reminderRules}
              />
            </CardContent>
          </Card>

          {(subscription.description || subscription.notes) && (
            <Card>
              <CardHeader>
                <CardTitle>Notas</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-2 text-sm whitespace-pre-wrap">
                {subscription.description && <p>{subscription.description}</p>}
                {subscription.notes && <p>{subscription.notes}</p>}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Actividad</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityLogList
                items={subscription.activityLogs.map((log) => ({
                  id: log.id,
                  action: log.action,
                  createdAt: log.createdAt.toISOString(),
                }))}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
