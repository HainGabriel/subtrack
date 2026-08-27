import { z } from "zod";

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Ingresa tu nombre").max(80, "Máximo 80 caracteres"),
  image: z.string().trim().url("Ingresa una URL válida").optional().or(z.literal("")),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const preferencesSchema = z.object({
  baseCurrency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Elige una moneda válida"),
  timezone: z.string().trim().min(1, "Elige una zona horaria"),
  weekStartsOn: z.number().int().min(0).max(6),
  notifyEmail: z.boolean(),
  notifyInApp: z.boolean(),
  weeklySummary: z.boolean(),
  monthlySummary: z.boolean(),
});
export type PreferencesInput = z.infer<typeof preferencesSchema>;

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Ingresa tu contraseña"),
  emailConfirmation: z.string().trim().min(1, "Escribe tu correo para confirmar"),
});
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
