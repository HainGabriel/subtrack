import { Fragment } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { PaymentStatus } from "@/generated/prisma/enums";
import { formatMoney } from "@/lib/domain/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Receipt } from "lucide-react";
import { RecordPaymentDialog } from "./record-payment-dialog";
import { EditPaymentDialog } from "./edit-payment-dialog";

const PAGE_SIZE = 20;

const STATUS_OPTIONS: Array<{ value: PaymentStatus; label: string }> = [
  { value: "SCHEDULED", label: "Programado" },
  { value: "PAID", label: "Pagado" },
  { value: "SKIPPED", label: "Omitido" },
  { value: "FAILED", label: "Fallido" },
  { value: "REFUNDED", label: "Reembolsado" },
  { value: "CANCELLED", label: "Cancelado" },
];

const STATUS_BADGE_CLASS: Record<PaymentStatus, string> = {
  PAID: "border-status-good/30 bg-status-good/10 text-status-good",
  SCHEDULED: "border-border text-muted-foreground",
  FAILED: "border-status-critical/30 bg-status-critical/10 text-status-critical",
  SKIPPED: "border-border text-muted-foreground",
  REFUNDED: "border-status-warning/30 bg-status-warning/10 text-status-warning",
  CANCELLED: "border-border text-muted-foreground",
};

const STATUS_LABEL: Record<PaymentStatus, string> = Object.fromEntries(
  STATUS_OPTIONS.map((o) => [o.value, o.label])
) as Record<PaymentStatus, string>;

interface PagosPageProps {
  searchParams: Promise<{
    estado?: string;
    moneda?: string;
    suscripcion?: string;
    desde?: string;
    hasta?: string;
    pagina?: string;
  }>;
}

function isValidStatus(value: string | undefined): value is PaymentStatus {
  return !!value && STATUS_OPTIONS.some((o) => o.value === value);
}

function buildHref(params: Record<string, string | undefined>, page: number): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  if (page > 1) search.set("pagina", String(page));
  const qs = search.toString();
  return qs ? `/pagos?${qs}` : "/pagos";
}

export default async function PagosPage({ searchParams }: PagosPageProps) {
  const authUser = await requireUser();
  const filters = await searchParams;

  const page = Math.max(1, Number.parseInt(filters.pagina ?? "1", 10) || 1);

  const where: Prisma.PaymentWhereInput = { userId: authUser.id };
  if (isValidStatus(filters.estado)) where.status = filters.estado;
  if (filters.moneda) where.currency = filters.moneda.toUpperCase();
  if (filters.suscripcion) where.subscriptionId = filters.suscripcion;
  if (filters.desde || filters.hasta) {
    where.dueDate = {
      ...(filters.desde ? { gte: new Date(filters.desde) } : {}),
      ...(filters.hasta ? { lte: new Date(filters.hasta) } : {}),
    };
  }

  const [
    totalCount,
    payments,
    subscriptionsForFilter,
    currencyRows,
    subscriptionOptions,
    paymentMethods,
  ] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      include: {
        subscription: { select: { id: true, name: true } },
        paymentMethod: { select: { alias: true } },
      },
      orderBy: { dueDate: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.subscription.findMany({
      where: { userId: authUser.id, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.payment.findMany({
      where: { userId: authUser.id },
      select: { currency: true },
      distinct: ["currency"],
    }),
    prisma.subscription.findMany({
      where: { userId: authUser.id, deletedAt: null },
      select: {
        id: true,
        name: true,
        amount: true,
        currency: true,
        paymentMethodId: true,
        nextBillingDate: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.paymentMethod.findMany({
      where: { userId: authUser.id, archivedAt: null },
      select: { id: true, alias: true },
      orderBy: { alias: "asc" },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentFilters = {
    estado: filters.estado,
    moneda: filters.moneda,
    suscripcion: filters.suscripcion,
    desde: filters.desde,
    hasta: filters.hasta,
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-medium">Pagos</h1>
          <p className="text-muted-foreground text-sm">Historial de pagos de tus suscripciones.</p>
        </div>
        <RecordPaymentDialog
          subscriptions={subscriptionOptions.map((s) => ({
            id: s.id,
            name: s.name,
            amount: s.amount.toString(),
            currency: s.currency,
            paymentMethodId: s.paymentMethodId,
            nextBillingDate: s.nextBillingDate.toISOString().slice(0, 10),
          }))}
          paymentMethods={paymentMethods}
        />
      </div>

      <form
        className="grid grid-cols-2 gap-3 rounded-xl border p-3 sm:grid-cols-3 lg:grid-cols-5"
        method="GET"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-estado">Estado</Label>
          <Select name="estado" defaultValue={filters.estado ?? "__all__"}>
            <SelectTrigger id="filter-estado" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-moneda">Moneda</Label>
          <Select name="moneda" defaultValue={filters.moneda ?? "__all__"}>
            <SelectTrigger id="filter-moneda" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas</SelectItem>
              {currencyRows.map((c) => (
                <SelectItem key={c.currency} value={c.currency}>
                  {c.currency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-suscripcion">Suscripción</Label>
          <Select name="suscripcion" defaultValue={filters.suscripcion ?? "__all__"}>
            <SelectTrigger id="filter-suscripcion" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas</SelectItem>
              {subscriptionsForFilter.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-desde">Desde</Label>
          <Input id="filter-desde" type="date" name="desde" defaultValue={filters.desde ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-hasta">Hasta</Label>
          <Input id="filter-hasta" type="date" name="hasta" defaultValue={filters.hasta ?? ""} />
        </div>

        <div className="col-span-2 flex items-end gap-2 sm:col-span-3 lg:col-span-5">
          <Button type="submit" size="sm">
            Aplicar filtros
          </Button>
          <Button asChild type="button" variant="ghost" size="sm">
            <Link href="/pagos">Limpiar</Link>
          </Button>
        </div>
      </form>

      {payments.length === 0 ? (
        <Empty>
          <EmptyMedia variant="icon">
            <Receipt aria-hidden className="size-5" />
          </EmptyMedia>
          <EmptyTitle>Sin pagos</EmptyTitle>
          <EmptyDescription>No hay pagos que coincidan con estos filtros.</EmptyDescription>
        </Empty>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Suscripción</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Fecha de pago</TableHead>
                <TableHead>Importe</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    <Link
                      href={`/suscripciones/${payment.subscriptionId}`}
                      className="hover:underline"
                    >
                      {payment.subscription.name}
                    </Link>
                  </TableCell>
                  <TableCell>{payment.dueDate.toISOString().slice(0, 10)}</TableCell>
                  <TableCell>
                    {payment.paidDate ? payment.paidDate.toISOString().slice(0, 10) : "—"}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatMoney({ amount: payment.amount.toString(), currency: payment.currency })}
                  </TableCell>
                  <TableCell>
                    {payment.paymentMethod?.alias ?? payment.paymentMethodLabel ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_BADGE_CLASS[payment.status]}>
                      {STATUS_LABEL[payment.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <EditPaymentDialog
                      payment={{
                        id: payment.id,
                        subscriptionName: payment.subscription.name,
                        amount: payment.amount.toString(),
                        currency: payment.currency,
                        note: payment.note,
                        status: payment.status,
                        paymentMethodId: payment.paymentMethodId,
                        dueDate: payment.dueDate.toISOString().slice(0, 10),
                      }}
                      paymentMethods={paymentMethods}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href={buildHref(currentFilters, Math.max(1, page - 1))}
                aria-disabled={page <= 1}
                className={page <= 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .map((p, idx, arr) => (
                <Fragment key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <PaginationItem>
                      <span className="text-muted-foreground px-2">…</span>
                    </PaginationItem>
                  )}
                  <PaginationItem>
                    <PaginationLink href={buildHref(currentFilters, p)} isActive={p === page}>
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                </Fragment>
              ))}
            <PaginationItem>
              <PaginationNext
                href={buildHref(currentFilters, Math.min(totalPages, page + 1))}
                aria-disabled={page >= totalPages}
                className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
