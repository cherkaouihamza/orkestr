export type UserRole = "space_owner" | "space_manager" | "jury" | "participant";
export type EventType = "hackathon" | "bootcamp" | "cohort";
export type EventStatus = "draft" | "active" | "completed" | "archived";
export type ParticipantStatus = "invited" | "registered" | "active" | "completed" | "dropped";
export type MilestoneType = "file" | "form" | "url" | "text";
export type MilestoneStatus = "upcoming" | "open" | "closed" | "evaluated";
export type SubmissionStatus = "not_submitted" | "submitted" | "validated" | "rejected";
export type FormFieldType =
  | "short_text"
  | "long_text"
  | "file"
  | "url"
  | "multiple_choice"
  | "checkbox";
export type NotificationType =
  | "welcome"
  | "milestone_open"
  | "milestone_reminder"
  | "milestone_closed"
  | "submission_received"
  | "submission_validated"
  | "results";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at">;
        Update: Partial<Omit<Profile, "id" | "created_at" | "updated_at">>;
      };
      spaces: {
        Row: Space;
        Insert: Omit<Space, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Space, "id" | "created_at" | "updated_at">>;
      };
      space_members: {
        Row: SpaceMember;
        Insert: Omit<SpaceMember, "id" | "created_at" | "invite_token">;
        Update: Partial<Omit<SpaceMember, "id" | "created_at">>;
      };
      events: {
        Row: Event;
        Insert: Omit<Event, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Event, "id" | "created_at" | "updated_at">>;
      };
      participants: {
        Row: Participant;
        Insert: Omit<Participant, "id" | "created_at" | "updated_at" | "invite_token">;
        Update: Partial<Omit<Participant, "id" | "created_at" | "updated_at">>;
      };
      teams: {
        Row: Team;
        Insert: Omit<Team, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Team, "id" | "created_at" | "updated_at">>;
      };
      team_members: {
        Row: TeamMember;
        Insert: Omit<TeamMember, "id" | "joined_at">;
        Update: never;
      };
      jury_members: {
        Row: JuryMember;
        Insert: Omit<JuryMember, "id" | "created_at" | "invite_token">;
        Update: Partial<Omit<JuryMember, "id" | "created_at">>;
      };
      evaluation_criteria: {
        Row: EvaluationCriterion;
        Insert: Omit<EvaluationCriterion, "id" | "created_at">;
        Update: Partial<Omit<EvaluationCriterion, "id" | "created_at">>;
      };
      milestones: {
        Row: Milestone;
        Insert: Omit<Milestone, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Milestone, "id" | "created_at" | "updated_at">>;
      };
      form_fields: {
        Row: FormField;
        Insert: Omit<FormField, "id" | "created_at">;
        Update: Partial<Omit<FormField, "id" | "created_at">>;
      };
      submissions: {
        Row: Submission;
        Insert: Omit<Submission, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Submission, "id" | "created_at" | "updated_at">>;
      };
      evaluations: {
        Row: Evaluation;
        Insert: Omit<Evaluation, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Evaluation, "id" | "created_at" | "updated_at">>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, "id" | "created_at">;
        Update: Partial<Omit<Notification, "id" | "created_at">>;
      };
      invitations: {
        Row: Invitation;
        Insert: Omit<Invitation, "id" | "created_at" | "token">;
        Update: Partial<Omit<Invitation, "id" | "created_at">>;
      };
    };
    Views: {
      team_final_scores: {
        Row: TeamFinalScore;
      };
    };
  };
}

export interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  preferred_locale: "fr" | "en";
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Space {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SpaceMember {
  id: string;
  space_id: string;
  user_id: string | null;
  email: string;
  role: UserRole;
  invited_at: string;
  accepted_at: string | null;
  invite_token: string | null;
  created_at: string;
}

export interface Event {
  id: string;
  space_id: string;
  name: string;
  description: string | null;
  type: EventType;
  status: EventStatus;
  banner_url: string | null;
  start_date: string | null;
  end_date: string | null;
  settings: EventSettings;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface HackathonSettings {
  max_team_size?: number;
  min_team_size?: number;
  allow_solo?: boolean;
}

export interface BootcampSettings {
  sequential_milestones?: boolean;
}

export interface ProgrammeSettings {
  reporting_frequency?: "weekly" | "biweekly" | "monthly";
  kpi_fields?: string[];
}

export type EventSettings = HackathonSettings | BootcampSettings | ProgrammeSettings;

export interface Participant {
  id: string;
  event_id: string;
  user_id: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: ParticipantStatus;
  invite_token: string | null;
  invited_at: string;
  registered_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  leader_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  participant_id: string;
  joined_at: string;
}

export interface JuryMember {
  id: string;
  event_id: string;
  user_id: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  invite_token: string | null;
  invited_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface EvaluationCriterion {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  weight: number;
  max_score: number;
  order_index: number;
  created_at: string;
}

export interface Milestone {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  type: MilestoneType;
  status: MilestoneStatus;
  open_at: string | null;
  close_at: string | null;
  order_index: number;
  allow_late_submission: boolean;
  created_at: string;
  updated_at: string;
}

export interface FormField {
  id: string;
  milestone_id: string;
  type: FormFieldType;
  label: string;
  placeholder: string | null;
  required: boolean;
  options: string[] | null;
  order_index: number;
  created_at: string;
}

export interface Submission {
  id: string;
  milestone_id: string;
  participant_id: string | null;
  team_id: string | null;
  status: SubmissionStatus;
  submitted_at: string | null;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  url: string | null;
  text_content: string | null;
  form_data: Record<string, unknown> | null;
  validated_by: string | null;
  validated_at: string | null;
  rejection_reason: string | null;
  is_late: boolean;
  created_at: string;
  updated_at: string;
}

export interface Evaluation {
  id: string;
  event_id: string;
  jury_member_id: string;
  team_id: string;
  criterion_id: string;
  score: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string | null;
  participant_id: string | null;
  jury_member_id: string | null;
  event_id: string | null;
  type: NotificationType;
  title: string;
  body: string | null;
  read_at: string | null;
  email_sent_at: string | null;
  created_at: string;
}

export interface Invitation {
  id: string;
  token: string;
  email: string;
  type: "space_member" | "participant" | "jury";
  entity_id: string;
  role: UserRole | null;
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface TeamFinalScore {
  event_id: string;
  team_id: string;
  team_name: string;
  final_score: number;
  jury_count: number;
  rank: number;
}

// Types étendus avec relations
export type SpaceWithMembers = Space & {
  space_members: SpaceMember[];
};

export type EventWithDetails = Event & {
  spaces: Space;
  _count?: {
    participants: number;
    teams: number;
    milestones: number;
  };
};

export type ParticipantWithTeam = Participant & {
  team_members: Array<{
    team_id: string;
    teams: Team;
  }>;
};

export type MilestoneWithSubmissions = Milestone & {
  form_fields: FormField[];
  submissions: Submission[];
};

export type TeamWithMembers = Team & {
  team_members: Array<{
    participant_id: string;
    participants: Participant;
  }>;
};
