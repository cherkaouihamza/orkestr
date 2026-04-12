"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/components/ui/use-toast";
import { getInitials, getFullName } from "@/lib/utils";
import {
  Plus,
  Users,
  Trash2,
  UserMinus,
  Trophy,
  Pencil,
  Crown,
  AlertTriangle,
  Loader2,
  UserPlus,
  Upload,
  Download,
} from "lucide-react";
import type { Participant } from "@/types/database";

interface TeamMemberRow {
  participant_id: string;
  participants: Pick<Participant, "id" | "first_name" | "last_name" | "email">;
}

interface Team {
  id: string;
  name: string;
  description: string | null;
  leader_id: string | null;
  team_members: TeamMemberRow[];
}

type ParticipantRow = Pick<Participant, "id" | "first_name" | "last_name" | "email" | "status">;

interface ImportTeamRow {
  teamName: string;
  description: string;
  leaderEmail: string;
  memberEmails: string[];
  leaderParticipant: ParticipantRow | null;
  memberParticipants: Array<ParticipantRow | null>;
  // per-member warning: null = ok, string = warning message
  memberWarnings: Array<string | null>;
  hasWarnings: boolean;
}

interface TeamsClientProps {
  locale: string;
  eventId: string;
  eventName: string;
  spaceName: string;
  teams: Team[];
  participants: ParticipantRow[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function MemberCheckbox({
  participant,
  checked,
  onChange,
}: {
  participant: ParticipantRow;
  checked: boolean;
  onChange: (id: string, checked: boolean) => void;
}) {
  return (
    <label
      className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
        checked ? "border-accent bg-orange-50" : "border-neutral-200 hover:border-neutral-300"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(participant.id, e.target.checked)}
        className="h-4 w-4 accent-orange-500"
      />
      <Avatar className="h-7 w-7">
        <AvatarFallback className="bg-primary-100 text-primary-900 text-xs">
          {getInitials(participant.first_name, participant.last_name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="text-sm font-medium text-neutral-900 truncate">
          {getFullName(participant.first_name, participant.last_name) || participant.email}
        </p>
        <p className="text-xs text-neutral-400 truncate">{participant.email}</p>
      </div>
    </label>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function TeamsClient({ locale, eventId, eventName, spaceName, teams: initialTeams, participants }: TeamsClientProps) {
  const t = useTranslations("teams");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const supabase = createClient();

  const [teams, setTeams] = useState(initialTeams);
  const [isLoading, setIsLoading] = useState(false);

  // ── Create / Edit dialog ──────────────────────────────────────────────────
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formMemberIds, setFormMemberIds] = useState<Set<string>>(new Set());
  const [formLeaderId, setFormLeaderId] = useState<string>("");

  // ── Delete confirmation ───────────────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formNameError, setFormNameError] = useState<string | null>(null);

  // ── Quick add member (from card) ──────────────────────────────────────────
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [addMemberTeam, setAddMemberTeam] = useState<Team | null>(null);
  const [addMemberConflict, setAddMemberConflict] = useState<{
    participant: ParticipantRow;
    currentTeam: Team;
  } | null>(null);

  // ── Import ────────────────────────────────────────────────────────────────
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportTeamRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const reloadTeams = async () => {
    const { data } = await supabase
      .from("teams")
      .select(`*, team_members(participant_id, participants(id, first_name, last_name, email))`)
      .eq("event_id", eventId)
      .order("name");
    if (data) setTeams(data as Team[]);
    router.refresh();
  };

  const assignedIdsByTeam = (excludeTeamId?: string) =>
    new Set(
      teams
        .filter((t) => t.id !== excludeTeamId)
        .flatMap((t) => t.team_members.map((tm) => tm.participant_id))
    );

  // Participants available in the form (not assigned to other teams)
  const availableParticipants = (excludeTeamId?: string) => {
    const assigned = assignedIdsByTeam(excludeTeamId);
    return participants.filter((p) => !assigned.has(p.id));
  };

  // ── Form helpers ──────────────────────────────────────────────────────────

  const openCreateDialog = () => {
    setEditingTeam(null);
    setFormName("");
    setFormDescription("");
    setFormMemberIds(new Set());
    setFormLeaderId("");
    setFormNameError(null);
    setShowFormDialog(true);
  };

  const openEditDialog = (team: Team) => {
    setEditingTeam(team);
    setFormName(team.name);
    setFormDescription(team.description ?? "");
    setFormMemberIds(new Set(team.team_members.map((tm) => tm.participant_id)));
    setFormLeaderId(team.leader_id ?? "");
    setFormNameError(null);
    setShowFormDialog(true);
  };

  const toggleMember = (id: string, checked: boolean) => {
    setFormMemberIds((prev) => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
    // Remove leader if deselected
    if (!checked && formLeaderId === id) setFormLeaderId("");
  };

  // Members selected in the form (for leader dropdown)
  const selectedParticipants = participants.filter((p) => formMemberIds.has(p.id));

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!formName.trim()) return;
    setFormNameError(null);
    setIsLoading(true);
    try {
      if (editingTeam) {
        // ── Update ──
        const { error: updateError } = await supabase
          .from("teams")
          .update({
            name: formName.trim(),
            description: formDescription.trim() || null,
            leader_id: formLeaderId || null,
          })
          .eq("id", editingTeam.id);

        if (updateError) {
          if (updateError.code === "23505") {
            setFormNameError(
              locale === "fr"
                ? "Une équipe avec ce nom existe déjà dans cet événement"
                : "A team with this name already exists in this event"
            );
            return;
          }
          toast({ title: tCommon("errorOccurred"), variant: "destructive" });
          return;
        }

        // Sync members: compute adds and removes
        const currentIds = new Set(editingTeam.team_members.map((tm) => tm.participant_id));
        const toRemove = [...currentIds].filter((id) => !formMemberIds.has(id));
        const toAdd = [...formMemberIds].filter((id) => !currentIds.has(id));

        if (toRemove.length > 0) {
          await supabase
            .from("team_members")
            .delete()
            .eq("team_id", editingTeam.id)
            .in("participant_id", toRemove);
        }
        if (toAdd.length > 0) {
          await supabase.from("team_members").insert(
            toAdd.map((id) => ({ team_id: editingTeam.id, participant_id: id }))
          );
        }

        toast({ title: t("updated") });
      } else {
        // ── Create ──
        const { data: team, error: createError } = await supabase
          .from("teams")
          .insert({
            event_id: eventId,
            name: formName.trim(),
            description: formDescription.trim() || null,
            leader_id: formLeaderId || null,
          })
          .select()
          .single();

        if (createError || !team) {
          if (createError?.code === "23505") {
            setFormNameError(
              locale === "fr"
                ? "Une équipe avec ce nom existe déjà dans cet événement"
                : "A team with this name already exists in this event"
            );
            return;
          }
          toast({ title: tCommon("errorOccurred"), variant: "destructive" });
          return;
        }

        if (formMemberIds.size > 0) {
          await supabase.from("team_members").insert(
            [...formMemberIds].map((id) => ({ team_id: team.id, participant_id: id }))
          );
        }

        toast({ title: t("created") });
      }

      setShowFormDialog(false);
      await reloadTeams();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!teamToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("teams").delete().eq("id", teamToDelete.id);
      if (error) {
        toast({ title: tCommon("errorOccurred"), variant: "destructive" });
        return;
      }
      setTeams((prev) => prev.filter((t) => t.id !== teamToDelete.id));
      toast({ title: t("deleted") });
      setShowDeleteConfirm(false);
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRemoveMember = async (team: Team, participantId: string) => {
    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("team_id", team.id)
      .eq("participant_id", participantId);

    if (error) return;

    // If leader removed, clear leader_id
    if (team.leader_id === participantId) {
      await supabase.from("teams").update({ leader_id: null }).eq("id", team.id);
    }

    setTeams((prev) =>
      prev.map((t) =>
        t.id === team.id
          ? {
              ...t,
              leader_id: t.leader_id === participantId ? null : t.leader_id,
              team_members: t.team_members.filter((tm) => tm.participant_id !== participantId),
            }
          : t
      )
    );
  };

  const getParticipantCurrentTeam = (participantId: string): Team | undefined =>
    teams.find((t) => t.team_members.some((tm) => tm.participant_id === participantId));

  const handleQuickAddMember = async (participant: ParticipantRow) => {
    if (!addMemberTeam) return;

    // Check if already in another team
    const currentTeam = getParticipantCurrentTeam(participant.id);
    if (currentTeam && currentTeam.id !== addMemberTeam.id) {
      setAddMemberConflict({ participant, currentTeam });
      return;
    }

    await doAddMember(participant.id, addMemberTeam);
  };

  const doAddMember = async (participantId: string, targetTeam: Team) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from("team_members").insert({
        team_id: targetTeam.id,
        participant_id: participantId,
      });
      if (error) {
        toast({ title: tCommon("errorOccurred"), variant: "destructive" });
        return;
      }
      setShowAddMemberDialog(false);
      setAddMemberConflict(null);
      await reloadTeams();
    } finally {
      setIsLoading(false);
    }
  };

  const handleMoveToTeam = async () => {
    if (!addMemberConflict || !addMemberTeam) return;
    setIsLoading(true);
    try {
      // Remove from current team
      await supabase
        .from("team_members")
        .delete()
        .eq("team_id", addMemberConflict.currentTeam.id)
        .eq("participant_id", addMemberConflict.participant.id);

      // Clear leader_id if was leader
      if (addMemberConflict.currentTeam.leader_id === addMemberConflict.participant.id) {
        await supabase
          .from("teams")
          .update({ leader_id: null })
          .eq("id", addMemberConflict.currentTeam.id);
      }

      // Add to new team
      await supabase.from("team_members").insert({
        team_id: addMemberTeam.id,
        participant_id: addMemberConflict.participant.id,
      });

      setShowAddMemberDialog(false);
      setAddMemberConflict(null);
      await reloadTeams();
    } finally {
      setIsLoading(false);
    }
  };

  // ── Import ────────────────────────────────────────────────────────────────

  const handleDownloadTemplate = async () => {
    const XLSX = await import("xlsx");

    // ── Feuille 1 : données ──────────────────────────────────────────────────
    const dataRows = [
      {
        teamName: "Team Alpha",
        description: "Application de gestion des déchets",
        member1Email: "jean.dupont@exemple.com",
        member2Email: "sara.martin@exemple.com",
        member3Email: "ali.hassan@exemple.com",
        member4Email: "",
        member5Email: "",
      },
      {
        teamName: "Team Beta",
        description: "Plateforme d'apprentissage en ligne",
        member1Email: "marie.curie@exemple.com",
        member2Email: "ahmed.benali@exemple.com",
        member3Email: "",
        member4Email: "",
        member5Email: "",
      },
    ];
    const wsData = XLSX.utils.json_to_sheet(dataRows);

    // Largeurs de colonnes
    wsData["!cols"] = [
      { wch: 20 }, // teamName
      { wch: 40 }, // description
      { wch: 30 }, // member1Email
      { wch: 30 }, // member2Email
      { wch: 30 }, // member3Email
      { wch: 30 }, // member4Email
      { wch: 30 }, // member5Email
    ];

    // ── Feuille 2 : instructions ─────────────────────────────────────────────
    const instructions = [
      ["Champ", "Obligatoire", "Description"],
      ["teamName", "Oui", "Nom de l'équipe"],
      ["description", "Non", "Sujet ou idée du projet de l'équipe"],
      ["member1Email", "Non", "Email du membre 1 — doit être un participant existant de l'événement"],
      ["member2Email", "Non", "Email du membre 2"],
      ["member3Email", "Non", "Email du membre 3"],
      ["member4Email", "Non", "Email du membre 4"],
      ["member5Email", "Non", "Email du membre 5"],
      [],
      ["Règles importantes"],
      ["• Les emails doivent correspondre à des participants déjà inscrits à l'événement"],
      ["• Maximum 5 membres par équipe via import (vous pouvez en ajouter plus manuellement)"],
      ["• Le nom de l'équipe (teamName) est obligatoire — les lignes sans nom seront ignorées"],
      ["• Les emails non reconnus seront signalés en prévisualisation mais n'empêcheront pas l'import"],
      ["• Après import, définissez le leader depuis le formulaire d'édition de chaque équipe"],
    ];
    const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
    wsInstructions["!cols"] = [{ wch: 18 }, { wch: 14 }, { wch: 75 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsData, "Équipes");
    XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions");
    XLSX.writeFile(wb, "modele_import_equipes.xlsx");
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (importFileRef.current) importFileRef.current.value = "";

    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws);

    const emailToParticipant = new Map(participants.map((p) => [p.email.toLowerCase(), p]));
    // Build map of participantId → current team name (from already-existing teams)
    const participantTeamName = new Map<string, string>(
      teams.flatMap((t) => t.team_members.map((tm) => [tm.participant_id, t.name]))
    );

    const preview: ImportTeamRow[] = rows
      .filter((r) => r.teamName?.trim())
      .map((r) => {
        const memberEmails = [
          r.member1Email,
          r.member2Email,
          r.member3Email,
          r.member4Email,
          r.member5Email,
        ]
          .map((e) => e?.trim())
          .filter(Boolean) as string[];

        const memberParticipants = memberEmails.map(
          (em) => emailToParticipant.get(em.toLowerCase()) ?? null
        );

        const memberWarnings: Array<string | null> = memberParticipants.map((p, i) => {
          if (p === null) {
            return locale === "fr"
              ? `Email non reconnu : ${memberEmails[i]}`
              : `Unknown email: ${memberEmails[i]}`;
          }
          const existingTeam = participantTeamName.get(p.id);
          if (existingTeam) {
            return locale === "fr"
              ? `Déjà dans l'équipe "${existingTeam}" — sera ignoré`
              : `Already in team "${existingTeam}" — will be skipped`;
          }
          return null;
        });

        const hasWarnings = memberWarnings.some((w) => w !== null);

        return {
          teamName: r.teamName.trim(),
          description: r.description?.trim() ?? "",
          leaderEmail: "",
          memberEmails,
          leaderParticipant: null,
          memberParticipants,
          memberWarnings,
          hasWarnings,
        };
      });

    setImportPreview(preview);
    setShowImportDialog(true);
  };

  const handleConfirmImport = async () => {
    setIsImporting(true);
    try {
      let createdCount = 0;
      for (const row of importPreview) {
        const { data: team, error } = await supabase
          .from("teams")
          .insert({
            event_id: eventId,
            name: row.teamName,
            description: row.description || null,
          })
          .select()
          .single();

        if (error || !team) continue;

        // Only include members with no conflict warning (not already in a team)
        const resolvedIds = row.memberParticipants
          .filter((p, i) => p !== null && row.memberWarnings[i] === null)
          .map((p) => p!.id);
        const uniqueIds = [...new Set(resolvedIds)];

        if (uniqueIds.length > 0) {
          await supabase
            .from("team_members")
            .insert(uniqueIds.map((id) => ({ team_id: team.id, participant_id: id })));
        }

        createdCount++;
      }

      toast({
        title:
          locale === "fr"
            ? `${createdCount} équipe(s) créée(s) avec succès`
            : `${createdCount} team(s) created successfully`,
      });
      setShowImportDialog(false);
      await reloadTeams();
    } finally {
      setIsImporting(false);
    }
  };

  // ── Export ────────────────────────────────────────────────────────────────

  const handleExport = async () => {
    const XLSX = await import("xlsx");
    const now = new Date();
    const datePart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}`;
    const safe = (s: string) => s.replace(/[^a-z0-9]/gi, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
    const fileName = `${safe(spaceName)}_${safe(eventName)}_equipes_${datePart}.xlsx`;

    const rows = teams.map((team) => {
      const leader = team.leader_id
        ? team.team_members.find((tm) => tm.participant_id === team.leader_id)?.participants
        : null;
      const members = team.team_members.map((tm) =>
        getFullName(tm.participants.first_name, tm.participants.last_name) || tm.participants.email
      );
      return {
        [locale === "fr" ? "Équipe" : "Team"]: team.name,
        [locale === "fr" ? "Description" : "Description"]: team.description ?? "",
        [locale === "fr" ? "Leader" : "Leader"]: leader
          ? getFullName(leader.first_name, leader.last_name) || leader.email
          : "",
        [locale === "fr" ? "Membres" : "Members"]: members.join("; "),
        [locale === "fr" ? "Nombre de membres" : "Member count"]: team.team_members.length,
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 24 }, { wch: 40 }, { wch: 24 }, { wch: 60 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, locale === "fr" ? "Équipes" : "Teams");
    XLSX.writeFile(wb, fileName);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const formAvailableParticipants = availableParticipants(editingTeam?.id);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("title")}</h1>
          <p className="text-neutral-500 mt-1">
            {teams.length} {locale === "fr" ? "équipe(s)" : "team(s)"} ·{" "}
            {participants.length} {locale === "fr" ? "participant(s)" : "participant(s)"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={teams.length === 0}>
            <Download className="h-4 w-4 mr-1.5" />
            {locale === "fr" ? "Exporter" : "Export"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <Download className="h-4 w-4 mr-1.5" />
            {locale === "fr" ? "Modèle Excel" : "Excel template"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => importFileRef.current?.click()}>
            <Upload className="h-4 w-4 mr-1.5" />
            {locale === "fr" ? "Importer des équipes" : "Import teams"}
          </Button>
          <input
            ref={importFileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImportFile}
          />
          <Button variant="accent" size="sm" onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-1.5" />
            {t("create")}
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-xl border border-neutral-300">
          <Trophy className="h-12 w-12 text-neutral-300 mb-4" />
          <h3 className="text-neutral-600 font-medium mb-2">{t("noTeams")}</h3>
          <p className="text-neutral-400 text-sm mb-6 max-w-xs">{t("noTeamsDescription")}</p>
          <Button variant="accent" onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            {t("create")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {teams.map((team) => {
            const leader = team.leader_id
              ? team.team_members.find((tm) => tm.participant_id === team.leader_id)?.participants
              : null;

            return (
              <Card key={team.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-neutral-900 truncate">{team.name}</h3>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {t("membersCount", { count: team.team_members.length })}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title={locale === "fr" ? "Ajouter un membre" : "Add member"}
                        onClick={() => {
                          setAddMemberTeam(team);
                          setShowAddMemberDialog(true);
                        }}
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title={tCommon("edit")}
                        onClick={() => openEditDialog(team)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-400 hover:text-red-600"
                        title={tCommon("delete")}
                        onClick={() => {
                          setTeamToDelete(team);
                          setShowDeleteConfirm(true);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Description */}
                  {team.description && (
                    <p className="text-xs text-neutral-500 leading-relaxed mt-1 line-clamp-2">
                      {team.description}
                    </p>
                  )}

                  {/* Leader badge */}
                  {leader && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Crown className="h-3 w-3 text-amber-500" />
                      <span className="text-xs text-amber-700 font-medium">
                        {getFullName(leader.first_name, leader.last_name) || leader.email}
                      </span>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="pt-0 flex-1">
                  {team.team_members.length === 0 ? (
                    <div
                      className="flex items-center justify-center py-5 text-neutral-400 text-sm border-2 border-dashed border-neutral-200 rounded-lg cursor-pointer hover:border-neutral-300 transition-colors"
                      onClick={() => {
                        setAddMemberTeam(team);
                        setShowAddMemberDialog(true);
                      }}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      {locale === "fr" ? "Aucun membre" : "No members"}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {team.team_members.map((tm) => {
                        const p = tm.participants;
                        const isLeader = team.leader_id === tm.participant_id;
                        return (
                          <div
                            key={tm.participant_id}
                            className="flex items-center justify-between py-1"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Avatar className="h-6 w-6 flex-shrink-0">
                                <AvatarFallback className="bg-primary-100 text-primary-900 text-xs">
                                  {getInitials(p.first_name, p.last_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-sm text-neutral-800 truncate">
                                  {getFullName(p.first_name, p.last_name) || p.email}
                                </p>
                              </div>
                              {isLeader && (
                                <Crown className="h-3 w-3 text-amber-500 flex-shrink-0" />
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-neutral-300 hover:text-red-500 flex-shrink-0"
                              onClick={() => handleRemoveMember(team, tm.participant_id)}
                            >
                              <UserMinus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Dialog Création / Édition ─────────────────────────────────────── */}
      <Dialog open={showFormDialog} onOpenChange={(open) => { if (!open) setShowFormDialog(false); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTeam ? t("edit") : t("create")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Nom */}
            <div className="space-y-2">
              <Label>{t("name")} *</Label>
              <Input
                placeholder={t("namePlaceholder")}
                value={formName}
                onChange={(e) => { setFormName(e.target.value); setFormNameError(null); }}
                className={formNameError ? "border-red-400 focus-visible:ring-red-400" : ""}
              />
              {formNameError && (
                <p className="text-xs text-red-500">{formNameError}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>
                {locale === "fr" ? "Description / Idée" : "Description / Idea"}{" "}
                <span className="text-neutral-400 text-xs">({tCommon("optional")})</span>
              </Label>
              <Textarea
                rows={3}
                placeholder={locale === "fr" ? "Décrivez le projet ou l'idée de l'équipe..." : "Describe the team's project or idea..."}
                value={formDescription}
                maxLength={500}
                onChange={(e) => setFormDescription(e.target.value)}
              />
              <p className="text-xs text-neutral-400 text-right">{formDescription.length}/500</p>
            </div>

            {/* Membres */}
            <div className="space-y-2">
              <Label>
                {t("members")}{" "}
                <span className="text-neutral-400 text-xs">({tCommon("optional")})</span>
              </Label>
              {formAvailableParticipants.length === 0 && formMemberIds.size === 0 ? (
                <p className="text-sm text-neutral-400 py-2">
                  {locale === "fr"
                    ? "Tous les participants sont déjà dans une équipe"
                    : "All participants are already in a team"}
                </p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {/* Show current members (edit mode) that might not be in formAvailable */}
                  {editingTeam?.team_members
                    .filter((tm) => !formAvailableParticipants.find((p) => p.id === tm.participant_id))
                    .map((tm) => {
                      const p = tm.participants as ParticipantRow;
                      return (
                        <MemberCheckbox
                          key={p.id}
                          participant={p}
                          checked={formMemberIds.has(p.id)}
                          onChange={toggleMember}
                        />
                      );
                    })}
                  {formAvailableParticipants.map((p) => (
                    <MemberCheckbox
                      key={p.id}
                      participant={p}
                      checked={formMemberIds.has(p.id)}
                      onChange={toggleMember}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Leader */}
            {formMemberIds.size > 0 && (
              <div className="space-y-2">
                <Label>
                  {t("leader")}{" "}
                  <span className="text-neutral-400 text-xs">({tCommon("optional")})</span>
                </Label>
                <Select value={formLeaderId || "none"} onValueChange={(v) => setFormLeaderId(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={locale === "fr" ? "Sélectionner un leader" : "Select a leader"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      {locale === "fr" ? "Aucun leader" : "No leader"}
                    </SelectItem>
                    {selectedParticipants.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {getFullName(p.first_name, p.last_name) || p.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFormDialog(false)}>
              {tCommon("cancel")}
            </Button>
            <Button variant="accent" onClick={handleSave} disabled={isLoading || !formName.trim()}>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingTeam ? tCommon("save") : tCommon("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog ajout rapide membre ────────────────────────────────────── */}
      <Dialog open={showAddMemberDialog} onOpenChange={(open) => { setShowAddMemberDialog(open); if (!open) setAddMemberConflict(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("addMember")} — {addMemberTeam?.name}
            </DialogTitle>
          </DialogHeader>

          {/* Conflict UI */}
          {addMemberConflict && (
            <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-800">
                  <span className="font-medium">
                    {getFullName(addMemberConflict.participant.first_name, addMemberConflict.participant.last_name) || addMemberConflict.participant.email}
                  </span>{" "}
                  {locale === "fr"
                    ? `est déjà dans l'équipe "${addMemberConflict.currentTeam.name}".`
                    : `is already in team "${addMemberConflict.currentTeam.name}".`}
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setAddMemberConflict(null)}>
                  {tCommon("cancel")}
                </Button>
                <Button variant="accent" size="sm" onClick={handleMoveToTeam} disabled={isLoading}>
                  {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                  {locale === "fr"
                    ? `Déplacer vers "${addMemberTeam?.name}"`
                    : `Move to "${addMemberTeam?.name}"`}
                </Button>
              </div>
            </div>
          )}

          {!addMemberConflict && (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {participants.length === 0 ? (
                <p className="text-sm text-neutral-500 text-center py-4">
                  {locale === "fr" ? "Aucun participant" : "No participants"}
                </p>
              ) : (
                participants.map((p) => {
                  const currentTeam = getParticipantCurrentTeam(p.id);
                  const inThisTeam = currentTeam?.id === addMemberTeam?.id;
                  if (inThisTeam) return null;
                  return (
                    <button
                      key={p.id}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-neutral-200 hover:border-accent hover:bg-orange-50 transition-colors text-left"
                      onClick={() => handleQuickAddMember(p)}
                      disabled={isLoading}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary-100 text-primary-900 text-xs">
                          {getInitials(p.first_name, p.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{getFullName(p.first_name, p.last_name) || p.email}</p>
                        {currentTeam ? (
                          <p className="text-xs text-amber-500">{locale === "fr" ? `Dans : ${currentTeam.name}` : `In: ${currentTeam.name}`}</p>
                        ) : (
                          <p className="text-xs text-neutral-400">{p.email}</p>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddMemberDialog(false); setAddMemberConflict(null); }}>
              {tCommon("cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog import Excel ───────────────────────────────────────────── */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {locale === "fr" ? "Prévisualisation de l'import" : "Import preview"} —{" "}
              {importPreview.length} {locale === "fr" ? "équipe(s)" : "team(s)"}
            </DialogTitle>
          </DialogHeader>

          {importPreview.some((r) => r.hasWarnings) && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700">
                {locale === "fr"
                  ? "Certains membres sont signalés en orange : email non reconnu ou participant déjà dans une autre équipe. Ces affectations seront ignorées, mais l'équipe sera créée."
                  : "Some members are flagged in orange: unknown email or participant already in another team. Those assignments will be skipped, but the team will still be created."}
              </p>
            </div>
          )}

          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {importPreview.map((row, i) => (
              <div
                key={i}
                className={`border rounded-lg p-3 ${row.hasWarnings ? "border-amber-200 bg-amber-50/40" : "border-neutral-200"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-neutral-900">{row.teamName}</p>
                      {row.hasWarnings && (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                      )}
                    </div>
                    {row.description && (
                      <p className="text-xs text-neutral-500 mt-0.5 line-clamp-1">{row.description}</p>
                    )}
                  </div>
                </div>

                {/* Members */}
                {row.memberEmails.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {row.memberEmails.map((email, j) => {
                      const found = row.memberParticipants[j];
                      const warning = row.memberWarnings[j];
                      if (!found) {
                        return (
                          <span
                            key={j}
                            title={warning ?? undefined}
                            className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-xs text-amber-600 px-2 py-0.5 rounded-full line-through"
                          >
                            {email}
                          </span>
                        );
                      }
                      if (warning) {
                        return (
                          <span
                            key={j}
                            title={warning}
                            className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-xs text-amber-600 px-2 py-0.5 rounded-full"
                          >
                            <AlertTriangle className="h-3 w-3" />
                            {getFullName(found.first_name, found.last_name) || email}
                          </span>
                        );
                      }
                      return (
                        <span
                          key={j}
                          className="inline-flex items-center gap-1 bg-white border border-neutral-200 text-xs text-neutral-700 px-2 py-0.5 rounded-full"
                        >
                          {getFullName(found.first_name, found.last_name) || email}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              {tCommon("cancel")}
            </Button>
            <Button
              variant="accent"
              onClick={handleConfirmImport}
              disabled={isImporting || importPreview.length === 0}
            >
              {isImporting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {locale === "fr"
                ? `Créer ${importPreview.length} équipe(s)`
                : `Create ${importPreview.length} team(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog confirmation suppression ──────────────────────────────── */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              {tCommon("delete")} — {teamToDelete?.name}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-neutral-600">
            {locale === "fr"
              ? `Supprimer l'équipe "${teamToDelete?.name}" ? Les membres seront désaffectés mais non supprimés.`
              : `Delete team "${teamToDelete?.name}"? Members will be unassigned but not deleted.`}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              {tCommon("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <Trash2 className="h-4 w-4 mr-2" />
              {tCommon("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
