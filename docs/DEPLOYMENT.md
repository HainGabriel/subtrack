# Desplegar SubTrack: Netlify (app) + Supabase (base de datos)

Este documento describe el despliegue real ya realizado (sitio en producción: **https://subtrack-app-672.netlify.app**, base de datos en el proyecto de Supabase `oqbsepcfojfgktlchaau`, región `us-west-2`) y sirve como referencia si necesitas repetirlo (otro entorno, staging, o reconstruir desde cero).

**Lo que ya está preparado en el código** (no necesitas tocar nada de esto):

- `next.config.ts` — `output: "standalone"` solo se activa con `BUILD_STANDALONE=true` (la define el `Dockerfile`; Netlify no la define, así que obtiene la salida estándar que su adaptador espera).
- `prisma7.config.ts` — usa `DIRECT_URL` para migraciones si existe, cae de vuelta a `DATABASE_URL` si no.
- `netlify.toml` — comando de build (`prisma generate` + `next build`), versión de Node, carpeta de funciones.
- `netlify/functions/notifications-cron.mts` — Scheduled Function (cada 15 min) que reemplaza al servicio `cron` de `docker-compose.yml`, llamando a `POST /api/cron/notifications`.
- `src/lib/auth/config.ts` — configuración de Auth.js sin proveedores, usada por `src/proxy.ts` para que el Proxy no arrastre `argon2` (ver "Problemas reales" abajo).

## Parte 1 — Base de datos en Supabase

1. Crear proyecto en [supabase.com](https://supabase.com/dashboard) (o por CLI: `npx supabase projects create NOMBRE --org-id ID --db-password PASS --region us-west-2`, con `npx supabase login --token <personal access token de supabase.com/dashboard/account/tokens>`).
2. Obtener las cadenas de conexión — **dos, no una**:
   - `DATABASE_URL` (runtime de la app): *transaction pooler*, puerto `6543`, con `?pgbouncer=true`.
   - `DIRECT_URL` (solo migraciones): *session pooler*, mismo host, puerto `5432`, sin `pgbouncer=true` — Supabase no permite DDL a través del pool en modo transacción.

   Formato real (con el usuario del pooler, no `postgres` a secas):
   ```
   DATABASE_URL="postgresql://postgres.<project-ref>:<PASSWORD>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres.<project-ref>:<PASSWORD>@aws-0-<region>.pooler.supabase.com:5432/postgres"
   ```
   Estos valores se pueden obtener por API sin pasar por el dashboard: `PATCH /v1/projects/{ref}/database/password` para fijar la contraseña, `GET /v1/projects/{ref}/config/database/pooler` para host/usuario/puerto (ver [Management API Reference](https://supabase.com/docs/reference/api/introduction)).
3. Aplicar las migraciones:
   ```bash
   DATABASE_URL="...6543...?pgbouncer=true" DIRECT_URL="...5432..." npx prisma migrate deploy
   ```
4. Seed de datos demo: **opcional**, se decidió no sembrarlos en este despliegue (la base quedó vacía a propósito, para registrarse con una cuenta real). Para hacerlo después: mismas variables + `npx prisma db seed`.

## Parte 2 — App en Netlify

Se usó la CLI (`npx netlify-cli`, sin instalación global) en vez del dashboard:

```bash
npx netlify-cli login                      # abre el navegador, autenticación interactiva
npx netlify-cli sites:create --name subtrack-app   # crea el sitio, lo vincula a esta carpeta
npx netlify-cli env:set DATABASE_URL "..."         # una vez por variable — ver tabla abajo
# ...
npx netlify-cli deploy --prod              # build + deploy
```

**Nota real:** el primer intento de `deploy --prod` (build local en Windows) falló con `EPERM: symlink` — el plugin de Next.js de Netlify necesita crear symlinks que Windows bloquea sin permisos de administrador/Modo desarrollador. La solución que se usó: conectar el sitio a un repositorio de GitHub (`git remote add origin ... && git push`, y luego enlazar el repo desde **Site settings → Build & deploy → Link repository** en el dashboard — este paso de autorización de la GitHub App sí lo tiene que hacer el dueño de la cuenta). Con eso, Netlify construye en sus propios servidores Linux, sin el problema de symlinks.

### Variables de entorno configuradas

| Variable | Valor |
|---|---|
| `DATABASE_URL` | Pooler de Supabase, puerto 6543, `pgbouncer=true` |
| `DIRECT_URL` | Pooler de Supabase, puerto 5432 |
| `AUTH_SECRET` | Generado con `crypto.randomBytes(32)` |
| `AUTH_URL` | `https://subtrack-app-672.netlify.app` |
| `CRON_SECRET` | Generado con `crypto.randomBytes(32)` |
| `APP_DEFAULT_TIMEZONE` / `_CURRENCY` / `_LOCALE` | `America/Santo_Domingo` / `DOP` / `es` |
| `EMAIL_FROM` | Placeholder `SubTrack <notificaciones@subtrack.local>` — **no envía correos reales** hasta que se configure `RESEND_API_KEY` |
| `RESEND_API_KEY` | **No configurada todavía** — sin ella, el registro/recuperación de contraseña funcionan pero el correo de bienvenida y de recuperación no se envían de verdad (se descartan silenciosamente en producción; ver limitación abajo) |
| `NODE_VERSION` | `22` (la fija `netlify.toml`) |

**`NODE_ENV` deliberadamente NO está seteada como variable de Netlify** — ver "Problemas reales" abajo.

## Problemas reales encontrados y corregidos durante este despliegue

1. **`argon2` (binario nativo) rompía el build**: `src/proxy.ts` importaba la configuración completa de Auth.js, que incluye el proveedor Credentials (usa `argon2` para verificar contraseñas). El runtime de Proxy/Middleware de Netlify no soporta addons nativos de C++. Solución: `src/lib/auth/config.ts` con la configuración SIN proveedores, compartida por `proxy.ts` (que solo necesita decodificar el JWT, nunca verificar contraseñas) y por `src/lib/auth/index.ts` (que sí agrega el proveedor Credentials, para el resto de la app).
2. **`NODE_ENV=production` como variable de Netlify rompía el build**: con esa variable puesta, `npm install` en el paso de build omite `devDependencies` — y `@tailwindcss/postcss`, `typescript`, etc. son necesarios para compilar aunque no se usen en runtime. Las Netlify Functions ya reciben `NODE_ENV=production` automáticamente en su propio runtime sin que hiciera falta declararlo. Solución: no setear `NODE_ENV` como variable de sitio.
3. **Build local en Windows fallaba por symlinks** (`EPERM`) — no es un bug del proyecto, es una limitación de Windows sin permisos elevados/Modo desarrollador. Resuelto conectando el sitio a GitHub para que Netlify construya en sus servidores.

Ninguno de estos tres era detectable sin intentar el despliegue real — quedan documentados aquí para que no se repitan si se recrea el sitio desde cero.

## Verificado funcionando en producción

- `GET /api/health` → `{"status":"ok"}` (conexión a Supabase confirmada).
- `GET /panel` sin sesión → `307` a `/iniciar-sesion` (Proxy de Next 16 SÍ funciona en Netlify — no era seguro de antemano, se confirmó con el deploy real).
- Cookies con `Secure`/`__Host-` correctamente aplicadas (Auth.js detecta HTTPS).
- Cabeceras de seguridad (CSP, X-Frame-Options) presentes; Netlify añade además HSTS automáticamente.
- Flujo completo probado en el navegador: registro → onboarding → panel, con una cuenta de prueba (creada y luego eliminada de la base para no ensuciar los datos reales).
- `netlify functions:list` confirma `notifications-cron` desplegada.

## Pendiente / próximos pasos

- **Configurar `RESEND_API_KEY`** para que los correos (bienvenida, recuperación de contraseña) se envíen de verdad: `npx netlify-cli env:set RESEND_API_KEY "re_..."` y `EMAIL_FROM` con un remitente verificado en Resend, luego `npx netlify-cli deploy --trigger --prod`.
- Dominio propio (opcional): Site settings → Domain management, y actualizar `AUTH_URL` al nuevo dominio.
- Verificar en unos minutos que la Scheduled Function `notifications-cron` corrió al menos una vez (pestaña **Functions** del sitio en el dashboard de Netlify).
