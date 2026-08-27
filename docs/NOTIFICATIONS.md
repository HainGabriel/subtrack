# Notificaciones y recordatorios

## Arquitectura

```
docker-compose "cron" (alpine + curl, cada 15 min)
        │  POST /api/cron/notifications
        │  Authorization: Bearer $CRON_SECRET
        ▼
Route Handler (src/app/api/cron/notifications/route.ts)
        │  valida el secreto (crypto.timingSafeEqual) + rate limit
        ▼
generateDueNotifications(prisma)  — src/lib/domain/notifications.ts
        │  escanea suscripciones activas + reglas de aviso,
        │  pruebas por terminar, fechas límite de cancelación,
        │  métodos de pago por vencer, presupuestos excedidos
        ▼
Notification (crea una fila por evento, con dedupeKey única)
```

El centro de notificaciones in-app (`/notificaciones`) lee directamente la tabla `Notification`. El envío por correo (`NotificationDelivery`, canal `EMAIL`) usa la abstracción de `src/lib/email` (Resend en producción, bandeja de desarrollo en memoria si no hay `RESEND_API_KEY`).

## Idempotencia

Cada evento notificable tiene una **`dedupeKey` determinística**, por ejemplo:

```
RENEWAL_UPCOMING:{subscriptionId}:{offsetDays}:{nextBillingDate}
BUDGET_THRESHOLD:{budgetId}:{año-mes}
PAYMENT_METHOD_EXPIRING:{paymentMethodId}:{año-mes}
```

`Notification.dedupeKey` tiene una restricción **única** en el esquema. `generateDueNotifications` intenta `create` y captura el error `P2002` (violación de restricción única) cuando la notificación ya existe, contándolo como "ya existía" en vez de duplicar. Esto garantiza que **ejecutar el job varias veces el mismo día — o reintentar tras un fallo — nunca genera avisos repetidos**, sin necesidad de locks distribuidos ni colas.

`NotificationDelivery` tiene además una restricción única `(notificationId, channel)`, para que un mismo aviso nunca se envíe dos veces por el mismo canal aunque el proceso de entrega se reintente.

## Zona horaria en los recordatorios

Las fechas de facturación se guardan como fechas de calendario puras (ver [RECURRENCE_RULES.md](./RECURRENCE_RULES.md)). Para decidir si "hoy toca avisar", el job calcula el día de calendario **en la zona horaria del usuario** (`UserSettings.timezone`, vía `Intl.DateTimeFormat` con `timeZone`) y lo compara contra `nextBillingDate - offsetDays`. Así, dos usuarios en zonas horarias distintas reciben el aviso en su propio "hoy", no en el UTC del servidor.

## Configurar el cron

**Desarrollo (Docker Compose):** el servicio `cron` en `docker-compose.yml` ya está configurado — un contenedor Alpine mínimo que hace `curl` al endpoint cada 15 minutos. Se levanta junto con el resto: `docker compose up -d`.

**Producción:** cualquier programador de tareas HTTP funciona (Vercel Cron, un cron de sistema con `curl`, GitHub Actions con `schedule`, etc.) — solo necesita poder hacer una petición `POST` con el header `Authorization`. Ejemplo de configuración con Vercel Cron (`vercel.json`):

```json
{
  "crons": [{ "path": "/api/cron/notifications", "schedule": "*/15 * * * *" }]
}
```

(Nota: Vercel firma sus propias peticiones de cron; si se usa ese mecanismo en vez de un secreto compartido, ajusta la validación en el Route Handler en consecuencia — la entrega actual usa `CRON_SECRET` por ser portable a cualquier proveedor.)

**Probar manualmente y de forma segura** (no expone el secreto en el historial de shell si usas una variable de entorno):

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/notifications
```

Respuesta esperada: `{ "created": <n>, "skippedExisting": <n> }`.

## Tipos de notificación

`RENEWAL_UPCOMING`, `TRIAL_ENDING`, `CANCEL_DEADLINE`, `PAYMENT_FAILED`, `BUDGET_THRESHOLD`, `PAYMENT_METHOD_EXPIRING`, `WEEKLY_SUMMARY`, `MONTHLY_SUMMARY` (los dos últimos, el resumen periódico opcional, quedan como extensión documentada — ver limitaciones en el README).

## Preferencias del usuario

`UserSettings.notifyEmail` / `notifyInApp` / `weeklySummary` / `monthlySummary` controlan qué canales/resúmenes recibe cada usuario — respétalos antes de crear una `NotificationDelivery` de canal `EMAIL`.

## Notificaciones push (web)

**No implementadas en esta entrega**, tal como permite la sección 10 del encargo cuando no se pueden completar sin degradar el resto. Quedan como extensión documentada: requerirían Service Worker, suscripción push del navegador y una tabla adicional para las suscripciones push por dispositivo.
