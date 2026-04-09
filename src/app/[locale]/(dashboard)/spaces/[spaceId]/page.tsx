import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Plus, Calendar, Users, Trophy, Zap, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getEventStatusColor, formatDate } from "@/lib/utils";
import type { EventType, EventStatus } from "@/types/database";

interface SpacePageProps {
  params: Promise<{ locale: string; spaceId: string }>;
}

const EVENT_TYPE_ICONS: Record<EventType, React.ComponentType<{ className?: string }>> = {
  hackathon: Trophy,
  bootcamp: Zap,
  programme: LayoutGrid,
};

export default async function SpacePage({ params }: SpacePageProps) {
  const { locale, spaceId } = await params;
  const t = await getTranslations("events");
  const tSpaces = await getTranslations("spaces");
  const supabase = await createClient();

  const { data: space } = await supabase
    .from("spaces")
    .select(`*, space_members(*)`)
    .eq("id", spaceId)
    .single();

  if (!space) notFound();

  const { data: events } = await supabase
    .from("events")
    .select(`
      *,
      participants(count),
      teams(count),
      milestones(count)
    `)
    .eq("space_id", spaceId)
    .order("created_at", { ascending: false });

  const statusCounts = {
    active: events?.filter((e) => e.status === "active").length ?? 0,
    draft: events?.filter((e) => e.status === "draft").length ?? 0,
    completed: events?.filter((e) => e.status === "completed").length ?? 0,
  };

  return (
    <div>
      {/* En-tête */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{space.name}</h1>
          {space.description && (
            <p className="text-neutral-500 mt-1">{space.description}</p>
          )}
        </div>
        <Button asChild variant="accent">
          <Link href={`/${locale}/spaces/${spaceId}/events/new`}>
            <Plus className="mr-2 h-4 w-4" />
            {t("create")}
          </Link>
        </Button>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="stat-card">
          <p className="text-sm text-neutral-500 mb-1">{t("statuses.active")}</p>
          <p className="text-3xl font-bold text-success">{statusCounts.active}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-neutral-500 mb-1">{t("statuses.draft")}</p>
          <p className="text-3xl font-bold text-neutral-600">{statusCounts.draft}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-neutral-500 mb-1">{t("statuses.completed")}</p>
          <p className="text-3xl font-bold text-primary-900">{statusCounts.completed}</p>
        </div>
      </div>

      {/* Liste des événements */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-800">{t("title")}</h2>
      </div>

      {!events || events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-xl border border-neutral-300">
          <Calendar className="h-12 w-12 text-neutral-300 mb-4" />
          <h3 className="text-neutral-600 font-medium mb-2">{t("noEvents")}</h3>
          <p className="text-neutral-400 text-sm mb-6 max-w-xs">{t("noEventsDescription")}</p>
          <Button asChild variant="accent">
            <Link href={`/${locale}/spaces/${spaceId}/events/new`}>
              <Plus className="mr-2 h-4 w-4" />
              {t("create")}
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const Icon = EVENT_TYPE_ICONS[event.type as EventType];
            return (
              <Link
                key={event.id}
                href={`/${locale}/events/${event.id}/overview`}
              >
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                          <Icon className="h-5 w-5 text-primary-900" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-neutral-900">{event.name}</h3>
                            <span
                              className={`badge ${getEventStatusColor(event.status)}`}
                            >
                              {t(`statuses.${event.status as EventStatus}`)}
                            </span>
                            <span className="badge bg-neutral-100 text-neutral-600">
                              {t(`types.${event.type as EventType}`)}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-neutral-500">
                            {event.start_date && (
                              <span>{formatDate(event.start_date, locale as "fr" | "en")}</span>
                            )}
                            {event.end_date && (
                              <span>→ {formatDate(event.end_date, locale as "fr" | "en")}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-neutral-500">
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {t("participants", { count: (event.participants as Array<{count: number}>)?.[0]?.count ?? 0 })}
                        </span>
                        {event.type === "hackathon" && (
                          <span className="flex items-center gap-1">
                            <Trophy className="h-4 w-4" />
                            {t("teams", { count: (event.teams as Array<{count: number}>)?.[0]?.count ?? 0 })}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {t("milestones", { count: (event.milestones as Array<{count: number}>)?.[0]?.count ?? 0 })}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
