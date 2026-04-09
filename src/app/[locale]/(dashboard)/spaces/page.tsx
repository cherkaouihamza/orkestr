import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Plus, Building2, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface SpacesPageProps {
  params: Promise<{ locale: string }>;
}

export default async function SpacesPage({ params }: SpacesPageProps) {
  const { locale } = await params;
  const t = await getTranslations("spaces");
  const tEvents = await getTranslations("events");
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: spaces } = await supabase
    .from("spaces")
    .select(`
      *,
      space_members(*),
      events(id, status)
    `)
    .or(`created_by.eq.${user?.id},space_members.user_id.eq.${user?.id}`)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("title")}</h1>
          <p className="text-neutral-500 mt-1">
            {locale === "fr" ? "Gérez vos espaces de travail" : "Manage your workspaces"}
          </p>
        </div>
        <Button asChild variant="accent">
          <Link href={`/${locale}/spaces/new`}>
            <Plus className="mr-2 h-4 w-4" />
            {t("create")}
          </Link>
        </Button>
      </div>

      {!spaces || spaces.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-neutral-200 rounded-full flex items-center justify-center mb-4">
            <Building2 className="h-8 w-8 text-neutral-400" />
          </div>
          <h2 className="text-lg font-semibold text-neutral-700 mb-2">{t("noSpaces")}</h2>
          <p className="text-neutral-500 mb-6 max-w-sm">{t("noSpacesDescription")}</p>
          <Button asChild variant="accent">
            <Link href={`/${locale}/spaces/new`}>
              <Plus className="mr-2 h-4 w-4" />
              {t("create")}
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {spaces.map((space) => {
            const activeEvents =
              (space.events as Array<{ id: string; status: string }>)?.filter(
                (e) => e.status === "active"
              ).length ?? 0;
            const totalEvents =
              (space.events as Array<{ id: string; status: string }>)?.length ?? 0;
            const memberCount =
              (space.space_members as Array<{ id: string }>)?.length ?? 0;

            return (
              <Link key={space.id} href={`/${locale}/spaces/${space.id}`}>
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 bg-primary-900 rounded-xl flex items-center justify-center mb-3">
                        {space.logo_url ? (
                          <img
                            src={space.logo_url}
                            alt={space.name}
                            className="w-full h-full object-cover rounded-xl"
                          />
                        ) : (
                          <Building2 className="h-6 w-6 text-white" />
                        )}
                      </div>
                      {activeEvents > 0 && (
                        <Badge variant="success">
                          {activeEvents} {tEvents("statuses.active")}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-base">{space.name}</CardTitle>
                    {space.description && (
                      <CardDescription className="line-clamp-2">
                        {space.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-neutral-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {t("events", { count: totalEvents })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {t("members")} ({memberCount})
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-2">
                      {locale === "fr" ? "Créé le" : "Created"}{" "}
                      {formatDate(space.created_at, locale as "fr" | "en")}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
