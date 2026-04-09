import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendParticipantInviteEmail } from "@/lib/resend";

export async function POST(request: NextRequest) {
  try {
    const { email, firstName, eventId, eventName, locale = "fr" } = await request.json();

    if (!email || !eventId || !eventName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createAdminClient();

    // Récupérer le token d'invitation
    const { data: participant } = await supabase
      .from("participants")
      .select("invite_token")
      .eq("event_id", eventId)
      .eq("email", email)
      .single();

    if (!participant?.invite_token) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }

    // Créer l'invitation en base
    const { data: { user } } = await supabase.auth.getUser();

    // Enregistrer l'invitation
    await supabase.from("invitations").upsert({
      token: participant.invite_token,
      email,
      type: "participant",
      entity_id: eventId,
      invited_by: user?.id ?? "system",
    });

    // Récupérer le nom de l'organisateur
    const { data: event } = await supabase
      .from("events")
      .select("name, created_by, profiles!events_created_by_fkey(first_name, last_name)")
      .eq("id", eventId)
      .single();

    const organizer = (event?.profiles as { first_name?: string; last_name?: string } | null);
    const organizerName = organizer
      ? `${organizer.first_name ?? ""} ${organizer.last_name ?? ""}`.trim()
      : "ORKESTR";

    const result = await sendParticipantInviteEmail({
      email,
      firstName,
      eventName,
      organizerName,
      inviteToken: participant.invite_token,
      locale: locale as "fr" | "en",
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
