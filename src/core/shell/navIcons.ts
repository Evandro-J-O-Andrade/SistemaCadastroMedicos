// src/core/shell/navIcons.ts
// Registro de ícones Lucide por nome (string vinda do banco). Apresentação, não autorização.
// Nomes desconhecidos caem em um ícone neutro (Circle), sem quebrar a renderização.
import {
  Home, LayoutDashboard, Building2, FileText, Stethoscope, CalendarClock,
  BarChart3, UserPlus, SlidersHorizontal, Users, Activity, Circle,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  Home,
  LayoutDashboard,
  Building2,
  FileText,
  Stethoscope,
  CalendarClock,
  BarChart3,
  UserPlus,
  SlidersHorizontal,
  Users,
  Activity,
};

export function iconFor(name: string | null | undefined): LucideIcon {
  if (!name) return Circle;
  return ICONS[name] ?? Circle;
}