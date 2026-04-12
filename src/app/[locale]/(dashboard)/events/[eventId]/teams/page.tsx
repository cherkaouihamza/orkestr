import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { EventSidebar } from "@/components/layout/Sidebar";
import { TeamsClient } from "@/components/events/TeamsClient";
import { TeamsDisabled } from "@/components/events/TeamsDisabled";
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
    .select("id, name, type, settings, spaces(name)")
    .eq("id", eventId)
    .single();

  if (!event) notFound();

  const settings = event.settings as Record<string, unknown> | null;
  const teamsEnabled = settings?.teamsEnabled !== false;

  const [{ data: teams }, { data: participants }] = await Promise.all([
    supabase
      .from("teams")
      .select(`*, team_members(participant_id, participants(id, first_name, last_name, email))`)
      .eq("event_id", eventId)
      .order("name"),
    supabase
      .from("participants")
      .select("id, first_name, last_name, email, status")
      .eq("event_id", eventId),
  ]);

  return (
    <div className="flex gap-0">
      <EventSidebar locale={locale} eventId={eventId} eventType={event.type as EventType} />
      <div className="flex-1 p-6">
        {!teamsEnabled ? (
          <TeamsDisabled locale={locale} eventId={eventId} />
        ) : (
          <TeamsClient
            locale={locale}
            eventId={eventId}
            eventName={event.name}
            spaceName={(event.spaces as { name: string } | null)?.name ?? ""}
            teams={teams ?? []}
            participants={participants ?? []}
          />
        )}
      </div>
    </div>
  );
}
