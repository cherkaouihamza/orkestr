"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Users2, Settings, Loader2 } from "lucide-react";

interface TeamsDisabledProps {
  locale: string;
  eventId: string;
}

export function TeamsDisabled({ locale, eventId }: TeamsDisabledProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleEnable = async () => {
    setIsLoading(true);
    try {
      // Read current settings first, then merge
      const { data: event } = await supabase
        .from("events")
        .select("settings")
        .eq("id", eventId)
        .single();

      const currentSettings = (event?.settings as Record<string, unknown>) ?? {};

      const { error } = await supabase
        .from("events")
        .update({ settings: { ...currentSettings, teamsEnabled: true } })
        .eq("id", eventId);

      if (error) {
        toast({
          title: locale === "fr" ? "Une erreur est survenue" : "An error occurred",
          variant: "destructive",
        });
        return;
      }

      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center max-w-md mx-auto">
      <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center mb-6">
        <Users2 className="h-8 w-8 text-neutral-400" />
      </div>
      <h2 className="text-lg font-semibold text-neutral-800 mb-2">
        {locale === "fr"
          ? "Gestion par équipes désactivée"
          : "Team management disabled"}
      </h2>
      <p className="text-sm text-neutral-500 mb-8 leading-relaxed">
        {locale === "fr"
          ? "La gestion par équipes n'est pas activée pour cet événement. Activez-la pour regrouper les participants en équipes."
          : "Team management is not enabled for this event. Enable it to group participants into teams."}
      </p>
      <div className="flex flex-col gap-3 w-full">
        <Button variant="accent" onClick={handleEnable} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Users2 className="h-4 w-4 mr-2" />
          )}
          {locale === "fr" ? "Activer les équipes" : "Enable teams"}
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/${locale}/events/${eventId}/settings`}>
            <Settings className="h-4 w-4 mr-2" />
            {locale === "fr" ? "Aller aux Paramètres" : "Go to Settings"}
          </Link>
        </Button>
      </div>
    </div>
  );
}
