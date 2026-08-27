import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import { ProfileTabs } from "./profile-tabs";
import { PROFILE_TABS, type ProfileTab } from "./profile-tab-constants";

export default async function PerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireUser();
  const { tab } = await searchParams;
  const initialTab: ProfileTab = PROFILE_TABS.includes(tab as ProfileTab)
    ? (tab as ProfileTab)
    : "perfil";

  const [dbUser, settings, exchangeRates] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { name: true, email: true, image: true },
    }),
    prisma.userSettings.findUniqueOrThrow({
      where: { userId: user.id },
      select: {
        baseCurrency: true,
        timezone: true,
        weekStartsOn: true,
        notifyEmail: true,
        notifyInApp: true,
        weeklySummary: true,
        monthlySummary: true,
      },
    }),
    prisma.exchangeRate.findMany({
      where: { userId: user.id },
      orderBy: { asOfDate: "desc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-xl font-semibold">Perfil</h1>
        <p className="text-muted-foreground text-sm">
          Administra tu información personal, preferencias y seguridad.
        </p>
      </div>

      <ProfileTabs
        initialTab={initialTab}
        name={dbUser.name}
        email={dbUser.email}
        image={dbUser.image}
        preferences={settings}
        exchangeRates={exchangeRates.map((r) => ({
          id: r.id,
          baseCurrency: r.baseCurrency,
          quoteCurrency: r.quoteCurrency,
          rate: r.rate.toString(),
          asOfDate: r.asOfDate.toISOString(),
        }))}
      />
    </div>
  );
}
