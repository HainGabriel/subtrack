import { createEvents, type EventAttributes } from "ics";
import { formatMoney } from "@/lib/domain/money";

export interface RenewalSubscriptionForIcs {
  id: string;
  name: string;
  amount: string;
  currency: string;
  nextBillingDate: Date;
}

function nextDayDateArray(date: Date): [number, number, number] {
  const nextDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1)
  );
  return [nextDay.getUTCFullYear(), nextDay.getUTCMonth() + 1, nextDay.getUTCDate()];
}

/**
 * Genera un calendario `.ics` con un evento de día completo por cada
 * suscripción, en la fecha `nextBillingDate`. Pensado para suscripciones
 * activas (el llamador filtra qué suscripciones incluir).
 */
export function exportRenewalsIcs(subscriptions: RenewalSubscriptionForIcs[]): string {
  const events: EventAttributes[] = subscriptions.map((sub) => {
    const start: [number, number, number] = [
      sub.nextBillingDate.getUTCFullYear(),
      sub.nextBillingDate.getUTCMonth() + 1,
      sub.nextBillingDate.getUTCDate(),
    ];

    return {
      uid: `subtrack-renewal-${sub.id}@subtrack.dev`,
      title: `Cobro: ${sub.name}`,
      description: `Importe: ${formatMoney({ amount: sub.amount, currency: sub.currency })}`,
      start,
      end: nextDayDateArray(sub.nextBillingDate),
      calName: "SubTrack — Próximos cobros",
    };
  });

  const { error, value } = createEvents(events, { productId: "-//SubTrack//Renewals//ES" });
  if (error) {
    throw error;
  }
  return value ?? "";
}
