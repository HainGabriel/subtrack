import type { LucideIcon } from "lucide-react";
import {
  CircleCheck,
  FlaskConical,
  PauseCircle,
  TriangleAlert,
  XCircle,
  CalendarX,
  Archive,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { SubscriptionStatus } from "@/generated/prisma/enums";

/**
 * Mapa único ESTADO → texto en español + ícono + color de estado fijo.
 * Los colores de estado (--status-good/warning/serious/critical) no
 * dependen del tema y SIEMPRE van acompañados de ícono + texto (nunca solo
 * color) — ver reglas de negocio del encargo. `ARCHIVED` es la única
 * excepción: es un estado neutro (ni bueno ni malo), así que usa
 * `text-muted-foreground` en vez de uno de los 4 colores de estado.
 */
const STATUS_CONFIG: Record<
  SubscriptionStatus,
  { label: string; icon: LucideIcon; className: string }
> = {
  ACTIVE: { label: "Activa", icon: CircleCheck, className: "text-[var(--status-good)]" },
  TRIAL: { label: "Prueba", icon: FlaskConical, className: "text-[var(--status-warning)]" },
  PAUSED: { label: "Pausada", icon: PauseCircle, className: "text-[var(--status-warning)]" },
  PENDING_CANCELLATION: {
    label: "Cancelación programada",
    icon: TriangleAlert,
    className: "text-[var(--status-serious)]",
  },
  CANCELLED: { label: "Cancelada", icon: XCircle, className: "text-[var(--status-critical)]" },
  EXPIRED: { label: "Vencida", icon: CalendarX, className: "text-[var(--status-critical)]" },
  ARCHIVED: { label: "Archivada", icon: Archive, className: "text-muted-foreground" },
};

export function StatusBadge({
  status,
  className,
}: {
  status: SubscriptionStatus;
  className?: string;
}) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium",
        config.className,
        className
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {config.label}
    </span>
  );
}

export { STATUS_CONFIG };
