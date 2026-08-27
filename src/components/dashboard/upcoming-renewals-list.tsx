import Link from "next/link";
import { differenceInCalendarDays } from "date-fns";
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
  ItemGroup,
} from "@/components/ui/item";
import { Badge } from "@/components/ui/badge";
import { CalendarClock } from "lucide-react";
import { formatMoney } from "@/lib/domain/money";

export interface UpcomingRenewalItem {
  id: string;
  name: string;
  amount: string;
  currency: string;
  nextBillingDate: Date;
  categoryName: string | null;
  paymentMethodAlias: string | null;
}

interface UpcomingRenewalsListProps {
  renewals: UpcomingRenewalItem[];
}

function daysUntilLabel(date: Date): string {
  const days = differenceInCalendarDays(date, new Date());
  if (days <= 0) return "Hoy";
  if (days === 1) return "Mañana";
  return `En ${days} días`;
}

export function UpcomingRenewalsList({ renewals }: UpcomingRenewalsListProps) {
  if (renewals.length === 0) {
    return (
      <Empty className="border-none py-6">
        <EmptyMedia variant="icon">
          <CalendarClock aria-hidden className="size-5" />
        </EmptyMedia>
        <EmptyTitle>Sin renovaciones próximas</EmptyTitle>
        <EmptyDescription>No hay cobros previstos en los próximos 14 días.</EmptyDescription>
      </Empty>
    );
  }

  return (
    <ItemGroup>
      {renewals.map((renewal) => (
        <Item key={renewal.id} variant="outline" asChild>
          <Link href={`/suscripciones/${renewal.id}`}>
            <ItemMedia variant="icon">
              <CalendarClock aria-hidden className="size-4" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{renewal.name}</ItemTitle>
              <ItemDescription>
                {renewal.categoryName ?? "Sin categoría"}
                {renewal.paymentMethodAlias ? ` · ${renewal.paymentMethodAlias}` : ""}
              </ItemDescription>
            </ItemContent>
            <div className="flex flex-col items-end gap-1">
              <span className="font-medium tabular-nums">
                {formatMoney({ amount: renewal.amount, currency: renewal.currency })}
              </span>
              <Badge variant="outline">{daysUntilLabel(renewal.nextBillingDate)}</Badge>
            </div>
          </Link>
        </Item>
      ))}
    </ItemGroup>
  );
}
