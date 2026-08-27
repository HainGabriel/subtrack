import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  PlusCircle,
  Pencil,
  Receipt,
  PauseCircle,
  CalendarX,
  XCircle,
  PlayCircle,
  Archive,
  Trash2,
  Upload,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ActivityAction } from "@/generated/prisma/enums";

const ACTION_CONFIG: Record<ActivityAction, { label: string; icon: LucideIcon }> = {
  CREATED: { label: "Suscripción creada", icon: PlusCircle },
  UPDATED: { label: "Suscripción editada", icon: Pencil },
  PAYMENT_RECORDED: { label: "Pago registrado", icon: Receipt },
  PAUSED: { label: "Pausada", icon: PauseCircle },
  CANCELLATION_SCHEDULED: { label: "Cancelación programada", icon: CalendarX },
  CANCELLED: { label: "Cancelada", icon: XCircle },
  REACTIVATED: { label: "Reactivada", icon: PlayCircle },
  ARCHIVED: { label: "Archivada", icon: Archive },
  DELETED: { label: "Eliminada", icon: Trash2 },
  IMPORTED: { label: "Importada desde CSV", icon: Upload },
};

export interface ActivityLogRow {
  id: string;
  action: ActivityAction;
  createdAt: string;
}

export function ActivityLogList({ items }: { items: ActivityLogRow[] }) {
  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">Sin actividad registrada todavía.</p>;
  }

  return (
    <ol className="flex flex-col gap-3">
      {items.map((item) => {
        const config = ACTION_CONFIG[item.action];
        const Icon = config.icon;
        return (
          <li key={item.id} className="flex items-start gap-3 text-sm">
            <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div className="flex flex-1 items-baseline justify-between gap-2">
              <span>{config.label}</span>
              <span className="text-muted-foreground shrink-0 text-xs">
                {format(new Date(item.createdAt), "d 'de' MMMM, yyyy 'a las' HH:mm", {
                  locale: es,
                })}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
