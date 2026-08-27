"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Bell,
  CalendarClock,
  FlaskConical,
  CalendarX,
  CircleAlert,
  PiggyBank,
  CreditCard,
  MailCheck,
  Check,
  Clock,
  BellOff,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Item,
  ItemContent,
  ItemActions,
  ItemMedia,
  ItemTitle,
  ItemDescription,
} from "@/components/ui/item";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  markAsReadAction,
  markAllAsReadAction,
  silenceNotificationAction,
  snoozeNotificationAction,
} from "@/lib/actions/notification-actions";
import type { NotificationType } from "@/generated/prisma/enums";

const TYPE_CONFIG: Record<NotificationType, { label: string; icon: LucideIcon }> = {
  RENEWAL_UPCOMING: { label: "Renovación próxima", icon: CalendarClock },
  TRIAL_ENDING: { label: "Prueba por terminar", icon: FlaskConical },
  CANCEL_DEADLINE: { label: "Fecha límite de cancelación", icon: CalendarX },
  PAYMENT_FAILED: { label: "Pago fallido", icon: CircleAlert },
  BUDGET_THRESHOLD: { label: "Presupuesto", icon: PiggyBank },
  PAYMENT_METHOD_EXPIRING: { label: "Método de pago por vencer", icon: CreditCard },
  WEEKLY_SUMMARY: { label: "Resumen semanal", icon: MailCheck },
  MONTHLY_SUMMARY: { label: "Resumen mensual", icon: MailCheck },
};

export interface NotificationRow {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  subscriptionId: string | null;
}

export function NotificationList({
  notifications,
  filter,
}: {
  notifications: NotificationRow[];
  filter: "todas" | "no-leidas";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  function navigate(overrides: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(overrides)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      const result = await markAllAsReadAction();
      if (!result.success) {
        toast.error(result.error ?? "No se pudo completar la acción.");
        return;
      }
      toast.success("Todas las notificaciones marcadas como leídas");
    });
  }

  function handleMarkRead(id: string) {
    setBusyId(id);
    startTransition(async () => {
      const result = await markAsReadAction(id);
      setBusyId(null);
      if (!result.success) toast.error(result.error ?? "No se pudo marcar como leída.");
    });
  }

  function handleSnooze(id: string) {
    const snoozedUntil = new Date();
    snoozedUntil.setDate(snoozedUntil.getDate() + 1);
    setBusyId(id);
    startTransition(async () => {
      const result = await snoozeNotificationAction({ notificationId: id, snoozedUntil });
      setBusyId(null);
      if (!result.success) {
        toast.error(result.error ?? "No se pudo posponer.");
        return;
      }
      toast.success("Notificación pospuesta 1 día");
    });
  }

  function handleSilence(id: string) {
    setBusyId(id);
    startTransition(async () => {
      const result = await silenceNotificationAction(id);
      setBusyId(null);
      if (!result.success) {
        toast.error(result.error ?? "No se pudo silenciar.");
        return;
      }
      toast.success("Notificación silenciada");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select
          value={filter}
          onValueChange={(value) => navigate({ filtro: value === "todas" ? null : value })}
        >
          <SelectTrigger size="sm" className="w-44" aria-label="Filtrar notificaciones">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            <SelectItem value="no-leidas">No leídas</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" disabled={pending} onClick={handleMarkAllRead}>
          <Check className="size-4" />
          Marcar todas como leídas
        </Button>
      </div>

      {notifications.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Bell />
            </EmptyMedia>
            <EmptyTitle>Sin notificaciones</EmptyTitle>
            <EmptyDescription>
              {filter === "no-leidas"
                ? "No tienes notificaciones sin leer."
                : "Aquí aparecerán tus avisos de renovaciones, presupuestos y más."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ol className="flex flex-col gap-2">
          {notifications.map((n) => {
            const config = TYPE_CONFIG[n.type];
            const Icon = config.icon;
            // El enlace a la suscripción envuelve solo ícono+contenido, nunca
            // las acciones: anidar botones dentro de un <a> hace que
            // cualquier click en ellos también dispare la navegación del
            // enlace (y es HTML inválido — interactivo dentro de interactivo).
            const mediaAndContent = (
              <>
                <ItemMedia>
                  <Icon className="text-muted-foreground size-5" aria-hidden="true" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle className="flex items-center gap-2">
                    {n.title}
                    {!n.isRead && <Badge className="h-4 px-1.5 text-[10px]">Nueva</Badge>}
                  </ItemTitle>
                  <ItemDescription>{n.body}</ItemDescription>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {format(new Date(n.createdAt), "d 'de' MMMM, HH:mm", { locale: es })} ·{" "}
                    {config.label}
                  </p>
                </ItemContent>
              </>
            );
            const content = (
              <Item variant="outline" className={n.isRead ? "opacity-70" : undefined}>
                {n.subscriptionId ? (
                  <Link
                    href={`/suscripciones/${n.subscriptionId}`}
                    className="flex flex-1 items-start gap-3"
                  >
                    {mediaAndContent}
                  </Link>
                ) : (
                  mediaAndContent
                )}
                <ItemActions>
                  {!n.isRead && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Marcar como leída"
                      disabled={pending && busyId === n.id}
                      onClick={() => handleMarkRead(n.id)}
                    >
                      <Check className="size-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Posponer 1 día"
                    disabled={pending && busyId === n.id}
                    onClick={() => handleSnooze(n.id)}
                  >
                    <Clock className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Silenciar"
                    disabled={pending && busyId === n.id}
                    onClick={() => handleSilence(n.id)}
                  >
                    <BellOff className="size-4" />
                  </Button>
                </ItemActions>
              </Item>
            );
            return <li key={n.id}>{content}</li>;
          })}
        </ol>
      )}
    </div>
  );
}
