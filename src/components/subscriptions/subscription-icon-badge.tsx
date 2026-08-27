import { resolveIcon } from "@/lib/icon-map";

// resolveIcon es una búsqueda determinista en un mapa fijo de componentes ya
// existentes (ICON_MAP): nunca crea un componente nuevo, así que la
// advertencia del compilador de React sobre "componente creado durante el
// render" es un falso positivo en todo este archivo.
/* eslint-disable react-hooks/static-components */

export function SubscriptionIconBadge({ icon, color }: { icon: string; color: string }) {
  const Icon = resolveIcon(icon);
  return (
    <span
      className="flex size-12 shrink-0 items-center justify-center rounded-xl"
      style={{ backgroundColor: `${color}22`, color }}
    >
      <Icon className="size-6" aria-hidden="true" />
    </span>
  );
}
