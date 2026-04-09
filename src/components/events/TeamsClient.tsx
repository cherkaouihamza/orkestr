"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/components/ui/use-toast";
import { getInitials, getFullName } from "@/lib/utils";
import { Plus, Users, Trash2, UserMinus, Trophy } from "lucide-react";
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

interface TeamsClientProps {
  locale: string;
  eventId: string;
  teams: Team[];
  participants: Pick<Participant, "id" | "first_name" | "last_name" | "email" | "status">[];
}

export function TeamsClient({ locale, eventId, teams: initialTeams, participants }: TeamsClientProps) {
  const t = useTranslations("teams");
  const tCommon = useTranslations("common");
  const [teams, setTeams] = useState(initialTeams);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamName, setTeamName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedParticipantId, setSelectedParticipantId] = useState("");

  const supabase = createClient();

  const assignedParticipantIds = new Set(
    teams.flatMap((team) => team.team_members.map((tm) => tm.participant_id))
  );

  const unassignedParticipants = participants.filter(
    (p) => !assignedParticipantIds.has(p.id)
  );

  const handleCreateTeam = async () => {
    if (!teamName.trim()) return;
    setIsLoading(true);
    try {
      const { data: team, error } = await supabase
        .from("teams")
        .insert({ event_id: eventId, name: teamName })
        .select(`*, team_members(participant_id, participants(id, first_name, last_name, email))`)
        .single();

      if (error) {
        toast({ title: tCommon("errorOccurred"), variant: "destructive" });
        return;
      }

      toast({ title: t("created") });
      setTeams((prev) => [...prev, team as Team]);
      setTeamName("");
      setShowCreateDialog(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedTeam || !selectedParticipantId) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.from("team_members").insert({
        team_id: selectedTeam.id,
        participant_id: selectedParticipantId,
      });

      if (error) {
        toast({ title: tCommon("errorOccurred"), variant: "destructive" });
        return;
      }

      // Recharger les équipes
      const { data: updatedTeams } = await supabase
        .from("teams")
        .select(`*, team_members(participant_id, participants(id, first_name, last_name, email))`)
        .eq("event_id", eventId)
        .order("name");

      if (updatedTeams) setTeams(updatedTeams as Team[]);
      setSelectedParticipantId("");
      setShowAddMemberDialog(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (teamId: string, participantId: string) => {
    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("team_id", teamId)
      .eq("participant_id", participantId);

    if (!error) {
      setTeams((prev) =>
        prev.map((team) =>
          team.id === teamId
            ? {
                ...team,
                team_members: team.team_members.filter(
                  (tm) => tm.participant_id !== participantId
                ),
              }
            : team
        )
      );
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    const { error } = await supabase.from("teams").delete().eq("id", teamId);
    if (!error) {
      setTeams((prev) => prev.filter((t) => t.id !== teamId));
      toast({ title: t("deleted") });
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("title")}</h1>
          <p className="text-neutral-500 mt-1">
            {teams.length} équipe(s) · {participants.length} participant(s)
          </p>
        </div>
        <Button variant="accent" size="sm" onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          {t("create")}
        </Button>
      </div>

      {teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-xl border border-neutral-300">
          <Trophy className="h-12 w-12 text-neutral-300 mb-4" />
          <h3 className="text-neutral-600 font-medium mb-2">{t("noTeams")}</h3>
          <p className="text-neutral-400 text-sm mb-6 max-w-xs">{t("noTeamsDescription")}</p>
          <Button variant="accent" onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t("create")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {teams.map((team) => (
            <Card key={team.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{team.name}</CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        setSelectedTeam(team);
                        setShowAddMemberDialog(true);
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:text-red-700"
                      onClick={() => handleDeleteTeam(team.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-neutral-500">
                  {t("membersCount", { count: team.team_members.length })}
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                {team.team_members.length === 0 ? (
                  <div className="flex items-center justify-center py-6 text-neutral-400 text-sm border-2 border-dashed border-neutral-200 rounded-lg">
                    <Users className="h-4 w-4 mr-2" />
                    {locale === "fr" ? "Aucun membre" : "No members"}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {team.team_members.map((tm) => {
                      const p = tm.participants;
                      return (
                        <div
                          key={tm.participant_id}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="bg-primary-100 text-primary-900 text-xs">
                                {getInitials(p.first_name, p.last_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium text-neutral-900">
                                {getFullName(p.first_name, p.last_name)}
                              </p>
                              <p className="text-xs text-neutral-400">{p.email}</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-neutral-400 hover:text-red-500"
                            onClick={() => handleRemoveMember(team.id, tm.participant_id)}
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
          ))}
        </div>
      )}

      {/* Dialog création d'équipe */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("create")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>{t("name")} *</Label>
            <Input
              placeholder={t("namePlaceholder")}
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateTeam()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {tCommon("cancel")}
            </Button>
            <Button variant="accent" onClick={handleCreateTeam} disabled={isLoading || !teamName}>
              {tCommon("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog ajout membre */}
      <Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("addMember")} — {selectedTeam?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {unassignedParticipants.length === 0 ? (
              <p className="text-sm text-neutral-500 text-center py-4">
                {locale === "fr"
                  ? "Tous les participants sont déjà dans une équipe"
                  : "All participants are already in a team"}
              </p>
            ) : (
              unassignedParticipants.map((p) => (
                <label
                  key={p.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedParticipantId === p.id
                      ? "border-accent bg-orange-50"
                      : "border-neutral-200 hover:border-neutral-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="participant"
                    value={p.id}
                    checked={selectedParticipantId === p.id}
                    onChange={() => setSelectedParticipantId(p.id)}
                    className="hidden"
                  />
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary-100 text-primary-900 text-xs">
                      {getInitials(p.first_name, p.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{getFullName(p.first_name, p.last_name)}</p>
                    <p className="text-xs text-neutral-400">{p.email}</p>
                  </div>
                </label>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMemberDialog(false)}>
              {tCommon("cancel")}
            </Button>
            <Button
              variant="accent"
              onClick={handleAddMember}
              disabled={isLoading || !selectedParticipantId}
            >
              {t("addMember")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
