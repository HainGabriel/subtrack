import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import {
  SubscriptionForm,
  type SubscriptionFormValues,
} from "@/components/subscriptions/subscription-form";

export const metadata: Metadata = { title: "Nueva suscripción — SubTrack" };

export default async function NuevaSuscripcionPage() {
  const user = await requireUser();

  const [categories, paymentMethods, tags, settings] = await Promise.all([
    prisma.category.findMany({
      where: { userId: user.id, archivedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.paymentMethod.findMany({
      where: { userId: user.id, archivedAt: null },
      orderBy: { alias: "asc" },
      select: { id: true, alias: true },
    }),
    prisma.tag.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
    }),
    prisma.userSettings.findUnique({ where: { userId: user.id }, select: { baseCurrency: true } }),
  ]);

  const defaultValues: SubscriptionFormValues = {
    name: "",
    provider: undefined,
    description: undefined,
    notes: undefined,
    categoryId: categories[0]?.id,
    color: "#4a3aa7",
    icon: "box",
    iconUrl: undefined,
    amount: "",
    currency: settings?.baseCurrency ?? "DOP",
    taxIncluded: true,
    taxAmount: undefined,
    billingFrequency: "MONTHLY",
    customIntervalCount: undefined,
    customIntervalUnit: undefined,
    startDate: new Date(),
    subscriptionType: "RECURRING",
    autoRenew: true,
    cancelByDate: undefined,
    paymentMethodId: undefined,
    accountProfile: undefined,
    managementUrl: undefined,
    supportContact: undefined,
    seats: 1,
    costPerSeat: undefined,
    priority: "MEDIUM",
    usefulnessRating: undefined,
    tagIds: [],
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nueva suscripción</h1>
        <p className="text-muted-foreground text-sm">
          Registra una suscripción para empezar a hacerle seguimiento a su gasto y renovación.
        </p>
      </div>
      <SubscriptionForm
        mode="create"
        defaultValues={defaultValues}
        categories={categories}
        paymentMethods={paymentMethods}
        availableTags={tags}
      />
    </div>
  );
}
