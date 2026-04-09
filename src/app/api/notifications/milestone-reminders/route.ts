import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendMilestoneReminderEmail, sendMilestoneOverdueEmail } from "@/lib/resend";

// Cron job: appelé par Vercel Cron toutes les heures
export async function GET(request: NextRequest) {
  // Vérifier l'autorisation (Vercel Cron secret)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createAdminClient();

  // Jalons qui ferment dans 48h (rappel)
  const in48h = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  const { data: upcomingMilestones } = await supabase
    .from("milestones")
    .select(`
      *,
      events(id, name),
      submissions(participant_id, team_id, status)
    `)
    .eq("status", "open")
    .gte("close_at", now)
    .lte("close_at", in48h);

  let remindersCount = 0;

  for (const milestone of upcomingMilestones ?? []) {
    const event = milestone.events as { id: string; name: string };

    // Participants sans soumission
    const { data: participants } = await supabase
      .from("participants")
      .select("id, email, first_name, preferred_locale:profiles(preferred_locale)")
      .eq("event_id", event.id)
      .in("status", ["active", "registered"]);

    const submittedParticipantIds = new Set(
      (milestone.submissions as Array<{ participant_id: string | null }>)
        ?.filter((s) => s.participant_id)
        .map((s) => s.participant_id)
    );

    for (const participant of participants ?? []) {
      if (!submittedParticipantIds.has(participant.id)) {
        const locale =
          ((participant as { preferred_locale?: { preferred_locale?: string } }).preferred_locale
            ?.preferred_locale as "fr" | "en") ?? "fr";

        await sendMilestoneReminderEmail({
          email: participant.email,
          firstName: participant.first_name,
          milestoneName: milestone.name,
          eventName: event.name,
          closeAt: milestone.close_at ?? "",
          eventId: event.id,
          locale,
        });
        remindersCount++;
      }
    }
  }

  // Jalons fermés J+1 avec non-soumissions
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: closedMilestones } = await supabase
    .from("milestones")
    .select(`*, events(id, name)`)
    .eq("status", "closed")
    .gte("close_at", yesterday)
    .lte("close_at", now);

  for (const milestone of closedMilestones ?? []) {
    const event = milestone.events as { id: string; name: string };

    const { data: participants } = await supabase
      .from("participants")
      .select("id, email, first_name")
      .eq("event_id", event.id)
      .in("status", ["active", "registered"]);

    const { data: milestoneSubmissions } = await supabase
      .from("submissions")
      .select("participant_id")
      .eq("milestone_id", milestone.id)
      .not("status", "eq", "not_submitted");

    const submittedIds = new Set(milestoneSubmissions?.map((s) => s.participant_id));

    for (const participant of participants ?? []) {
      if (!submittedIds.has(participant.id)) {
        await sendMilestoneOverdueEmail({
          email: participant.email,
          firstName: participant.first_name,
          milestoneName: milestone.name,
          eventName: event.name,
          eventId: event.id,
        });
        remindersCount++;
      }
    }
  }

  return NextResponse.json({ success: true, remindersCount });
}
