import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { EventSidebar } from "@/components/layout/Sidebar";
import { TeamsClient } from "@/components/events/TeamsClient";
import type { EventType } from "@/types/database";

export default async function TeamsPage({
  params,
}: {
  params: Promise<{ locale: string; eventId: string }>;
}) {
  const { locale, eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, name, type, settings")
    .eq("id", eventId)
    .single();

  if (!event || event.type !== "hackathon") notFound();

  const [{ data: teams }, { data: participants }] = await Promise.all([
    supabase
      .from("teams")
      .select(`*, team_members(participant_id, participants(id, first_name, last_name, email))`)
      .eq("event_id", eventId)
      .order("name"),
    supabase
      .from("participants")
      .select("id, first_name, last_name, email, status")
      .eq("event_id", eventId)
      .in("status", ["registered", "active"]),
  ]);

  return (
    <div className="flex gap-0">
      <EventSidebar locale={locale} eventId={eventId} eventType={event.type as EventType} />
      <div className="flex-1 p-6">
        <TeamsClient
          locale={locale}
          eventId={eventId}
          teams={teams ?? []}
          participants={participants ?? []}
        />
      </div>
    </div>
  );
}
