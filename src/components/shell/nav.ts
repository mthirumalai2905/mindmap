import {
  BookOpen,
  Boxes,
  CalendarDays,
  FlaskConical,
  LayoutDashboard,
  Library,
  Megaphone,
  Milestone,
  Network,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Two-key "g then x" shortcut. */
  key?: string;
}

export const NAV: NavItem[] = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard, key: "o" },
  { href: "/map", label: "Master Mind Map", icon: Network, key: "m" },
  { href: "/products", label: "Products", icon: Boxes, key: "p" },
  { href: "/content", label: "Content Library", icon: Library, key: "c" },
  { href: "/marketing", label: "PR & Marketing", icon: Megaphone, key: "k" },
  { href: "/research", label: "Research & Experiments", icon: FlaskConical, key: "r" },
  { href: "/universe", label: "Skalle Universe", icon: BookOpen, key: "u" },
  { href: "/roadmap", label: "Roadmap", icon: Milestone, key: "t" },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, key: "l" },
  { href: "/settings", label: "Settings", icon: Settings, key: "s" },
];

export function navLabel(segment: string): string | undefined {
  return NAV.find((n) => n.href === `/${segment}`)?.label;
}
