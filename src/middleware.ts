import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { createServerClient } from "@supabase/ssr";

const intlMiddleware = createMiddleware(routing);

const publicRoutes = ["/login", "/register", "/invite"];

function isPublicRoute(pathname: string): boolean {
  const strippedPath = pathname.replace(/^\/(fr|en)/, "") || "/";
  return publicRoutes.some(
    (route) => strippedPath === route || strippedPath.startsWith(`${route}/`)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for API routes and static files
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Handle i18n routing
  const intlResponse = intlMiddleware(request);

  // Check auth for protected routes
  const isPublic = isPublicRoute(pathname);
  if (!isPublic) {
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const locale = pathname.split("/")[1] || "fr";
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Redirection intelligente depuis la racine locale (/) ou /spaces
    const strippedPath = pathname.replace(/^\/(fr|en)/, "") || "/";
    if (strippedPath === "/" || strippedPath === "/spaces") {
      const locale = pathname.split("/")[1] || "fr";

      // Vérifier si l'user est membre d'un espace (organisateur)
      const { count } = await supabase
        .from("space_members")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (!count || count === 0) {
        // Pas membre d'un espace → participant → rediriger vers my-events
        return NextResponse.redirect(new URL(`/${locale}/my-events`, request.url));
      }

      // Organisateur sur la racine → rediriger vers /spaces
      if (strippedPath === "/") {
        return NextResponse.redirect(new URL(`/${locale}/spaces`, request.url));
      }
    }

    return response;
  }

  return intlResponse;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
