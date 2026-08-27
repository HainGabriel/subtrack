/**
 * Equivalente en Netlify del servicio "cron" de docker-compose.yml: llama
 * cada 15 minutos a POST /api/cron/notifications (protegido con
 * CRON_SECRET) para generar los avisos de renovación/presupuesto/etc.
 * No duplica lógica — reutiliza el mismo endpoint ya probado que corre
 * generateDueNotifications(); ver docs/NOTIFICATIONS.md.
 *
 * Netlify inyecta automáticamente la variable de entorno `URL` con la
 * URL pública del sitio en producción.
 */
export default async () => {
  const cronSecret = process.env.CRON_SECRET;
  const siteUrl = process.env.URL;

  if (!cronSecret || !siteUrl) {
    return new Response("Falta CRON_SECRET o la URL del sitio.", { status: 500 });
  }

  const response = await fetch(`${siteUrl}/api/cron/notifications`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cronSecret}` },
  });

  const body = await response.text();
  return new Response(body, { status: response.status });
};

export const config = {
  schedule: "*/15 * * * *",
};
