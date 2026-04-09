# ORKESTR — Contexte projet pour Claude Code

## Description
Plateforme SaaS de gestion opérationnelle de hackathons, bootcamps et programmes d'accompagnement.
Déployée sur **orkestr.me** (Vercel + GitHub).

## Stack technique
- **Framework** : Next.js 14 App Router + TypeScript strict
- **UI** : Tailwind CSS + shadcn/ui (composants dans `src/components/ui/`)
- **Backend** : Supabase (PostgreSQL + Auth + Storage + RLS)
- **Emails** : Resend (templates React dans `src/lib/resend/templates.tsx`)
- **i18n** : next-intl, routing `/fr/...` et `/en/...`
- **Déploiement** : Vercel

## Architecture des fichiers clés
```
src/
├── app/
│   ├── [locale]/
│   │   ├── (auth)/         → login, register, invite/[token]
│   │   ├── (dashboard)/    → organisateurs (spaces, events/[id]/*)
│   │   └── (participant)/  → portail participant (my-events/[id])
│   └── api/
│       └── notifications/  → invite-participant, invite-jury, milestone-reminders
├── components/
│   ├── ui/                 → shadcn components
│   ├── layout/             → Sidebar, Header, EventSidebar
│   ├── events/             → TeamsClient
│   ├── milestones/         → MilestonesClient
│   ├── participants/       → ParticipantsClient, ParticipantMilestoneCard
│   └── jury/               → JuryClient
├── lib/
│   ├── supabase/           → client.ts, server.ts, storage.ts
│   ├── resend/             → index.ts, templates.tsx
│   └── utils/              → index.ts (cn, formatDate, getInitials, downloadCSV...)
├── i18n/                   → routing.ts, request.ts, navigation.ts
├── middleware.ts            → Auth guard + i18n routing
└── types/
    └── database.ts         → Tous les types TypeScript (Database, Profile, Event...)
messages/
├── fr.json                 → Toutes les clés UI en français
└── en.json                 → Toutes les clés UI en anglais
supabase/
└── migrations/
    └── 001_init.sql        → Schéma complet (tables, RLS, fonctions, triggers)
```

## Hiérarchie fonctionnelle
```
Espace → Événements → Participants/Équipes → Jalons → Soumissions
```

## Rôles utilisateurs
- `space_owner` : propriétaire d'espace (tout)
- `space_manager` : droits délégués sur événements
- `jury` : notation uniquement sur événement assigné
- `participant` : portail isolé (jalons de son événement)

## Types d'événements
- **hackathon** : équipes, jury, grille de notation, jalons de dépôt
- **bootcamp** : suivi individuel, parcours par étapes
- **programme** : reporting périodique, KPIs sur plusieurs mois

## Design tokens
- Primaire : `#0F2D4A` (bleu nuit)
- Accent : `#F97316` (orange) — utilisé pour CTA principaux
- Neutre : `#F8FAFC`
- Succès : `#10B981`, Erreur : `#EF4444`
- Titres : font Sora, corps : Inter
- Logo : `ORKEST<span class="text-accent">R</span>`

## Variables d'environnement requises
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
NEXT_PUBLIC_APP_URL=https://orkestr.me
NEXT_PUBLIC_APP_NAME=ORKESTR
CRON_SECRET  (pour l'endpoint Vercel Cron)
```

## Supabase Storage Buckets à créer
- `avatars` (public)
- `space-logos` (public)
- `event-banners` (public)
- `submissions` (private, signed URLs)

## Conventions de code
- Composants serveur par défaut, `"use client"` uniquement si nécessaire
- Les pages dashboard sont des Server Components, les interactions sont dans des Client Components (*Client.tsx)
- RLS activé sur toutes les tables — utiliser `createAdminClient()` uniquement dans les API routes
- i18n : `useTranslations()` côté client, `getTranslations()` côté serveur
- Toujours utiliser `@/` pour les imports absolus

## Cron jobs (Vercel)
- `/api/notifications/milestone-reminders` → toutes les heures (rappels 48h + relances J+1)

## État actuel (session initiale)
Toute la structure de base a été créée :
- [x] Configuration (package.json, next.config, tailwind, tsconfig, eslint, prettier)
- [x] i18n (routing, messages FR/EN complets)
- [x] Schéma SQL Supabase complet avec RLS
- [x] Types TypeScript (database.ts)
- [x] Libs Supabase (client, server, storage) et Resend (templates emails FR/EN)
- [x] Middleware auth + i18n
- [x] Layouts (root, dashboard, auth, participant)
- [x] Composants UI de base (button, input, label, card, badge, dialog, select, textarea, toast...)
- [x] Sidebar + Header avec sélecteur de langue
- [x] Module Auth (login, register, invite/[token])
- [x] Module Espaces (liste, création, détail avec événements)
- [x] Module Événements (création avec choix de type, overview, settings)
- [x] Module Participants (liste, invitation, import CSV, export)
- [x] Module Équipes (création, ajout/retrait membres)
- [x] Module Jalons (CRUD complet avec types file/form/url/text)
- [x] Module Jury (invitation, critères, notation, classement)
- [x] Dashboard participant (jalons + soumissions inline)
- [x] API notifications (invite-participant, invite-jury, milestone-reminders cron)

## Prochaines étapes possibles
- Page de soumissions admin (validation/rejet par organisateur)
- Dashboard KPIs (recharts pour graphiques)
- Import/export CSV avancé
- Notifications in-app (vue /notifications)
- Page profil utilisateur
- Paramètres de l'espace (membres, logo)
- Tests E2E (Playwright)
