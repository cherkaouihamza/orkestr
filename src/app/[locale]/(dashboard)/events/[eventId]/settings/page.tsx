"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { EventSidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import type { EventType, EventStatus } from "@/types/database";

interface EventSettingsPageProps {
  params: Promise<{ locale: string; eventId: string }>;
}

export default function EventSettingsPage({ params: paramsPromise }: EventSettingsPageProps) {
  const t = useTranslations("events");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [locale, setLocale] = useState("fr");
  const [eventId, setEventId] = useState("");
  const [event, setEvent] = useState<{
    id: string;
    name: string;
    description: string | null;
    type: EventType;
    status: EventStatus;
    start_date: string | null;
    end_date: string | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    paramsPromise.then(async ({ locale: l, eventId: id }) => {
      setLocale(l);
      setEventId(id);
      const { data } = await supabase
        .from("events")
        .select("id, name, description, type, status, start_date, end_date")
        .eq("id", id)
        .single();
      if (data) setEvent(data as typeof event);
    });
  }, []);

  const handleSave = async () => {
    if (!event) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("events")
        .update({
          name: event.name,
          description: event.description,
          status: event.status,
          start_date: event.start_date,
          end_date: event.end_date,
        })
        .eq("id", eventId);

      if (error) {
        toast({ title: tCommon("errorOccurred"), variant: "destructive" });
        return;
      }

      toast({ title: t("updated") });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t("deleteConfirm"))) return;
    setIsLoading(true);
    const { error } = await supabase.from("events").delete().eq("id", eventId);
    if (!error) {
      toast({ title: t("deleted") });
      router.push(`/${locale}/spaces`);
    } else {
      setIsLoading(false);
    }
  };

  if (!event) {
    return (
      <div className="flex gap-0">
        <EventSidebar locale={locale} eventId={eventId} eventType="hackathon" />
        <div className="flex-1 p-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-0">
      <EventSidebar locale={locale} eventId={eventId} eventType={event.type} />
      <div className="flex-1 p-6 max-w-2xl">
        <h1 className="page-title mb-6">{tCommon("settings")}</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">
              {locale === "fr" ? "Informations" : "Information"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t("name")}</Label>
              <Input
                value={event.name}
                onChange={(e) => setEvent((prev) => prev && { ...prev, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("description")}</Label>
              <Textarea
                rows={3}
                value={event.description ?? ""}
                onChange={(e) =>
                  setEvent((prev) => prev && { ...prev, description: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>{t("status")}</Label>
              <Select
                value={event.status}
                onValueChange={(v) =>
                  setEvent((prev) => prev && { ...prev, status: v as EventStatus })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{t("statuses.draft")}</SelectItem>
                  <SelectItem value="active">{t("statuses.active")}</SelectItem>
                  <SelectItem value="completed">{t("statuses.completed")}</SelectItem>
                  <SelectItem value="archived">{t("statuses.archived")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("startDate")}</Label>
                <Input
                  type="datetime-local"
                  value={event.start_date?.slice(0, 16) ?? ""}
                  onChange={(e) =>
                    setEvent(
                      (prev) =>
                        prev && {
                          ...prev,
                          start_date: e.target.value
                            ? new Date(e.target.value).toISOString()
                            : null,
                        }
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t("endDate")}</Label>
                <Input
                  type="datetime-local"
                  value={event.end_date?.slice(0, 16) ?? ""}
                  onChange={(e) =>
                    setEvent(
                      (prev) =>
                        prev && {
                          ...prev,
                          end_date: e.target.value
                            ? new Date(e.target.value).toISOString()
                            : null,
                        }
                    )
                  }
                />
              </div>
            </div>

            <Button variant="accent" onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {tCommon("save")}
            </Button>
          </CardContent>
        </Card>

        {/* Zone de danger */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-base text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {locale === "fr" ? "Zone de danger" : "Danger zone"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-500 mb-4">{t("deleteConfirm")}</p>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <Trash2 className="h-4 w-4 mr-2" />
              {tCommon("delete")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
