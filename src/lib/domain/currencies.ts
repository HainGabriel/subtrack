export interface CurrencyOption {
  code: string;
  name: string;
}

/**
 * Lista curada de monedas soportadas en los selects de la app. No es
 * exhaustiva (ISO 4217 tiene ~180 códigos) pero cubre los mercados más
 * relevantes para un usuario hispanohablante; el campo `currency` en
 * base de datos acepta cualquier código de 3 letras si se necesita otro.
 */
export const CURRENCIES: CurrencyOption[] = [
  { code: "DOP", name: "Peso dominicano" },
  { code: "USD", name: "Dólar estadounidense" },
  { code: "EUR", name: "Euro" },
  { code: "MXN", name: "Peso mexicano" },
  { code: "COP", name: "Peso colombiano" },
  { code: "ARS", name: "Peso argentino" },
  { code: "CLP", name: "Peso chileno" },
  { code: "PEN", name: "Sol peruano" },
  { code: "BRL", name: "Real brasileño" },
  { code: "GBP", name: "Libra esterlina" },
  { code: "CAD", name: "Dólar canadiense" },
  { code: "GTQ", name: "Quetzal guatemalteco" },
  { code: "CRC", name: "Colón costarricense" },
  { code: "PAB", name: "Balboa panameño" },
];

export const TIMEZONES = [
  "America/Santo_Domingo",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Mexico_City",
  "America/Bogota",
  "America/Lima",
  "America/Santiago",
  "America/Argentina/Buenos_Aires",
  "America/Sao_Paulo",
  "Europe/Madrid",
  "Europe/London",
  "UTC",
] as const;
