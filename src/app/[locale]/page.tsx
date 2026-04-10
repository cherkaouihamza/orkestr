import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  Zap,
  LayoutGrid,
  ArrowRight,
  CheckCircle,
  Layers,
  Users,
  FileText,
  BarChart3,
  Globe,
  Sparkles,
} from "lucide-react";

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  const t = await getTranslations("landing");

  const hackathonFeatures = [
    t("features.hackathonFeature1"),
    t("features.hackathonFeature2"),
    t("features.hackathonFeature3"),
    t("features.hackathonFeature4"),
  ];

  const bootcampFeatures = [
    t("features.bootcampFeature1"),
    t("features.bootcampFeature2"),
    t("features.bootcampFeature3"),
    t("features.bootcampFeature4"),
  ];

  const programmeFeatures = [
    t("features.programmeFeature1"),
    t("features.programmeFeature2"),
    t("features.programmeFeature3"),
    t("features.programmeFeature4"),
  ];

  const freeFeatures = [
    t("pricing.freeFeature1"),
    t("pricing.freeFeature2"),
    t("pricing.freeFeature3"),
    t("pricing.freeFeature4"),
  ];

  const starterFeatures = [
    t("pricing.starterFeature1"),
    t("pricing.starterFeature2"),
    t("pricing.starterFeature3"),
    t("pricing.starterFeature4"),
    t("pricing.starterFeature5"),
  ];

  const proFeatures = [
    t("pricing.proFeature1"),
    t("pricing.proFeature2"),
    t("pricing.proFeature3"),
    t("pricing.proFeature4"),
    t("pricing.proFeature5"),
    t("pricing.proFeature6"),
  ];

  const steps = [
    {
      num: "1",
      icon: <Layers className="h-6 w-6 text-primary-900" />,
      bg: "bg-neutral-100",
      title: t("how.step1Title"),
      desc: t("how.step1Desc"),
    },
    {
      num: "2",
      icon: <FileText className="h-6 w-6 text-accent" />,
      bg: "bg-accent/10",
      title: t("how.step2Title"),
      desc: t("how.step2Desc"),
    },
    {
      num: "3",
      icon: <BarChart3 className="h-6 w-6 text-success" />,
      bg: "bg-success/10",
      title: t("how.step3Title"),
      desc: t("how.step3Desc"),
    },
  ];

  const stats = [
    {
      value: t("stats.stat1Value"),
      label: t("stats.stat1Label"),
      icon: <Zap className="h-5 w-5 text-accent" />,
    },
    {
      value: t("stats.stat2Value"),
      label: t("stats.stat2Label"),
      icon: <CheckCircle className="h-5 w-5 text-success" />,
    },
    {
      value: t("stats.stat3Value"),
      label: t("stats.stat3Label"),
      icon: <Users className="h-5 w-5 text-primary-300" />,
    },
  ];

  const otherLocale = locale === "fr" ? "en" : "fr";

  return (
    <div className="min-h-screen bg-white">
      {/* ─── HEADER ──────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="orkestr-logo text-xl text-primary-900">
            ORKEST<span className="text-accent">R</span>
          </div>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="gap-1.5 text-neutral-600 hover:text-primary-900">
              <Link href={`/${otherLocale}`}>
                <Globe className="h-4 w-4" />
                <span className="text-sm font-medium uppercase">{t("header.langSwitch")}</span>
              </Link>
            </Button>
            <div className="w-px h-4 bg-neutral-200" />
            <Button asChild variant="ghost" size="sm">
              <Link href={`/${locale}/login`}>{t("header.signIn")}</Link>
            </Button>
            <Button asChild variant="accent" size="sm">
              <Link href={`/${locale}/register`}>{t("header.getStarted")}</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* ─── HERO ─────────────────────────────────────────────────── */}
      <section className="bg-primary-900 pt-16 min-h-screen flex items-center relative overflow-hidden">
        <div className="absolute top-32 right-0 w-[600px] h-[600px] bg-accent opacity-5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary-700 opacity-30 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 py-24 relative">
          <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-4 py-1.5 mb-8">
            <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
            <span className="text-accent text-sm font-medium">{t("hero.badge")}</span>
          </div>

          <h1 className="font-sora font-bold text-5xl md:text-6xl lg:text-7xl text-white leading-[1.1] mb-6 max-w-4xl">
            {t("hero.titleStart")}{" "}
            <span className="text-accent">hackathons</span>,
            <br />
            {t("hero.titleEnd")}
          </h1>

          <p className="text-primary-200 text-xl md:text-2xl max-w-2xl mb-10 leading-relaxed">
            {t("hero.subtitle")}
          </p>

          <div className="flex flex-wrap gap-4">
            <Button asChild variant="accent" size="lg" className="text-base px-8 h-12">
              <Link href={`/${locale}/register`}>
                {t("hero.ctaPrimary")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="text-base px-8 h-12 bg-transparent border-white/25 text-white hover:bg-white/10 hover:text-white"
            >
              <a href="#features">{t("hero.ctaSecondary")}</a>
            </Button>
          </div>

          <div className="mt-14 flex flex-wrap items-center gap-6 text-primary-400 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              {t("hero.trustNoCreditCard")}
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              {t("hero.trustSetupTime")}
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              {t("hero.trustBilingue")}
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─────────────────────────────────────────────── */}
      <section id="features" className="py-24 bg-neutral-100 scroll-mt-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-sora font-bold text-4xl text-primary-900 mb-4">
              {t("features.title")}
            </h2>
            <p className="text-neutral-500 text-lg max-w-xl mx-auto">
              {t("features.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Hackathon */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-8 hover:shadow-lg transition-shadow group">
              <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-accent/15 transition-colors">
                <Trophy className="h-7 w-7 text-accent" />
              </div>
              <h3 className="font-sora font-bold text-xl text-primary-900 mb-3">Hackathon</h3>
              <p className="text-neutral-500 text-sm mb-6 leading-relaxed">
                {t("features.hackathonDesc")}
              </p>
              <ul className="space-y-2.5">
                {hackathonFeatures.map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-neutral-700">
                    <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Bootcamp */}
            <div className="bg-white rounded-2xl border-2 border-accent/30 p-8 hover:shadow-lg transition-shadow group relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-accent text-white text-xs font-semibold px-3 py-1 rounded-full">
                  {t("features.popularBadge")}
                </span>
              </div>
              <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-100 transition-colors">
                <Zap className="h-7 w-7 text-blue-500" />
              </div>
              <h3 className="font-sora font-bold text-xl text-primary-900 mb-3">Bootcamp</h3>
              <p className="text-neutral-500 text-sm mb-6 leading-relaxed">
                {t("features.bootcampDesc")}
              </p>
              <ul className="space-y-2.5">
                {bootcampFeatures.map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-neutral-700">
                    <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Programme */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-8 hover:shadow-lg transition-shadow group">
              <div className="w-14 h-14 bg-purple-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-purple-100 transition-colors">
                <LayoutGrid className="h-7 w-7 text-purple-500" />
              </div>
              <h3 className="font-sora font-bold text-xl text-primary-900 mb-3">Programme</h3>
              <p className="text-neutral-500 text-sm mb-6 leading-relaxed">
                {t("features.programmeDesc")}
              </p>
              <ul className="space-y-2.5">
                {programmeFeatures.map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-neutral-700">
                    <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-sora font-bold text-4xl text-primary-900 mb-4">
              {t("how.title")}
            </h2>
            <p className="text-neutral-500 text-lg">{t("how.subtitle")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            <div
              className="hidden md:block absolute h-px bg-neutral-200 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)]"
              style={{ top: "2rem" }}
              aria-hidden="true"
            />
            {steps.map(({ num, icon, bg, title, desc }) => (
              <div key={num} className="flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className={`w-16 h-16 ${bg} rounded-2xl flex items-center justify-center border border-neutral-200`}>
                    {icon}
                  </div>
                  <span className="absolute -top-2 -right-2 w-6 h-6 bg-primary-900 text-white text-xs font-bold rounded-full flex items-center justify-center font-sora">
                    {num}
                  </span>
                </div>
                <h3 className="font-sora font-semibold text-lg text-primary-900 mb-3">{title}</h3>
                <p className="text-neutral-500 text-sm leading-relaxed max-w-xs">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── STATS ────────────────────────────────────────────────── */}
      <section className="py-20 bg-primary-900">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-primary-800 rounded-2xl overflow-hidden">
            {stats.map(({ value, label, icon }) => (
              <div key={value} className="bg-primary-900 px-10 py-12 text-center">
                <div className="flex justify-center mb-4">{icon}</div>
                <div className="font-sora font-bold text-5xl text-accent mb-3">{value}</div>
                <div className="text-primary-300 text-sm leading-relaxed">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ──────────────────────────────────────────────── */}
      <section className="py-24 bg-neutral-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="font-sora font-bold text-4xl text-primary-900 mb-4">
              {t("pricing.title")}
            </h2>
            <p className="text-neutral-500 text-lg">{t("pricing.subtitle")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Plan Gratuit */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-8 flex flex-col hover:shadow-md transition-shadow">
              <div className="mb-6">
                <p className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">
                  {t("pricing.freeName")}
                </p>
                <div className="flex items-end gap-1.5 mb-3">
                  <span className="font-sora font-bold text-5xl text-primary-900">
                    {t("pricing.freePrice")}
                  </span>
                  <span className="text-neutral-400 mb-1.5">{t("pricing.freePeriod")}</span>
                </div>
                <p className="text-neutral-500 text-sm leading-relaxed">{t("pricing.freeDesc")}</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {freeFeatures.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-neutral-700">
                    <CheckCircle className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button asChild variant="default" size="lg" className="w-full">
                <Link href={`/${locale}/register`}>{t("pricing.freeCta")}</Link>
              </Button>
            </div>

            {/* Plan Starter — mis en avant */}
            <div className="bg-white rounded-2xl border-2 border-accent p-8 flex flex-col relative shadow-lg">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1.5 bg-accent text-white text-xs font-semibold px-3 py-1 rounded-full">
                  <Sparkles className="h-3 w-3" />
                  {t("pricing.starterBadge")}
                </span>
              </div>
              <div className="mb-6">
                <p className="text-sm font-semibold text-accent uppercase tracking-wide mb-3">
                  {t("pricing.starterName")}
                </p>
                <div className="flex items-end gap-1.5 mb-3">
                  <span className="font-sora font-bold text-5xl text-primary-900">
                    {t("pricing.starterPrice")}
                  </span>
                  <span className="text-neutral-400 mb-1.5">{t("pricing.starterPeriod")}</span>
                </div>
                <p className="text-neutral-500 text-sm leading-relaxed">{t("pricing.starterDesc")}</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {starterFeatures.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-neutral-700">
                    <CheckCircle className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                size="lg"
                className="w-full border-neutral-300 text-neutral-400 cursor-not-allowed opacity-60"
                disabled
              >
                {t("pricing.comingSoon")}
              </Button>
            </div>

            {/* Plan Pro */}
            <div className="bg-primary-900 rounded-2xl p-8 flex flex-col relative overflow-hidden hover:shadow-md transition-shadow">
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-accent opacity-10 rounded-full blur-2xl pointer-events-none" />
              <div className="mb-6 relative">
                <p className="text-sm font-semibold text-primary-300 uppercase tracking-wide mb-3">
                  {t("pricing.proName")}
                </p>
                <div className="flex items-end gap-1.5 mb-3">
                  <span className="font-sora font-bold text-5xl text-white">
                    {t("pricing.proPrice")}
                  </span>
                  <span className="text-primary-400 mb-1.5">{t("pricing.proPeriod")}</span>
                </div>
                <p className="text-primary-300 text-sm leading-relaxed">{t("pricing.proDesc")}</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1 relative">
                {proFeatures.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-primary-200">
                    <CheckCircle className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                size="lg"
                className="w-full bg-transparent border-primary-600 text-primary-300 cursor-not-allowed opacity-60"
                disabled
              >
                {t("pricing.comingSoon")}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA FINAL ────────────────────────────────────────────── */}
      <section className="py-24 bg-neutral-100">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="font-sora font-bold text-4xl text-primary-900 mb-4">
            {t("ctaSection.title")}
          </h2>
          <p className="text-neutral-500 text-lg mb-8 leading-relaxed">
            {t("ctaSection.subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild variant="accent" size="lg" className="text-base px-10 h-12">
              <Link href={`/${locale}/register`}>
                {t("ctaSection.primary")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-base px-8 h-12">
              <Link href={`/${locale}/login`}>{t("ctaSection.secondary")}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ───────────────────────────────────────────────── */}
      <footer className="bg-primary-900 border-t border-primary-800">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="orkestr-logo text-xl text-white">
              ORKEST<span className="text-accent">R</span>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-primary-400">
              <Link href={`/${locale}/login`} className="hover:text-white transition-colors">
                {t("footer.signIn")}
              </Link>
              <Link href={`/${locale}/register`} className="hover:text-white transition-colors">
                {t("footer.signUp")}
              </Link>
              <span className="text-primary-700" aria-hidden="true">|</span>
              <span className="text-primary-600 cursor-not-allowed">{t("footer.legal")}</span>
              <span className="text-primary-600 cursor-not-allowed">{t("footer.privacy")}</span>
            </nav>
            <p className="text-primary-600 text-sm whitespace-nowrap">{t("footer.copyright")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
