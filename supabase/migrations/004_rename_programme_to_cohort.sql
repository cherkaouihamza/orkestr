-- Migration : renommage du type d'événement "programme" → "cohort"
-- À exécuter dans le Supabase Dashboard SQL Editor

UPDATE events SET type = 'cohort' WHERE type = 'programme';
