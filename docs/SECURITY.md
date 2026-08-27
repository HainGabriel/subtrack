# Seguridad

## Modelo de amenazas (resumen)

**Activos a proteger:** credenciales de usuario, datos financieros personales (montos, historial de pagos, alias de métodos de pago), sesión del usuario.

**Explícitamente fuera de alcance / no se guarda nunca:** números completos de tarjeta, CVV, credenciales de terceros. `PaymentMethod` solo admite alias, marca, **últimos 4 dígitos** y mes/año de expiración — el esquema de base de datos ni siquiera tiene columnas para más que eso, así que no es solo una regla de la UI.

**Adversarios considerados:**

- Un atacante externo intentando fuerza bruta sobre login / recuperación de contraseña → mitigado con rate limiting (ver abajo) y hashing argon2id.
- Un usuario autenticado intentando acceder/modificar datos de otro usuario (IDOR) → mitigado filtrando **toda** query por `userId` en el servidor, nunca confiando en un id recibido del cliente sin verificar pertenencia.
- Una fuga de la base de datos → contraseñas y tokens de recuperación se guardan como hash (argon2id y SHA-256 respectivamente), nunca en claro; no hay datos de tarjeta que filtrar.
- Un tercero invocando el endpoint de cron sin autorización → protegido con un secreto compartido (`CRON_SECRET`) comparado con `crypto.timingSafeEqual` y rate-limited.
- CSV malicioso en la importación → parseo con biblioteca dedicada (no `eval`/regex frágil), validación de esquema por fila, límites de tamaño.

**Aceptado como limitación conocida (ver CHANGELOG/limitaciones):** el rate limiting en memoria es por instancia — en un despliegue multi-instancia hace falta un adaptador distribuido (interfaz ya preparada para ello, ver abajo).

## Autenticación y sesiones

- Auth.js v5 con proveedor **Credentials**, sesión **JWT** (firmada con `AUTH_SECRET`). Cookies `httpOnly`, `sameSite=lax` (comportamiento por defecto de Auth.js) y `secure` automáticamente en producción (HTTPS).
- Contraseñas: **argon2id**, `memoryCost=64MiB`, `timeCost=3` — muy por encima de los defaults débiles de la librería, alineado con las recomendaciones actuales de OWASP.
- Recuperación de contraseña: token de un solo uso, generado con `crypto.randomBytes(32)`, **se guarda solo su hash SHA-256** en la base de datos (`PasswordResetToken.tokenHash`), expira en 1 hora, se marca `usedAt` al consumirse. La respuesta de "solicitar recuperación" es idéntica exista o no el correo, para no filtrar qué cuentas están registradas.

## Autorización

- `proxy.ts` (equivalente a `middleware.ts` en Next.js 16) redirige a `/iniciar-sesion` a nivel de UX, pero **no es la barrera de seguridad real** — Next.js documenta explícitamente que un cambio de matcher puede dejar rutas o Server Actions sin cobertura de Proxy.
- La barrera real es `requireUser()` (`src/lib/auth/guard.ts`), invocada al inicio de **toda** Server Action y Route Handler que toque datos privados. Cada query subsiguiente filtra por `userId: user.id` — nunca se confía en un id de recurso recibido del cliente sin verificar que pertenece al usuario autenticado (se usa `findFirstOrThrow({ where: { id, userId } })`, no `findUnique({ where: { id } })`).

## Rate limiting

`src/lib/rate-limit.ts` expone `rateLimit(key, limit, windowMs)` sobre una interfaz `RateLimitStore` con una implementación en memoria (ventana fija) por defecto. Perfiles aplicados: login, registro, solicitud/envío de recuperación de contraseña, importación CSV, endpoint de cron. **Para producción multi-instancia**, sustituye `InMemoryStore` por un adaptador distribuido (p. ej. Upstash Redis) implementando la misma interfaz — el resto del código no cambia.

## OWASP / superficie de ataque

- **XSS:** React escapa por defecto; no se usa `dangerouslySetInnerHTML` salvo en el renderizado controlado de plantillas de correo (contenido generado por la propia app, no por input de usuario sin sanitizar).
- **CSRF:** mitigado por el mecanismo de Server Actions de Next.js (verificación de origen integrada) más `sameSite` en las cookies de sesión.
- **IDOR:** ver "Autorización" arriba.
- **Inyección SQL:** Prisma parametriza todas las queries; no se usa `$queryRawUnsafe` con input de usuario en ningún punto.
- **Open redirects:** el `callbackUrl` tras login se limita a rutas relativas internas.
- **Cabeceras de seguridad / CSP:** configuradas en `next.config.ts` — ver ese archivo para la política exacta aplicada.
- **Archivos importados (CSV):** validados por tamaño, tipo MIME y esquema de fila antes de tocar la base de datos; nunca se ejecuta contenido del archivo.
- **Secretos:** exclusivamente en variables de entorno, validadas al arrancar (`src/lib/env.ts`) — el proceso falla rápido y con un mensaje claro si falta alguna. `.env.example` documenta todas sin valores reales.
- **Logs:** estructurados, sin contraseñas, tokens, números completos de tarjeta ni secretos — errores internos se logean en servidor con detalle; las respuestas al cliente llevan solo mensajes genéricos en español.

## Pendiente / próximos pasos de seguridad

- Verificación de correo electrónico real (actualmente `emailVerified` existe en el esquema pero el flujo de verificación no está implementado en esta entrega — ver limitaciones en el README).
- Auditoría de dependencias automatizada en CI (`npm audit` o equivalente) — no incluida en el workflow inicial.
- Adaptador de rate limiting distribuido para despliegues multi-instancia.
