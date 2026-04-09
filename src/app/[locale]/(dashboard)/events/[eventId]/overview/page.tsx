import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Users, Milestone, Trophy, CheckCircle2, Clock, AlertCircle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EventSidebar } from "@/components/layout/Sidebar";
import { getEventStatusColor, getMilestoneStatusColor, formatDate, calculateCompletionRate } from "@/lib/utils";
import type { EventType, EventStatus, MilestoneStatus } from "@/types/database";

interface EventOverviewProps {
  params: Promise<{ locale: string; eventId: string }>;
}

export default async function EventOverviewPage({ params }: EventOverviewProps) {
  const { locale, eventId } = await params;
  const t = await getTranslations("events");
  const tDash = await getTranslations("dashboard");
  const tMilestones = await getTranslations("milestones");
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select(`*, spaces(name, id)`)
    .eq("id", eventId)
    .single();

  if (!event) notFound();

  const [{ data: participants }, { data: milestones }, { data: submissions }] = await Promise.all([
    supabase.from("participants").select("id, status").eq("event_id", eventId),
    supabase.from("milestones").select("id, name, status, close_at").eq("event_id", eventId).order("order_index"),
    supabase.from("submissions").select("id, status, milestone_id").in(
      "milestone_id",
      (await supabase.from("milestones").select("id").eq("event_id", eventId)).data?.map(m => m.id) ?? []
    ),
  ]);

  const totalParticipants = participants?.length ?? 0;
  const activeParticipants = participants?.filter(p => p.status === "active").length ?? 0;
  const totalMilestones = milestones?.length ?? 0;
  const openMilestones = milestones?.filter(m => m.status === "open").length ?? 0;
  const submittedCount = submissions?.filter(s => s.status === "submitted" || s.status === "validated").length ?? 0;
  const completionRate = calculateCompletionRate(submittedCount, totalMilestones * Math.max(totalParticipants, 1));

  const activateEvent = async () => {
    "use server";
    const supabase = await createClient();
    await supabase.from("events").update({ status: "active" }).eq("id", eventId);
  };

  return (
    <div className="flex gap-0">
      <EventSidebar locale={locale} eventId={eventId} eventType={event.type as EventType} />

      <div className="flex-1 p-6">
        {/* En-tête */}
        <div className="page-header">
          <div>
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-1">
              <Link
                href={`/${locale}/spaces/${(event.spaces as { id: string; name: string })?.id}`}
                className="hover:text-primary-900"
              >
                {(event.spaces as { id: string; name: string })?.name}
              </Link>
              <span>/</span>
              <span>{event.name}</span>
            </div>
            <h1 className="page-title">{event.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className={`badge ${getEventStatusColor(event.status)}`}>
                {t(`statuses.${event.status as EventStatus}`)}
              </span>
              <span className="badge bg-neutral-100 text-neutral-600">
                {t(`types.${event.type as EventType}`)}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {event.status === "draft" && (
              <form action={activateEvent}>
                <Button type="submit" variant="accent">
                  {t("activate")}
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="stat-card">
            <div className="flex items-center gap-2 text-neutral-500 mb-2">
              <Users className="h-4 w-4" />
              <span className="text-sm">{tDash("totalParticipants")}</span>
            </div>
            <p className="text-3xl font-bold text-primary-900">{totalParticipants}</p>
            <p className="text-xs text-neutral-400 mt-1">{activeParticipants} actifs</p>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-2 text-neutral-500 mb-2">
              <Milestone className="h-4 w-4" />
              <span className="text-sm">{tDash("activeEvents")}</span>
            </div>
            <p className="text-3xl font-bold text-primary-900">{totalMilestones}</p>
            <p className="text-xs text-neutral-400 mt-1">{openMilestones} ouverts</p>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-2 text-neutral-500 mb-2">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm">{tDash("submitted")}</span>
            </div>
            <p className="text-3xl font-bold text-success">{submittedCount}</p>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-2 text-neutral-500 mb-2">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">{tDash("completionRate")}</span>
            </div>
            <p className="text-3xl font-bold text-primary-900">{completionRate}%</p>
            <Progress value={completionRate} className="mt-2 h-1.5" />
          </div>
        </div>

        {/* Jalons récents */}
        {milestones && milestones.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                {tMilestones("title")}
                <Link
                  href={`/${locale}/events/${eventId}/milestones`}
                  className="text-sm text-accent font-normal hover:underline"
                >
                  {locale === "fr" ? "Voir tout" : "View all"}
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {milestones.slice(0, 5).map((milestone) => {
                  const msSubmissions = submissions?.filter(s => s.milestone_id === milestone.id) ?? [];
                  const msSubmitted = msSubmissions.filter(s => s.status !== "not_submitted").length;
                  return (
                    <div
                      key={milestone.id}
                      className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        {milestone.status === "open" ? (
                          <Clock className="h-4 w-4 text-green-500" />
                        ) : milestone.status === "closed" ? (
                          <AlertCircle className="h-4 w-4 text-neutral-400" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-primary-900" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-neutral-900">{milestone.name}</p>
                          {milestone.close_at && (
                            <p className="text-xs text-neutral-400">
                              {formatDate(milestone.close_at, locale as "fr" | "en")}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-neutral-500">
                          {msSubmitted}/{totalParticipants}
                        </span>
                        <span
                          className={`badge ${getMilestoneStatusColor(milestone.status)}`}
                        >
                          {tMilestones(`statuses.${milestone.status as MilestoneStatus}`)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
