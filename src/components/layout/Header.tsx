"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getInitials } from "@/lib/utils";
import type { Profile } from "@/types/database";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut, User, Globe, Building2, UserCircle, Scale, ChevronDown, ArrowLeft } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type RoleType = "organizer" | "participant" | "jury";

interface RoleEntry {
  type: RoleType;
  label: string;
  context: string;
  href: string;
}

interface HeaderProps {
  locale: string;
  profile: Profile | null;
}

interface BreadcrumbItem {
  label: string;
  href?: string;
}

// ── Role config ───────────────────────────────────────────────────────────────

const ROLE_ICON: Record<RoleType, React.ComponentType<{ className?: string }>> = {
  organizer: Building2,
  participant: UserCircle,
  jury: Scale,
};

const ROLE_BADGE_CLASS: Record<RoleType, string> = {
  organizer: "bg-primary-900 text-white",
  participant: "bg-accent text-white",
  jury: "bg-amber-500 text-white",
};

const ROLE_LABEL_FR: Record<RoleType, string> = {
  organizer: "Organisateur",
  participant: "Participant",
  jury: "Jury",
};

const ROLE_LABEL_EN: Record<RoleType, string> = {
  organizer: "Organizer",
  participant: "Participant",
  jury: "Jury",
};

const LS_KEY = "orkestr_activeRole";

// ── Component ─────────────────────────────────────────────────────────────────

export function Header({ locale, profile }: HeaderProps) {
  const t = useTranslations("nav");
  const tAuth = useTranslations("auth");
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [roles, setRoles] = useState<RoleEntry[]>([]);
  const [activeRole, setActiveRole] = useState<RoleType | null>(null);

  const ROLE_LABEL = locale === "fr" ? ROLE_LABEL_FR : ROLE_LABEL_EN;

  const PAGE_LABELS: Record<string, string> = {
    overview: t("dashboard"),
    participants: t("participants"),
    teams: t("teams"),
    milestones: t("milestones"),
    jury: t("jury"),
    settings: t("settings"),
    new: locale === "fr" ? "Nouveau" : "New",
  };

  // ── Load roles ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const loadRoles = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const found: RoleEntry[] = [];

      // Organizer: owns a space or is a space_member
      const [{ data: ownedSpaces }, { data: memberSpaces }] = await Promise.all([
        supabase.from("spaces").select("id, name").eq("created_by", user.id).limit(1),
        supabase.from("space_members").select("spaces(id, name)").eq("user_id", user.id).limit(1),
      ]);

      const spaceName =
        (ownedSpaces?.[0]?.name) ??
        ((memberSpaces?.[0]?.spaces as { name: string } | null)?.name) ??
        "";

      if ((ownedSpaces?.length ?? 0) > 0 || (memberSpaces?.length ?? 0) > 0) {
        found.push({
          type: "organizer",
          label: ROLE_LABEL.organizer,
          context: spaceName,
          href: `/${locale}/spaces`,
        });
      }

      // Participant
      const { data: participantRows } = await supabase
        .from("participants")
        .select("id, event_id, events(name)")
        .eq("user_id", user.id)
        .limit(5);

      for (const row of participantRows ?? []) {
        const eventName = (row.events as { name: string } | null)?.name ?? "";
        found.push({
          type: "participant",
          label: ROLE_LABEL.participant,
          context: eventName,
          href: `/${locale}/my-events/${row.event_id}`,
        });
      }

      // Jury
      const { data: juryRows } = await supabase
        .from("jury_members")
        .select("id, event_id, events(name)")
        .eq("user_id", user.id)
        .limit(5);

      for (const row of juryRows ?? []) {
        const eventName = (row.events as { name: string } | null)?.name ?? "";
        found.push({
          type: "jury",
          label: ROLE_LABEL.jury,
          context: eventName,
          href: `/${locale}/events/${row.event_id}/jury`,
        });
      }

      setRoles(found);

      // Restore or default active role
      const saved = localStorage.getItem(LS_KEY) as RoleType | null;
      const validSaved = saved && found.some((r) => r.type === saved) ? saved : null;
      const defaultRole = found[0]?.type ?? null;
      setActiveRole(validSaved ?? defaultRole);
    };

    loadRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchRole = (role: RoleEntry) => {
    setActiveRole(role.type);
    localStorage.setItem(LS_KEY, role.type);
    router.push(role.href);
  };

  const switchToOrganizer = () => {
    const org = roles.find((r) => r.type === "organizer");
    if (org) switchRole(org);
  };

  // ── Breadcrumb ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const build = async () => {
      const segments = pathname.split("/").filter(Boolean).slice(1);

      if (segments.length === 0) { setBreadcrumbs([]); return; }

      if (segments[0] === "spaces") {
        if (segments.length === 1) {
          setBreadcrumbs([{ label: locale === "fr" ? "Mes espaces" : "My spaces" }]);
          return;
        }
        const spaceId = segments[1];
        const { data: space } = await supabase.from("spaces").select("name").eq("id", spaceId).single();
        const spaceName = space?.name ?? spaceId;

        if (segments.length === 2) {
          setBreadcrumbs([
            { label: locale === "fr" ? "Mes espaces" : "My spaces", href: `/${locale}/spaces` },
            { label: spaceName },
          ]);
          return;
        }
        const lastSeg = segments[segments.length - 1];
        setBreadcrumbs([
          { label: locale === "fr" ? "Mes espaces" : "My spaces", href: `/${locale}/spaces` },
          { label: spaceName, href: `/${locale}/spaces/${spaceId}` },
          { label: PAGE_LABELS[lastSeg] ?? lastSeg },
        ]);
        return;
      }

      if (segments[0] === "events" && segments[1]) {
        const eventId = segments[1];
        const { data: event } = await supabase
          .from("events")
          .select("name, space_id, spaces(name)")
          .eq("id", eventId)
          .single();
        const spaceName = (event?.spaces as { name: string } | null)?.name ?? "";
        const spaceId = event?.space_id;
        const eventName = event?.name ?? eventId;
        const lastSeg = segments[segments.length - 1];
        setBreadcrumbs([
          { label: spaceName, href: spaceId ? `/${locale}/spaces/${spaceId}` : undefined },
          { label: eventName, href: `/${locale}/events/${eventId}/overview` },
          { label: PAGE_LABELS[lastSeg] ?? lastSeg },
        ]);
        return;
      }

      if (segments[0] === "my-events" && segments[1]) {
        setBreadcrumbs([{ label: locale === "fr" ? "Mes événements" : "My events" }]);
        return;
      }

      setBreadcrumbs([]);
    };

    build();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // ── Auth ────────────────────────────────────────────────────────────────────

  const handleLogout = async () => {
    localStorage.removeItem(LS_KEY);
    await supabase.auth.signOut();
    router.push(`/${locale}/login`);
    router.refresh();
  };

  const switchLocale = (newLocale: string) => {
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPath);
  };

  const otherLocale = locale === "fr" ? "en" : "fr";
  const isMultiRole = roles.length > 1;
  const activeRoleEntry = roles.find((r) => r.type === activeRole) ?? null;
  const isNonOrgMode = activeRole === "participant" || activeRole === "jury";
  const organizerRole = roles.find((r) => r.type === "organizer");

  return (
    <>
      {/* ── Header bar ─────────────────────────────────────────────────────── */}
      <header className="h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-6 flex-shrink-0">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 min-w-0">
          {breadcrumbs.map((item, i) => {
            const isLast = i === breadcrumbs.length - 1;
            const isFirst = i === 0;
            return (
              <span key={i} className={`flex items-center gap-1.5 ${!isLast ? "hidden sm:flex" : ""}`}>
                {!isFirst && (
                  <span className="text-neutral-300 select-none hidden sm:inline">›</span>
                )}
                {isLast ? (
                  <span className="text-sm font-semibold text-neutral-900 truncate max-w-[160px]">
                    {item.label}
                  </span>
                ) : item.href ? (
                  <Link
                    href={item.href}
                    className="text-sm text-neutral-500 hover:text-primary-900 transition-colors truncate max-w-[160px]"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-sm text-neutral-500 truncate max-w-[160px]">{item.label}</span>
                )}
              </span>
            );
          })}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2 flex-shrink-0">

          {/* Language switcher */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => switchLocale(otherLocale)}
            className="gap-1.5 text-neutral-600 hover:text-primary-900"
          >
            <Globe className="h-4 w-4" />
            <span className="text-sm font-medium uppercase">{otherLocale}</span>
          </Button>

          {/* Role switcher — only when multi-role */}
          {isMultiRole && activeRoleEntry && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors">
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_BADGE_CLASS[activeRoleEntry.type]}`}>
                    {ROLE_LABEL[activeRoleEntry.type]}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="text-xs text-neutral-400 font-normal">
                  {locale === "fr" ? "Changer de rôle" : "Switch role"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {roles.map((role, i) => {
                  const Icon = ROLE_ICON[role.type];
                  const isActive = role.type === activeRole;
                  return (
                    <DropdownMenuItem
                      key={i}
                      onClick={() => switchRole(role)}
                      className={isActive ? "bg-neutral-100" : ""}
                    >
                      <div className="flex items-center gap-2.5 w-full">
                        <Icon className="h-4 w-4 text-neutral-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-900">
                            {ROLE_LABEL[role.type]}
                          </p>
                          {role.context && (
                            <p className="text-xs text-neutral-400 truncate">{role.context}</p>
                          )}
                        </div>
                        {isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                        )}
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-neutral-100 transition-colors">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-primary-900 text-white text-sm font-medium">
                    {getInitials(profile?.first_name, profile?.last_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium text-neutral-900 leading-none">
                    {profile?.first_name
                      ? `${profile.first_name} ${profile.last_name ?? ""}`
                      : profile?.email}
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5">{profile?.email}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                {profile?.first_name
                  ? `${profile.first_name} ${profile.last_name ?? ""}`
                  : profile?.email}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push(`/${locale}/settings/profile`)}>
                <User className="mr-2 h-4 w-4" />
                {t("profile")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                {tAuth("logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* ── Role banner ─────────────────────────────────────────────────────── */}
      {isNonOrgMode && organizerRole && (
        <div className="flex items-center justify-between bg-primary-900/5 border-b border-primary-900/10 px-6 py-1.5 flex-shrink-0">
          <div className="flex items-center gap-2">
            {activeRole === "participant" ? (
              <UserCircle className="h-3.5 w-3.5 text-accent" />
            ) : (
              <Scale className="h-3.5 w-3.5 text-amber-500" />
            )}
            <span className="text-xs text-neutral-600">
              {locale === "fr"
                ? `Vous naviguez en tant que ${ROLE_LABEL_FR[activeRole]} — ${activeRoleEntry?.context ?? ""}`
                : `Browsing as ${ROLE_LABEL_EN[activeRole]} — ${activeRoleEntry?.context ?? ""}`}
            </span>
          </div>
          <button
            onClick={switchToOrganizer}
            className="flex items-center gap-1 text-xs text-primary-900 font-medium hover:underline"
          >
            <ArrowLeft className="h-3 w-3" />
            {locale === "fr" ? "Retour organisateur" : "Back to organizer"}
          </button>
        </div>
      )}
    </>
  );
}
