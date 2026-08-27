import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import {
  NotificationList,
  type NotificationRow,
} from "@/components/notifications/notification-list";

export const metadata: Metadata = { title: "Notificaciones — SubTrack" };

export default async function NotificacionesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const filter = sp.filtro === "no-leidas" ? "no-leidas" : "todas";

  const notifications = await prisma.notification.findMany({
    where: {
      userId: user.id,
      silenced: false,
      ...(filter === "no-leidas" ? { isRead: false } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const rows: NotificationRow[] = notifications.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
    subscriptionId: n.subscriptionId,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notificaciones</h1>
        <p className="text-muted-foreground text-sm">
          Avisos de renovaciones, presupuestos y métodos de pago próximos a vencer.
        </p>
      </div>
      <NotificationList notifications={rows} filter={filter} />
    </div>
  );
}
