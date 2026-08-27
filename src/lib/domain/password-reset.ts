import "server-only";
import { randomBytes, createHash } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Genera un token de recuperación de un solo uso. Se guarda solo el
 * hash (SHA-256) en la base de datos — si la tabla se filtrara, los
 * tokens no serían utilizables directamente, igual que con contraseñas.
 */
export async function createPasswordResetToken(prisma: PrismaClient, userId: string) {
  const token = randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });
  return token;
}

export async function consumePasswordResetToken(prisma: PrismaClient, token: string) {
  const tokenHash = hashToken(token);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return null;
  }

  await prisma.passwordResetToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return record.userId;
}
