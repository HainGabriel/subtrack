"use client";

import { useState, useTransition } from "react";
import {
  MoreVertical,
  Plus,
  Archive,
  ArchiveRestore,
  Pencil,
  Trash2,
  CreditCard,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import { resolveIcon } from "@/lib/icon-map";
import { PAYMENT_METHOD_TYPE_LABELS } from "@/lib/validation/payment-method";
import {
  archivePaymentMethodAction,
  unarchivePaymentMethodAction,
} from "@/lib/actions/payment-method-actions";
import { PaymentMethodFormDialog, type PaymentMethodFormValue } from "./payment-method-form-dialog";
import {
  DeletePaymentMethodDialog,
  type DeletablePaymentMethod,
} from "./delete-payment-method-dialog";

export interface PaymentMethodRow {
  id: string;
  type: PaymentMethodFormValue["type"];
  alias: string;
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
  color: string;
  icon: string;
  archivedAt: string | null;
  subscriptionCount: number;
  expirySeverity: "critical" | "serious" | "warning" | null;
  daysUntilExpiry: number | null;
}

export function PaymentMethodManager({ methods }: { methods: PaymentMethodRow[] }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentMethodFormValue | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeletablePaymentMethod | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const active = methods.filter((m) => !m.archivedAt);
  const archived = methods.filter((m) => m.archivedAt);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(method: PaymentMethodRow) {
    setEditing({
      id: method.id,
      type: method.type,
      alias: method.alias,
      brand: method.brand,
      last4: method.last4,
      expMonth: method.expMonth,
      expYear: method.expYear,
      color: method.color,
      icon: method.icon,
    });
    setFormOpen(true);
  }

  function openDelete(method: PaymentMethodRow) {
    setDeleteTarget({
      id: method.id,
      alias: method.alias,
      subscriptionCount: method.subscriptionCount,
    });
  }

  function toggleArchive(method: PaymentMethodRow) {
    setPendingId(method.id);
    startTransition(async () => {
      const result = method.archivedAt
        ? await unarchivePaymentMethodAction(method.id)
        : await archivePaymentMethodAction(method.id);
      setPendingId(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(method.archivedAt ? "Método restaurado" : "Método archivado");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold">Métodos de pago</h1>
          <p className="text-muted-foreground text-sm">
            Administra las tarjetas y cuentas con las que pagas tus suscripciones.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          Nuevo método
        </Button>
      </div>

      {methods.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CreditCard />
            </EmptyMedia>
            <EmptyTitle>Sin métodos de pago</EmptyTitle>
            <EmptyDescription>
              Agrega tu primer método de pago para asociarlo a tus suscripciones.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              Nuevo método
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <MethodList
            methods={active}
            pendingId={pendingId}
            onEdit={openEdit}
            onDelete={openDelete}
            onToggleArchive={toggleArchive}
          />

          {archived.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-muted-foreground text-sm font-medium">Archivados</h2>
              <MethodList
                methods={archived}
                pendingId={pendingId}
                onEdit={openEdit}
                onDelete={openDelete}
                onToggleArchive={toggleArchive}
              />
            </div>
          )}
        </>
      )}

      <PaymentMethodFormDialog open={formOpen} onOpenChange={setFormOpen} method={editing} />
      <DeletePaymentMethodDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        method={deleteTarget}
      />
    </div>
  );
}

const severityClass: Record<NonNullable<PaymentMethodRow["expirySeverity"]>, string> = {
  critical: "text-[color:var(--status-critical)]",
  serious: "text-[color:var(--status-serious)]",
  warning: "text-[color:var(--status-warning)]",
};

function expiryLabel(method: PaymentMethodRow): string | null {
  if (!method.expMonth || !method.expYear) return null;
  const monthLabel = method.expMonth.toString().padStart(2, "0");
  if (method.expirySeverity === "critical") {
    return `Venció ${monthLabel}/${method.expYear}`;
  }
  return `Vence ${monthLabel}/${method.expYear}`;
}

function MethodList({
  methods,
  pendingId,
  onEdit,
  onDelete,
  onToggleArchive,
}: {
  methods: PaymentMethodRow[];
  pendingId: string | null;
  onEdit: (method: PaymentMethodRow) => void;
  onDelete: (method: PaymentMethodRow) => void;
  onToggleArchive: (method: PaymentMethodRow) => void;
}) {
  if (methods.length === 0) {
    return <p className="text-muted-foreground text-sm">No hay métodos en este grupo.</p>;
  }

  return (
    <ItemGroup>
      {methods.map((method) => {
        const Icon = resolveIcon(method.icon);
        const expiry = expiryLabel(method);
        return (
          <Item key={method.id} variant="outline">
            <ItemMedia variant="icon">
              <div
                className="flex size-9 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${method.color}22`, color: method.color }}
              >
                <Icon className="size-4.5" />
              </div>
            </ItemMedia>
            <ItemContent>
              <ItemTitle>
                {method.alias}
                <Badge variant="secondary">{PAYMENT_METHOD_TYPE_LABELS[method.type]}</Badge>
              </ItemTitle>
              <ItemDescription>
                {[method.brand, method.last4 ? `•••• ${method.last4}` : null]
                  .filter(Boolean)
                  .join(" · ") || "Sin detalles adicionales"}
                {expiry && (
                  <span
                    className={cn(
                      "ml-2 inline-flex items-center gap-1 font-medium",
                      method.expirySeverity && severityClass[method.expirySeverity]
                    )}
                  >
                    <TriangleAlert className="size-3.5" />
                    {expiry}
                  </span>
                )}
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              {method.subscriptionCount > 0 && (
                <Badge variant="outline">
                  {method.subscriptionCount}{" "}
                  {method.subscriptionCount === 1 ? "suscripción" : "suscripciones"}
                </Badge>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={pendingId === method.id}
                    aria-label={`Acciones para ${method.alias}`}
                  >
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => onEdit(method)}>
                    <Pencil className="size-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onToggleArchive(method)}>
                    {method.archivedAt ? (
                      <>
                        <ArchiveRestore className="size-4" />
                        Restaurar
                      </>
                    ) : (
                      <>
                        <Archive className="size-4" />
                        Archivar
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onSelect={() => onDelete(method)}>
                    <Trash2 className="size-4" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </ItemActions>
          </Item>
        );
      })}
    </ItemGroup>
  );
}
