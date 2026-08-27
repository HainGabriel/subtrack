import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { generateDueNotifications } from "@/lib/domain/notifications";

/**
 * Endpoint invocado por el servicio "cron" de docker-compose.yml cada 15
 * minutos para generar las notificaciones vencidas de todos los usuarios.
 *
 * Prueba manual:
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/notifications
 */

function isAuthorized(request: Request): boolean {
  const header = request.headers.get("authorization") ?? "";
  const prefix = "Bearer ";
  if (!header.startsWith(prefix)) return false;

  const token = header.slice(prefix.length);
  const expected = env.CRON_SECRET;

  const tokenBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expected);

  // Compara con timingSafeEqual solo cuando las longitudes coinciden: si
  // difieren, es inválido directo sin comparar (evita filtrar la longitud
  // del secreto y evita que timingSafeEqual lance por tamaños distintos).
  if (tokenBuffer.length !== expectedBuffer.length) return false;

  return timingSafeEqual(tokenBuffer, expectedBuffer);
}

export async function POST(request: Request): Promise<Response> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";
  const limited = rateLimit(`cron:${ip}`, RATE_LIMITS.cron.limit, RATE_LIMITS.cron.windowMs);
  if (!limited.success) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const result = await generateDueNotifications(prisma);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("POST /api/cron/notifications:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
