import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface InvitePageProps {
  params: Promise<{ locale: string; token: string }>;
  searchParams: Promise<{ role?: string; type?: string }>;
}

export default async function InvitePage({ params, searchParams }: InvitePageProps) {
  const { locale, token } = await params;
  const { type } = await searchParams;

  const supabase = await createClient();
  const adminSupabase = await createAdminClient();

  // Récupérer l'invitation
  const { data: invitation } = await adminSupabase
    .from("invitations")
    .select("*")
    .eq("token", token)
    .single();

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

  // Vérifier si l'utilisateur est connecté
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Rediriger vers le login avec le token
    redirect(`/${locale}/login?redirectTo=/${locale}/invite/${token}`);
  }

  // Accepter l'invitation
  await adminSupabase
    .from("invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("token", token);

  // Traiter selon le type
  if (invitation.type === "participant") {
    await adminSupabase
      .from("participants")
      .update({
        user_id: user.id,
        status: "registered",
        registered_at: new Date().toISOString(),
      })
      .eq("event_id", invitation.entity_id)
      .eq("email", invitation.email);

    redirect(`/${locale}/my-events/${invitation.entity_id}`);
  } else if (invitation.type === "space_member") {
    await adminSupabase
      .from("space_members")
      .update({
        user_id: user.id,
        accepted_at: new Date().toISOString(),
      })
      .eq("space_id", invitation.entity_id)
      .eq("email", invitation.email);

    redirect(`/${locale}/spaces`);
  } else if (invitation.type === "jury") {
    await adminSupabase
      .from("jury_members")
      .update({
        user_id: user.id,
        accepted_at: new Date().toISOString(),
      })
      .eq("event_id", invitation.entity_id)
      .eq("email", invitation.email);

    redirect(`/${locale}/events/${invitation.entity_id}/jury`);
  }

  redirect(`/${locale}/spaces`);
}
