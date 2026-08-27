import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/lib/env";

// Evita recrear el pool de conexiones en cada hot-reload de desarrollo.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  const client = new PrismaClient({
    adapter,
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
  if (env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

let instance: PrismaClient | undefined;

/**
 * Proxy perezoso: construir el `PrismaClient` de verdad lee `env.DATABASE_URL`,
 * y hacerlo al importar el módulo rompe el build de Docker (`next build`
 * analiza estáticamente las rutas en una etapa sin las variables reales,
 * que solo se inyectan en runtime). Se construye recién en el primer uso.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    if (!instance) instance = globalForPrisma.prisma ?? createClient();
    return Reflect.get(instance as object, prop, receiver);
  },
});
