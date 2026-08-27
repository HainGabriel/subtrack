"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, CalendarClock, CheckCircle2, XCircle } from "lucide-react";
import type { PaymentStatus } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { formatMoney } from "@/lib/domain/money";
import { cn } from "@/lib/utils";

export interface CalendarEvent {
  id: string;
  subscriptionId: string;
  subscriptionName: string;
  categoryName: string | null;
  amount: string;
  currency: string;
  day: number;
  kind: "payment" | "upcoming";
  status?: PaymentStatus;
}

interface CalendarViewProps {
  year: number;
  month: number; // 1-12
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  events: CalendarEvent[];
}

const STATUS_META: Record<PaymentStatus, { label: string; className: string }> = {
  PAID: { label: "Pagado", className: "text-status-good" },
  SCHEDULED: { label: "Programado", className: "text-muted-foreground" },
  FAILED: { label: "Fallido", className: "text-status-critical" },
  SKIPPED: { label: "Omitido", className: "text-muted-foreground" },
  REFUNDED: { label: "Reembolsado", className: "text-status-warning" },
  CANCELLED: { label: "Cancelado", className: "text-muted-foreground" },
};

function eventMeta(event: CalendarEvent): { label: string; className: string } {
  if (event.kind === "upcoming") return { label: "Próximo cobro", className: "text-primary" };
  return (
    STATUS_META[event.status as PaymentStatus] ?? {
      label: "Pago",
      className: "text-muted-foreground",
    }
  );
}

function monthTitle(year: number, month: number): string {
  return new Intl.DateTimeFormat("es-DO", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function weekdayShort(date: Date): string {
  return new Intl.DateTimeFormat("es-DO", { weekday: "short", timeZone: "UTC" }).format(date);
}

function dayFullLabel(date: Date): string {
  const label = new Intl.DateTimeFormat("es-DO", {
    day: "numeric",
    month: "long",
    weekday: "long",
    timeZone: "UTC",
  }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function addMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const total = year * 12 + (month - 1) + delta;
  return { year: Math.floor(total / 12), month: (((total % 12) + 12) % 12) + 1 };
}

function monthHref(year: number, month: number): string {
  return `/calendario?mes=${year}-${String(month).padStart(2, "0")}`;
}

interface GridCell {
  date: Date;
  day: number;
  inMonth: boolean;
}

function buildGrid(year: number, month: number, weekStartsOn: number): GridCell[] {
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const firstWeekday = firstOfMonth.getUTCDay();
  const offset = (firstWeekday - weekStartsOn + 7) % 7;
  const gridStart = new Date(Date.UTC(year, month - 1, 1 - offset));

  const cells: GridCell[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(gridStart);
    date.setUTCDate(gridStart.getUTCDate() + i);
    cells.push({ date, day: date.getUTCDate(), inMonth: date.getUTCMonth() === month - 1 });
  }
  // Recorta la última fila si cae completamente fuera del mes (mes que cabe en 5 filas).
  const lastRowStart = cells.length - 7;
  if (cells.slice(lastRowStart).every((c) => !c.inMonth)) {
    return cells.slice(0, lastRowStart);
  }
  return cells;
}

export function CalendarView({ year, month, weekStartsOn, events }: CalendarViewProps) {
  const router = useRouter();
  const [selectedDay, setSelectedDay] = React.useState<number | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const eventsByDay = React.useMemo(() => {
    const map = new Map<number, CalendarEvent[]>();
    for (const event of events) {
      const list = map.get(event.day) ?? [];
      list.push(event);
      map.set(event.day, list);
    }
    return map;
  }, [events]);

  const grid = React.useMemo(
    () => buildGrid(year, month, weekStartsOn),
    [year, month, weekStartsOn]
  );
  const weekdayLabels = React.useMemo(
    () => grid.slice(0, 7).map((c) => weekdayShort(c.date)),
    [grid]
  );

  const prev = addMonth(year, month, -1);
  const next = addMonth(year, month, 1);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      router.push(monthHref(prev.year, prev.month));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      router.push(monthHref(next.year, next.month));
    }
  };

  const sortedDaysWithEvents = React.useMemo(
    () => Array.from(eventsByDay.keys()).sort((a, b) => a - b),
    [eventsByDay]
  );

  const selectedEvents = selectedDay !== null ? (eventsByDay.get(selectedDay) ?? []) : [];
  const selectedDate =
    selectedDay !== null ? new Date(Date.UTC(year, month - 1, selectedDay)) : null;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="focus-visible:ring-ring/50 flex flex-col gap-4 rounded-xl outline-none focus-visible:ring-3"
      aria-label="Calendario de cobros. Usa las flechas izquierda y derecha para cambiar de mes."
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button asChild variant="outline" size="icon-sm" aria-label="Mes anterior">
            <Link href={monthHref(prev.year, prev.month)}>
              <ChevronLeft />
            </Link>
          </Button>
          <h2 className="font-heading w-44 text-center text-lg font-medium capitalize">
            {monthTitle(year, month)}
          </h2>
          <Button asChild variant="outline" size="icon-sm" aria-label="Mes siguiente">
            <Link href={monthHref(next.year, next.month)}>
              <ChevronRight />
            </Link>
          </Button>
        </div>

        <Tabs defaultValue="grid">
          <TabsList>
            <TabsTrigger value="grid">Mes</TabsTrigger>
            <TabsTrigger value="list">Lista</TabsTrigger>
          </TabsList>

          <TabsContent value="grid" className="mt-4">
            <div className="grid grid-cols-7 gap-1">
              {weekdayLabels.map((label, i) => (
                <div
                  key={i}
                  className="text-muted-foreground py-1 text-center text-xs font-medium capitalize"
                >
                  {label}
                </div>
              ))}
              {grid.map((cell) => {
                const cellEvents = cell.inMonth ? (eventsByDay.get(cell.day) ?? []) : [];
                const hasEvents = cellEvents.length > 0;
                const visible = cellEvents.slice(0, 2);
                const overflow = cellEvents.length - visible.length;

                return (
                  <button
                    key={cell.date.toISOString()}
                    type="button"
                    disabled={!hasEvents}
                    onClick={() => setSelectedDay(cell.day)}
                    className={cn(
                      "flex min-h-20 flex-col items-start gap-1 rounded-lg border p-1.5 text-left text-xs transition-colors",
                      cell.inMonth ? "bg-card" : "bg-muted/30 text-muted-foreground/50",
                      hasEvents && "hover:bg-muted/60 cursor-pointer",
                      !hasEvents && "cursor-default"
                    )}
                  >
                    <span className={cn("font-medium", !cell.inMonth && "opacity-50")}>
                      {cell.day}
                    </span>
                    {visible.map((event) => (
                      <span
                        key={event.id}
                        className={cn(
                          "w-full truncate rounded-sm px-1 py-0.5 text-[0.65rem]",
                          "bg-muted"
                        )}
                      >
                        {event.subscriptionName}
                      </span>
                    ))}
                    {overflow > 0 && (
                      <span className="text-muted-foreground text-[0.65rem]">+{overflow} más</span>
                    )}
                  </button>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="list" className="mt-4">
            {sortedDaysWithEvents.length === 0 ? (
              <Empty className="border-none py-8">
                <EmptyMedia variant="icon">
                  <CalendarClock aria-hidden className="size-5" />
                </EmptyMedia>
                <EmptyTitle>Sin cobros este mes</EmptyTitle>
                <EmptyDescription>No hay pagos ni cobros previstos registrados.</EmptyDescription>
              </Empty>
            ) : (
              <ul className="flex flex-col gap-4">
                {sortedDaysWithEvents.map((day) => {
                  const date = new Date(Date.UTC(year, month - 1, day));
                  const dayEvents = eventsByDay.get(day) ?? [];
                  return (
                    <li key={day}>
                      <h3 className="mb-1.5 text-sm font-medium capitalize">
                        {dayFullLabel(date)}
                      </h3>
                      <ul className="flex flex-col gap-1.5">
                        {dayEvents.map((event) => {
                          const meta = eventMeta(event);
                          return (
                            <li key={event.id}>
                              <Link
                                href={`/suscripciones/${event.subscriptionId}`}
                                className="hover:bg-muted/60 flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                              >
                                <div>
                                  <p className="font-medium">{event.subscriptionName}</p>
                                  <p className={cn("text-xs", meta.className)}>{meta.label}</p>
                                </div>
                                <span className="font-medium tabular-nums">
                                  {formatMoney({ amount: event.amount, currency: event.currency })}
                                </span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Alternativa textual accesible del mes en grilla, para lectores de pantalla. */}
      <table className="sr-only">
        <caption>Cobros del mes en formato de tabla</caption>
        <thead>
          <tr>
            <th scope="col">Día</th>
            <th scope="col">Suscripción</th>
            <th scope="col">Importe</th>
            <th scope="col">Estado</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id}>
              <td>{event.day}</td>
              <td>{event.subscriptionName}</td>
              <td>{formatMoney({ amount: event.amount, currency: event.currency })}</td>
              <td>{eventMeta(event).label}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog open={selectedDay !== null} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">
              {selectedDate ? dayFullLabel(selectedDate) : ""}
            </DialogTitle>
            <DialogDescription>
              {selectedEvents.length} {selectedEvents.length === 1 ? "cobro" : "cobros"} este día
            </DialogDescription>
          </DialogHeader>
          <ul className="flex flex-col gap-2">
            {selectedEvents.map((event) => {
              const meta = eventMeta(event);
              const StatusIcon =
                event.kind === "payment" && event.status === "PAID"
                  ? CheckCircle2
                  : event.kind === "payment" && event.status === "FAILED"
                    ? XCircle
                    : CalendarClock;
              return (
                <li key={event.id}>
                  <Link
                    href={`/suscripciones/${event.subscriptionId}`}
                    className="hover:bg-muted/60 flex items-center justify-between gap-3 rounded-lg border p-2.5 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <StatusIcon aria-hidden className={cn("size-4", meta.className)} />
                      <div>
                        <p className="font-medium">{event.subscriptionName}</p>
                        <p className="text-muted-foreground text-xs">
                          {event.categoryName ?? "Sin categoría"} ·{" "}
                          <span className={meta.className}>{meta.label}</span>
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="tabular-nums">
                      {formatMoney({ amount: event.amount, currency: event.currency })}
                    </Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
