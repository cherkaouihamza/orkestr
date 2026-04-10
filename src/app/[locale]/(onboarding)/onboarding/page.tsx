"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Check,
  ChevronRight,
  Building2,
  Calendar,
  Users,
  Rocket,
} from "lucide-react";

// ─── Stepper 2 étapes ─────────────────────────────────────────────────────────

function Stepper({ current, labels }: { current: 1 | 2; labels: [string, string] }) {
  return (
    <div className="flex items-center justify-center mb-10">
      {([1, 2] as const).map((step, i) => (
        <div key={step} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all",
                current === step
                  ? "bg-accent border-accent text-white shadow-md"
                  : current > step
                  ? "bg-primary-900 border-primary-900 text-white"
                  : "bg-white border-neutral-300 text-neutral-400"
              )}
            >
              {current > step ? <Check className="h-4 w-4" /> : step}
            </div>
            <span
              className={cn(
                "text-xs font-medium hidden sm:block whitespace-nowrap",
                current === step
                  ? "text-accent"
                  : current > step
                  ? "text-primary-900"
                  : "text-neutral-400"
              )}
            >
              {labels[i]}
            </span>
          </div>
          {step < 2 && (
            <div
              className={cn(
                "h-px w-24 sm:w-32 mx-2 transition-colors",
                current > step ? "bg-primary-900" : "bg-neutral-300"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const t = useTranslations("onboarding");
  const tCommon = useTranslations("common");
  const fr = locale === "fr";

  const supabase = createClient();

  const [step, setStep] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [firstName, setFirstName] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name")
        .eq("id", user.id)
        .single();
      setFirstName(profile?.first_name ?? null);
    };
    loadProfile();
  }, []);

  // Étape 1 — Espace
  const [spaceName, setSpaceName] = useState("");
  const [spaceDescription, setSpaceDescription] = useState("");
  const [createdSpaceName, setCreatedSpaceName] = useState<string | null>(null);
  const [spaceError, setSpaceError] = useState(false);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleCreateSpace = async () => {
    setSpaceError(false);
    if (spaceName.trim().length < 2) {
      setSpaceError(true);
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const slug = slugify(spaceName.trim());

      const { data: space, error } = await supabase
        .from("spaces")
        .insert({
          name: spaceName.trim(),
          slug,
          description: spaceDescription.trim() || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        toast({ title: tCommon("errorOccurred"), variant: "destructive" });
        return;
      }

      await supabase.from("space_members").insert({
        space_id: space.id,
        user_id: user.id,
        email: user.email!,
        role: "space_owner",
        accepted_at: new Date().toISOString(),
      });

      setCreatedSpaceName(space.name);
      setStep(2);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    setCreatedSpaceName(null);
    setStep(2);
  };

  const handleFinish = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", user.id);

      router.push(`/${locale}/spaces`);
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="text-center mb-8">
        <span className="orkestr-logo text-3xl text-primary-900">
          ORKEST<span className="text-accent">R</span>
        </span>
      </div>

      {/* ── Bandeau de bienvenue ─────────────────────────────────────────── */}
      <div className="bg-primary-900 rounded-2xl px-6 py-5 mb-8 text-center">
        <p className="text-white font-sora font-bold text-lg leading-snug">
          {firstName
            ? `Hey ${firstName} ! 👋 ${t("welcome")}`
            : `${t("welcome")} 👋`}
        </p>
        <p className="text-white/70 text-sm mt-1">{t("welcomeSubtitle")}</p>
      </div>

      <Stepper current={step} labels={[t("step1.label"), t("step2.label")]} />

      {/* ── Étape 1 : Créer un espace ────────────────────────────────────── */}
      {step === 1 && (
        <Card className="shadow-lg border-0">
          <CardContent className="pt-8 pb-8 px-8">
            <div className="mb-6">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4">
                <Building2 className="h-6 w-6 text-primary-900" />
              </div>
              <h1 className="font-sora font-bold text-2xl text-primary-900 mb-1">
                {t("step1.title")}
              </h1>
              <p className="text-neutral-500 text-sm">{t("step1.subtitle")}</p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="spaceName">{t("step1.spaceName")} *</Label>
                <Input
                  id="spaceName"
                  placeholder={fr ? "Ex : Startup Weekend Lyon" : "E.g. Startup Weekend NYC"}
                  value={spaceName}
                  onChange={(e) => setSpaceName(e.target.value)}
                  className={spaceError ? "border-error" : ""}
                />
                {spaceError && (
                  <p className="text-xs text-error">{t("step1.nameError")}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="spaceDescription">
                  {t("step1.spaceDescription")}{" "}
                  <span className="text-neutral-400">({tCommon("optional")})</span>
                </Label>
                <Textarea
                  id="spaceDescription"
                  placeholder={fr ? "Décrivez votre organisation..." : "Describe your organization..."}
                  rows={3}
                  value={spaceDescription}
                  onChange={(e) => setSpaceDescription(e.target.value)}
                />
              </div>

              <Button
                onClick={handleCreateSpace}
                variant="accent"
                size="lg"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {t("step1.cta")}
              </Button>

              <button
                type="button"
                onClick={handleSkip}
                className="w-full text-center text-sm text-neutral-400 hover:text-neutral-600 transition-colors py-1"
              >
                {t("step1.skip")}
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Étape 2 : Vous êtes prêt ! ──────────────────────────────────── */}
      {step === 2 && (
        <Card className="shadow-lg border-0">
          <CardContent className="pt-8 pb-8 px-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Rocket className="h-8 w-8 text-success" />
              </div>
              <h1 className="font-sora font-bold text-2xl text-primary-900 mb-2">
                {t("step2.title")}
              </h1>
              {createdSpaceName ? (
                <p className="text-neutral-500 text-sm">
                  {t("step2.spaceCreated")}{" "}
                  <span className="font-semibold text-primary-900">{createdSpaceName}</span>{" "}
                  {t("step2.spaceCreatedSuffix")}
                </p>
              ) : (
                <p className="text-neutral-500 text-sm">{t("step2.noSpace")}</p>
              )}
            </div>

            <div className="space-y-3 mb-8">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
                {t("step2.nextStepsLabel")}
              </p>
              {[
                {
                  icon: <Calendar className="h-5 w-5 text-accent" />,
                  bg: "bg-orange-50",
                  title: t("step2.action1Title"),
                  desc: t("step2.action1Desc"),
                },
                {
                  icon: <Users className="h-5 w-5 text-blue-500" />,
                  bg: "bg-blue-50",
                  title: t("step2.action2Title"),
                  desc: t("step2.action2Desc"),
                },
                {
                  icon: <Building2 className="h-5 w-5 text-purple-500" />,
                  bg: "bg-purple-50",
                  title: t("step2.action3Title"),
                  desc: t("step2.action3Desc"),
                },
              ].map(({ icon, bg, title, desc }) => (
                <div
                  key={title}
                  className="flex items-start gap-3 p-3.5 rounded-xl bg-neutral-50 border border-neutral-200"
                >
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", bg)}>
                    {icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-800">{title}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-neutral-300 ml-auto flex-shrink-0 self-center" />
                </div>
              ))}
            </div>

            <Button
              onClick={handleFinish}
              variant="accent"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t("step2.cta")}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}
