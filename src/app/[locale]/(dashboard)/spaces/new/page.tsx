"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

const spaceSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
});

type SpaceForm = z.infer<typeof spaceSchema>;

export default function NewSpacePage({ params }: { params: Promise<{ locale: string }> }) {
  const t = useTranslations("spaces");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SpaceForm>({ resolver: zodResolver(spaceSchema) });

  const supabase = createClient();

  const onSubmit = async (data: SpaceForm) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const slug = slugify(data.name);

      const { data: space, error } = await supabase
        .from("spaces")
        .insert({
          name: data.name,
          slug,
          description: data.description || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error("Supabase error:", error);
        toast({ title: tCommon("errorOccurred"), variant: "destructive" });
        return;
      }

      // Ajouter l'utilisateur comme space_owner
      await supabase.from("space_members").insert({
        space_id: space.id,
        user_id: user.id,
        email: user.email!,
        role: "space_owner",
        accepted_at: new Date().toISOString(),
      });

      toast({ title: t("created") });
      router.push(`/${locale}/spaces/${space.id}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <Link
          href={`/${locale}/spaces`}
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-primary-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          {tCommon("back")}
        </Link>
        <h1 className="page-title">{t("create")}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("create")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">{t("name")} *</Label>
              <Input
                id="name"
                placeholder={t("namePlaceholder")}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-error">{tCommon("required")}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                {t("description")} <span className="text-neutral-400">({tCommon("optional")})</span>
              </Label>
              <Textarea
                id="description"
                placeholder={t("descriptionPlaceholder")}
                rows={3}
                {...register("description")}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" asChild className="flex-1">
                <Link href={`/${locale}/spaces`}>{tCommon("cancel")}</Link>
              </Button>
              <Button type="submit" variant="accent" className="flex-1" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {tCommon("create")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
