import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Chequeo de salud: confirma que la app puede consultar la base de datos. */
export async function GET(): Promise<Response> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (err) {
    // Nunca exponer el detalle (mensaje, stack, cadena de conexión) en la
    // respuesta — solo se registra en el servidor.
    console.error("GET /api/health:", err);
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
