import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";

/**
 * Formatea una marca de tiempo (con hora) en la zona horaria elegida por el
 * usuario, no en la del servidor. El servidor de producción corre en UTC
 * (Netlify Functions), así que sin esto cualquier hora mostrada quedaba
 * desfasada respecto a la hora local real del usuario.
 */
export function formatInUserTimezone(
  date: Date | string,
  timezone: string,
  pattern: string
): string {
  return formatInTimeZone(date, timezone, pattern, { locale: es });
}
