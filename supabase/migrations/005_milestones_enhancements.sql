-- ============================================================
-- 005 — Milestones enhancements
-- ============================================================

-- 1. Add settings JSONB to milestones (stores visible, etc.)
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}';

-- 2. Add milestone_id to notifications for reminder dedup
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS milestone_id UUID REFERENCES milestones(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_notifications_milestone_id ON notifications(milestone_id);

-- 3. Extend form_field_type enum with new types
ALTER TYPE form_field_type ADD VALUE IF NOT EXISTS 'number';
ALTER TYPE form_field_type ADD VALUE IF NOT EXISTS 'date';
ALTER TYPE form_field_type ADD VALUE IF NOT EXISTS 'radio';
ALTER TYPE form_field_type ADD VALUE IF NOT EXISTS 'rating';
