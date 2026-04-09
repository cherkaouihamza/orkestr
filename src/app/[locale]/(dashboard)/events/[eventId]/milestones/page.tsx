import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { EventSidebar } from "@/components/layout/Sidebar";
import { MilestonesClient } from "@/components/milestones/MilestonesClient";
import type { EventType } from "@/types/database";

export default async function MilestonesPage({
  params,
}: {
  params: Promise<{ locale: string; eventId: string }>;
}) {
  const { locale, eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, name, type")
    .eq("id", eventId)
    .single();

  if (!event) notFound();

  const { data: milestones } = await supabase
    .from("milestones")
    .select(`*, form_fields(*), submissions(id, status, participant_id, team_id)`)
    .eq("event_id", eventId)
    .order("order_index");

  const { data: participants } = await supabase
    .from("participants")
    .select("id")
    .eq("event_id", eventId);

  return (
    <div className="flex gap-0">
      <EventSidebar locale={locale} eventId={eventId} eventType={event.type as EventType} />
      <div className="flex-1 p-6">
        <MilestonesClient
          locale={locale}
          eventId={eventId}
          milestones={milestones ?? []}
          participantCount={participants?.length ?? 0}
        />
      </div>
    </div>
  );
}
