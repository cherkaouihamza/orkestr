import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { EventSidebar } from "@/components/layout/Sidebar";
import { JuryClient } from "@/components/jury/JuryClient";
import type { EventType } from "@/types/database";

export default async function JuryPage({
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

  if (!event || event.type !== "hackathon") notFound();

  const [{ data: juryMembers }, { data: criteria }, { data: teams }, { data: evaluations }] =
    await Promise.all([
      supabase.from("jury_members").select("*").eq("event_id", eventId),
      supabase
        .from("evaluation_criteria")
        .select("*")
        .eq("event_id", eventId)
        .order("order_index"),
      supabase
        .from("teams")
        .select("id, name, team_members(count)")
        .eq("event_id", eventId)
        .order("name"),
      supabase.from("evaluations").select("*").eq("event_id", eventId),
    ]);

  return (
    <div className="flex gap-0">
      <EventSidebar locale={locale} eventId={eventId} eventType={event.type as EventType} />
      <div className="flex-1 p-6">
        <JuryClient
          locale={locale}
          eventId={eventId}
          eventName={event.name}
          juryMembers={juryMembers ?? []}
          criteria={criteria ?? []}
          teams={teams ?? []}
          evaluations={evaluations ?? []}
        />
      </div>
    </div>
  );
}
