-- ============================================================
-- ORKESTR - Schéma initial de base de données
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TYPES ENUM
-- ============================================================

CREATE TYPE user_role AS ENUM ('space_owner', 'space_manager', 'jury', 'participant');
CREATE TYPE event_type AS ENUM ('hackathon', 'bootcamp', 'programme');
CREATE TYPE event_status AS ENUM ('draft', 'active', 'completed', 'archived');
CREATE TYPE participant_status AS ENUM ('invited', 'registered', 'active', 'completed', 'dropped');
CREATE TYPE milestone_type AS ENUM ('file', 'form', 'url', 'text');
CREATE TYPE milestone_status AS ENUM ('upcoming', 'open', 'closed', 'evaluated');
CREATE TYPE submission_status AS ENUM ('not_submitted', 'submitted', 'validated', 'rejected');
CREATE TYPE form_field_type AS ENUM ('short_text', 'long_text', 'file', 'url', 'multiple_choice', 'checkbox');
CREATE TYPE notification_type AS ENUM (
  'welcome',
  'milestone_open',
  'milestone_reminder',
  'milestone_closed',
  'submission_received',
  'submission_validated',
  'results'
);

-- ============================================================
-- PROFILES (extension de auth.users)
-- ============================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  preferred_locale TEXT NOT NULL DEFAULT 'fr' CHECK (preferred_locale IN ('fr', 'en')),
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ESPACES
-- ============================================================

CREATE TABLE spaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE space_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'space_manager',
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  invite_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_space_members_space_id ON space_members(space_id);
CREATE INDEX idx_space_members_user_id ON space_members(user_id);
CREATE INDEX idx_space_members_invite_token ON space_members(invite_token);

-- ============================================================
-- ÉVÉNEMENTS
-- ============================================================

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type event_type NOT NULL,
  status event_status NOT NULL DEFAULT 'draft',
  banner_url TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  settings JSONB NOT NULL DEFAULT '{}',
  -- hackathon settings: { max_team_size, min_team_size, allow_solo }
  -- bootcamp settings: { sequential_milestones }
  -- programme settings: { reporting_frequency, kpi_fields }
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_space_id ON events(space_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_type ON events(type);

-- Gestionnaires d'événements (space_manager assignés à un événement)
CREATE TABLE event_managers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- ============================================================
-- PARTICIPANTS
-- ============================================================

CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  status participant_status NOT NULL DEFAULT 'invited',
  invite_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  registered_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, email)
);

CREATE INDEX idx_participants_event_id ON participants(event_id);
CREATE INDEX idx_participants_user_id ON participants(user_id);
CREATE INDEX idx_participants_status ON participants(status);
CREATE INDEX idx_participants_invite_token ON participants(invite_token);

-- ============================================================
-- ÉQUIPES (hackathon)
-- ============================================================

CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  leader_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, name)
);

CREATE INDEX idx_teams_event_id ON teams(event_id);

CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(team_id, participant_id)
);

CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_participant_id ON team_members(participant_id);

-- ============================================================
-- JURÉS (hackathon)
-- ============================================================

CREATE TABLE jury_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  invite_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, email)
);

CREATE INDEX idx_jury_members_event_id ON jury_members(event_id);
CREATE INDEX idx_jury_members_invite_token ON jury_members(invite_token);

-- Critères d'évaluation
CREATE TABLE evaluation_criteria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  weight NUMERIC(5,2) NOT NULL CHECK (weight > 0 AND weight <= 100),
  max_score NUMERIC(5,2) NOT NULL DEFAULT 10,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_evaluation_criteria_event_id ON evaluation_criteria(event_id);

-- ============================================================
-- JALONS
-- ============================================================

CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type milestone_type NOT NULL,
  status milestone_status NOT NULL DEFAULT 'upcoming',
  open_at TIMESTAMPTZ,
  close_at TIMESTAMPTZ,
  order_index INTEGER NOT NULL DEFAULT 0,
  allow_late_submission BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_milestones_event_id ON milestones(event_id);
CREATE INDEX idx_milestones_status ON milestones(status);

-- Champs de formulaire pour les jalons de type "form"
CREATE TABLE form_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  milestone_id UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  type form_field_type NOT NULL,
  label TEXT NOT NULL,
  placeholder TEXT,
  required BOOLEAN NOT NULL DEFAULT FALSE,
  options JSONB, -- pour multiple_choice: ["option1", "option2"]
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_form_fields_milestone_id ON form_fields(milestone_id);

-- ============================================================
-- SOUMISSIONS
-- ============================================================

CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  milestone_id UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  status submission_status NOT NULL DEFAULT 'not_submitted',
  submitted_at TIMESTAMPTZ,
  -- Contenu selon le type de jalon :
  file_url TEXT,          -- type: file
  file_name TEXT,
  file_size INTEGER,
  url TEXT,               -- type: url
  text_content TEXT,      -- type: text
  form_data JSONB,        -- type: form { field_id: value }
  -- Validation
  validated_by UUID REFERENCES profiles(id),
  validated_at TIMESTAMPTZ,
  rejection_reason TEXT,
  is_late BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Contrainte: soit participant, soit équipe
  CONSTRAINT submission_owner CHECK (
    (participant_id IS NOT NULL AND team_id IS NULL) OR
    (participant_id IS NULL AND team_id IS NOT NULL)
  ),
  UNIQUE(milestone_id, participant_id),
  UNIQUE(milestone_id, team_id)
);

CREATE INDEX idx_submissions_milestone_id ON submissions(milestone_id);
CREATE INDEX idx_submissions_participant_id ON submissions(participant_id);
CREATE INDEX idx_submissions_team_id ON submissions(team_id);
CREATE INDEX idx_submissions_status ON submissions(status);

-- ============================================================
-- ÉVALUATIONS (hackathon)
-- ============================================================

CREATE TABLE evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  jury_member_id UUID NOT NULL REFERENCES jury_members(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  criterion_id UUID NOT NULL REFERENCES evaluation_criteria(id) ON DELETE CASCADE,
  score NUMERIC(5,2) NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(jury_member_id, team_id, criterion_id)
);

CREATE INDEX idx_evaluations_event_id ON evaluations(event_id);
CREATE INDEX idx_evaluations_jury_member_id ON evaluations(jury_member_id);
CREATE INDEX idx_evaluations_team_id ON evaluations(team_id);

-- Vue: score final par équipe
CREATE OR REPLACE VIEW team_final_scores AS
SELECT
  e.event_id,
  e.team_id,
  t.name AS team_name,
  ROUND(
    SUM(e.score * ec.weight / ec.max_score) / SUM(ec.weight) * 100,
    2
  ) AS final_score,
  COUNT(DISTINCT e.jury_member_id) AS jury_count,
  RANK() OVER (PARTITION BY e.event_id ORDER BY
    SUM(e.score * ec.weight / ec.max_score) / SUM(ec.weight) DESC
  ) AS rank
FROM evaluations e
JOIN evaluation_criteria ec ON ec.id = e.criterion_id
JOIN teams t ON t.id = e.team_id
GROUP BY e.event_id, e.team_id, t.name;

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  jury_member_id UUID REFERENCES jury_members(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  read_at TIMESTAMPTZ,
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_participant_id ON notifications(participant_id);
CREATE INDEX idx_notifications_read_at ON notifications(read_at);

-- ============================================================
-- INVITATIONS (token générique)
-- ============================================================

CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  email TEXT NOT NULL,
  type TEXT NOT NULL, -- 'space_member' | 'participant' | 'jury'
  entity_id UUID NOT NULL, -- space_id, event_id selon le type
  role user_role,
  invited_by UUID NOT NULL REFERENCES profiles(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_email ON invitations(email);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE jury_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Profiles: chaque utilisateur voit son propre profil
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Spaces: vus par leurs membres
CREATE POLICY "spaces_select_members" ON spaces
  FOR SELECT USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM space_members
      WHERE space_id = spaces.id AND user_id = auth.uid() AND accepted_at IS NOT NULL
    )
  );

CREATE POLICY "spaces_insert_owner" ON spaces
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "spaces_update_owner" ON spaces
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM space_members
      WHERE space_id = spaces.id AND user_id = auth.uid() AND role = 'space_owner'
    )
  );

-- Space members: vus par les membres de l'espace
CREATE POLICY "space_members_select" ON space_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM spaces
      WHERE spaces.id = space_members.space_id AND (
        spaces.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM space_members sm2
          WHERE sm2.space_id = space_members.space_id AND sm2.user_id = auth.uid()
        )
      )
    )
  );

-- Events: vus par les membres de l'espace et les participants
CREATE POLICY "events_select" ON events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM spaces
      WHERE spaces.id = events.space_id AND (
        spaces.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM space_members
          WHERE space_id = spaces.id AND user_id = auth.uid()
        )
      )
    ) OR
    EXISTS (
      SELECT 1 FROM participants
      WHERE event_id = events.id AND user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM jury_members
      WHERE event_id = events.id AND user_id = auth.uid()
    )
  );

-- Participants: vus par les organisateurs et eux-mêmes
CREATE POLICY "participants_select" ON participants
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM events e
      JOIN spaces s ON s.id = e.space_id
      WHERE e.id = participants.event_id AND (
        s.created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM space_members WHERE space_id = s.id AND user_id = auth.uid())
      )
    )
  );

-- Milestones: vus par les participants de l'événement et les organisateurs
CREATE POLICY "milestones_select" ON milestones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN spaces s ON s.id = e.space_id
      WHERE e.id = milestones.event_id AND (
        s.created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM space_members WHERE space_id = s.id AND user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM participants WHERE event_id = e.id AND user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM jury_members WHERE event_id = e.id AND user_id = auth.uid())
      )
    )
  );

-- Submissions: vus par les organisateurs et le propriétaire
CREATE POLICY "submissions_select" ON submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM milestones m
      JOIN events e ON e.id = m.event_id
      JOIN spaces s ON s.id = e.space_id
      WHERE m.id = submissions.milestone_id AND (
        s.created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM space_members WHERE space_id = s.id AND user_id = auth.uid()) OR
        EXISTS (
          SELECT 1 FROM participants p
          WHERE p.id = submissions.participant_id AND p.user_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM team_members tm
          JOIN participants p ON p.id = tm.participant_id
          WHERE tm.team_id = submissions.team_id AND p.user_id = auth.uid()
        )
      )
    )
  );

-- Evaluations: vus par le juré concerné et les organisateurs
CREATE POLICY "evaluations_select" ON evaluations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jury_members jm
      WHERE jm.id = evaluations.jury_member_id AND jm.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM events e
      JOIN spaces s ON s.id = e.space_id
      WHERE e.id = evaluations.event_id AND (
        s.created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM space_members WHERE space_id = s.id AND user_id = auth.uid())
      )
    )
  );

-- Team members: vus par les organisateurs et les participants/jurés de l'événement
CREATE POLICY "team_members_select" ON team_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teams t
      JOIN events e ON e.id = t.event_id
      JOIN spaces s ON s.id = e.space_id
      WHERE t.id = team_members.team_id AND (
        s.created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM space_members WHERE space_id = s.id AND user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM participants WHERE event_id = e.id AND user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM jury_members WHERE event_id = e.id AND user_id = auth.uid())
      )
    )
  );

-- Team members: seuls les organisateurs peuvent ajouter des membres
CREATE POLICY "team_members_insert" ON team_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams t
      JOIN events e ON e.id = t.event_id
      JOIN spaces s ON s.id = e.space_id
      WHERE t.id = team_members.team_id AND (
        s.created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM space_members WHERE space_id = s.id AND user_id = auth.uid())
      )
    )
  );

-- Team members: seuls les organisateurs peuvent modifier
CREATE POLICY "team_members_update" ON team_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM teams t
      JOIN events e ON e.id = t.event_id
      JOIN spaces s ON s.id = e.space_id
      WHERE t.id = team_members.team_id AND (
        s.created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM space_members WHERE space_id = s.id AND user_id = auth.uid())
      )
    )
  );

-- Team members: seuls les organisateurs peuvent supprimer
CREATE POLICY "team_members_delete" ON team_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM teams t
      JOIN events e ON e.id = t.event_id
      JOIN spaces s ON s.id = e.space_id
      WHERE t.id = team_members.team_id AND (
        s.created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM space_members WHERE space_id = s.id AND user_id = auth.uid())
      )
    )
  );

-- Notifications: visibles uniquement par le destinataire
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM participants
      WHERE id = notifications.participant_id AND user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM jury_members
      WHERE id = notifications.jury_member_id AND user_id = auth.uid()
    )
  );

-- ============================================================
-- FONCTIONS ET TRIGGERS
-- ============================================================

-- Mise à jour automatique du champ updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER spaces_updated_at BEFORE UPDATE ON spaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER participants_updated_at BEFORE UPDATE ON participants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER milestones_updated_at BEFORE UPDATE ON milestones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER submissions_updated_at BEFORE UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER evaluations_updated_at BEFORE UPDATE ON evaluations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Mise à jour automatique du statut des jalons
CREATE OR REPLACE FUNCTION update_milestone_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.open_at IS NOT NULL AND NEW.close_at IS NOT NULL THEN
    IF NOW() < NEW.open_at THEN
      NEW.status = 'upcoming';
    ELSIF NOW() BETWEEN NEW.open_at AND NEW.close_at THEN
      NEW.status = 'open';
    ELSIF NOW() > NEW.close_at AND NEW.status != 'evaluated' THEN
      NEW.status = 'closed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER milestones_auto_status BEFORE INSERT OR UPDATE ON milestones
  FOR EACH ROW EXECUTE FUNCTION update_milestone_status();

-- Création automatique du profil à l'inscription
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Slug automatique pour les espaces
CREATE OR REPLACE FUNCTION generate_space_slug(name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  base_slug := LOWER(REGEXP_REPLACE(
    REGEXP_REPLACE(name, '[^a-zA-Z0-9\s-]', '', 'g'),
    '\s+', '-', 'g'
  ));
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM spaces WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- STORAGE BUCKETS (à créer via Supabase Dashboard)
-- ============================================================
-- Buckets nécessaires :
-- - 'avatars' (public)
-- - 'space-logos' (public)
-- - 'event-banners' (public)
-- - 'submissions' (private, accès via signed URLs)
