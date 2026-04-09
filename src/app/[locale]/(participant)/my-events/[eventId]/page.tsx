import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, Clock, AlertCircle, Calendar, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ParticipantMilestoneCard } from "@/components/participants/ParticipantMilestoneCard";
import { getMilestoneStatusColor, formatDateTime, calculateCompletionRate } from "@/lib/utils";
import type { MilestoneStatus, Milestone, FormField } from "@/types/database";

interface ParticipantEventPageProps {
  params: Promise<{ locale: string; eventId: string }>;
}

export default async function ParticipantEventPage({ params }: ParticipantEventPageProps) {
  const { locale, eventId } = await params;
  const t = await getTranslations("participant");
  const tMilestones = await getTranslations("milestones");
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  // Trouver le participant
  const { data: participant } = await supabase
    .from("participants")
    .select("*")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .single();

  if (!participant) notFound();

  const { data: event } = await supabase
    .from("events")
    .select("id, name, type, start_date, end_date")
    .eq("id", eventId)
    .single();

  if (!event) notFound();

  // Trouver l'équipe du participant (hackathon)
  const { data: teamMembership } = await supabase
    .from("team_members")
    .select("team_id, teams(id, name)")
    .eq("participant_id", participant.id)
    .single();

  // Jalons + soumissions
  const { data: milestones } = await supabase
    .from("milestones")
    .select(`*, form_fields(*)`)
    .eq("event_id", eventId)
    .in("status", ["open", "closed", "evaluated"])
    .order("order_index");

  const milestoneIds = milestones?.map((m) => m.id) ?? [];

  const teamId = (teamMembership?.teams as { id: string; name: string } | null)?.id;

  const { data: submissions } = await supabase
    .from("submissions")
    .select("*")
    .in("milestone_id", milestoneIds)
    .or(
      teamId
        ? `participant_id.eq.${participant.id},team_id.eq.${teamId}`
        : `participant_id.eq.${participant.id}`
    );

  const submittedCount = submissions?.filter(
    (s) => s.status === "submitted" || s.status === "validated"
  ).length ?? 0;

  const completionRate = calculateCompletionRate(submittedCount, milestones?.length ?? 0);

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <span className="text-sm text-neutral-500 mb-1 block">
          {locale === "fr" ? "Mon espace participant" : "My participant space"}
        </span>
        <h1 className="text-2xl font-bold text-primary-900 font-sora">{event.name}</h1>
        {teamMembership && (
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="default">
              {locale === "fr" ? "Équipe" : "Team"}:{" "}
              {(teamMembership.teams as { id: string; name: string })?.name}
            </Badge>
          </div>
        )}
      </div>

      {/* Progression globale */}
      <Card className="mb-6">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-neutral-700">
              {t("myMilestones")}
            </span>
            <span className="text-sm font-bold text-primary-900">
              {submittedCount}/{milestones?.length ?? 0}
            </span>
          </div>
          <Progress value={completionRate} className="h-2" />
          <p className="text-xs text-neutral-400 mt-1">{completionRate}% complété</p>
        </CardContent>
      </Card>

      {/* Jalons */}
      {!milestones || milestones.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-neutral-200">
          <Calendar className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
          <p className="text-neutral-500">{t("noMilestones")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {milestones.map((milestone) => {
            const submission = submissions?.find(
              (s) => s.milestone_id === milestone.id
            );
            return (
              <ParticipantMilestoneCard
                key={milestone.id}
                locale={locale}
                milestone={milestone as Milestone & { form_fields: FormField[] }}
                submission={submission ?? null}
                participantId={participant.id}
                teamId={teamId ?? null}
                eventId={eventId}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
