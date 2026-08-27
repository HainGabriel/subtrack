/**
 * Seed de datos de desarrollo — usuario demo con un panel realista.
 *
 * Cómo se ejecuta:
 *   - `npx prisma migrate reset`  → aplica TODAS las migraciones desde cero
 *     y luego corre automáticamente este seed (usa esto si quieres una base
 *     de datos completamente limpia).
 *   - `npx prisma db seed`        → corre SOLO este script contra la base de
 *     datos actual (no toca migraciones). Es idempotente: si el usuario demo
 *     ya existe, lo borra primero (las cascadas del esquema limpian todo lo
 *     asociado) y lo vuelve a crear, así que se puede correr las veces que
 *     haga falta sin duplicar datos.
 *
 * Ambos comandos están ya configurados en `prisma7.config.ts`
 * (`seed: "tsx prisma/seed.ts"`) — no hace falta tocar ese archivo.
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { provisionNewUser } from "@/lib/domain/provision-user";
import {
  createSubscription,
  recordPayment,
  transitionSubscriptionStatus,
} from "@/lib/domain/subscriptions";

const DEMO_EMAIL = "demo@subtrack.dev";
const DEMO_PASSWORD = "Demo1234!";

// ────────────────────────────────────────────────────────────────
// Utilidades de fecha (fechas de calendario puras en UTC, igual que
// src/lib/domain/recurrence.ts, para no arrastrar horas ni desfases de
// zona horaria en los datos de ejemplo).
// ────────────────────────────────────────────────────────────────

function today(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function daysFromToday(offset: number): Date {
  const t = today();
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate() + offset));
}

function monthsAgo(count: number): Date {
  const t = today();
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() - count, t.getUTCDate()));
}

/**
 * Simula `cycles` ciclos de pago YA pagados para una suscripción recién
 * creada, encadenando `recordPayment` — cada llamada avanza
 * `nextBillingDate` (vía `computeNextBillingDate` dentro del propio
 * `recordPayment`), así que basta con re-alimentar el bucle con el
 * `nextBillingDate` que la propia función devuelve para obtener una
 * secuencia de fechas coherente con la recurrencia real de la
 * suscripción, sin duplicar esa lógica aquí.
 */
async function seedPaymentHistory(
  userId: string,
  subscriptionId: string,
  startDueDate: Date,
  cycles: number
) {
  let dueDate = startDueDate;
  for (let i = 0; i < cycles; i++) {
    const { subscription } = await recordPayment(prisma, userId, subscriptionId, {
      dueDate,
      paidDate: dueDate,
    });
    dueDate = subscription.nextBillingDate;
  }
}

async function main() {
  console.log("Sembrando usuario demo…");

  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) {
    console.log(`Usuario demo existente (${existing.id}) — eliminando para recrearlo…`);
    await prisma.user.delete({ where: { id: existing.id } });
  }

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const user = await prisma.user.create({
    data: {
      name: "Usuario Demo",
      email: DEMO_EMAIL,
      passwordHash,
      isDemo: true,
    },
  });

  await provisionNewUser(prisma, user.id);
  await prisma.userSettings.update({
    where: { userId: user.id },
    data: { onboardingCompletedAt: new Date() },
  });

  const categories = await prisma.category.findMany({ where: { userId: user.id } });
  const categoryId = (name: string): string | null =>
    categories.find((c) => c.name === name)?.id ?? null;

  // ────────────────────────────────────────────────────────────────
  // Métodos de pago
  // ────────────────────────────────────────────────────────────────

  const cardExpiry = daysFromToday(20);
  const card = await prisma.paymentMethod.create({
    data: {
      userId: user.id,
      type: "CARD",
      alias: "Visa terminada en 4242",
      brand: "Visa",
      last4: "4242",
      expMonth: cardExpiry.getUTCMonth() + 1,
      expYear: cardExpiry.getUTCFullYear(),
      icon: "credit-card",
    },
  });

  const paypal = await prisma.paymentMethod.create({
    data: {
      userId: user.id,
      type: "PAYPAL",
      alias: "PayPal personal",
      icon: "wallet",
    },
  });

  // ────────────────────────────────────────────────────────────────
  // Suscripciones
  // ────────────────────────────────────────────────────────────────

  // 1) Con historial de pagos (4 ciclos), DOP, autoRenew true, ACTIVE.
  const netflix = await createSubscription(prisma, user.id, {
    name: "Netflix",
    provider: "Netflix Inc.",
    categoryId: categoryId("Entretenimiento"),
    color: "#e50914",
    icon: "clapperboard",
    amount: "550",
    currency: "DOP",
    taxIncluded: true,
    billingFrequency: "MONTHLY",
    startDate: monthsAgo(4),
    subscriptionType: "RECURRING",
    autoRenew: true,
    paymentMethodId: paypal.id,
  });
  await seedPaymentHistory(user.id, netflix.id, netflix.startDate, 4);

  // 2) Con historial de pagos (3 ciclos), DOP.
  const spotify = await createSubscription(prisma, user.id, {
    name: "Spotify Premium",
    provider: "Spotify AB",
    categoryId: categoryId("Entretenimiento"),
    color: "#1db954",
    icon: "music",
    amount: "299",
    currency: "DOP",
    taxIncluded: true,
    billingFrequency: "MONTHLY",
    startDate: monthsAgo(3),
    subscriptionType: "RECURRING",
    autoRenew: true,
    paymentMethodId: paypal.id,
  });
  await seedPaymentHistory(user.id, spotify.id, spotify.startDate, 3);

  // 3) Con historial de pagos (3 ciclos), en USD (moneda distinta a DOP).
  const icloud = await createSubscription(prisma, user.id, {
    name: "iCloud+ 200GB",
    provider: "Apple",
    categoryId: categoryId("Almacenamiento"),
    color: "#0ca30c",
    icon: "cloud",
    amount: "2.99",
    currency: "USD",
    taxIncluded: true,
    billingFrequency: "MONTHLY",
    startDate: monthsAgo(3),
    subscriptionType: "RECURRING",
    autoRenew: true,
  });
  await seedPaymentHistory(user.id, icloud.id, icloud.startDate, 3);

  // 4) En EUR (otra moneda distinta), sin historial adicional.
  await createSubscription(prisma, user.id, {
    name: "Adobe Creative Cloud",
    provider: "Adobe",
    categoryId: categoryId("Productividad"),
    color: "#da1f26",
    icon: "palette",
    amount: "59.99",
    currency: "EUR",
    taxIncluded: true,
    billingFrequency: "MONTHLY",
    startDate: monthsAgo(1),
    subscriptionType: "RECURRING",
    autoRenew: true,
  });

  // 5) FREE_TRIAL con nextBillingDate (fin de prueba) dentro de pocos días.
  await createSubscription(prisma, user.id, {
    name: "Duolingo Plus",
    provider: "Duolingo",
    categoryId: categoryId("Educación"),
    color: "#58cc02",
    icon: "graduation-cap",
    amount: "299",
    currency: "DOP",
    taxIncluded: true,
    billingFrequency: "ANNUAL",
    startDate: daysFromToday(3),
    subscriptionType: "FREE_TRIAL",
    autoRenew: true,
  });

  // 6) PENDING_CANCELLATION con cancelByDate próxima.
  const gym = await createSubscription(prisma, user.id, {
    name: "Gimnasio Body Shop",
    provider: null,
    categoryId: categoryId("Salud"),
    color: "#e34948",
    icon: "heart-pulse",
    amount: "1800",
    currency: "DOP",
    taxIncluded: true,
    billingFrequency: "MONTHLY",
    startDate: monthsAgo(6),
    subscriptionType: "RECURRING",
    autoRenew: false,
  });
  await transitionSubscriptionStatus(prisma, user.id, gym.id, "PENDING_CANCELLATION", {
    cancelByDate: daysFromToday(5),
  });

  // 7) Asociada al método de pago (CARD) que vence pronto.
  await createSubscription(prisma, user.id, {
    name: "Plan móvil postpago",
    provider: "Claro",
    categoryId: categoryId("Telefonía / Internet"),
    color: "#eb6834",
    icon: "wifi",
    amount: "1500",
    currency: "DOP",
    taxIncluded: true,
    billingFrequency: "MONTHLY",
    startDate: monthsAgo(2),
    subscriptionType: "RECURRING",
    autoRenew: true,
    paymentMethodId: card.id,
  });

  // 8) CANCELLED — para probar "ahorro por cancelaciones".
  const disneyPlus = await createSubscription(prisma, user.id, {
    name: "Disney+",
    provider: "Disney",
    categoryId: categoryId("Entretenimiento"),
    color: "#113ccf",
    icon: "clapperboard",
    amount: "450",
    currency: "DOP",
    taxIncluded: true,
    billingFrequency: "MONTHLY",
    startDate: monthsAgo(8),
    subscriptionType: "RECURRING",
    autoRenew: false,
  });
  await transitionSubscriptionStatus(prisma, user.id, disneyPlus.id, "CANCELLED", {
    endDate: daysFromToday(-15),
  });

  // 9) PAUSED.
  const gamePass = await createSubscription(prisma, user.id, {
    name: "Xbox Game Pass Ultimate",
    provider: "Microsoft",
    categoryId: categoryId("Entretenimiento"),
    color: "#107c10",
    icon: "gamepad-2",
    amount: "14.99",
    currency: "USD",
    taxIncluded: true,
    billingFrequency: "MONTHLY",
    startDate: monthsAgo(2),
    subscriptionType: "RECURRING",
    autoRenew: true,
  });
  await transitionSubscriptionStatus(prisma, user.id, gamePass.id, "PAUSED");

  // 10) Tipo INSTALLMENT, para variar `subscriptionType` más allá de RECURRING/FREE_TRIAL.
  await createSubscription(prisma, user.id, {
    name: "iPhone 15 a plazos",
    provider: "Claro",
    categoryId: categoryId("Telefonía / Internet"),
    color: "#52514e",
    icon: "smartphone",
    amount: "3200",
    currency: "DOP",
    taxIncluded: true,
    billingFrequency: "MONTHLY",
    startDate: monthsAgo(5),
    subscriptionType: "INSTALLMENT",
    autoRenew: false,
  });

  // ────────────────────────────────────────────────────────────────
  // Presupuestos
  // ────────────────────────────────────────────────────────────────

  await prisma.budget.create({
    data: {
      userId: user.id,
      scope: "GLOBAL",
      period: "MONTHLY",
      amount: "15000",
      currency: "DOP",
      alertThresholdPercent: 80,
    },
  });

  const entretenimientoId = categoryId("Entretenimiento");
  if (entretenimientoId) {
    await prisma.budget.create({
      data: {
        userId: user.id,
        scope: "CATEGORY",
        categoryId: entretenimientoId,
        period: "MONTHLY",
        amount: "2000",
        currency: "DOP",
        alertThresholdPercent: 90,
      },
    });
  }

  // ────────────────────────────────────────────────────────────────
  // Tasa de cambio manual
  // ────────────────────────────────────────────────────────────────

  await prisma.exchangeRate.create({
    data: {
      userId: user.id,
      baseCurrency: "USD",
      quoteCurrency: "DOP",
      rate: "60.5",
      asOfDate: today(),
      source: "MANUAL",
    },
  });

  const subscriptionCount = await prisma.subscription.count({ where: { userId: user.id } });
  const paymentCount = await prisma.payment.count({ where: { userId: user.id } });
  const budgetCount = await prisma.budget.count({ where: { userId: user.id } });

  console.log("\nSeed completado.");
  console.log(`  Usuario demo:      ${DEMO_EMAIL}`);
  console.log(`  Contraseña:        ${DEMO_PASSWORD}`);
  console.log(`  Categorías:        ${categories.length}`);
  console.log(`  Métodos de pago:   2 (CARD por vencer, PAYPAL)`);
  console.log(`  Suscripciones:     ${subscriptionCount}`);
  console.log(`  Pagos históricos:  ${paymentCount}`);
  console.log(`  Presupuestos:      ${budgetCount}`);
  console.log(`  Tasas de cambio:   1 (USD → DOP)`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("\nEl seed falló:\n", error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
