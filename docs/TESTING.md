# Estrategia de pruebas

## Niveles

| Nivel | Herramienta | Qué cubre | Comando |
|---|---|---|---|
| Unitarias / dominio | Vitest | Lógica de negocio pura: recurrencia, dinero, agregaciones | `npm run test` |
| Componentes | Vitest + Testing Library | Formularios y componentes interactivos clave | `npm run test` |
| End-to-end | Playwright | Flujos completos contra la app real + PostgreSQL | `npm run test:e2e` |
| Estático | ESLint + `tsc --noEmit` | Errores de tipo, reglas de React/hooks, accesibilidad básica de JSX | `npm run lint` / `npm run typecheck` |
| Build | `next build` | La app compila y optimiza para producción sin errores | `npm run build` |

## Por qué Vitest y no Jest

El proyecto usa Vite/Turbopack en el resto de la cadena de herramientas y ESM nativo; Vitest comparte configuración de resolución de módulos (alias `@/*`) sin la capa de transformación adicional que necesitaría Jest en un proyecto ESM-first, y arranca sensiblemente más rápido en modo watch.

## Motor de recurrencia — cobertura obligatoria

`src/lib/domain/__tests__/recurrence.test.ts` (18 casos) cubre explícitamente, como exige el encargo:

- Las 7 frecuencias (semanal, mensual, bimestral, trimestral, semestral, anual, personalizada en días/semanas/meses/años).
- Día 31 cayendo en un mes de 28/29/30 días, con recuperación del `anchorDay` en el ciclo siguiente.
- 29 de febrero en año bisiesto, tanto el año siguiente (no bisiesto) como el próximo año bisiesto.
- Cruce de fin de año (bimestral desde diciembre).
- Ausencia de `customIntervalUnit` en frecuencia `CUSTOM` → error explícito.

Ver [RECURRENCE_RULES.md](./RECURRENCE_RULES.md) para la política detallada.

## Dinero y multi-moneda

`src/lib/domain/__tests__/money.test.ts` cubre suma decimal sin errores de coma flotante, agrupación por moneda (nunca mezclar monedas distintas) y formateo con `Intl`.

## Autorización

Todo flujo E2E de una sola cuenta implícitamente ejercita `requireUser()` (sin sesión, cualquier ruta protegida redirige a `/iniciar-sesion`). El caso "un usuario nunca accede a datos de otro" se prueba explícitamente en el flujo E2E `e2e/authorization.spec.ts`: se crean dos usuarios, se crea una suscripción con el primero, y se verifica que el segundo no puede verla ni operarla (ni por navegación directa a `/suscripciones/{id}`, ni intentando invocar la Server Action correspondiente).

## Flujos E2E cubiertos

Ver `e2e/*.spec.ts`. Como mínimo: registro → onboarding → crear suscripción → verla reflejada en el panel → registrar un pago → ver el historial actualizado → filtrar el listado → exportar datos → cerrar sesión; y el caso de autorización cruzada entre dos usuarios descrito arriba.

## Accesibilidad

Las pantallas críticas (login, registro, crear suscripción, panel) se revisan manualmente por teclado (tab/shift+tab, foco visible, envío de formularios con Enter, cierre de diálogos con Escape) como parte de la validación final — no hay una herramienta de auditoría automatizada (tipo `axe-core`) integrada en esta entrega; queda como mejora recomendada en el README.

## Ejecutar todo localmente

```bash
npm run lint
npm run typecheck
npm run test:coverage
docker compose up -d db
npx prisma migrate deploy
npx prisma db seed
npm run build
npm run test:e2e
```

CI (`.github/workflows/ci.yml`) ejecuta exactamente esta secuencia contra un PostgreSQL efímero en cada push/PR a `main`.
