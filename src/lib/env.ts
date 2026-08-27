import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.url(),
  AUTH_SECRET: z.string().min(16),
  AUTH_URL: z.url().optional(),
  RESEND_API_KEY: z.string().optional().default(""),
  EMAIL_FROM: z.string().default("SubTrack <notificaciones@subtrack.local>"),
  CRON_SECRET: z.string().min(16),
  APP_DEFAULT_TIMEZONE: z.string().default("America/Santo_Domingo"),
  APP_DEFAULT_CURRENCY: z.string().length(3).default("DOP"),
  APP_DEFAULT_LOCALE: z.string().default("es"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

/**
 * Valida las variables de entorno una sola vez al arrancar el proceso.
 * Falla rápido y con un mensaje claro en vez de fallar más adelante
 * de forma confusa dentro de una request.
 */
function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Variables de entorno inválidas o faltantes.\n${issues}\n\nRevisa .env.example y tu archivo .env.`
    );
  }
  return parsed.data;
}

export const env = loadEnv();
