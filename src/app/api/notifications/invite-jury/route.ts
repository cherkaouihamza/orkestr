import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendJuryInviteEmail } from "@/lib/resend";

export async function POST(request: NextRequest) {
  try {
    const { email, firstName, eventId, eventName, token, locale = "fr" } = await request.json();

    if (!email || !eventId || !eventName || !token) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from("invitations").upsert({
      token,
      email,
      type: "jury",
      entity_id: eventId,
      role: "jury",
      invited_by: user?.id ?? "system",
    });

    const { data: event } = await supabase
      .from("events")
      .select("profiles!events_created_by_fkey(first_name, last_name)")
      .eq("id", eventId)
      .single();

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
