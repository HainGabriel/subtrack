import {
  Clapperboard,
  Briefcase,
  Code,
  GraduationCap,
  Cloud,
  Landmark,
  HeartPulse,
  Wifi,
  Home,
  Shapes,
  Music,
  Gamepad2,
  Newspaper,
  Dumbbell,
  Utensils,
  Car,
  Plane,
  Baby,
  PawPrint,
  Palette,
  Camera,
  Box,
  CreditCard,
  Wallet,
  Banknote,
  Smartphone,
  Building2,
  type LucideIcon,
} from "lucide-react";

/**
 * Los campos `icon` de Subscription / Category / PaymentMethod guardan
 * el nombre del ícono como string (para no depender de React al
 * persistir). Este mapa es la única fuente de verdad entre el nombre
 * guardado y el componente de lucide-react a renderizar — tanto el
 * selector de íconos como cualquier vista que los muestre deben usarlo,
 * así nunca se desincronizan.
 */
export const ICON_MAP: Record<string, LucideIcon> = {
  clapperboard: Clapperboard,
  briefcase: Briefcase,
  code: Code,
  "graduation-cap": GraduationCap,
  cloud: Cloud,
  landmark: Landmark,
  "heart-pulse": HeartPulse,
  wifi: Wifi,
  home: Home,
  shapes: Shapes,
  music: Music,
  "gamepad-2": Gamepad2,
  newspaper: Newspaper,
  dumbbell: Dumbbell,
  utensils: Utensils,
  car: Car,
  plane: Plane,
  baby: Baby,
  "paw-print": PawPrint,
  palette: Palette,
  camera: Camera,
  box: Box,
  "credit-card": CreditCard,
  wallet: Wallet,
  banknote: Banknote,
  smartphone: Smartphone,
  "building-2": Building2,
};

export const ICON_NAMES = Object.keys(ICON_MAP);

export function resolveIcon(name: string | null | undefined): LucideIcon {
  return (name && ICON_MAP[name]) || Shapes;
}
