# Changelog

## [1.0.0] — Entrega inicial — 2026-08-27

### Añadido

**Autenticación y cuentas**
- Registro, inicio/cierre de sesión con Auth.js v5 (Credentials + JWT), argon2id para contraseñas.
- Recuperación de contraseña con token de un solo uso (hash SHA-256), sin revelar si un correo existe.
- Onboarding de dos pasos (moneda base, zona horaria, inicio de semana).
- Perfil con preferencias, cambio de contraseña, exportación de datos y eliminación de cuenta con confirmación reforzada.
- Rate limiting en login, registro y recuperación de contraseña.

**Suscripciones**
- CRUD completo con categoría, etiquetas, color/ícono, impuestos, método de pago, prioridad, valoración, avisos de renovación configurables.
- Motor de recurrencia con política explícita y probada para meses de 28-31 días y años bisiestos (7 frecuencias fijas + personalizada).
- Registro de pagos idempotente (nunca duplica un cobro para el mismo ciclo) con avance automático de la próxima fecha.
- Pausar, programar cancelación, cancelar, reactivar y archivar sin perder historial.
- Listado con búsqueda, filtros, orden, paginación server-side, vista de tabla/tarjetas y archivado en lote.

**Panel y calendario**
- Gasto previsto/real, equivalente anual, ahorro por cancelaciones, con conversión a la moneda base cuando hay tasa disponible (marcada como estimada) y desglose por moneda cuando no la hay.
- Próximas renovaciones, sección "requiere tu atención", gráfica de gasto mensual y distribución por categoría.
- Calendario mensual/lista de cobros previstos.

**Presupuestos, métodos de pago y categorías**
- Presupuestos globales o por categoría, mensuales o anuales, con umbral de alerta configurable.
- Métodos de pago (solo alias/últimos 4 dígitos/vencimiento — nunca datos sensibles completos) con aviso de vencimiento próximo.
- Categorías con reasignación guiada antes de eliminar una en uso.

**Notificaciones**
- Job programado idempotente (dedupeKey única) para renovaciones próximas, pruebas por terminar, fechas límite de cancelación, métodos por vencer y presupuestos excedidos.
- Centro de notificaciones in-app con leídas/no leídas, posponer y silenciar.
- Envío de correo con abstracción de proveedor (Resend en producción, bandeja de desarrollo en memoria sin proveedor externo).

**Importar / exportar**
- Importación CSV con plantilla, vista previa, validación por fila y detección de duplicados.
- Exportación de suscripciones y pagos en CSV, todos los datos en JSON, y próximos cobros en formato iCalendar (`.ics`).

**Diseño y accesibilidad**
- Paleta de marca validada (contraste y daltonismo) para colores categóricos de gráficas y colores de estado fijos.
- Tema claro/oscuro/sistema sin destello incorrecto al cargar.
- Sidebar responsive con drawer móvil, command palette (Ctrl/Cmd+K), estados vacíos, skeletons y páginas de error en todas las secciones.

**Seguridad**
- Autorización en dos capas: `proxy.ts` para UX, `requireUser()` + filtrado por `userId` en cada Server Action/Route Handler como barrera real.
- Cabeceras de seguridad (CSP, X-Frame-Options, etc.) en todas las respuestas.
- Endpoint de cron protegido con secreto comparado en tiempo constante.
- Recuperación con gracia de sesiones "huérfanas" (JWT válido cuyo usuario ya no existe) en vez de un error de servidor.

**Infraestructura**
- Docker Compose (PostgreSQL + app + cron) con Dockerfile multi-stage, usuario no root, build reproducible.
- GitHub Actions: lint, formato, tipos, pruebas unitarias con cobertura, migración en base de datos temporal, build, pruebas E2E.
- Seed de desarrollo idempotente con datos realistas (multi-moneda, prueba gratuita, cancelación programada, historial de pagos, presupuestos, tasa de cambio, método por vencer).
- 26 pruebas unitarias (motor de recurrencia y dinero) y suite E2E con Playwright (registro/onboarding, flujo completo de suscripción a pago, autorización entre usuarios).

### Corregido durante el desarrollo

- `proxy.ts` debía vivir en `src/` (no en la raíz del repo) para que Next.js 16 lo registrara — sin este archivo en la ubicación correcta, cualquier visita sin sesión a una ruta protegida crasheaba con un error 500 en vez de redirigir.
- La validación de variables de entorno y la construcción del cliente de Prisma se movieron a inicialización perezosa: hacerlo al importar el módulo rompía el build de Docker, que corre `next build` antes de que existan las variables de entorno reales de runtime.
- Una sesión válida que apunta a un usuario eliminado ahora se limpia con gracia (`/api/auth/clear-session`) en vez de crashear.

### Limitaciones conocidas

- Verificación de correo electrónico (el campo existe en el esquema, el flujo no está implementado en esta entrega).
- Resúmenes periódicos por correo (semanal/mensual): las preferencias existen, el envío programado queda como extensión documentada.
- Notificaciones push del navegador: no implementadas, documentadas como extensión futura.
- Rate limiting en memoria: correcto para una sola instancia; un despliegue multi-instancia necesita el adaptador distribuido documentado en `docs/SECURITY.md`.
- Sin auditoría automatizada de accesibilidad (tipo axe-core) integrada; la revisión de las pantallas críticas fue manual.
