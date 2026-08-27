import Link from "next/link";
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
  ItemGroup,
} from "@/components/ui/item";
import { Trophy } from "lucide-react";
import { formatMoney } from "@/lib/domain/money";

export interface TopSubscriptionItem {
  id: string;
  name: string;
  categoryName: string | null;
  /** Costo anualizado en la moneda propia de la suscripción. */
  annualizedAmount: string;
  currency: string;
  /** Equivalente anualizado en la moneda base del usuario, si había tasa de cambio. */
  baseCurrencyEquivalent: { amount: string; currency: string; isEstimate: boolean } | null;
}

interface TopSubscriptionsListProps {
  subscriptions: TopSubscriptionItem[];
}

export function TopSubscriptionsList({ subscriptions }: TopSubscriptionsListProps) {
  if (subscriptions.length === 0) {
    return (
      <Empty className="border-none py-6">
        <EmptyMedia variant="icon">
          <Trophy aria-hidden className="size-5" />
        </EmptyMedia>
        <EmptyTitle>Sin suscripciones activas</EmptyTitle>
        <EmptyDescription>Añade una suscripción para verla aquí.</EmptyDescription>
      </Empty>
    );
  }

  return (
    <ItemGroup>
      {subscriptions.map((sub, index) => (
        <Item key={sub.id} variant="outline" asChild>
          <Link href={`/suscripciones/${sub.id}`}>
            <ItemMedia variant="icon" className="text-muted-foreground font-mono text-xs">
              #{index + 1}
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{sub.name}</ItemTitle>
              <ItemDescription>{sub.categoryName ?? "Sin categoría"} · al año</ItemDescription>
            </ItemContent>
            <div className="flex flex-col items-end gap-0.5">
              <span className="font-medium tabular-nums">
                {formatMoney({ amount: sub.annualizedAmount, currency: sub.currency })}
              </span>
              {sub.baseCurrencyEquivalent &&
                sub.baseCurrencyEquivalent.currency !== sub.currency && (
                  <span className="text-muted-foreground text-xs tabular-nums">
                    ≈{" "}
                    {formatMoney({
                      amount: sub.baseCurrencyEquivalent.amount,
                      currency: sub.baseCurrencyEquivalent.currency,
                    })}
                    {sub.baseCurrencyEquivalent.isEstimate ? " est." : ""}
                  </span>
                )}
            </div>
          </Link>
        </Item>
      ))}
    </ItemGroup>
  );
}
