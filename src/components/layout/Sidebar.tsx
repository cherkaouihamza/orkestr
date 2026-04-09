"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Building2,
  Calendar,
  Users,
  Trophy,
  Milestone,
  Settings,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  locale: string;
}

export function Sidebar({ locale }: SidebarProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const navItems = [
    {
      href: `/${locale}/spaces`,
      icon: Building2,
      label: t("spaces"),
    },
    {
      href: `/${locale}/settings`,
      icon: Settings,
      label: t("settings"),
    },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="w-64 flex-shrink-0 bg-white border-r border-neutral-300 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-neutral-300">
        <Link href={`/${locale}/spaces`}>
          <span className="orkestr-logo text-2xl text-primary-900">
            ORKEST<span className="text-accent">R</span>
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-hide">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn("sidebar-item", isActive(item.href) && "active")}
          >
            <item.icon className="h-4 w-4 flex-shrink-0" />
            <span>{item.label}</span>
            {isActive(item.href) && <ChevronRight className="ml-auto h-4 w-4 opacity-50" />}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-neutral-300">
        <p className="text-xs text-neutral-500 text-center">ORKESTR v0.1</p>
      </div>
    </aside>
  );
}

// Sidebar secondaire pour les événements
interface EventSidebarItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: number;
}

interface EventSidebarProps {
  locale: string;
  eventId: string;
  eventType: "hackathon" | "bootcamp" | "programme";
}

export function EventSidebar({ locale, eventId, eventType }: EventSidebarProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const base = `/${locale}/events/${eventId}`;

  const items: EventSidebarItem[] = [
    { href: `${base}/overview`, icon: LayoutDashboard, label: t("dashboard") },
    { href: `${base}/participants`, icon: Users, label: t("participants") },
    ...(eventType === "hackathon"
      ? [{ href: `${base}/teams`, icon: Trophy, label: t("teams") }]
      : []),
    { href: `${base}/milestones`, icon: Milestone, label: t("milestones") },
    ...(eventType === "hackathon"
      ? [{ href: `${base}/jury`, icon: Calendar, label: t("jury") }]
      : []),
    { href: `${base}/settings`, icon: Settings, label: t("settings") },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <div className="w-48 bg-neutral-100 border-r border-neutral-300 flex flex-col pt-4">
      <nav className="flex-1 px-2 space-y-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive(item.href)
                ? "bg-primary-900 text-white"
                : "text-neutral-600 hover:bg-neutral-200 hover:text-primary-900"
            )}
          >
            <item.icon className="h-4 w-4 flex-shrink-0" />
            <span>{item.label}</span>
            {item.badge != null && item.badge > 0 && (
              <span className="ml-auto bg-accent text-white text-xs rounded-full px-1.5 py-0.5">
                {item.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}
