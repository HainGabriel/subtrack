import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const authUser = await requireUser();

  // findUnique (no findUniqueOrThrow): una sesión puede seguir siendo un
  // JWT válido después de que su usuario ya no exista (cuenta eliminada,
  // datos de desarrollo reseteados) — se limpia con gracia en vez de
  // crashear con un 500.
  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    include: { settings: true },
  });

  if (!user) {
    redirect("/api/auth/clear-session");
  }

  if (!user.settings?.onboardingCompletedAt) {
    redirect("/onboarding");
  }

  const unreadNotifications = await prisma.notification.count({
    where: { userId: user.id, isRead: false },
  });

  return (
    <AppShell
      name={user.name}
      email={user.email}
      image={user.image}
      unreadNotifications={unreadNotifications}
    >
      {children}
    </AppShell>
  );
}
