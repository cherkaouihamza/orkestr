"use client";

import { useState, useEffect } from "react";
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
  ChevronDown,
  Plus,
  Zap,
  BookOpen,
  Layers,
  PanelLeftOpen,
  PanelLeftClose,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Space, Event } from "@/types/database";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarProps {
  locale: string;
}

interface SidebarEvent {
  id: string;
  name: string;
  type: Event["type"];
  status: Event["status"];
  space_id: string;
}

interface SpaceWithEvents extends Space {
  events: SidebarEvent[];
}

const EVENT_TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  hackathon: Trophy,
  bootcamp: Zap,
  cohort: BookOpen,
  programme: BookOpen, // fallback for legacy DB rows
};

const STATUS_DOT: Record<Event["status"], string> = {
  active: "bg-success",
  draft: "bg-neutral-400",
  completed: "bg-neutral-400",
  archived: "bg-neutral-300",
};

// ── Sidebar principale ────────────────────────────────────────────────────────

export function Sidebar({ locale }: SidebarProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [spaces, setSpaces] = useState<SpaceWithEvents[]>([]);
  const [expandedSpaces, setExpandedSpaces] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState(true);

  const toggleCollapsed = () => setCollapsed((prev) => !prev);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: spacesData } = await supabase
        .from("spaces")
        .select("*")
        .order("created_at", { ascending: true });

      if (!spacesData) return;

      const spaceList = spacesData as Space[];

      const { data: eventsData } = await supabase
        .from("events")
        .select("id, name, type, status, space_id")
        .in("space_id", spaceList.map((s) => s.id))
        .order("created_at", { ascending: true });

      const events = (eventsData ?? []) as unknown as SidebarEvent[];

      const spaceMap: SpaceWithEvents[] = spaceList.map((space) => ({
        ...space,
        events: events.filter((e) => e.space_id === space.id),
      }));

      setSpaces(spaceMap);

      const activeSpaceId = spaceList.find((s) =>
        pathname.includes(`/spaces/${s.id}`)
      )?.id;
      if (activeSpaceId) {
        setExpandedSpaces(new Set([activeSpaceId]));
      }
    };

    load();
  }, [pathname]);

  const toggleSpace = (spaceId: string) => {
    setExpandedSpaces((prev) => {
      const next = new Set(prev);
      next.has(spaceId) ? next.delete(spaceId) : next.add(spaceId);
      return next;
    });
  };

  const isEventActive = (eventId: string) => pathname.includes(`/events/${eventId}`);
  const isSpaceActive = (spaceId: string) => pathname.includes(`/spaces/${spaceId}`);

  return (
    <TooltipProvider delayDuration={100}>
      <aside
        className={cn(
          "relative flex-shrink-0 bg-white border-r border-neutral-200 flex flex-col transition-all duration-200",
          collapsed ? "w-14" : "w-64"
        )}
      >
        {/* ── Header logo + toggle ────────────────────────────────────────── */}
        <div className="h-16 flex items-center border-b border-neutral-200 px-3 gap-2 flex-shrink-0">
          {collapsed ? (
            <Link
              href={`/${locale}/spaces`}
              className="flex-1 flex items-center justify-center"
            >
              <Layers className="h-6 w-6 text-primary-900" />
            </Link>
          ) : (
            <Link href={`/${locale}/spaces`} className="flex-1">
              <span className="orkestr-logo text-2xl text-primary-900">
                ORKEST<span className="text-accent">R</span>
              </span>
            </Link>
          )}
          <button
            onClick={toggleCollapsed}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-accent text-white flex-shrink-0 hover:opacity-90 transition-opacity"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* ── Navigation ───────────────────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto scrollbar-hide py-4">

          {/* Section ESPACES — header (expanded only) */}
          {!collapsed && (
            <div className="px-4 mb-1 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                {t("spaces")}
              </span>
              <Link
                href={`/${locale}/spaces/new`}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-neutral-100 text-neutral-400 hover:text-primary-900 transition-colors"
                title={t("newSpace")}
              >
                <Plus className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}

          {!collapsed && spaces.length === 0 && (
            <p className="px-4 py-2 text-xs text-neutral-400 italic">{t("noSpaces")}</p>
          )}

          {/* ── Mode EXPANDED ────────────────────────────────────────────── */}
          {!collapsed && (
            <ul className="space-y-0.5 px-2">
              {spaces.map((space) => {
                const isExpanded = expandedSpaces.has(space.id);
                const spaceActive = isSpaceActive(space.id);

                return (
                  <li key={space.id}>
                    <div
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer group transition-colors",
                        spaceActive
                          ? "bg-primary-50 text-primary-900"
                          : "text-neutral-600 hover:bg-neutral-100 hover:text-primary-900"
                      )}
                      onClick={() => toggleSpace(space.id)}
                    >
                      <Building2 className="h-4 w-4 flex-shrink-0 text-primary-900/70" />
                      <Link
                        href={`/${locale}/spaces/${space.id}`}
                        className="flex-1 text-sm font-medium truncate"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {space.name}
                      </Link>
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-neutral-400" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>

                    {isExpanded && (
                      <ul className="mt-0.5 space-y-0.5">
                        {space.events.length === 0 ? (
                          <li className="pl-8 pr-2 py-1.5 text-xs text-neutral-400 italic">
                            {t("noEvents")}
                          </li>
                        ) : (
                          space.events.map((event) => {
                            const Icon = EVENT_TYPE_ICON[event.type] ?? Calendar;
                            const active = isEventActive(event.id);

                            return (
                              <li key={event.id}>
                                <Link
                                  href={`/${locale}/events/${event.id}/overview`}
                                  className={cn(
                                    "flex items-center gap-2 pl-6 pr-2 py-1.5 rounded-lg text-sm transition-colors",
                                    active
                                      ? "bg-accent/10 text-accent font-medium"
                                      : "text-neutral-500 hover:bg-neutral-100 hover:text-primary-900"
                                  )}
                                >
                                  <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                                  <span className="flex-1 truncate">{event.name}</span>
                                  <span
                                    className={cn(
                                      "w-1.5 h-1.5 rounded-full flex-shrink-0",
                                      STATUS_DOT[event.status]
                                    )}
                                  />
                                </Link>
                              </li>
                            );
                          })
                        )}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {/* ── Mode COLLAPSED ───────────────────────────────────────────── */}
          {collapsed && (
            <ul className="space-y-1 px-1">
              {spaces.map((space) => {
                const spaceActive = isSpaceActive(space.id);

                return (
                  <li key={space.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          href={`/${locale}/spaces/${space.id}`}
                          className={cn(
                            "flex items-center justify-center w-10 h-10 mx-auto rounded-lg transition-colors",
                            spaceActive
                              ? "bg-primary-50 text-primary-900"
                              : "text-neutral-500 hover:bg-neutral-100 hover:text-primary-900"
                          )}
                        >
                          <Building2 className="h-5 w-5" />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right">{space.name}</TooltipContent>
                    </Tooltip>

                    {space.events.map((event) => {
                      const Icon = EVENT_TYPE_ICON[event.type] ?? Calendar;
                      const active = isEventActive(event.id);

                      return (
                        <Tooltip key={event.id}>
                          <TooltipTrigger asChild>
                            <Link
                              href={`/${locale}/events/${event.id}/overview`}
                              className={cn(
                                "flex items-center justify-center w-8 h-8 mx-auto rounded-lg transition-colors mt-0.5",
                                active
                                  ? "bg-accent/10 text-accent"
                                  : "text-neutral-400 hover:bg-neutral-100 hover:text-primary-900"
                              )}
                            >
                              <Icon className="h-4 w-4" />
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="right">{event.name}</TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </li>
                );
              })}
            </ul>
          )}
        </nav>

        {/* ── Bouton toggle bas ───────────────────────────────────────────── */}
        <div className="flex justify-center pb-3 flex-shrink-0">
          <button
            onClick={toggleCollapsed}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-accent text-white hover:opacity-90 transition-opacity"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="px-3 pb-3 border-t border-neutral-200 pt-3 flex-shrink-0">
          <p className="text-xs text-neutral-400 text-center">
            {collapsed ? "v0.1" : "ORKESTR v0.1"}
          </p>
        </div>
      </aside>
    </TooltipProvider>
  );
}

// ── Sidebar secondaire pour les événements ────────────────────────────────────

interface EventSidebarItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: number;
}

interface EventSidebarProps {
  locale: string;
  eventId: string;
  eventType: "hackathon" | "bootcamp" | "cohort";
}

export function EventSidebar({ locale, eventId, eventType }: EventSidebarProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const base = `/${locale}/events/${eventId}`;

  const items: EventSidebarItem[] = [
    { href: `${base}/overview`, icon: LayoutDashboard, label: t("dashboard") },
    { href: `${base}/participants`, icon: Users, label: t("participants") },
    { href: `${base}/teams`, icon: Trophy, label: t("teams") },
    { href: `${base}/milestones`, icon: Milestone, label: t("milestones") },
    ...(eventType === "hackathon"
      ? [{ href: `${base}/jury`, icon: Calendar, label: t("jury") }]
      : []),
    { href: `${base}/settings`, icon: Settings, label: t("settings") },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <div className="w-48 bg-neutral-100 border-r border-neutral-200 flex flex-col pt-4">
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
