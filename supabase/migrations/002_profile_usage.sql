-- Migration : ajout des colonnes usage_type et organization_name sur profiles

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS usage_type TEXT NOT NULL DEFAULT 'personal'
    CHECK (usage_type IN ('personal', 'professional')),
  ADD COLUMN IF NOT EXISTS organization_name TEXT;
