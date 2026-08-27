import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/lib/env";

export const DEFAULT_CATEGORIES: Array<{ name: string; color: string; icon: string }> = [
  { name: "Entretenimiento", color: "#e87ba4", icon: "clapperboard" },
  { name: "Productividad", color: "#2a78d6", icon: "briefcase" },
  { name: "Desarrollo", color: "#4a3aa7", icon: "code" },
  { name: "Educación", color: "#eda100", icon: "graduation-cap" },
  { name: "Almacenamiento", color: "#1baf7a", icon: "cloud" },
  { name: "Finanzas", color: "#008300", icon: "landmark" },
  { name: "Salud", color: "#e34948", icon: "heart-pulse" },
  { name: "Telefonía / Internet", color: "#eb6834", icon: "wifi" },
  { name: "Hogar", color: "#0ca30c", icon: "home" },
  { name: "Otros", color: "#898781", icon: "shapes" },
];

/**
 * Aprovisiona un usuario recién registrado: preferencias por defecto y
 * el set inicial de categorías útiles (sección 7 del encargo). Se
 * reutiliza tanto en el registro real como en el seed de desarrollo
 * para que ambos caminos queden siempre consistentes.
 */
export async function provisionNewUser(prisma: PrismaClient, userId: string) {
  await prisma.userSettings.create({
    data: {
      userId,
      baseCurrency: env.APP_DEFAULT_CURRENCY,
      locale: env.APP_DEFAULT_LOCALE,
      timezone: env.APP_DEFAULT_TIMEZONE,
    },
  });

  await prisma.category.createMany({
    data: DEFAULT_CATEGORIES.map((c) => ({ ...c, userId, isSystem: true })),
  });
}
