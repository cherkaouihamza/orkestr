"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { Loader2, ArrowLeft, Trophy, Zap, Users2, Check } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import type { EventType } from "@/types/database";

const eventSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  type: z.enum(["hackathon", "bootcamp", "cohort"]),
  startDate: z.string().min(1, "required"),
  endDate: z.string().min(1, "required"),
  maxParticipants: z.coerce.number().int().min(1).optional(),
});

type EventForm = z.infer<typeof eventSchema>;

const EVENT_TYPES: Array<{
  value: EventType;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = [
  { value: "hackathon", icon: Trophy, color: "text-accent" },
  { value: "bootcamp", icon: Zap, color: "text-blue-500" },
  { value: "cohort", icon: Users2, color: "text-purple-500" },
];

export default function NewEventPage() {
  const t = useTranslations("events");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { locale, spaceId } = useParams<{ locale: string; spaceId: string }>();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<EventType>("hackathon");
  const [maxParticipants, setMaxParticipants] = useState<string>("");
  const [teamsEnabled, setTeamsEnabled] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<EventForm>({
    resolver: zodResolver(eventSchema),
    defaultValues: { type: "hackathon" },
  });

  const supabase = createClient();

  const onSubmit = async (data: EventForm) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: event, error } = await supabase
        .from("events")
        .insert({
          space_id: spaceId,
          name: data.name,
          description: data.description || null,
          type: data.type,
          status: "draft",
          start_date: data.startDate || null,
          end_date: data.endDate || null,
          settings: {
            teamsEnabled,
            ...(data.maxParticipants ? { maxParticipants: data.maxParticipants } : {}),
          },
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error("Event creation error:", error);
        toast({ title: tCommon("errorOccurred"), variant: "destructive" });
        return;
      }

      toast({ title: t("created") });
      router.push(`/${locale}/events/${event.id}/overview`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/${locale}/spaces/${spaceId}`}
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-primary-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          {tCommon("back")}
        </Link>
        <h1 className="page-title">{t("create")}</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Type d'événement */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("type")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {EVENT_TYPES.map(({ value, icon: Icon, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setSelectedType(value);
                    setValue("type", value);
                    setTeamsEnabled(value === "hackathon");
                  }}
                  className={cn(
                    "relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all text-center",
                    selectedType === value
                      ? "border-accent bg-orange-50"
                      : "border-neutral-200 hover:border-neutral-300 bg-white"
                  )}
                >
                  {selectedType === value && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                  <Icon className={cn("h-8 w-8", color)} />
                  <div>
                    <div className="font-medium text-sm text-neutral-900">
                      {t(`types.${value}`)}
                    </div>
                    <div className="text-xs text-neutral-500 mt-1">
                      {t(`typeDescriptions.${value}`)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Gestion par équipes */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  {t("teamsEnabled")}
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {t("teamsEnabledDescription")}
                </p>
              </div>
              <Switch
                checked={teamsEnabled}
                onCheckedChange={setTeamsEnabled}
              />
            </div>
          </CardContent>
        </Card>

        {/* Informations générales */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {locale === "fr" ? "Informations générales" : "General information"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("name")} *</Label>
              <Input
                id="name"
                placeholder={t("namePlaceholder")}
                {...register("name")}
              />
              {errors.name && <p className="text-xs text-error">{tCommon("required")}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                {t("description")}{" "}
                <span className="text-neutral-400">({tCommon("optional")})</span>
              </Label>
              <Textarea
                id="description"
                rows={3}
                {...register("description")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">{t("startDate")} *</Label>
                <Input id="startDate" type="datetime-local" {...register("startDate")} />
                {errors.startDate && <p className="text-xs text-error">{tCommon("required")}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">{t("endDate")} *</Label>
                <Input id="endDate" type="datetime-local" {...register("endDate")} />
                {errors.endDate && <p className="text-xs text-error">{tCommon("required")}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxParticipants">
                {t("maxParticipants")}{" "}
                <span className="text-neutral-400">({tCommon("optional")})</span>
              </Label>
              <Input
                id="maxParticipants"
                type="number"
                min={1}
                placeholder={t("maxParticipantsPlaceholder")}
                {...register("maxParticipants")}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="button" variant="outline" asChild className="flex-1">
            <Link href={`/${locale}/spaces/${spaceId}`}>{tCommon("cancel")}</Link>
          </Button>
          <Button type="submit" variant="accent" className="flex-1" disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {tCommon("create")}
          </Button>
        </div>
      </form>
    </div>
  );
}
