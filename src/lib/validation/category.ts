import { z } from "zod";
import { ICON_NAMES } from "@/lib/icon-map";

/**
 * Paleta curada de 10 colores para categorías y métodos de pago. No es
 * exhaustiva — el campo `color` en base de datos acepta cualquier hex de
 * 6 dígitos — pero mantiene la UI consistente y evita un color-picker
 * libre que rompería el diseño.
 */
export const COLOR_SWATCHES = [
  "#6366f1", // indigo
  "#2a78d6", // azul
  "#1baf7a", // verde
  "#0ca30c", // verde oscuro
  "#eda100", // ámbar
  "#eb6834", // naranja
  "#d03b3b", // rojo
  "#e87ba4", // rosa
  "#4a3aa7", // violeta
  "#52514e", // gris
] as const;

const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Elige un color válido");

const iconSchema = z
  .string()
  .trim()
  .refine((v) => ICON_NAMES.includes(v), "Elige un ícono válido");

export const categorySchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(60, "Máximo 60 caracteres"),
  color: hexColorSchema,
  icon: iconSchema,
});
export type CategoryInput = z.infer<typeof categorySchema>;

export const deleteCategorySchema = z.object({
  categoryId: z.string().min(1),
  reassignToCategoryId: z.string().min(1).optional(),
});
export type DeleteCategoryInput = z.infer<typeof deleteCategorySchema>;
