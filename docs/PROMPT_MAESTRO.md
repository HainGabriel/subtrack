# Prompt maestro para Claude Code: gestor completo de suscripciones

> Copia desde **INICIO DEL PROMPT** hasta **FIN DEL PROMPT** y pégalo en Claude Code dentro de una carpeta nueva destinada al proyecto.

---

## INICIO DEL PROMPT

Actúa como un **equipo senior multidisciplinario de ingeniería de software, producto, UX/UI, seguridad, QA y DevOps**. Tu misión es diseñar, construir, probar, documentar y dejar listo para ejecutar y desplegar un producto web completo llamado provisionalmente **SubTrack**: una aplicación moderna para administrar suscripciones personales y empresariales, controlar gastos recurrentes y evitar cobros o renovaciones inesperadas.

No quiero una demostración superficial, una landing page ni una colección de componentes estáticos. Quiero una **aplicación full-stack real, funcional, segura, mantenible, responsive, accesible y visualmente sobresaliente**, con persistencia de datos, autenticación, reglas de negocio, notificaciones, pruebas y documentación.

### 1. Forma de trabajo y autonomía

1. Analiza primero el entorno, los archivos existentes, las versiones instaladas y las instrucciones del repositorio (`CLAUDE.md`, `AGENTS.md`, README u otras) antes de modificar nada.
2. Si Claude Code dispone de agentes o subagentes, divide el trabajo y ejecútalo en paralelo cuando no haya conflictos. Como mínimo, utiliza estos roles:
   - **Arquitecto/product owner:** alcance, modelo de dominio, arquitectura y criterios de aceptación.
   - **Diseñador UX/UI:** sistema visual, experiencia responsive, accesibilidad, animaciones y estados.
   - **Ingeniero frontend:** interfaz, componentes, formularios, gráficas y gestión de estados.
   - **Ingeniero backend/datos:** API, base de datos, autenticación, tareas programadas y reglas de negocio.
   - **Ingeniero de seguridad:** autorización, validación, secretos, rate limiting y revisión OWASP.
   - **QA:** pruebas unitarias, integración, E2E, accesibilidad y casos límite.
   - **DevOps/documentación:** Docker, CI, variables de entorno, migraciones, datos de ejemplo y manuales.
3. Designa un agente coordinador que mantenga el plan, evite ediciones simultáneas sobre los mismos archivos, integre los resultados y ejecute la validación final.
4. Crea y mantén una lista de tareas con dependencias, responsables, estado y criterios de aceptación. No declares una tarea terminada sin verificarla.
5. Toma decisiones razonables sin detenerte por detalles menores. Solo pregunta si falta una decisión que cambie de forma importante el producto, implique credenciales externas o provoque una acción irreversible.
6. Si alguna integración externa requiere credenciales que no están disponibles, implementa una interfaz/adaptador funcional, un proveedor local o de desarrollo, variables de entorno documentadas y una experiencia degradada segura. La aplicación debe poder probarse localmente sin pagar servicios externos.
7. Usa versiones **estables, compatibles y vigentes** de las dependencias. Antes de elegir APIs o paquetes, consulta la documentación oficial disponible y evita funciones obsoletas.
8. No reemplaces funcionalidad real con botones falsos, datos codificados directamente en la UI, TODO silenciosos o simulaciones no identificadas. Los únicos datos de muestra permitidos deben proceder del seed de desarrollo.
9. Conserva cualquier trabajo previo del repositorio. Haz cambios pequeños, coherentes y fáciles de revisar.
10. Continúa hasta entregar una aplicación ejecutable y validada. Si aparece un error, diagnostícalo, corrígelo y vuelve a ejecutar las comprobaciones relacionadas.

### 2. Stack técnico recomendado

Usa este stack salvo que el entorno existente justifique claramente otro equivalente. Documenta cualquier cambio:

- **Next.js con App Router + React + TypeScript estricto**.
- **PostgreSQL** como base de datos.
- **Prisma ORM** con migraciones y seed reproducible.
- **Auth.js** o una solución madura equivalente para autenticación segura.
- **Tailwind CSS + shadcn/ui/Radix** para componentes accesibles y un sistema visual consistente.
- **Motion/Framer Motion** para animaciones deliberadas y suaves.
- **React Hook Form + Zod** para formularios y validación compartida.
- **TanStack Table** para tablas potentes y accesibles.
- **Recharts** o equivalente para visualización de gastos.
- **date-fns** o equivalente para fechas, zonas horarias y recurrencias.
- Notificaciones por correo mediante una abstracción de proveedor (por ejemplo Resend en producción y captura/log seguro en desarrollo).
- Tareas programadas mediante una abstracción compatible con cron y despliegue; deben ser idempotentes y estar protegidas contra ejecuciones no autorizadas.
- **Vitest/Jest + Testing Library** para pruebas unitarias y de componentes.
- **Playwright** para pruebas end-to-end.
- **ESLint + Prettier**, comprobación de tipos y hooks/CI de calidad.
- **Docker Compose** para levantar aplicación y PostgreSQL localmente.
- **GitHub Actions** para lint, tipos, pruebas y build.

No añadas Redux, microservicios, colas externas ni infraestructura compleja si el problema no lo requiere. Prioriza una arquitectura modular, sencilla de operar y preparada para crecer.

### 3. Idioma, moneda, fechas y configuración regional

- La interfaz predeterminada debe estar en **español**, con arquitectura preparada para internacionalización y traducción futura al inglés.
- Moneda predeterminada: **DOP (peso dominicano)**, pero cada suscripción puede usar otra moneda.
- Permite elegir moneda base del usuario y muestra totales agrupados correctamente. No sumes monedas distintas como si fueran iguales.
- Implementa una capa de tasas de cambio/adaptador. En ausencia de API externa, permite tasas manuales con fecha y marca claramente los totales estimados.
- Zona horaria configurable; valor inicial sugerido: `America/Santo_Domingo`.
- Guarda fechas y horas con una estrategia consistente; presenta los vencimientos según la zona horaria del usuario.
- Formatos regionales correctos para moneda, número y fecha mediante `Intl`.

### 4. Usuarios, autenticación y seguridad de acceso

Implementa:

- Registro, inicio y cierre de sesión.
- Recuperación/cambio de contraseña mediante flujo seguro; en desarrollo puede utilizar el proveedor local de correo.
- Verificación de correo si el proveedor/configuración lo permite.
- Sesiones seguras y protección de todas las rutas y operaciones privadas.
- Perfil: nombre, correo, avatar opcional, moneda base, idioma, zona horaria, inicio de semana y preferencias de notificación.
- Cada usuario solo puede acceder a sus propios registros. Aplica autorización en el servidor, no únicamente ocultando elementos en la interfaz.
- Opción para exportar sus datos y eliminar su cuenta con confirmación reforzada.
- Datos de demostración separados y claramente identificados.

### 5. Modelo de suscripción

Cada suscripción debe soportar como mínimo:

- Nombre, proveedor/aplicación, descripción y notas.
- Categoría, etiquetas y color.
- Logo o icono: selección de icono, URL segura o carga validada si se implementa almacenamiento.
- Importe, moneda, impuestos incluidos/opcionales y costo efectivo.
- Frecuencia: semanal, mensual, bimestral, trimestral, semestral, anual y personalizada cada N días/semanas/meses/años.
- Fecha de inicio, próxima fecha de cobro/renovación, fecha del último pago y fecha de finalización opcional.
- Tipo: suscripción recurrente, prueba gratuita, contrato, cuota o compra recurrente.
- Estado: activa, prueba, pausada, cancelación programada, cancelada, vencida o archivada.
- Renovación automática sí/no y fecha límite recomendada para cancelar.
- Método de pago relacionado y últimos cuatro dígitos/alias; **nunca almacenar números completos de tarjeta, CVV ni secretos financieros**.
- Cuenta/perfil al que pertenece la suscripción, URL de gestión/cancelación y contacto de soporte.
- Número de licencias/asientos y costo por asiento cuando aplique.
- Nivel de prioridad/necesidad y valoración de utilidad.
- Avisos personalizados: múltiples anticipaciones, por ejemplo 30, 14, 7, 3 y 1 día antes, el mismo día y después de vencida.
- Campos de auditoría y borrado lógico/archivo cuando convenga.

Las reglas de recurrencia deben manejar correctamente meses de distinta duración, años bisiestos, cambios de zona horaria y fechas como el día 29, 30 o 31. Define y prueba explícitamente la política utilizada; por ejemplo, cobrar el último día válido del mes y conservar el día original para el siguiente ciclo.

### 6. Pagos, historial y presupuestos

- Registro de pagos reales por suscripción: fecha prevista, fecha pagada, importe, moneda, estado, método y nota.
- Estados de pago: previsto, pagado, omitido, fallido, reembolsado y cancelado.
- Al marcar un pago como realizado, calcula de forma segura la próxima fecha según la recurrencia, sin crear duplicados.
- Posibilidad de corregir un pago y recalcular previsiones sin destruir el historial.
- Presupuestos mensuales y anuales generales y opcionalmente por categoría.
- Alertas al alcanzar umbrales configurables del presupuesto.
- Comparación entre gasto previsto y real.
- Ahorro estimado por suscripciones canceladas y costo anual equivalente.

### 7. Métodos de pago y categorías

- CRUD de métodos de pago: efectivo, tarjeta, cuenta bancaria, PayPal, Apple/Google Pay u otro.
- Para tarjetas, guardar solo alias, marca, últimos cuatro dígitos, mes/año de expiración y color/icono.
- Avisar sobre métodos próximos a expirar.
- CRUD de categorías personalizadas, conservando un conjunto inicial útil: entretenimiento, productividad, desarrollo, educación, almacenamiento, finanzas, salud, telefonía/internet, hogar y otros.
- Impedir la eliminación accidental de categorías o métodos que estén en uso; ofrecer reasignación o archivo.

### 8. Dashboard principal

Construye un dashboard claro y útil que incluya:

- Saludo y resumen del período.
- Gasto previsto este mes, gasto anual equivalente, gasto real, presupuesto restante y ahorro por cancelaciones.
- Próximo cobro destacado y lista cronológica de próximas renovaciones.
- Suscripciones que requieren atención: prueba por terminar, método por expirar, pago fallido, renovación cercana y presupuesto excedido.
- Gráfica de gasto por mes y comparación con períodos anteriores.
- Distribución por categoría y listado de las suscripciones más costosas.
- Calendario mensual de cobros.
- Acciones rápidas para agregar suscripción, registrar pago, importar y revisar alertas.
- Filtros globales por período, categoría, estado, moneda y método de pago.
- Estados vacíos útiles, skeletons durante carga y mensajes claros de error/recuperación.

Los indicadores y gráficas deben derivarse de datos reales del servidor y tener una alternativa accesible en texto o tabla.

### 9. Pantallas y navegación

Incluye, como mínimo:

1. Landing o presentación breve para usuarios no autenticados.
2. Registro, inicio de sesión, recuperación de contraseña y onboarding.
3. Dashboard.
4. Lista de suscripciones con vista de tabla y tarjetas, búsqueda, filtros, orden, paginación y selección masiva.
5. Crear/editar suscripción mediante formulario excelente, con ayuda contextual y previsualización del próximo cobro.
6. Detalle de suscripción con resumen, historial, calendario, alertas y actividad.
7. Calendario general con vistas mensual/lista y navegación por teclado.
8. Pagos e historial.
9. Presupuestos y reportes.
10. Métodos de pago.
11. Categorías y etiquetas.
12. Centro de notificaciones.
13. Importación/exportación.
14. Perfil, apariencia, preferencias y seguridad.
15. Página 404, estados de error y páginas de carga coherentes.

La navegación debe funcionar bien en escritorio y móvil: sidebar plegable en escritorio y navegación/drawer apropiado en pantallas pequeñas. Incluye `command palette` o búsqueda rápida si mejora la experiencia.

### 10. Notificaciones y recordatorios

- Centro de notificaciones interno con leídas/no leídas, filtros y acciones.
- Recordatorios de renovación, fin de prueba, fecha límite de cancelación, pagos fallidos, presupuesto y vencimiento del método de pago.
- Preferencias por canal y tipo; correo e in-app como mínimo.
- Resumen semanal/mensual opcional.
- Job programado que busque eventos pendientes, respete zona horaria y preferencias, y evite envíos duplicados mediante claves idempotentes.
- Plantillas de correo responsive, claras y coherentes con la marca.
- Acciones para posponer o silenciar alertas específicas.
- Documenta cómo configurar el cron en desarrollo y producción y cómo probarlo manualmente de forma segura.

No implementes notificaciones web push salvo que puedas completarlas correctamente y sin degradar el resto. Déjalas como extensión documentada si no entran en la primera entrega.

### 11. Importación, exportación y datos

- Importación CSV con plantilla descargable, mapeo de columnas, vista previa, validación por fila, informe de errores y confirmación antes de guardar.
- Exportación CSV y JSON de suscripciones y pagos del usuario.
- Exportación de eventos de renovación en formato iCalendar (`.ics`).
- Evita duplicados mediante una estrategia documentada.
- Transacciones para operaciones que afecten múltiples registros.
- Seed con un usuario de desarrollo y datos realistas que demuestren: diferentes monedas, una prueba gratuita, renovación automática, cancelación programada, método por vencer y varios pagos históricos.

### 12. Diseño visual y experiencia

El diseño debe sentirse como un producto financiero moderno, elegante y confiable, no como un panel administrativo genérico.

- Define tokens de diseño: colores, tipografía, espaciado, radios, sombras, capas, duraciones y curvas de animación.
- Tema claro, oscuro y opción “usar sistema”, sin destellos incorrectos al cargar.
- Usa una paleta distintiva con excelente contraste; evita saturar la pantalla.
- Jerarquía visual fuerte, abundante espacio útil y densidad adaptable.
- Componentes consistentes: botones, inputs, selects, comboboxes, date pickers, tarjetas, tablas, badges, tooltips, dialogs, drawers, toasts y menús.
- Microinteracciones: hover/focus, entrada escalonada discreta, cambios de cifras, expansión de tarjetas, drawers y feedback al guardar.
- Transiciones entre 150 y 300 ms en acciones normales; evita animaciones lentas o decorativas que interfieran con el trabajo.
- Respeta `prefers-reduced-motion` y proporciona equivalentes sin movimiento.
- No sacrifiques rendimiento, legibilidad ni accesibilidad por efectos visuales.
- Diseño responsive real para 320 px, móvil común, tablet, portátil y pantallas amplias.
- Iconografía coherente y textos en español naturales; no uses lorem ipsum.

### 13. Accesibilidad

Cumple razonablemente **WCAG 2.2 AA**:

- HTML semántico, landmarks y encabezados correctos.
- Navegación completa por teclado, foco visible y gestión de foco en modales/drawers.
- Labels, descripciones y errores asociados correctamente.
- Contraste suficiente, objetivos táctiles adecuados y contenido que no dependa solo del color.
- Gráficas con resumen textual accesible.
- `aria-live` para confirmaciones importantes sin generar ruido.
- Pruebas automatizadas de accesibilidad en páginas críticas y revisión manual básica con teclado.

### 14. Backend, API y reglas de negocio

- Mantén la lógica crítica en módulos de dominio/servicios testeables, no incrustada en componentes visuales.
- Usa Server Actions o API routes de forma consistente; documenta la decisión.
- Valida toda entrada en el servidor con esquemas compartidos cuando sea seguro.
- Implementa paginación, filtros, ordenamiento y búsqueda en el servidor para listados grandes.
- Respuestas y errores tipados; mensajes seguros para el usuario y detalles útiles solo en logs.
- Transacciones para pagos, avance de recurrencia e importación.
- Índices de base de datos para usuario, estado, próxima fecha de cobro, categoría y consultas frecuentes.
- Restricciones únicas y claves idempotentes donde corresponda.
- Evita problemas N+1 y consultas innecesarias; no envíes al cliente datos privados que no necesita.
- Añade un registro de actividad relevante por suscripción: creación, edición, pago, pausa, cancelación y reactivación.

### 15. Seguridad y privacidad

- Sigue prácticas OWASP: protección contra XSS, CSRF según el mecanismo elegido, inyección, IDOR, open redirects y abuso de endpoints.
- Hash de contraseñas con algoritmo moderno si el proveedor de autenticación no lo gestiona.
- Cookies `httpOnly`, `secure` en producción y `sameSite` apropiado.
- Rate limiting en autenticación, recuperación de contraseña, importación y jobs sensibles; proporciona un adaptador local si el proveedor productivo no está configurado.
- Encabezados de seguridad y Content Security Policy compatible con la aplicación.
- Validación estricta de URL, archivos, MIME, tamaño y contenido importado.
- Secretos exclusivamente en variables de entorno; entrega `.env.example` sin valores reales.
- Logs estructurados sin contraseñas, tokens, números completos de tarjeta ni información sensible.
- Dependencias auditadas y superficie de ataque mínima.
- Incluye un breve modelo de amenazas en la documentación y registra las decisiones de seguridad importantes.

### 16. Rendimiento y calidad

- Objetivos razonables de Core Web Vitals y carga rápida del dashboard.
- Usa renderizado del servidor, caché y componentes cliente solo donde aporten valor.
- Evita paquetes pesados para tareas pequeñas.
- Optimiza imágenes/iconos y evita layout shifts.
- Debounce de búsqueda, paginación y virtualización si el volumen lo requiere.
- Manejo correcto de concurrencia: doble clic, reintentos, peticiones repetidas y ejecuciones simultáneas del cron no deben duplicar pagos o avisos.

### 17. Pruebas obligatorias

Escribe y ejecuta pruebas que cubran, como mínimo:

- Cálculo de próximas fechas para todas las frecuencias.
- Día 29/30/31, febrero y años bisiestos.
- Renovación automática, prueba gratuita, pausa, cancelación y vencimiento.
- Creación/edición/eliminación o archivo de suscripción.
- Registro de pago y prevención de duplicados.
- Avisos por anticipación, zona horaria e idempotencia.
- Autorización: un usuario jamás accede a datos de otro.
- Presupuestos y agregaciones por moneda.
- Importación CSV válida, parcialmente inválida y duplicada.
- Formularios y estados de error importantes.
- Flujos E2E: registro/login, onboarding, crear suscripción, ver dashboard, registrar pago, filtrar, exportar y cerrar sesión.
- Accesibilidad de las pantallas críticas.
- Build de producción.

No reduzcas las aserciones ni elimines pruebas para ocultar errores. Si una prueba revela un defecto, corrige la implementación.

### 18. Docker, despliegue y operación

- `docker-compose.yml` para aplicación y PostgreSQL, con healthchecks y volúmenes nombrados.
- Dockerfile multi-stage, usuario no root y build reproducible.
- Scripts claros para instalar, desarrollar, migrar, hacer seed, probar, construir y ejecutar.
- `.env.example` documentado y validación de variables de entorno al iniciar.
- Migraciones versionadas; no dependas de `db push` como estrategia de producción.
- CI en GitHub Actions con instalación bloqueada, lint, formato, tipos, pruebas, migración en DB temporal y build.
- README con despliegue recomendado (por ejemplo Vercel + PostgreSQL administrado o contenedor en VPS), cron, correo, backups y restauración.
- Endpoint de salud sin exposición de información sensible.
- Estrategia básica de logs, monitoreo y manejo de errores.

### 19. Documentación requerida

Crea y mantén:

- `README.md`: descripción, capturas si es viable, requisitos, instalación normal y con Docker, variables, migraciones, seed, pruebas y despliegue.
- `docs/ARCHITECTURE.md`: módulos, flujo de datos, decisiones y límites.
- `docs/DATA_MODEL.md`: entidades, relaciones, restricciones e índices, con diagrama Mermaid.
- `docs/RECURRENCE_RULES.md`: algoritmo y casos límite.
- `docs/SECURITY.md`: modelo de amenazas, controles y aspectos pendientes.
- `docs/NOTIFICATIONS.md`: arquitectura, cron, idempotencia y proveedores.
- `docs/TESTING.md`: estrategia y comandos.
- `docs/USER_GUIDE.md`: guía sencilla en español para una persona no técnica.
- `CHANGELOG.md` con la entrega inicial.

Comenta el código solo cuando explique una decisión no obvia. Prefiere nombres claros y documentación cercana a las reglas complejas.

### 20. Arquitectura mínima de datos

Diseña el esquema definitivo, pero contempla como mínimo entidades equivalentes a:

- `User`, `Account/Session` según autenticación.
- `UserSettings`.
- `Subscription`.
- `Category` y `Tag` con relación apropiada.
- `PaymentMethod`.
- `Payment`.
- `ReminderRule`.
- `Notification` y `NotificationDelivery` o equivalente para idempotencia.
- `Budget`.
- `ExchangeRate` o configuración equivalente.
- `ActivityLog`.
- Tokens de verificación/recuperación gestionados de forma segura.

Define `onDelete` conscientemente. Conserva historial financiero cuando corresponda y evita cascadas destructivas inesperadas.

### 21. Criterios de aceptación funcionales

La entrega solo se considera completa si:

1. Un usuario puede registrarse/iniciar sesión y solo ve sus datos.
2. Puede crear una suscripción con recurrencia, renovación automática, método, categoría y múltiples avisos.
3. El dashboard refleja inmediatamente los valores reales de esa suscripción.
4. El calendario muestra correctamente los próximos cobros.
5. Puede registrar un pago y la próxima fecha se calcula correctamente.
6. Un job genera una sola notificación por evento/regla aunque se ejecute varias veces.
7. Puede pausar, programar cancelación, cancelar, reactivar y archivar sin perder historial.
8. Puede buscar, filtrar, ordenar e importar/exportar datos.
9. La UI es completamente utilizable en móvil, teclado, modo claro y oscuro.
10. Lint, tipos, pruebas, E2E principales y build terminan correctamente.
11. El proyecto arranca desde cero siguiendo únicamente el README.
12. No existen secretos reales, errores críticos conocidos ni funcionalidades principales simuladas.

### 22. Fases de ejecución

Ejecuta el trabajo en este orden lógico, paralelizando tareas independientes:

1. **Descubrimiento:** inspección del repositorio y entorno; riesgos y preguntas realmente bloqueantes.
2. **Especificación:** arquitectura, decisiones técnicas, modelo de datos, mapa de pantallas, sistema visual y plan de pruebas.
3. **Fundación:** proyecto, herramientas, DB, autenticación, layout, tokens, CI y Docker.
4. **Vertical slice:** crear suscripción → verla en dashboard/calendario → registrar pago → recibir aviso.
5. **Expansión:** CRUD completos, filtros, presupuestos, reportes, métodos, categorías, importación/exportación y preferencias.
6. **Pulido visual:** responsive, temas, transiciones, estados vacíos/carga/error y accesibilidad.
7. **Fortalecimiento:** seguridad, concurrencia, idempotencia, rendimiento y casos límite.
8. **Validación:** lint, formato, tipos, pruebas, E2E, auditoría de dependencias y build.
9. **Documentación y entrega:** instrucciones verificadas desde un entorno limpio y resumen final.

Realiza commits pequeños y descriptivos si el repositorio Git está disponible y hacerlo no contradice instrucciones existentes. No publiques, despliegues ni hagas push a servicios externos sin autorización explícita.

### 23. Entrega final esperada

Cuando termines, responde con un informe conciso que contenga:

- Qué se construyó y cuáles son las funciones principales.
- Arquitectura y decisiones importantes.
- Estructura principal de carpetas.
- Cómo ejecutar con y sin Docker.
- Credenciales del usuario demo **solo si son de desarrollo y están documentadas en el seed**.
- Variables externas pendientes y cómo configurarlas.
- Comandos ejecutados y resultados de lint, tipos, pruebas y build.
- Cobertura o alcance real de pruebas, sin inventar resultados.
- Limitaciones conocidas y siguientes mejoras recomendadas.
- Archivos clave que debería revisar primero.

Antes de entregar, comprueba el estado real del repositorio y elimina archivos temporales. No afirmes que algo funciona si no lo ejecutaste. Si una validación no puede realizarse por una limitación objetiva del entorno, indica exactamente cuál, qué comprobaste en su lugar y el comando que debo ejecutar.

Comienza ahora: inspecciona el entorno, presenta el plan y la asignación de agentes de manera breve, y luego implementa el proyecto completo sin detenerte tras la planificación.

## FIN DEL PROMPT

---

## Uso recomendado

1. Crea una carpeta vacía para el proyecto y ábrela en Claude Code.
2. Activa el modo con permisos para crear archivos y ejecutar comandos dentro de esa carpeta.
3. Pega el prompt completo.
4. Revisa el plan inicial de Claude y responde únicamente si plantea una decisión realmente importante.
5. No agregues claves reales en el chat ni en el repositorio; colócalas después en el archivo `.env` local siguiendo `.env.example`.

