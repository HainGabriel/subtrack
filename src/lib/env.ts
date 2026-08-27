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

type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
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

let cached: Env | undefined;

/**
 * Validación perezosa (no al importar el módulo): `next build` analiza
 * estáticamente las rutas en build-time, dentro de una etapa de Docker
 * que deliberadamente NO tiene las variables reales (esas solo se
 * inyectan en runtime vía `docker-compose.yml`/la plataforma de
 * despliegue). Validar en el primer USO real, en vez de al importar,
 * deja que el build termine sin secretos y sigue fallando rápido y con
 * un mensaje claro en cuanto una request de verdad necesita una
 * variable que falta.
 */
export const env: Env = new Proxy({} as Env, {
  get(_target, prop: string) {
    if (!cached) cached = loadEnv();
    return cached[prop as keyof Env];
  },
});
