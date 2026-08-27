import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import { CategoryManager, type CategoryRow } from "./category-manager";

export default async function CategoriasPage() {
  const user = await requireUser();

  const categories = await prisma.category.findMany({
    where: { userId: user.id },
    orderBy: [{ archivedAt: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { subscriptions: true, budgets: true } },
    },
  });

  const rows: CategoryRow[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    icon: c.icon,
    isSystem: c.isSystem,
    archivedAt: c.archivedAt?.toISOString() ?? null,
    subscriptionCount: c._count.subscriptions,
    budgetCount: c._count.budgets,
  }));

  return <CategoryManager categories={rows} />;
}
