# Desplegar SubTrack: Netlify (app) + Supabase (base de datos)

Esta guía asume que ya tienes el repositorio funcionando en local (ver [README.md](../README.md)). Cubre exactamente los pasos para llevarlo a producción con Netlify + Supabase.

**Lo que ya está preparado en el código** (no necesitas tocar nada de esto):

- `next.config.ts` ya NO fuerza `output: "standalone"` salvo que la variable `BUILD_STANDALONE=true` esté presente (la pone el `Dockerfile`; Netlify no la define, así que obtiene la salida estándar que su adaptador espera).
- `prisma7.config.ts` usa `DIRECT_URL` para migraciones si existe, y cae de vuelta a `DATABASE_URL` si no (así local/Docker no necesitan nada nuevo).
- `netlify.toml` — comando de build (`prisma generate` + `next build`), versión de Node, carpeta de funciones.
- `netlify/functions/notifications-cron.mts` — Scheduled Function que reemplaza al servicio `cron` de `docker-compose.yml`: llama a `POST /api/cron/notifications` cada 15 minutos, reutilizando el mismo endpoint ya probado.

## Parte 1 — Base de datos en Supabase

1. Crea una cuenta en [supabase.com](https://supabase.com) y un **New project** (elige una región cercana a tus usuarios; guarda la contraseña de la base de datos que definas ahí, la vas a necesitar).
2. Espera a que aprovisione el proyecto (1-2 minutos).
3. Ve a **Project Settings → Database → Connection string**. Supabase ofrece varias variantes — necesitas dos:
   - **Transaction pooler** (puerto `6543`) → esta es tu `DATABASE_URL`. Agrégale `?pgbouncer=true` al final si Supabase no lo incluye ya. La app la usa en runtime a través de un driver adapter (`@prisma/adapter-pg`), que sí funciona bien con el pool en modo transacción.
   - **Session pooler o conexión directa** (puerto `5432`) → esta es tu `DIRECT_URL`. Solo la usan las migraciones (`prisma migrate deploy`) — Supabase no permite ejecutar DDL a través del pool en modo transacción.

   Ejemplo de forma (sustituye host/usuario/contraseña reales):
   ```
   DATABASE_URL="postgresql://postgres.xxxxxxxx:TU_PASSWORD@aws-0-xx-xxxx-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres.xxxxxxxx:TU_PASSWORD@aws-0-xx-xxxx-1.pooler.supabase.com:5432/postgres"
   ```
   > Supabase también documenta crear un rol de base de datos dedicado llamado `prisma` para esta integración (ver su [guía oficial de Prisma](https://supabase.com/docs/guides/database/prisma)) — es un paso opcional de refinamiento, no obligatorio para que esto funcione.

4. Aplica las migraciones ya existentes del repo contra Supabase (desde tu máquina, una sola vez):
   ```bash
   DATABASE_URL="...pooler...6543...?pgbouncer=true" \
   DIRECT_URL="...pooler...5432..." \
   npx prisma migrate deploy
   ```
5. **Opcional** — solo si quieres datos de ejemplo en esa base (normalmente NO en una base de producción real): `npx prisma db seed` con las mismas variables.

## Parte 2 — App en Netlify

### Si el código no está en GitHub todavía

Netlify puede desplegar por Git (recomendado, con auto-deploy en cada push) o directo desde tu máquina con la CLI. Para lo primero necesitas un repositorio en GitHub/GitLab/Bitbucket — dime si quieres que prepare el push (tendría que crear el repo remoto contigo, o puedes crearlo tú y pasarme la URL).

### Opción A — Por el dashboard de Netlify (recomendada, con auto-deploy)

1. En [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**, conecta tu proveedor de Git y elige este repositorio.
2. Netlify detecta Next.js automáticamente. Confirma el build command (`npx prisma generate && npm run build`, ya viene de `netlify.toml`).
3. Antes de desplegar (o justo después, en **Site settings → Environment variables**), agrega TODAS estas variables (mismos valores/formato que tu `.env`, ver [`.env.example`](../.env.example)):

   | Variable | Valor en producción |
   |---|---|
   | `DATABASE_URL` | La del *transaction pooler* de Supabase (puerto 6543, con `?pgbouncer=true`) |
   | `DIRECT_URL` | La *session pooler*/directa de Supabase (puerto 5432) |
   | `AUTH_SECRET` | Genera uno nuevo y distinto al de desarrollo: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
   | `AUTH_URL` | La URL real de tu sitio, ej. `https://tu-sitio.netlify.app` (o tu dominio propio) |
   | `RESEND_API_KEY` | Tu clave real de [resend.com](https://resend.com) — en serverless la bandeja de desarrollo en memoria no sirve, así que esto es importante en producción |
   | `EMAIL_FROM` | Un remitente verificado en Resend |
   | `CRON_SECRET` | Genera uno nuevo (no reuses el de desarrollo): `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
   | `APP_DEFAULT_TIMEZONE` | `America/Santo_Domingo` (o la que prefieras) |
   | `APP_DEFAULT_CURRENCY` | `DOP` |
   | `APP_DEFAULT_LOCALE` | `es` |
   | `NODE_ENV` | `production` |

4. Despliega. Sigue el log de build — si algo falla por variables faltantes, el error de `src/lib/env.ts` te dice exactamente cuál.

### Opción B — Por CLI, sin conectar Git

```bash
npm install -g netlify-cli
netlify login          # abre el navegador para autenticarte — hazlo tú
netlify init            # crea o vincula el sitio
netlify env:set DATABASE_URL "..."
netlify env:set DIRECT_URL "..."
# ... (repite para cada variable de la tabla de arriba)
netlify deploy --prod
```

## Verificación después del primer despliegue

1. Abre la URL del sitio — debe verse la landing (no un error).
2. `https://tu-sitio.netlify.app/api/health` debe responder `{"status":"ok"}`.
3. Intenta entrar a `/panel` **sin sesión** — debe redirigir a `/iniciar-sesion`, no mostrar un error de servidor. Esto depende de que el runtime de Netlify soporte `proxy.ts` (la convención de Next 16, renombrada desde `middleware.ts`) — no pude confirmarlo al 100% desde la documentación pública al momento de preparar esto, así que es el punto más importante a revisar tú mismo tras el primer deploy. Si falla, dímelo y lo ajustamos (por ejemplo, agregando una comprobación equivalente al inicio de cada página protegida, aunque `requireUser()` ya cubre esa capa en cada Server Action).
4. Regístrate con una cuenta nueva y completa el onboarding.
5. En Netlify: pestaña **Functions** → confirma que `notifications-cron` aparece programada. Puedes invocarla manualmente desde ahí para probarla antes de esperar los 15 minutos.

## Lo que necesito de ti si quieres que yo ejecute el despliegue

No tengo acceso a tus cuentas de Supabase/Netlify ni debo crear cuentas o recursos en la nube a tu nombre sin que tú lo autorices y estés presente. Puedo ayudarte de dos formas:

- **Guiarte paso a paso** mientras tú haces clic en las pantallas (puedo controlar el navegador contigo mirando, si lo prefieres).
- **Ejecutar comandos de CLI yo mismo**, si tú corres `netlify login` (te sale un enlace, `! netlify login`) y me confirmas que quedó autenticado en esta máquina — desde ahí sí puedo correr `netlify env:set`, `netlify deploy`, etc. por ti. Para Supabase no hay CLI de login interactivo necesario si me pasas las cadenas de conexión ya generadas desde tu dashboard (puedo entonces correr `prisma migrate deploy` yo mismo).

Cuando tengas el proyecto de Supabase creado (o quieras que lo hagamos juntos ahora), dime y seguimos.
