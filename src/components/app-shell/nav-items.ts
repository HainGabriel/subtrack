import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Layers,
  CalendarDays,
  Receipt,
  PiggyBank,
  CreditCard,
  Tag,
  Bell,
  ArrowLeftRight,
  User,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/panel", label: "Panel", icon: LayoutDashboard },
  { href: "/suscripciones", label: "Suscripciones", icon: Layers },
  { href: "/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/pagos", label: "Pagos", icon: Receipt },
  { href: "/presupuestos", label: "Presupuestos", icon: PiggyBank },
  { href: "/metodos-pago", label: "Métodos de pago", icon: CreditCard },
  { href: "/categorias", label: "Categorías", icon: Tag },
  { href: "/notificaciones", label: "Notificaciones", icon: Bell },
  { href: "/importar-exportar", label: "Importar / Exportar", icon: ArrowLeftRight },
  { href: "/perfil", label: "Perfil", icon: User },
];
