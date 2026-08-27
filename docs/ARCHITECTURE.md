# Arquitectura

## Visión general

SubTrack es una aplicación **monolítica** Next.js 16 (App Router) con TypeScript estricto: un solo proceso Node.js sirve tanto el frontend (React Server Components) como el backend (Server Actions + un puñado de Route Handlers), respaldado por PostgreSQL vía Prisma 7. Deliberadamente **no** hay microservicios, colas externas, ni Redux — el problema (gestionar suscripciones de un usuario) no lo justifica, y una arquitectura más simple es más fácil de operar y de auditar.

## Server Actions vs. Route Handlers — decisión

- **Server Actions** (`src/lib/actions/*.ts`, con `"use server"`) son el mecanismo por defecto para **toda mutación disparada desde la interfaz** (crear/editar/borrar suscripciones, registrar pagos, cambiar preferencias, etc.). Se invocan directamente desde formularios y botones sin necesidad de definir un endpoint REST aparte, con tipado de extremo a extremo y sin serialización manual.
- **Route Handlers** (`src/app/api/**/route.ts`) se reservan para los tres casos donde el llamador **no es la propia UI de React**:
  1. `src/app/api/auth/[...nextauth]/route.ts` — lo exige Auth.js (necesita un endpoint HTTP real para el flujo OAuth/callback, aunque hoy solo se use Credentials).
  2. `src/app/api/cron/notifications/route.ts` — lo invoca un programador de tareas externo (ver [NOTIFICATIONS.md](./NOTIFICATIONS.md)), no un navegador con sesión.
  3. `src/app/api/health/route.ts` — lo consulta el `healthcheck` de Docker/el balanceador, sin contexto de sesión.

## Capas del código

```
src/
  app/                    Rutas (App Router). Página = composición; la lógica vive en lib/.
    (auth)/               Login, registro, recuperación — layout propio de dos paneles.
    (app)/                Todo lo protegido; layout.tsx exige sesión + onboarding completo
                           y monta el AppShell (sidebar, topbar, command palette).
    api/                  Los tres Route Handlers descritos arriba.
  lib/
    domain/                Lógica de negocio pura o casi-pura, testeable sin HTTP:
                            recurrence, money, exchange-rate, subscriptions,
                            notifications, spend-aggregation, password-reset,
                            provision-user, csv-import/export, ics-export.
    actions/                Server Actions — orquestan: requireUser() → validar (Zod) →
                            llamar a domain/ o Prisma directo → revalidatePath → responder.
    validation/             Esquemas Zod, compartidos entre cliente (react-hook-form) y
                            servidor (la Server Action vuelve a validar — nunca confía
                            solo en la validación de cliente).
    auth/                   Configuración de Auth.js, hashing de contraseñas, guard de
                            autorización (requireUser).
    email/                  Abstracción de envío + plantillas.
    prisma.ts               Singleton de PrismaClient con el driver adapter de pg.
  components/
    ui/                     shadcn/ui (primitivas Radix ya estilizadas).
    app-shell/              Navegación de la app protegida.
    subscriptions/, dashboard/, auth/, ...   Componentes de cada área funcional.
  generated/prisma/          Cliente de Prisma generado (no editar a mano, no versionar
                              lógica de negocio aquí).
```

**Regla de dependencia:** `domain/` no importa de `actions/` ni de `components/` (evita ciclos y mantiene la lógica de negocio testeable de forma aislada, como demuestran las 18 pruebas del motor de recurrencia). `actions/` sí puede importar de `domain/` y de `prisma.ts`.

## Autenticación

Auth.js v5, proveedor **Credentials** (correo + contraseña) con **sesión JWT** — no sesión de base de datos, porque Credentials no es compatible con el adaptador de base de datos de Auth.js (limitación documentada de la propia librería: no puede vincular automáticamente la sesión al usuario sin un flujo OAuth). Las tablas `Account`/`Session`/`VerificationToken` sí existen en el esquema, en la forma estándar que espera `@auth/prisma-adapter`, **preparadas** para el día en que se añada un proveedor OAuth (Google, GitHub, etc.) — en ese momento sí se conectaría el adaptador y esas tablas entrarían en uso.

## Autorización en profundidad

Dos capas independientes, nunca solo una:

1. `proxy.ts` (la convención de Next.js 16 que reemplaza a `middleware.ts`) redirige a `/iniciar-sesion` por UX si no hay sesión — se ejecuta antes de renderizar, pero Next.js mismo advierte que un cambio de `matcher` puede dejar sin cobertura una ruta o una Server Action.
2. `requireUser()` al inicio de cada Server Action/Route Handler privado, con cada query subsiguiente filtrada por `userId` — esta es la barrera que de verdad protege los datos, independiente de que la capa 1 falle o se reconfigure mal.

## Multi-moneda

Nunca se suman importes de monedas distintas como si fueran la misma. `src/lib/domain/money.ts` agrupa por moneda (`groupByCurrency`); cuando hace falta un total único en la moneda base del usuario, `src/lib/domain/exchange-rate.ts` convierte usando la tasa manual más reciente disponible (`ExchangeRate`, por usuario, con fecha) y **marca el resultado como estimado** (`isEstimate: true`) — si no hay tasa registrada, la función devuelve `null` en vez de inventar un número, y la UI muestra el desglose por moneda sin sumar.

## Idempotencia y concurrencia

- **Registrar un pago dos veces** para el mismo ciclo: bloqueado por la restricción única `(subscriptionId, dueDate)` en `Payment` — el segundo intento falla con un error de Prisma (`P2002`) que la Server Action traduce a un mensaje claro.
- **El job de notificaciones ejecutándose varias veces**: bloqueado por `Notification.dedupeKey` único — ver [NOTIFICATIONS.md](./NOTIFICATIONS.md).
- **Avance de recurrencia**: `recordPayment` (dominio) calcula y persiste `nextBillingDate` dentro de la misma transacción que crea el `Payment`, así que no hay ventana donde dos pagos concurrentes lean el mismo `nextBillingDate` "viejo" y lo dupliquen — la segunda transacción concurrente se serializa contra la restricción única antes descrita.

## Internacionalización

La interfaz está en español en toda esta entrega, pero la arquitectura no acopla el idioma al código: todo el texto vive en los componentes de cada página (no hay lógica que dependa del idioma), y `UserSettings.locale` ya existe en el esquema para cuando se añada un segundo idioma real (con una librería de i18n tipo `next-intl`, fuera de alcance de esta entrega).

## Rendimiento

- Server Components por defecto — el JavaScript de cliente se limita a lo que de verdad necesita interactividad (formularios, diálogos, el command palette, gráficas).
- Paginación, filtrado y ordenamiento de listados grandes (suscripciones, pagos) se resuelven en el servidor con Prisma (`where`/`orderBy`/`skip`/`take`), no trayendo todo el dataset al cliente.
- Índices de base de datos en las columnas de consulta frecuente — ver [DATA_MODEL.md](./DATA_MODEL.md).
