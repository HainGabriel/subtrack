"use client";

import Link from "next/link";
import { MoreVertical, Pencil, Archive, Eye } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/subscriptions/status-badge";
import { formatMoney } from "@/lib/domain/money";
import { resolveIcon } from "@/lib/icon-map";
import type { SubscriptionStatus } from "@/generated/prisma/enums";

export interface SubscriptionListRow {
  id: string;
  name: string;
  provider: string | null;
  color: string;
  icon: string;
  amount: string;
  currency: string;
  nextBillingDate: string;
  status: SubscriptionStatus;
  category: { id: string; name: string; color: string } | null;
  tags: { id: string; name: string; color: string }[];
}

export function SubscriptionTable({
  rows,
  selectedIds,
  onToggle,
  onToggleAll,
  onArchive,
}: {
  rows: SubscriptionListRow[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
  onArchive: (id: string) => void;
}) {
  const allSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.id));

  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(checked) => onToggleAll(checked === true)}
                aria-label="Seleccionar todas las suscripciones"
              />
            </TableHead>
            <TableHead>Suscripción</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Importe</TableHead>
            <TableHead>Próximo cobro</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-10 text-right">
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const Icon = resolveIcon(row.icon);
            const isSelected = selectedIds.has(row.id);
            return (
              <TableRow key={row.id} data-state={isSelected ? "selected" : undefined}>
                <TableCell>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggle(row.id)}
                    aria-label={`Seleccionar ${row.name}`}
                  />
                </TableCell>
                <TableCell>
                  <Link
                    href={`/suscripciones/${row.id}`}
                    className="flex min-w-0 items-center gap-3"
                  >
                    <span
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${row.color}22`, color: row.color }}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{row.name}</span>
                      {row.provider && (
                        <span className="text-muted-foreground block truncate text-xs">
                          {row.provider}
                        </span>
                      )}
                    </span>
                  </Link>
                </TableCell>
                <TableCell>
                  {row.category ? (
                    <Badge
                      variant="outline"
                      style={{ borderColor: row.category.color, color: row.category.color }}
                    >
                      {row.category.name}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  {formatMoney({ amount: row.amount, currency: row.currency })}
                </TableCell>
                <TableCell className="text-sm">
                  {new Intl.DateTimeFormat("es-DO", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  }).format(new Date(row.nextBillingDate))}
                </TableCell>
                <TableCell>
                  <StatusBadge status={row.status} />
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Acciones para ${row.name}`}
                      >
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/suscripciones/${row.id}`}>
                          <Eye className="size-4" />
                          Ver detalle
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/suscripciones/${row.id}/editar`}>
                          <Pencil className="size-4" />
                          Editar
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => onArchive(row.id)}>
                        <Archive className="size-4" />
                        Archivar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
