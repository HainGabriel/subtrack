import Link from "next/link";
import {
  Hourglass,
  CreditCard,
  XCircle,
  CalendarClock,
  PiggyBank,
  type LucideIcon,
} from "lucide-react";
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemContent, ItemMedia, ItemTitle, ItemGroup } from "@/components/ui/item";
import { CheckCircle2 } from "lucide-react";
import type { AttentionItem } from "@/lib/domain/spend-aggregation";
import { cn } from "@/lib/utils";

const ICON_BY_TYPE: Record<AttentionItem["type"], LucideIcon> = {
  TRIAL_ENDING: Hourglass,
  PAYMENT_METHOD_EXPIRING: CreditCard,
  PAYMENT_FAILED: XCircle,
  RENEWAL_SOON: CalendarClock,
  BUDGET_EXCEEDED: PiggyBank,
};

const SEVERITY_LABEL: Record<AttentionItem["severity"], string> = {
  warning: "Atención",
  serious: "Importante",
  critical: "Crítico",
};

const SEVERITY_TEXT_CLASS: Record<AttentionItem["severity"], string> = {
  warning: "text-status-warning",
  serious: "text-status-serious",
  critical: "text-status-critical",
};

interface AttentionListProps {
  items: AttentionItem[];
}

export function AttentionList({ items }: AttentionListProps) {
  if (items.length === 0) {
    return (
      <Empty className="border-none py-6">
        <EmptyMedia variant="icon">
          <CheckCircle2 aria-hidden className="text-status-good size-5" />
        </EmptyMedia>
        <EmptyTitle>Todo al día</EmptyTitle>
        <EmptyDescription>No hay nada que requiera tu atención por ahora.</EmptyDescription>
      </Empty>
    );
  }

  return (
    <ItemGroup>
      {items.map((item, index) => {
        const Icon = ICON_BY_TYPE[item.type];
        return (
          <Item key={`${item.type}-${item.href}-${index}`} variant="outline" asChild>
            <Link href={item.href}>
              <ItemMedia variant="icon">
                <Icon aria-hidden className={cn("size-4", SEVERITY_TEXT_CLASS[item.severity])} />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{item.label}</ItemTitle>
              </ItemContent>
              <span className={cn("text-xs font-medium", SEVERITY_TEXT_CLASS[item.severity])}>
                {SEVERITY_LABEL[item.severity]}
              </span>
            </Link>
          </Item>
        );
      })}
    </ItemGroup>
  );
}
