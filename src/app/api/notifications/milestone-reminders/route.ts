import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendMilestoneReminderEmail } from "@/lib/resend";

// Cron: 0 9 * * * — runs once daily at 9:00 UTC
// Sends reminders at J-7, J-3, J-1 before close_at, with dedup via notifications table

const REMINDER_WINDOWS = [
  { daysBeforeClose: 7, label: "7d" },
  { daysBeforeClose: 3, label: "3d" },
  { daysBeforeClose: 1, label: "1d" },
];

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createAdminClient();
  let remindersCount = 0;

  for (const window of REMINDER_WINDOWS) {
    const windowStart = new Date(Date.now() + (window.daysBeforeClose - 0.5) * 24 * 60 * 60 * 1000).toISOString();
    const windowEnd = new Date(Date.now() + (window.daysBeforeClose + 0.5) * 24 * 60 * 60 * 1000).toISOString();

    const { data: milestones } = await supabase
      .from("milestones")
      .select("id, name, event_id, close_at, events(id, name)")
      .eq("status", "open")
      .gte("close_at", windowStart)
      .lte("close_at", windowEnd);

    for (const milestone of milestones ?? []) {
      const event = milestone.events as { id: string; name: string } | null;
      if (!event) continue;

      // Get participants who haven't submitted
      const { data: participants } = await supabase
        .from("participants")
        .select("id, email, first_name, user_id")
        .eq("event_id", event.id)
        .in("status", ["active", "registered"]);

      const { data: submissions } = await supabase
        .from("submissions")
        .select("participant_id")
        .eq("milestone_id", milestone.id)
        .not("status", "eq", "not_submitted");

      const submittedIds = new Set((submissions ?? []).map((s) => s.participant_id));

      // Already-sent dedup: check notifications table
      const { data: alreadySent } = await supabase
        .from("notifications")
        .select("participant_id")
        .eq("milestone_id", milestone.id)
        .eq("type", "milestone_reminder")
        .like("body", `%${window.label}%`);

      const alreadySentIds = new Set((alreadySent ?? []).map((n) => n.participant_id));

      for (const participant of participants ?? []) {
        if (submittedIds.has(participant.id)) continue;
        if (alreadySentIds.has(participant.id)) continue;

        // Resolve locale from user profile
        let locale: "fr" | "en" = "fr";
        if (participant.user_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("preferred_locale")
            .eq("id", participant.user_id)
            .single();
          if (profile?.preferred_locale) locale = profile.preferred_locale as "fr" | "en";
        }

        const milestoneUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/my-events/${event.id}`;

        await sendMilestoneReminderEmail({
          email: participant.email,
          firstName: participant.first_name,
          milestoneName: milestone.name,
          eventName: event.name,
          closeAt: milestone.close_at ?? "",
          eventId: event.id,
          locale,
        });

        // Record in notifications to prevent duplicate sends
        await supabase.from("notifications").insert({
          participant_id: participant.id,
          event_id: event.id,
          milestone_id: milestone.id,
          type: "milestone_reminder",
          title: locale === "fr"
            ? `Rappel J-${window.daysBeforeClose} : ${milestone.name}`
            : `Reminder J-${window.daysBeforeClose}: ${milestone.name}`,
          body: `${window.label}|${milestoneUrl}`,
          email_sent_at: new Date().toISOString(),
        });

        remindersCount++;
      }
    }
  }

  return NextResponse.json({ success: true, remindersCount });
}
