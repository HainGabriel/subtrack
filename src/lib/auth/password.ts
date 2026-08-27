import * as argon2 from "argon2";

/**
 * argon2id con parámetros por encima del mínimo recomendado por OWASP
 * (m=19MiB por defecto de argon2 es débil para servidores modernos).
 */
const HASH_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MiB
  timeCost: 3,
  parallelism: 1,
};

export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, HASH_OPTIONS);
}

export function verifyPassword(hash: string, plain: string): Promise<boolean> {
  return argon2.verify(hash, plain).catch(() => false);
}
