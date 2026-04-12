"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { toast } from "@/components/ui/use-toast";
import {
  getParticipantStatusColor,
  getFullName,
  getInitials,
} from "@/lib/utils";
import {
  UserPlus,
  Upload,
  Download,
  Search,
  MoreHorizontal,
  Mail,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronRight,
  CheckSquare,
  Square,
  HelpCircle,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Participant, ParticipantStatus, EventType } from "@/types/database";

interface ParticipantWithTeam extends Participant {
  team_members: Array<{
    team_id: string;
    teams: { id: string; name: string };
  }>;
}

interface Team {
  id: string;
  name: string;
}

interface CsvRow {
  email: string;
  firstName: string;
  lastName: string;
  projectTitle: string;
  valid: boolean;
  error?: string;
}

interface ParticipantsClientProps {
  locale: string;
  eventId: string;
  eventName: string;
  spaceName: string;
  eventType: EventType;
  teamsEnabled: boolean;
  teams: Team[];
  participants: ParticipantWithTeam[];
}

export function ParticipantsClient({
  locale,
  eventId,
  eventName,
  spaceName,
  eventType,
  teamsEnabled,
  teams: initialTeams,
  participants: initialParticipants,
}: ParticipantsClientProps) {
  const t = useTranslations("participants");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [participants, setParticipants] = useState(initialParticipants);
  const [teams, setTeams] = useState(initialTeams);
  const [search, setSearch] = useState("");

  // Invite dialog
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteLastName, setInviteLastName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteProjectTitle, setInviteProjectTitle] = useState("");
  const [inviteProjectDescription, setInviteProjectDescription] = useState("");
  const [inviteSkills, setInviteSkills] = useState("");
  const [inviteTeamId, setInviteTeamId] = useState<string>("");
  const [newTeamName, setNewTeamName] = useState("");
  const [inviteEmailError, setInviteEmailError] = useState<string | null>(null);

  // CSV preview
  const [showCsvPreview, setShowCsvPreview] = useState(false);
  const [csvPreviewRows, setCsvPreviewRows] = useState<CsvRow[]>([]);
  const [csvRawInserts, setCsvRawInserts] = useState<object[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Expanded rows (project details)
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Multi-select delete
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Assign team dialog
  const [showAssignTeamDialog, setShowAssignTeamDialog] = useState(false);
  const [assignTeamParticipant, setAssignTeamParticipant] = useState<ParticipantWithTeam | null>(null);
  const [assignTeamId, setAssignTeamId] = useState<string>("");

  const supabase = createClient();

  const filtered = participants.filter(
    (p) =>
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  const reloadParticipants = async () => {
    const { data } = await supabase
      .from("participants")
      .select(`*, team_members(team_id, teams(id, name))`)
      .eq("event_id", eventId)
      .order("invited_at", { ascending: false });
    if (data) setParticipants(data as ParticipantWithTeam[]);
    router.refresh();
  };

  // ── Invite ────────────────────────────────────────────────────────────────

  const resetInviteForm = () => {
    setInviteEmail("");
    setInviteFirstName("");
    setInviteLastName("");
    setInvitePhone("");
    setInviteProjectTitle("");
    setInviteProjectDescription("");
    setInviteSkills("");
    setInviteTeamId("");
    setNewTeamName("");
    setInviteEmailError(null);
  };

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviteEmailError(null);
    setIsLoading(true);
    try {
      const metadata: Record<string, string> = {};
      if (invitePhone) metadata.phone = invitePhone;
      if (inviteProjectTitle) metadata.projectTitle = inviteProjectTitle;
      if (inviteProjectDescription) metadata.projectDescription = inviteProjectDescription;
      if (inviteSkills) metadata.skills = inviteSkills;

      const { data: participant, error } = await supabase
        .from("participants")
        .insert({
          event_id: eventId,
          email: inviteEmail,
          first_name: inviteFirstName || null,
          last_name: inviteLastName || null,
          status: "invited",
          metadata: {
            phone: invitePhone || null,
            projectTitle: inviteProjectTitle || null,
            projectDescription: inviteProjectDescription || null,
            skills: inviteSkills || null,
          },
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          setInviteEmailError(
            locale === "fr"
              ? "Un participant avec cet email est déjà inscrit à cet événement"
              : "A participant with this email is already registered for this event"
          );
          return;
        }
        toast({ title: tCommon("errorOccurred"), variant: "destructive" });
        return;
      }

      // Assign team if selected
      if (participant && inviteTeamId && inviteTeamId !== "new" && inviteTeamId !== "none") {
        await supabase.from("team_members").insert({
          team_id: inviteTeamId,
          participant_id: participant.id,
        });
      } else if (participant && inviteTeamId === "new" && newTeamName.trim()) {
        const { data: newTeam } = await supabase
          .from("teams")
          .insert({ event_id: eventId, name: newTeamName.trim() })
          .select()
          .single();
        if (newTeam) {
          await supabase.from("team_members").insert({
            team_id: newTeam.id,
            participant_id: participant.id,
          });
          setTeams((prev) => [...prev, newTeam]);
        }
      }

      await fetch("/api/notifications/invite-participant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, firstName: inviteFirstName, eventId, eventName, locale }),
      });

      toast({ title: t("invited", { email: inviteEmail }) });
      setShowInviteDialog(false);
      resetInviteForm();
      await reloadParticipants();
    } finally {
      setIsLoading(false);
    }
  };

  // ── CSV ───────────────────────────────────────────────────────────────────

  const handleCSVFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const Papa = (await import("papaparse")).default;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as Array<Record<string, string>>;

        const preview: CsvRow[] = rows.map((r) => {
          const email = r.email?.trim() ?? "";
          const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
          return {
            email,
            firstName: r.firstName || r.first_name || "",
            lastName: r.lastName || r.last_name || "",
            projectTitle: r.projectTitle || "",
            valid,
            error: !email
              ? locale === "fr" ? "Email manquant" : "Missing email"
              : !valid
              ? locale === "fr" ? "Email invalide" : "Invalid email"
              : undefined,
          };
        });

        const inserts = rows
          .filter((r) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email?.trim() ?? ""))
          .map((r) => {
            return {
              event_id: eventId,
              email: r.email.trim(),
              first_name: r.firstName || r.first_name || null,
              last_name: r.lastName || r.last_name || null,
              status: "invited" as ParticipantStatus,
              metadata: {
                phone: r.phone || null,
                projectTitle: r.projectTitle || null,
                projectDescription: r.projectDescription || null,
                skills: r.skills || null,
              },
            };
          });

        setCsvPreviewRows(preview);
        setCsvRawInserts(inserts);
        setShowCsvPreview(true);
      },
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleConfirmImport = async () => {
    if (csvRawInserts.length === 0) return;
    setIsImporting(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from("participants").upsert(csvRawInserts as any, {
        onConflict: "event_id,email",
        ignoreDuplicates: true,
      });

      if (error) {
        toast({ title: tCommon("errorOccurred"), variant: "destructive" });
        return;
      }

      toast({ title: t("csvImported", { count: csvRawInserts.length }) });
      setShowCsvPreview(false);
      await reloadParticipants();
    } finally {
      setIsImporting(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((p) => p.id)));
    }
  };

  const handleDeleteSelected = async () => {
    setIsDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase.from("participants").delete().in("id", ids);
      if (error) {
        toast({ title: tCommon("errorOccurred"), variant: "destructive" });
        return;
      }
      setParticipants((prev) => prev.filter((p) => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
      setShowDeleteConfirm(false);
      toast({ title: t("removed") });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteOne = async (participantId: string) => {
    const { error } = await supabase.from("participants").delete().eq("id", participantId);
    if (!error) {
      setParticipants((prev) => prev.filter((p) => p.id !== participantId));
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(participantId); return n; });
      toast({ title: t("removed") });
    }
  };

  // ── Assign team ───────────────────────────────────────────────────────────

  const openAssignTeamDialog = (participant: ParticipantWithTeam) => {
    setAssignTeamParticipant(participant);
    const currentTeamId = participant.team_members?.[0]?.team_id ?? "none";
    setAssignTeamId(currentTeamId);
    setShowAssignTeamDialog(true);
  };

  const handleAssignTeam = async () => {
    if (!assignTeamParticipant) return;
    const participantId = assignTeamParticipant.id;
    const currentTeamId = assignTeamParticipant.team_members?.[0]?.team_id;

    // Remove existing membership
    if (currentTeamId) {
      await supabase
        .from("team_members")
        .delete()
        .eq("participant_id", participantId)
        .eq("team_id", currentTeamId);
    }

    // Insert new membership
    if (assignTeamId && assignTeamId !== "none") {
      const { error } = await supabase.from("team_members").insert({
        team_id: assignTeamId,
        participant_id: participantId,
      });
      if (error) {
        toast({ title: tCommon("errorOccurred"), variant: "destructive" });
        return;
      }
    }

    setShowAssignTeamDialog(false);
    setAssignTeamParticipant(null);
    await reloadParticipants();
  };

  // ── Export / Template ─────────────────────────────────────────────────────

  const handleDownloadTemplate = () => {
    const content = [
      "email,firstName,lastName,phone,projectTitle,projectDescription,skills",
      "jean.dupont@exemple.com,Jean,Dupont,+33612345678,EcoTrack,Application de suivi carbone personnel,React Native; Python",
      "sara.martin@exemple.com,Sara,Martin,+33698765432,MediConnect,Plateforme de télémédecine rurale,Vue.js; Node.js; PostgreSQL",
    ].join("\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "participants_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    const XLSX = await import("xlsx");
    const now = new Date();
    const datePart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}`;
    const safeName = (s: string) => s.replace(/[^a-z0-9]/gi, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
    const fileName = `${safeName(spaceName)}_${safeName(eventName)}_participants_${datePart}.xlsx`;

    const rows = participants.map((p) => {
      const meta = p.metadata as Record<string, string> | null;
      return {
        Email: p.email,
        Prénom: p.first_name ?? "",
        Nom: p.last_name ?? "",
        Statut: p.status,
        Équipe: p.team_members?.[0]?.teams?.name ?? "",
        Téléphone: meta?.phone ?? "",
        Projet: meta?.projectTitle ?? "",
        "Description projet": meta?.projectDescription ?? "",
        Compétences: meta?.skills ?? "",
        "Invité le": p.invited_at ?? "",
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Participants");
    XLSX.writeFile(wb, fileName);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const invalidCount = csvPreviewRows.filter((r) => !r.valid).length;
  const validCount = csvPreviewRows.filter((r) => r.valid).length;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("title")}</h1>
          <p className="text-neutral-500 mt-1">
            {participants.length} {tCommon("total").toLowerCase()}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1.5" />
            {tCommon("export")}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <Download className="h-4 w-4 mr-1.5" />
            {t("csvTemplate")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-1.5" />
            {t("importCsv")}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleCSVFile}
          />
          <Button variant="accent" size="sm" onClick={() => setShowInviteDialog(true)}>
            <UserPlus className="h-4 w-4 mr-1.5" />
            {t("invite")}
          </Button>
        </div>
      </div>

      {/* Bulk delete bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-4 py-2 mb-4">
          <span className="text-sm text-red-700 font-medium">
            {selectedIds.size} {locale === "fr" ? "participant(s) sélectionné(s)" : "participant(s) selected"}
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            {locale === "fr" ? "Supprimer la sélection" : "Delete selected"}
          </Button>
        </div>
      )}

      {/* Recherche */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
        <Input
          placeholder={tCommon("search") + "..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-neutral-500">{t("noParticipants")}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="px-4 py-3 w-8">
                    <button onClick={toggleSelectAll} className="flex items-center">
                      {selectedIds.size === filtered.length && filtered.length > 0 ? (
                        <CheckSquare className="h-4 w-4 text-accent" />
                      ) : (
                        <Square className="h-4 w-4 text-neutral-400" />
                      )}
                    </button>
                  </th>
                  <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">
                    {t("name")}
                  </th>
                  <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">
                    {t("email")}
                  </th>
                  <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">
                    {t("projectTitle")}
                  </th>
                  {teamsEnabled && (
                    <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">
                      {t("team")}
                    </th>
                  )}
                  <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">
                    {t("status")}
                  </th>
                  <th className="w-10 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((participant) => {
                  const team = participant.team_members?.[0]?.teams;
                  const meta = participant.metadata as Record<string, string> | null;
                  const projectTitle = meta?.projectTitle;
                  const projectDescription = meta?.projectDescription;
                  const skills = meta?.skills;
                  const isExpanded = expandedId === participant.id;
                  const hasDetails = projectDescription || skills;

                  return (
                    <>
                      <tr
                        key={participant.id}
                        className="border-b border-neutral-100 hover:bg-neutral-50 last:border-0"
                      >
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleSelect(participant.id)}
                            className="flex items-center"
                          >
                            {selectedIds.has(participant.id) ? (
                              <CheckSquare className="h-4 w-4 text-accent" />
                            ) : (
                              <Square className="h-4 w-4 text-neutral-400" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary-100 text-primary-900 text-xs">
                                {getInitials(participant.first_name, participant.last_name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium text-neutral-900">
                              {getFullName(participant.first_name, participant.last_name)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600">
                          {participant.email}
                        </td>
                        <td className="px-4 py-3">
                          {projectTitle ? (
                            <div className="flex items-center gap-1.5">
                              <Badge variant="secondary" className="text-xs font-normal">
                                {projectTitle}
                              </Badge>
                              {hasDetails && (
                                <button
                                  onClick={() => setExpandedId(isExpanded ? null : participant.id)}
                                  className="text-neutral-400 hover:text-neutral-600"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  ) : (
                                    <ChevronRight className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-neutral-300">—</span>
                          )}
                        </td>
                        {teamsEnabled && (
                          <td className="px-4 py-3 text-sm text-neutral-600">
                            {team ? (
                              <Badge variant="secondary">{team.name}</Badge>
                            ) : (
                              <span className="text-neutral-400">{t("noTeam")}</span>
                            )}
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <span className={`badge ${getParticipantStatusColor(participant.status)}`}>
                            {t(`statuses.${participant.status as ParticipantStatus}`)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                {t("resendInvite")}
                              </DropdownMenuItem>
                              {teamsEnabled && (
                                <DropdownMenuItem onClick={() => openAssignTeamDialog(participant)}>
                                  <Users className="mr-2 h-4 w-4" />
                                  {locale === "fr" ? "Affecter à une équipe" : "Assign to team"}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => handleDeleteOne(participant.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {tCommon("delete")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                      {isExpanded && hasDetails && (
                        <tr key={`${participant.id}-details`} className="bg-neutral-50 border-b border-neutral-100">
                          <td colSpan={7} className="px-4 pb-3 pt-0">
                            <div className="ml-14 space-y-1.5 text-sm text-neutral-600">
                              {projectDescription && (
                                <p className="leading-relaxed">{projectDescription}</p>
                              )}
                              {skills && (
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  {skills.split(/[;,]/).map((s) => s.trim()).filter(Boolean).map((skill) => (
                                    <span
                                      key={skill}
                                      className="bg-white border border-neutral-200 text-xs text-neutral-600 px-2 py-0.5 rounded-full"
                                    >
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* ── Dialog invitation ─────────────────────────────────────────────── */}
      <Dialog open={showInviteDialog} onOpenChange={(open) => { setShowInviteDialog(open); if (!open) resetInviteForm(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("invite")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("firstName")}</Label>
                <Input
                  placeholder="Jean"
                  value={inviteFirstName}
                  onChange={(e) => setInviteFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("lastName")}</Label>
                <Input
                  placeholder="Dupont"
                  value={inviteLastName}
                  onChange={(e) => setInviteLastName(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("email")} *</Label>
              <Input
                type="email"
                placeholder="jean@exemple.com"
                value={inviteEmail}
                onChange={(e) => { setInviteEmail(e.target.value); setInviteEmailError(null); }}
                className={inviteEmailError ? "border-red-400 focus-visible:ring-red-400" : ""}
              />
              {inviteEmailError && (
                <p className="text-xs text-red-500">{inviteEmailError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>
                {t("phone")}{" "}
                <span className="text-neutral-400 text-xs">({tCommon("optional")})</span>
              </Label>
              <Input
                type="tel"
                placeholder="+33612345678"
                value={invitePhone}
                onChange={(e) => setInvitePhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>
                {t("projectTitle")}{" "}
                <span className="text-neutral-400 text-xs">({tCommon("optional")})</span>
              </Label>
              <Input
                placeholder="EcoTrack"
                value={inviteProjectTitle}
                onChange={(e) => setInviteProjectTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>
                {t("projectDescription")}{" "}
                <span className="text-neutral-400 text-xs">({tCommon("optional")})</span>
              </Label>
              <Textarea
                rows={3}
                placeholder={t("projectDescriptionPlaceholder")}
                value={inviteProjectDescription}
                maxLength={500}
                onChange={(e) => setInviteProjectDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>
                {t("skills")}{" "}
                <span className="text-neutral-400 text-xs">({tCommon("optional")})</span>
              </Label>
              <Input
                placeholder={t("skillsPlaceholder")}
                value={inviteSkills}
                onChange={(e) => setInviteSkills(e.target.value)}
              />
            </div>

            {/* Équipe — uniquement si teamsEnabled */}
            {teamsEnabled && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label>
                    {t("team")}{" "}
                    <span className="text-neutral-400 text-xs">({tCommon("optional")})</span>
                  </Label>
                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3.5 w-3.5 text-neutral-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        {locale === "fr"
                          ? "Vous pouvez aussi affecter les participants aux équipes depuis l'onglet Équipes"
                          : "You can also assign participants to teams from the Teams tab"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {teams.length === 0 ? (
                  <p className="text-sm text-neutral-400">
                    {locale === "fr" ? "Aucune équipe créée — " : "No teams yet — "}
                    <Link
                      href={`/${locale}/events/${eventId}/teams`}
                      className="text-accent hover:underline"
                      onClick={() => setShowInviteDialog(false)}
                    >
                      {locale === "fr" ? "créer des équipes" : "create teams"}
                    </Link>
                  </p>
                ) : (
                  <>
                    <Select value={inviteTeamId} onValueChange={setInviteTeamId}>
                      <SelectTrigger>
                        <SelectValue placeholder={locale === "fr" ? "Sélectionner une équipe" : "Select a team"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          {locale === "fr" ? "Aucune équipe" : "No team"}
                        </SelectItem>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                        <SelectItem value="new">
                          + {locale === "fr" ? "Créer une nouvelle équipe" : "Create new team"}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {inviteTeamId === "new" && (
                      <Input
                        placeholder={locale === "fr" ? "Nom de la nouvelle équipe" : "New team name"}
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        className="mt-2"
                      />
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Info box */}
          <div className="flex items-start gap-2 bg-neutral-50 border border-neutral-200 rounded-lg p-3 mt-2">
            <Mail className="h-4 w-4 text-neutral-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-neutral-500">
              {locale === "fr"
                ? "Une invitation par email sera envoyée automatiquement à ce participant."
                : "An invitation email will automatically be sent to this participant."}
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowInviteDialog(false); resetInviteForm(); }}>
              {tCommon("cancel")}
            </Button>
            <Button variant="accent" onClick={handleInvite} disabled={isLoading || !inviteEmail}>
              <Mail className="mr-2 h-4 w-4" />
              {tCommon("send")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog prévisualisation CSV ───────────────────────────────────── */}
      <Dialog open={showCsvPreview} onOpenChange={setShowCsvPreview}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {locale === "fr" ? "Prévisualisation de l'import" : "Import preview"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Stats */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700 bg-green-50 px-3 py-1 rounded-full">
                ✓ {validCount} {locale === "fr" ? "valide(s)" : "valid"}
              </span>
              {invalidCount > 0 && (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-700 bg-red-50 px-3 py-1 rounded-full">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {invalidCount} {locale === "fr" ? "erreur(s)" : "error(s)"}
                </span>
              )}
            </div>

            {/* Info box */}
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-700">
                {locale === "fr"
                  ? "Une invitation par email sera envoyée à chaque participant après validation."
                  : "An invitation email will be sent to each participant after confirmation."}
              </p>
            </div>

            {/* Table preview */}
            <div className="border border-neutral-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    <th className="text-left text-xs font-medium text-neutral-500 px-3 py-2">{t("email")}</th>
                    <th className="text-left text-xs font-medium text-neutral-500 px-3 py-2">{t("firstName")}</th>
                    <th className="text-left text-xs font-medium text-neutral-500 px-3 py-2">{t("lastName")}</th>
                    <th className="text-left text-xs font-medium text-neutral-500 px-3 py-2">{t("projectTitle")}</th>
                    <th className="w-8 px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {csvPreviewRows.map((row, i) => (
                    <tr
                      key={i}
                      className={`border-b border-neutral-100 last:border-0 ${!row.valid ? "bg-red-50" : ""}`}
                    >
                      <td className="px-3 py-2 text-neutral-700 font-mono text-xs">{row.email || "—"}</td>
                      <td className="px-3 py-2 text-neutral-600">{row.firstName || "—"}</td>
                      <td className="px-3 py-2 text-neutral-600">{row.lastName || "—"}</td>
                      <td className="px-3 py-2 text-neutral-600">{row.projectTitle || "—"}</td>
                      <td className="px-3 py-2">
                        {!row.valid && (
                          <span title={row.error}>
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {invalidCount > 0 && (
              <p className="text-xs text-red-600">
                {locale === "fr"
                  ? `${invalidCount} ligne(s) invalide(s) seront ignorées lors de l'import.`
                  : `${invalidCount} invalid row(s) will be skipped during import.`}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCsvPreview(false)}>
              {tCommon("cancel")}
            </Button>
            <Button
              variant="accent"
              onClick={handleConfirmImport}
              disabled={isImporting || validCount === 0}
            >
              {locale === "fr"
                ? `Confirmer l'import (${validCount})`
                : `Confirm import (${validCount})`}
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
              {locale === "fr" ? "Confirmer la suppression" : "Confirm deletion"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-neutral-600">
            {locale === "fr"
              ? `Vous allez supprimer ${selectedIds.size} participant(s). Cette action est irréversible.`
              : `You are about to delete ${selectedIds.size} participant(s). This action cannot be undone.`}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              {tCommon("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDeleteSelected} disabled={isDeleting}>
              <Trash2 className="h-4 w-4 mr-2" />
              {tCommon("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog affecter à une équipe ──────────────────────────────────── */}
      <Dialog
        open={showAssignTeamDialog}
        onOpenChange={(open) => { setShowAssignTeamDialog(open); if (!open) setAssignTeamParticipant(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {locale === "fr" ? "Affecter à une équipe" : "Assign to team"}
            </DialogTitle>
          </DialogHeader>
          {assignTeamParticipant && (
            <div className="space-y-4">
              <p className="text-sm text-neutral-600">
                {getFullName(assignTeamParticipant.first_name, assignTeamParticipant.last_name) || assignTeamParticipant.email}
              </p>
              {teams.length === 0 ? (
                <p className="text-sm text-neutral-400">
                  {locale === "fr" ? "Aucune équipe créée pour cet événement." : "No teams created for this event."}
                </p>
              ) : (
                <div className="space-y-2">
                  <Label>{locale === "fr" ? "Équipe" : "Team"}</Label>
                  <Select value={assignTeamId} onValueChange={setAssignTeamId}>
                    <SelectTrigger>
                      <SelectValue placeholder={locale === "fr" ? "Sélectionner une équipe" : "Select a team"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        {locale === "fr" ? "Aucune équipe" : "No team"}
                      </SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignTeamDialog(false)}>
              {tCommon("cancel")}
            </Button>
            <Button variant="accent" onClick={handleAssignTeam} disabled={teams.length === 0}>
              {tCommon("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
