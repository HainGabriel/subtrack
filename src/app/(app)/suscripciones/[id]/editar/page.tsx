import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import {
  SubscriptionForm,
  type SubscriptionFormValues,
} from "@/components/subscriptions/subscription-form";

export const metadata: Metadata = { title: "Editar suscripción — SubTrack" };

export default async function EditarSuscripcionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const subscription = await prisma.subscription.findFirst({
    where: { id, userId: user.id },
    include: { tags: { select: { tagId: true } } },
  });
  if (!subscription) notFound();

  const [categories, paymentMethods, tags] = await Promise.all([
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
  ]);

  const defaultValues: SubscriptionFormValues = {
    name: subscription.name,
    provider: subscription.provider ?? undefined,
    description: subscription.description ?? undefined,
    notes: subscription.notes ?? undefined,
    categoryId: subscription.categoryId ?? undefined,
    color: subscription.color,
    icon: subscription.icon,
    iconUrl: subscription.iconUrl ?? undefined,
    amount: subscription.amount.toString(),
    currency: subscription.currency,
    taxIncluded: subscription.taxIncluded,
    taxAmount: subscription.taxAmount?.toString(),
    billingFrequency: subscription.billingFrequency,
    customIntervalCount: subscription.customIntervalCount ?? undefined,
    customIntervalUnit: subscription.customIntervalUnit ?? undefined,
    startDate: subscription.startDate,
    subscriptionType: subscription.subscriptionType,
    autoRenew: subscription.autoRenew,
    cancelByDate: subscription.cancelByDate ?? undefined,
    paymentMethodId: subscription.paymentMethodId ?? undefined,
    accountProfile: subscription.accountProfile ?? undefined,
    managementUrl: subscription.managementUrl ?? undefined,
    supportContact: subscription.supportContact ?? undefined,
    seats: subscription.seats,
    costPerSeat: subscription.costPerSeat?.toString(),
    priority: subscription.priority,
    usefulnessRating: subscription.usefulnessRating ?? undefined,
    tagIds: subscription.tags.map((t) => t.tagId),
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Editar suscripción</h1>
        <p className="text-muted-foreground text-sm">
          La frecuencia y la fecha de inicio no se pueden cambiar una vez creada la suscripción.
        </p>
      </div>
      <SubscriptionForm
        mode="edit"
        subscriptionId={subscription.id}
        defaultValues={defaultValues}
        categories={categories}
        paymentMethods={paymentMethods}
        availableTags={tags}
      />
    </div>
  );
}
