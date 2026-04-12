-- Migration : ajout des RLS manquantes (INSERT/UPDATE/DELETE)
-- sur participants, milestones, teams, submissions, jury_members,
-- evaluation_criteria, evaluations

-- ── PARTICIPANTS ──────────────────────────────────────────────────────────────

CREATE POLICY participants_insert ON participants FOR INSERT TO authenticated
WITH CHECK (event_id IN (
  SELECT e.id FROM events e JOIN spaces s ON s.id = e.space_id
  WHERE s.created_by = auth.uid()
     OR e.space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

CREATE POLICY participants_update ON participants FOR UPDATE TO authenticated
USING (event_id IN (
  SELECT e.id FROM events e JOIN spaces s ON s.id = e.space_id
  WHERE s.created_by = auth.uid()
     OR e.space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

CREATE POLICY participants_delete ON participants FOR DELETE TO authenticated
USING (event_id IN (
  SELECT e.id FROM events e JOIN spaces s ON s.id = e.space_id
  WHERE s.created_by = auth.uid()
     OR e.space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

-- ── MILESTONES ────────────────────────────────────────────────────────────────

CREATE POLICY milestones_insert ON milestones FOR INSERT TO authenticated
WITH CHECK (event_id IN (
  SELECT e.id FROM events e JOIN spaces s ON s.id = e.space_id
  WHERE s.created_by = auth.uid()
     OR e.space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

CREATE POLICY milestones_update ON milestones FOR UPDATE TO authenticated
USING (event_id IN (
  SELECT e.id FROM events e JOIN spaces s ON s.id = e.space_id
  WHERE s.created_by = auth.uid()
     OR e.space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

CREATE POLICY milestones_delete ON milestones FOR DELETE TO authenticated
USING (event_id IN (
  SELECT e.id FROM events e JOIN spaces s ON s.id = e.space_id
  WHERE s.created_by = auth.uid()
     OR e.space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

-- ── TEAMS ─────────────────────────────────────────────────────────────────────

CREATE POLICY teams_insert ON teams FOR INSERT TO authenticated
WITH CHECK (event_id IN (
  SELECT e.id FROM events e JOIN spaces s ON s.id = e.space_id
  WHERE s.created_by = auth.uid()
     OR e.space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

CREATE POLICY teams_update ON teams FOR UPDATE TO authenticated
USING (event_id IN (
  SELECT e.id FROM events e JOIN spaces s ON s.id = e.space_id
  WHERE s.created_by = auth.uid()
     OR e.space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

CREATE POLICY teams_delete ON teams FOR DELETE TO authenticated
USING (event_id IN (
  SELECT e.id FROM events e JOIN spaces s ON s.id = e.space_id
  WHERE s.created_by = auth.uid()
     OR e.space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

-- ── SUBMISSIONS ───────────────────────────────────────────────────────────────

CREATE POLICY submissions_insert ON submissions FOR INSERT TO authenticated
WITH CHECK (
  participant_id IN (SELECT id FROM participants WHERE user_id = auth.uid())
  OR team_id IN (
    SELECT tm.team_id FROM team_members tm
    JOIN participants p ON p.id = tm.participant_id
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY submissions_update ON submissions FOR UPDATE TO authenticated
USING (
  participant_id IN (SELECT id FROM participants WHERE user_id = auth.uid())
  OR team_id IN (
    SELECT tm.team_id FROM team_members tm
    JOIN participants p ON p.id = tm.participant_id
    WHERE p.user_id = auth.uid()
  )
);

-- ── JURY MEMBERS ──────────────────────────────────────────────────────────────

CREATE POLICY jury_members_insert ON jury_members FOR INSERT TO authenticated
WITH CHECK (event_id IN (
  SELECT e.id FROM events e JOIN spaces s ON s.id = e.space_id
  WHERE s.created_by = auth.uid()
     OR e.space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

CREATE POLICY jury_members_update ON jury_members FOR UPDATE TO authenticated
USING (event_id IN (
  SELECT e.id FROM events e JOIN spaces s ON s.id = e.space_id
  WHERE s.created_by = auth.uid()
     OR e.space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

CREATE POLICY jury_members_delete ON jury_members FOR DELETE TO authenticated
USING (event_id IN (
  SELECT e.id FROM events e JOIN spaces s ON s.id = e.space_id
  WHERE s.created_by = auth.uid()
     OR e.space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

-- ── EVALUATION CRITERIA ───────────────────────────────────────────────────────

CREATE POLICY eval_criteria_insert ON evaluation_criteria FOR INSERT TO authenticated
WITH CHECK (event_id IN (
  SELECT e.id FROM events e JOIN spaces s ON s.id = e.space_id
  WHERE s.created_by = auth.uid()
     OR e.space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

CREATE POLICY eval_criteria_delete ON evaluation_criteria FOR DELETE TO authenticated
USING (event_id IN (
  SELECT e.id FROM events e JOIN spaces s ON s.id = e.space_id
  WHERE s.created_by = auth.uid()
     OR e.space_id IN (SELECT space_id FROM space_members WHERE user_id = auth.uid())
));

-- ── EVALUATIONS ───────────────────────────────────────────────────────────────

CREATE POLICY evaluations_insert ON evaluations FOR INSERT TO authenticated
WITH CHECK (
  jury_member_id IN (SELECT id FROM jury_members WHERE user_id = auth.uid())
);

CREATE POLICY evaluations_update ON evaluations FOR UPDATE TO authenticated
USING (
  jury_member_id IN (SELECT id FROM jury_members WHERE user_id = auth.uid())
);
