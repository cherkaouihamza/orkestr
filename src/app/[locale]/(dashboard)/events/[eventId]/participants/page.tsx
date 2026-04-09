import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { EventSidebar } from "@/components/layout/Sidebar";
import { ParticipantsClient } from "@/components/participants/ParticipantsClient";
import type { EventType } from "@/types/database";

interface ParticipantsPageProps {
  params: Promise<{ locale: string; eventId: string }>;
}

export default async function ParticipantsPage({ params }: ParticipantsPageProps) {
  const { locale, eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, name, type")
    .eq("id", eventId)
    .single();

  if (!event) notFound();

  const { data: participants } = await supabase
    .from("participants")
    .select(`
      *,
      team_members(
        team_id,
        teams(id, name)
      )
    `)
    .eq("event_id", eventId)
    .order("invited_at", { ascending: false });

  return (
    <div className="flex gap-0">
      <EventSidebar locale={locale} eventId={eventId} eventType={event.type as EventType} />
      <div className="flex-1 p-6">
        <ParticipantsClient
          locale={locale}
          eventId={eventId}
          eventName={event.name}
          participants={participants ?? []}
        />
      </div>
    </div>
  );
}
