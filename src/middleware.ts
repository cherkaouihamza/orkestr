import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { createServerClient } from "@supabase/ssr";

const intlMiddleware = createMiddleware(routing);

// Routes accessibles sans authentification
const publicRoutes = ["/", "/login", "/register", "/invite"];

function isPublicRoute(pathname: string): boolean {
  const strippedPath = pathname.replace(/^\/(fr|en)/, "") || "/";
  return publicRoutes.some(
    (route) => strippedPath === route || strippedPath.startsWith(`${route}/`)
  );
}

function strippedPathname(pathname: string): string {
  return pathname.replace(/^\/(fr|en)/, "") || "/";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes and static files
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const intlResponse = intlMiddleware(request);

  if (isPublicRoute(pathname)) {
    return intlResponse;
  }

  // ── Route protégée : créer le client Supabase ──────────────────────────────
  const response = intlResponse || NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Non authentifié → login
  if (!user) {
    const locale = pathname.split("/")[1] || "fr";
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const locale = pathname.split("/")[1] || "fr";
  const stripped = strippedPathname(pathname);

  // ── /onboarding : pas de redirection onboarding_completed ─────────────────
  // (l'user est auth et on le laisse passer librement sur cette route)
  if (stripped === "/onboarding") {
    return response;
  }

  // ── Toute autre route : vérifier onboarding_completed ─────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .single();

  if (profile?.onboarding_completed === false) {
    return NextResponse.redirect(new URL(`/${locale}/onboarding`, request.url));
  }

  // ── /spaces : rediriger vers /my-events si l'user n'est PAS organisateur ──
  // Un organisateur = membre d'un espace OU créateur d'un espace.
  // On vérifie les deux pour couvrir le cas d'un user qui a skippé la création
  // d'espace en onboarding (pas encore dans space_members).
  if (stripped === "/spaces") {
    const [{ count: memberCount }, { count: ownerCount }] = await Promise.all([
      supabase
        .from("space_members")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("spaces")
        .select("id", { count: "exact", head: true })
        .eq("created_by", user.id),
    ]);

    const isOrganizer = (memberCount ?? 0) > 0 || (ownerCount ?? 0) > 0;
    if (!isOrganizer) {
      return NextResponse.redirect(new URL(`/${locale}/my-events`, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
