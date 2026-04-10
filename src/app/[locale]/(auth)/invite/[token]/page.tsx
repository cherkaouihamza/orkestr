import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface InvitePageProps {
  params: Promise<{ locale: string; token: string }>;
  searchParams: Promise<{ role?: string; type?: string }>;
}

interface Invitation {
  token: string;
  accepted_at: string | null;
  expires_at: string;
  type: string;
  entity_id: string;
  email: string;
}

export default async function InvitePage({ params, searchParams }: InvitePageProps) {
  const { locale, token } = await params;
  const { type } = await searchParams;

  const supabase = await createClient();
  const adminSupabase = await createAdminClient();

  const { data: invitationRaw } = await (adminSupabase as any)
    .from("invitations")
    .select("*")
    .eq("token", token)
    .single();

  const invitation = invitationRaw as Invitation | null;

  if (!invitation || invitation.accepted_at) {
    return (
      <Card className="shadow-xl border-0">
        <CardHeader>
          <CardTitle>
            {locale === "fr" ? "Invitation invalide" : "Invalid invitation"}
          </CardTitle>
          <CardDescription>
            {locale === "fr"
              ? "Cette invitation est invalide ou a déjà été utilisée."
              : "This invitation is invalid or has already been used."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href={`/${locale}/login`}>
              {locale === "fr" ? "Se connecter" : "Login"}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return (
      <Card className="shadow-xl border-0">
        <CardHeader>
          <CardTitle>
            {locale === "fr" ? "Invitation expirée" : "Invitation expired"}
          </CardTitle>
          <CardDescription>
            {locale === "fr"
              ? "Ce lien d'invitation a expiré."
              : "This invitation link has expired."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href={`/${locale}/login`}>
              {locale === "fr" ? "Retour" : "Back"}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?redirectTo=/${locale}/invite/${token}`);
  }

  await (adminSupabase as any)
    .from("invitations")
    .update({ accepted_at: new Date().toISOString() } as any)
    .eq("token", token);

  if (invitation.type === "participant") {
    await (adminSupabase as any)
      .from("participants")
      .update({
        user_id: user.id,
        status: "registered",
        registered_at: new Date().toISOString(),
      } as any)
      .eq("event_id", invitation.entity_id)
      .eq("email", invitation.email);

    redirect(`/${locale}/my-events/${invitation.entity_id}`);
  } else if (invitation.type === "space_member") {
    await (adminSupabase as any)
      .from("space_members")
      .update({
        user_id: user.id,
        accepted_at: new Date().toISOString(),
      } as any)
      .eq("space_id", invitation.entity_id)
      .eq("email", invitation.email);

    redirect(`/${locale}/spaces`);
  } else if (invitation.type === "jury") {
    await (adminSupabase as any)
      .from("jury_members")
      .update({
        user_id: user.id,
        accepted_at: new Date().toISOString(),
      } as any)
      .eq("event_id", invitation.entity_id)
      .eq("email", invitation.email);

    redirect(`/${locale}/events/${invitation.entity_id}/jury`);
  }

  redirect(`/${locale}/spaces`);
}