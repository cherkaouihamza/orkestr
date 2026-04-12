"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, MailCheck, User, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

const registerSchema = z
  .object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8),
    confirmPassword: z.string(),
    usageType: z.enum(["personal", "professional"]),
    organizationName: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "passwordMismatch",
    path: ["confirmPassword"],
  })
  .refine(
    (data) =>
      data.usageType !== "professional" ||
      (data.organizationName && data.organizationName.trim().length > 0),
    {
      message: "organizationNameRequired",
      path: ["organizationName"],
    }
  );

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const t = useTranslations("auth");
  const { locale } = useParams<{ locale: string }>();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [emailExists, setEmailExists] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { usageType: "personal" },
  });

  const usageType = watch("usageType");
  const supabase = createClient();

  const onSubmit = async (data: RegisterForm) => {
    setEmailExists(false);
    setIsLoading(true);
    try {
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error(error.message);
        return;
      }

      // Supabase retourne user.identities = [] quand l'email est déjà enregistré
      if (signUpData.user && signUpData.user.identities?.length === 0) {
        setEmailExists(true);
        return;
      }

      // Sauvegarde usage_type et organization_name dans profiles
      // En dev la session est disponible immédiatement ; en prod le trigger
      // handle_new_user() crée le profil, on update ensuite si session dispo
      if (signUpData.user && signUpData.session) {
        await supabase
          .from("profiles")
          .update({
            usage_type: data.usageType,
            organization_name: data.usageType === "professional" ? data.organizationName : null,
          })
          .eq("id", signUpData.user.id);
      }

      setRegisteredEmail(data.email);
      setEmailSent(true);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Écran de confirmation email ────────────────────────────────────────────
  if (emailSent) {
    return (
      <Card className="shadow-xl border-0">
        <CardContent className="pt-10 pb-10 px-8 text-center">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-5">
            <MailCheck className="h-8 w-8 text-success" />
          </div>
          <h2 className="font-sora font-bold text-xl text-primary-900 mb-2">
            {t("emailConfirmTitle")}
          </h2>
          <p className="text-neutral-500 text-sm leading-relaxed mb-1">
            {t("emailConfirmDescription")}
          </p>
          <p className="font-semibold text-primary-900 text-sm mb-6">{registeredEmail}</p>
          <p className="text-xs text-neutral-400">
            {t("emailConfirmHint")}{" "}
            <Link href={`/${locale}/login`} className="text-accent hover:underline">
              {t("login")}
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Formulaire d'inscription ───────────────────────────────────────────────
  return (
    <Card className="shadow-xl border-0">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">{t("createAccount")}</CardTitle>
        <CardDescription>{t("createAccountDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* Prénom / Nom */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="firstName">{t("firstName")}</Label>
              <Input id="firstName" placeholder="Jean" {...register("firstName")} />
              {errors.firstName && (
                <p className="text-xs text-error">{t("required" as never)}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">{t("lastName")}</Label>
              <Input id="lastName" placeholder="Dupont" {...register("lastName")} />
              {errors.lastName && (
                <p className="text-xs text-error">{t("required" as never)}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              type="email"
              placeholder="vous@exemple.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-error">{t("invalidEmail")}</p>
            )}
            {emailExists && (
              <p className="text-xs text-error">
                {t("emailAlreadyExists")}{" "}
                <Link href={`/${locale}/login`} className="underline font-medium">
                  {t("login")}
                </Link>
              </p>
            )}
          </div>

          {/* Mot de passe */}
          <div className="space-y-2">
            <Label htmlFor="password">{t("password")}</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register("password")}
            />
            <p className="text-xs text-neutral-500">{t("passwordRequirements")}</p>
            {errors.password && (
              <p className="text-xs text-error">{t("required" as never)}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-error">{t("passwordMismatch")}</p>
            )}
          </div>

          {/* Usage type */}
          <div className="space-y-2">
            <Label>{t("usageType")}</Label>
            <Controller
              name="usageType"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-3">
                  {(["personal", "professional"] as const).map((type) => {
                    const Icon = type === "personal" ? User : Building2;
                    const label = type === "personal" ? t("usagePersonal") : t("usageProfessional");
                    const selected = field.value === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => field.onChange(type)}
                        className={cn(
                          "relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center",
                          selected
                            ? "border-accent bg-orange-50"
                            : "border-neutral-200 hover:border-neutral-300 bg-white"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-6 w-6",
                            selected ? "text-accent" : "text-neutral-400"
                          )}
                        />
                        <span
                          className={cn(
                            "text-sm font-medium",
                            selected ? "text-accent" : "text-neutral-600"
                          )}
                        >
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            />
          </div>

          {/* Nom organisation (conditionnel) */}
          {usageType === "professional" && (
            <div className="space-y-2">
              <Label htmlFor="organizationName">
                {t("organizationName")} *
              </Label>
              <Input
                id="organizationName"
                placeholder={t("organizationNamePlaceholder")}
                {...register("organizationName")}
              />
              {errors.organizationName && (
                <p className="text-xs text-error">{t("organizationNameRequired")}</p>
              )}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {t("createAccount")}
          </Button>
        </form>

        <p className="text-center text-sm text-neutral-500 mt-4">
          {t("alreadyAccount")}{" "}
          <Link
            href={`/${locale}/login`}
            className="text-accent font-medium hover:underline"
          >
            {t("login")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
