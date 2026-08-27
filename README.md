# SubTrack

Aplicación web para administrar suscripciones personales y empresariales: controla gastos recurrentes, recibe avisos antes de cada cobro y evita renovaciones inesperadas.

Next.js 16 (App Router) + TypeScript estricto + PostgreSQL + Prisma 7 + Auth.js v5, con soporte multi-moneda, presupuestos, calendario de cobros, importación/exportación CSV/ICS y un centro de notificaciones con jobs idempotentes.

## Requisitos

- Node.js 22+
- Docker Desktop (recomendado, para PostgreSQL local) **o** un PostgreSQL 16 propio
- npm

## Puesta en marcha con Docker (recomendado)

```bash
cp .env.example .env
# Genera un AUTH_SECRET y un CRON_SECRET reales y pégalos en .env:
#   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

docker compose up -d db          # solo la base de datos
npm install
npx prisma migrate deploy        # aplica las migraciones
npx prisma db seed               # usuario y datos de demostración

docker compose up -d --build     # app + cron, ya conectados a la db
```

La app queda en [http://localhost:3000](http://localhost:3000). El servicio `cron` llama automáticamente a `/api/cron/notifications` cada 15 minutos — ver [docs/NOTIFICATIONS.md](./docs/NOTIFICATIONS.md).

## Puesta en marcha sin Docker

```bash
cp .env.example .env
# Ajusta DATABASE_URL a tu PostgreSQL y genera AUTH_SECRET/CRON_SECRET reales.

npm install
npx prisma migrate deploy
npx prisma db seed
npm run build
npm run start        # o: npm run dev, para desarrollo con recarga en caliente
```

> **Nota sobre `output: "standalone"`:** solo se activa cuando `BUILD_STANDALONE=true` está presente (lo define el `Dockerfile`, para la imagen mínima). Sin esa variable, `npm run build` genera la salida estándar de Next — la que espera el adaptador de Netlify. Para replicar exactamente el runtime de Docker en local: `BUILD_STANDALONE=true npm run build && node .next/standalone/server.js` (copiando antes `public/` y `.next/static/` dentro de `.next/standalone/`, como hace el `Dockerfile`).

## Usuario de demostración

El seed (`prisma/seed.ts`) crea un usuario de desarrollo con un panel ya poblado (10 suscripciones en varias monedas, prueba gratuita, cancelación programada, historial de pagos, presupuestos, una tarjeta por vencer):

```
Correo:      demo@subtrack.dev
Contraseña:  Demo1234!
```

El seed es idempotente — `npx prisma db seed` se puede correr las veces que haga falta sin duplicar datos.

## Scripts

| Script                                          | Qué hace                           |
| ----------------------------------------------- | ---------------------------------- |
| `npm run dev`                                   | Servidor de desarrollo (Turbopack) |
| `npm run build`                                 | Build de producción                |
| `npm run start`                                 | Sirve el build (`next start`)      |
| `npm run lint`                                  | ESLint                             |
| `npm run typecheck`                             | `tsc --noEmit`                     |
| `npm run format` / `format:check`               | Prettier                           |
| `npm run test` / `test:watch` / `test:coverage` | Vitest (unitarias/componentes)     |
| `npm run test:e2e` / `test:e2e:ui`              | Playwright (end-to-end)            |
| `npm run db:migrate`                            | `prisma migrate dev`               |
| `npm run db:seed`                               | `prisma db seed`                   |
| `npm run db:studio`                             | Prisma Studio                      |
| `npm run db:generate`                           | Regenera el cliente de Prisma      |

## Variables de entorno

Ver [`.env.example`](./.env.example) — todas documentadas ahí. Se validan al primer uso real (no al arrancar el proceso, para que el build de Docker no necesite secretos) mediante `src/lib/env.ts`; si falta alguna, el error indica exactamente cuál.

## Pruebas

```bash
npm run test              # unitarias — no requieren base de datos
npm run build && npm run start   # en otra terminal:
npm run test:e2e          # end-to-end — requiere la app y la base de datos corriendo
```

Ver [docs/TESTING.md](./docs/TESTING.md) para la estrategia completa y qué cubre cada nivel.

## Documentación

- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — módulos, decisiones, flujo de datos
- [docs/DATA_MODEL.md](./docs/DATA_MODEL.md) — entidades, relaciones, diagrama
- [docs/RECURRENCE_RULES.md](./docs/RECURRENCE_RULES.md) — política de fechas de cobro
- [docs/SECURITY.md](./docs/SECURITY.md) — modelo de amenazas, controles
- [docs/NOTIFICATIONS.md](./docs/NOTIFICATIONS.md) — cron, idempotencia, proveedores
- [docs/TESTING.md](./docs/TESTING.md) — estrategia y comandos
- [docs/USER_GUIDE.md](./docs/USER_GUIDE.md) — guía de uso en español, sin tecnicismos
- [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) — desplegar en Netlify + Supabase
- [CHANGELOG.md](./CHANGELOG.md) — historial de la entrega

## Estructura del proyecto

```
src/
  app/            Rutas (App Router): (auth)/, (app)/ [protegido], api/, onboarding/
  components/     UI: ui/ (shadcn/ui), app-shell/, subscriptions/, dashboard/, auth/, notifications/
  lib/
    domain/       Lógica de negocio pura/testeable (recurrencia, dinero, agregaciones...)
    actions/      Server Actions (mutaciones desde la UI)
    validation/   Esquemas Zod compartidos
    auth/         Auth.js, hashing, guard de autorización
    email/        Envío de correo + plantillas
  generated/prisma/  Cliente de Prisma generado (no editar a mano)
prisma/           schema.prisma, migraciones, seed.ts
e2e/              Pruebas Playwright
docs/             Documentación técnica
```

## Licencia

Proyecto privado — sin licencia de distribución pública.
