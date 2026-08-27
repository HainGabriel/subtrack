"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutGrid, List, Plus, Search, Archive, Layers } from "lucide-react";
import { toast } from "sonner";

import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  SubscriptionTable,
  type SubscriptionListRow,
} from "@/components/subscriptions/subscription-table";
import { SubscriptionCardGrid } from "@/components/subscriptions/subscription-card";
import { STATUS_CONFIG } from "@/components/subscriptions/status-badge";
import { CURRENCIES } from "@/lib/domain/currencies";
import { archiveAction, bulkArchiveAction } from "@/lib/actions/subscription-actions";

const ORDER_OPTIONS = [
  { value: "proximo_asc", label: "Próximo cobro (más cercano primero)" },
  { value: "proximo_desc", label: "Próximo cobro (más lejano primero)" },
  { value: "monto_desc", label: "Importe (mayor primero)" },
  { value: "monto_asc", label: "Importe (menor primero)" },
  { value: "nombre_asc", label: "Nombre (A–Z)" },
] as const;

const ALL_VALUE = "__all__";

export interface SubscriptionsExplorerProps {
  rows: SubscriptionListRow[];
  view: "tabla" | "tarjetas";
  categories: { id: string; name: string }[];
  paymentMethods: { id: string; alias: string }[];
  page: number;
  pageCount: number;
  total: number;
  hasAnySubscriptions: boolean;
}

export function SubscriptionsExplorer({
  rows,
  view,
  categories,
  paymentMethods,
  page,
  pageCount,
  total,
  hasAnySubscriptions,
}: SubscriptionsExplorerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(searchParams.get("q") ?? "");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmBulkArchive, setConfirmBulkArchive] = useState(false);

  function buildHref(overrides: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(overrides)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    // Cualquier cambio de filtro/orden/vista reinicia a la página 1.
    if (!("pagina" in overrides)) params.delete("pagina");
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  function navigate(overrides: Record<string, string | null>) {
    router.push(buildHref(overrides));
  }

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearchChange(value: string) {
    setSearchValue(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      navigate({ q: value || null });
    }, 350);
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? new Set(rows.map((row) => row.id)) : new Set());
  }

  function handleSingleArchive(id: string) {
    startTransition(async () => {
      const result = await archiveAction(id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Suscripción archivada");
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    });
  }

  function handleBulkArchive() {
    startTransition(async () => {
      const result = await bulkArchiveAction([...selectedIds]);
      setConfirmBulkArchive(false);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`${selectedIds.size} suscripción(es) archivada(s)`);
      setSelectedIds(new Set());
    });
  }

  const activeFilters = {
    categoria: searchParams.get("categoria") ?? ALL_VALUE,
    estado: searchParams.get("estado") ?? ALL_VALUE,
    moneda: searchParams.get("moneda") ?? ALL_VALUE,
    metodoPago: searchParams.get("metodoPago") ?? ALL_VALUE,
    orden: searchParams.get("orden") ?? "proximo_asc",
  };

  if (!hasAnySubscriptions) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Layers />
          </EmptyMedia>
          <EmptyTitle>Sin suscripciones todavía</EmptyTitle>
          <EmptyDescription>
            Registra tu primera suscripción para empezar a hacerle seguimiento a tus gastos
            recurrentes.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href="/suscripciones/nueva">
              <Plus className="size-4" />
              Nueva suscripción
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <InputGroup className="sm:max-w-xs">
          <InputGroupAddon>
            <Search className="size-4" />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Buscar por nombre o proveedor..."
            value={searchValue}
            onChange={(event) => handleSearchChange(event.target.value)}
            aria-label="Buscar suscripciones"
          />
        </InputGroup>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={activeFilters.categoria}
            onValueChange={(value) => navigate({ categoria: value === ALL_VALUE ? null : value })}
          >
            <SelectTrigger size="sm" aria-label="Filtrar por categoría">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Todas las categorías</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={activeFilters.estado}
            onValueChange={(value) => navigate({ estado: value === ALL_VALUE ? null : value })}
          >
            <SelectTrigger size="sm" aria-label="Filtrar por estado">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Todos los estados</SelectItem>
              {(Object.keys(STATUS_CONFIG) as Array<keyof typeof STATUS_CONFIG>).map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_CONFIG[status].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={activeFilters.moneda}
            onValueChange={(value) => navigate({ moneda: value === ALL_VALUE ? null : value })}
          >
            <SelectTrigger size="sm" aria-label="Filtrar por moneda">
              <SelectValue placeholder="Moneda" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Todas las monedas</SelectItem>
              {CURRENCIES.map((currency) => (
                <SelectItem key={currency.code} value={currency.code}>
                  {currency.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={activeFilters.metodoPago}
            onValueChange={(value) => navigate({ metodoPago: value === ALL_VALUE ? null : value })}
          >
            <SelectTrigger size="sm" aria-label="Filtrar por método de pago">
              <SelectValue placeholder="Método de pago" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Todos los métodos</SelectItem>
              {paymentMethods.map((method) => (
                <SelectItem key={method.id} value={method.id}>
                  {method.alias}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={activeFilters.orden} onValueChange={(value) => navigate({ orden: value })}>
            <SelectTrigger size="sm" aria-label="Ordenar por">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              {ORDER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1 rounded-lg border p-0.5">
            <Button
              asChild
              size="icon-sm"
              variant={view === "tabla" ? "secondary" : "ghost"}
              aria-label="Vista de tabla"
              aria-pressed={view === "tabla"}
            >
              <Link href={buildHref({ vista: null })} scroll={false}>
                <List className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="icon-sm"
              variant={view === "tarjetas" ? "secondary" : "ghost"}
              aria-label="Vista de tarjetas"
              aria-pressed={view === "tarjetas"}
            >
              <Link href={buildHref({ vista: "tarjetas" })} scroll={false}>
                <LayoutGrid className="size-4" />
              </Link>
            </Button>
          </div>

          <Button asChild>
            <Link href="/suscripciones/nueva">
              <Plus className="size-4" />
              Nueva suscripción
            </Link>
          </Button>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="bg-muted/50 flex items-center justify-between rounded-lg border px-3 py-2">
          <p className="text-sm">{selectedIds.size} seleccionada(s)</p>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => setConfirmBulkArchive(true)}
          >
            <Archive className="size-4" />
            Archivar seleccionadas
          </Button>
        </div>
      )}

      {rows.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Search />
            </EmptyMedia>
            <EmptyTitle>Sin resultados</EmptyTitle>
            <EmptyDescription>
              Ninguna suscripción coincide con estos filtros. Prueba a ajustarlos o a limpiar la
              búsqueda.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" asChild>
              <Link href={pathname}>Limpiar filtros</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : view === "tarjetas" ? (
        <SubscriptionCardGrid rows={rows} selectedIds={selectedIds} onToggle={toggleSelected} />
      ) : (
        <SubscriptionTable
          rows={rows}
          selectedIds={selectedIds}
          onToggle={toggleSelected}
          onToggleAll={toggleAll}
          onArchive={handleSingleArchive}
        />
      )}

      {pageCount > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href={buildHref({ pagina: String(Math.max(1, page - 1)) })}
                aria-disabled={page <= 1}
                className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
              />
            </PaginationItem>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
              <PaginationItem key={pageNumber}>
                <PaginationLink
                  href={buildHref({ pagina: String(pageNumber) })}
                  isActive={pageNumber === page}
                >
                  {pageNumber}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href={buildHref({ pagina: String(Math.min(pageCount, page + 1)) })}
                aria-disabled={page >= pageCount}
                className={page >= pageCount ? "pointer-events-none opacity-50" : undefined}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <p className="text-muted-foreground text-center text-xs">{total} suscripción(es) en total</p>

      <AlertDialog open={confirmBulkArchive} onOpenChange={setConfirmBulkArchive}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Archivar {selectedIds.size} suscripción(es)?</AlertDialogTitle>
            <AlertDialogDescription>
              Las suscripciones archivadas dejan de contar para tus totales activos, pero conservan
              su historial. Puedes reactivarlas cuando quieras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkArchive} disabled={pending}>
              Archivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
