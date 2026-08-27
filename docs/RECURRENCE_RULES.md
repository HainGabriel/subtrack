# Reglas de recurrencia de facturación

Implementación: [`src/lib/domain/recurrence.ts`](../src/lib/domain/recurrence.ts). Pruebas: [`src/lib/domain/__tests__/recurrence.test.ts`](../src/lib/domain/__tests__/recurrence.test.ts) (18 casos).

## Modelo de fechas

Todas las fechas de facturación (`startDate`, `nextBillingDate`, `Payment.dueDate`) se tratan como **fechas de calendario puras** — año/mes/día en UTC, sin que el componente horario tenga significado. La aritmética de recurrencia (sumar meses, semanas, días) se hace exclusivamente sobre esos componentes UTC.

**Por qué:** sumar "un mes" o "una semana" a un instante con zona horaria es ambiguo y frágil frente a cambios de horario de verano. Modelar la fecha de cobro como un día de calendario (igual que "el 15 de cada mes" en la vida real) elimina esa clase entera de bugs. La zona horaria del usuario (`UserSettings.timezone`) se usa **solo** para:

1. **Formatear** fechas al mostrarlas (`Intl.DateTimeFormat` con `timeZone`).
2. **Decidir "qué día es hoy"** al generar recordatorios (el job de notificaciones compara el día de calendario en la zona del usuario contra la fecha de aviso calculada).

## Política para meses de distinta duración

Cada suscripción con frecuencia basada en meses (`MONTHLY`, `BIMONTHLY`, `QUARTERLY`, `SEMIANNUAL`, `ANNUAL`, o `CUSTOM` con unidad `MONTH`/`YEAR`) guarda un **`billingAnchorDay`**: el día de mes originalmente pactado (1-31), derivado de `startDate` al crear la suscripción y **nunca modificado automáticamente** después.

Al avanzar un ciclo:

1. Se toma el **mes y año** de la fecha de cobro actual (`nextBillingDate`).
2. Se le suman los meses del intervalo (1, 2, 3, 6 o 12, o el valor personalizado).
3. El día del ciclo siguiente es `min(billingAnchorDay, díasEnElMesDestino)`.

La clave: el día objetivo **siempre se deriva del anchor**, nunca del día ya recortado del ciclo anterior. Por eso un mes corto no "contamina" los ciclos siguientes:

```
Suscripción con anchor = 31 (creada el 31 de enero)
31 ene  →  28 feb (2026, no bisiesto; se recorta por ser el último día válido)
28 feb  →  31 mar (el anchor de 31 se recupera, NO se arrastra el 28)
```

Si en cambio se avanzara "sumando un mes" a la fecha ya recortada (28 feb + 1 mes = 28 mar), el día 31 se perdería para siempre — esta implementación evita exactamente eso.

## Casos probados explícitamente

| Caso | Resultado |
|---|---|
| 31 de enero, mensual | 28 feb (no bisiesto) o 29 feb (bisiesto) → 31 mar (anchor recuperado) |
| 29 de febrero (bisiesto), anual | 28 feb el año siguiente; vuelve a caer en 29 en el próximo año bisiesto |
| 30 de abril, mensual | 30 de mayo (abril de 30 días no afecta a un mes de 31) |
| 31 de diciembre, bimestral | 28/29 de febrero del año siguiente (cruce de año) |
| Frecuencia personalizada en días/semanas | Suma directa de días/semanas, sin noción de "anchor" (no aplica) |
| Frecuencia personalizada en meses/años | Misma política de anchor que las frecuencias fijas |

## Frecuencias soportadas

`WEEKLY` (7 días), `MONTHLY` (1 mes), `BIMONTHLY` (2 meses), `QUARTERLY` (3 meses), `SEMIANNUAL` (6 meses), `ANNUAL` (12 meses), `CUSTOM` (cada N días/semanas/meses/años, con `customIntervalCount` + `customIntervalUnit`).

## Costo anualizado

`annualizedOccurrences(input)` devuelve cuántas veces al año se cobra una suscripción (p. ej. 12 para mensual, 4 para trimestral), usado para:

- Costo anual equivalente en el panel.
- Normalizar el "gasto previsto mensual" de suscripciones con distinta frecuencia (`amount * ocurrenciasAnuales / 12`) — ver [`spend-aggregation.ts`](../src/lib/domain/spend-aggregation.ts).
- Ordenar suscripciones por costo real cuando tienen frecuencias distintas.
