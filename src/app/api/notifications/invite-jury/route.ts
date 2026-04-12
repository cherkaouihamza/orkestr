import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendJuryInviteEmail } from "@/lib/resend";

export async function POST(request: NextRequest) {
  try {
    const { email, firstName, eventId, eventName, token, locale = "fr" } = await request.json();

    if (!email || !eventId || !eventName || !token) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Client anon pour récupérer la session utilisateur
    const anonClient = await createClient();
    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Client admin pour les opérations DB privilégiées
    const supabase = await createAdminClient();

    // Vérification droits : l'user doit être space_owner ou space_member de l'espace de l'événement
    const { data: event } = await supabase
      .from("events")
      .select("space_id, profiles!events_created_by_fkey(first_name, last_name)")
      .eq("id", eventId)
      .single();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const { data: space } = await supabase
      .from("spaces")
      .select("created_by, space_members(user_id)")
      .eq("id", event.space_id)
      .single();

    const isOwner = space?.created_by === user.id;
    const isMember = (space?.space_members as Array<{ user_id: string }> | null)?.some(
      (m) => m.user_id === user.id
    );

    if (!isOwner && !isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await supabase.from("invitations").upsert({
      token,
      email,
      type: "jury",
      entity_id: eventId,
      role: "jury",
      invited_by: user.id,
    });

    const organizer = (event?.profiles as { first_name?: string; last_name?: string } | null);
    const organizerName = organizer
      ? `${organizer.first_name ?? ""} ${organizer.last_name ?? ""}`.trim()
      : "ORKESTR";

    const result = await sendJuryInviteEmail({
      email,
      firstName,
      eventName,
      organizerName,
      inviteToken: token,
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
