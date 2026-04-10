import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");

  // Locale par défaut fr, peut être passé en param si besoin
  const locale = searchParams.get("locale") ?? "fr";

  if (!code) {
    return NextResponse.redirect(
      new URL(`/${locale}/login?error=auth`, request.url)
    );
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(
      new URL(`/${locale}/login?error=auth`, request.url)
    );
  }

  // Vérifie si l'onboarding est complété pour rediriger au bon endroit
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", data.user.id)
    .single();

  if (profile?.onboarding_completed === false) {
    return NextResponse.redirect(new URL(`/${locale}/onboarding`, request.url));
  }

  return NextResponse.redirect(new URL(`/${locale}/spaces`, request.url));
}
