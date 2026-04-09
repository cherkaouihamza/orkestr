"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { getInitials } from "@/lib/utils";
import {
  Plus,
  Star,
  Trophy,
  Users,
  Medal,
  Trash2,
  GripVertical,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { JuryMember, EvaluationCriterion, Evaluation } from "@/types/database";

interface Team {
  id: string;
  name: string;
  team_members: Array<{ count: number }>;
}

interface JuryClientProps {
  locale: string;
  eventId: string;
  eventName: string;
  juryMembers: JuryMember[];
  criteria: EvaluationCriterion[];
  teams: Team[];
  evaluations: Evaluation[];
}

export function JuryClient({
  locale,
  eventId,
  eventName,
  juryMembers: initialJury,
  criteria: initialCriteria,
  teams,
  evaluations: initialEvaluations,
}: JuryClientProps) {
  const t = useTranslations("jury");
  const tCommon = useTranslations("common");
  const [juryMembers, setJuryMembers] = useState(initialJury);
  const [criteria, setCriteria] = useState(initialCriteria);
  const [evaluations, setEvaluations] = useState(initialEvaluations);
  const [activeTab, setActiveTab] = useState<"jury" | "criteria" | "scoring" | "ranking">("jury");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showCriterionDialog, setShowCriterionDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Invite jury
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteLastName, setInviteLastName] = useState("");

  // Criterion form
  const [criterionName, setCriterionName] = useState("");
  const [criterionWeight, setCriterionWeight] = useState("20");
  const [criterionMaxScore, setCriterionMaxScore] = useState("10");

  const supabase = createClient();

  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);

  // Calculer les scores finaux
  const teamScores = teams.map((team) => {
    const teamEvals = evaluations.filter((e) => e.team_id === team.id);
    if (teamEvals.length === 0) return { team, score: null, juryCount: 0 };

    const juryIds = [...new Set(teamEvals.map((e) => e.jury_member_id))];
    let totalWeightedScore = 0;
    let totalWeight = 0;

    criteria.forEach((criterion) => {
      const criterionEvals = teamEvals.filter((e) => e.criterion_id === criterion.id);
      if (criterionEvals.length > 0) {
        const avgScore = criterionEvals.reduce((sum, e) => sum + e.score, 0) / criterionEvals.length;
        totalWeightedScore += (avgScore / criterion.max_score) * criterion.weight;
        totalWeight += criterion.weight;
      }
    });

    const score = totalWeight > 0 ? (totalWeightedScore / totalWeight) * 100 : 0;
    return { team, score: Math.round(score * 10) / 10, juryCount: juryIds.length };
  });

  const rankedTeams = [...teamScores]
    .filter((ts) => ts.score !== null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const handleInviteJury = async () => {
    if (!inviteEmail) return;
    setIsLoading(true);
    try {
      const { data: juryMember, error } = await supabase
        .from("jury_members")
        .insert({
          event_id: eventId,
          email: inviteEmail,
          first_name: inviteFirstName || null,
          last_name: inviteLastName || null,
        })
        .select()
        .single();

      if (error) {
        toast({ title: tCommon("errorOccurred"), variant: "destructive" });
        return;
      }

      await fetch("/api/notifications/invite-jury", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          firstName: inviteFirstName,
          eventId,
          eventName,
          token: juryMember.invite_token,
          locale,
        }),
      });

      toast({ title: t("scoresSubmitted") });
      setJuryMembers((prev) => [...prev, juryMember]);
      setInviteEmail("");
      setInviteFirstName("");
      setInviteLastName("");
      setShowInviteDialog(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCriterion = async () => {
    if (!criterionName || !criterionWeight) return;
    setIsLoading(true);
    try {
      const { data: criterion, error } = await supabase
        .from("evaluation_criteria")
        .insert({
          event_id: eventId,
          name: criterionName,
          weight: parseFloat(criterionWeight),
          max_score: parseFloat(criterionMaxScore),
          order_index: criteria.length,
        })
        .select()
        .single();

      if (error) {
        toast({ title: tCommon("errorOccurred"), variant: "destructive" });
        return;
      }

      setCriteria((prev) => [...prev, criterion]);
      setCriterionName("");
      setCriterionWeight("20");
      setCriterionMaxScore("10");
      setShowCriterionDialog(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCriterion = async (id: string) => {
    const { error } = await supabase.from("evaluation_criteria").delete().eq("id", id);
    if (!error) setCriteria((prev) => prev.filter((c) => c.id !== id));
  };

  const handleScoreChange = async (
    juryMemberId: string,
    teamId: string,
    criterionId: string,
    score: number
  ) => {
    const existing = evaluations.find(
      (e) =>
        e.jury_member_id === juryMemberId &&
        e.team_id === teamId &&
        e.criterion_id === criterionId
    );

    if (existing) {
      await supabase.from("evaluations").update({ score }).eq("id", existing.id);
      setEvaluations((prev) =>
        prev.map((e) => (e.id === existing.id ? { ...e, score } : e))
      );
    } else {
      const { data } = await supabase
        .from("evaluations")
        .insert({ event_id: eventId, jury_member_id: juryMemberId, team_id: teamId, criterion_id: criterionId, score })
        .select()
        .single();
      if (data) setEvaluations((prev) => [...prev, data]);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t("title")}</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-neutral-200 p-1 rounded-lg mb-6 w-fit">
        {(["jury", "criteria", "scoring", "ranking"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-white text-primary-900 shadow-sm"
                : "text-neutral-600 hover:text-primary-900"
            }`}
          >
            {tab === "jury"
              ? t("members")
              : tab === "criteria"
                ? t("criteria")
                : tab === "scoring"
                  ? t("scoring")
                  : t("ranking")}
          </button>
        ))}
      </div>

      {/* Jury Members */}
      {activeTab === "jury" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-neutral-500">{juryMembers.length} juré(s)</p>
            <Button variant="accent" size="sm" onClick={() => setShowInviteDialog(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              {t("invite")}
            </Button>
          </div>

          {juryMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-neutral-300 text-center">
              <Users className="h-12 w-12 text-neutral-300 mb-4" />
              <h3 className="text-neutral-600 font-medium mb-2">{t("noJury")}</h3>
              <p className="text-neutral-400 text-sm mb-6">{t("noJuryDescription")}</p>
              <Button variant="accent" onClick={() => setShowInviteDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t("invite")}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {juryMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 bg-white rounded-xl border border-neutral-200"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary-900 text-white text-sm">
                        {getInitials(member.first_name, member.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">
                        {member.first_name} {member.last_name}
                      </p>
                      <p className="text-xs text-neutral-400">{member.email}</p>
                    </div>
                  </div>
                  <Badge variant={member.accepted_at ? "success" : "secondary"}>
                    {member.accepted_at
                      ? locale === "fr" ? "Accepté" : "Accepted"
                      : locale === "fr" ? "En attente" : "Pending"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Criteria */}
      {activeTab === "criteria" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <p className="text-neutral-500">{criteria.length} critère(s)</p>
              {totalWeight !== 100 && criteria.length > 0 && (
                <Badge variant="warning">
                  Total: {totalWeight}% (≠ 100%)
                </Badge>
              )}
              {totalWeight === 100 && (
                <Badge variant="success">Total: 100% ✓</Badge>
              )}
            </div>
            <Button variant="accent" size="sm" onClick={() => setShowCriterionDialog(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              {t("addCriterion")}
            </Button>
          </div>

          <div className="space-y-2">
            {criteria.map((criterion) => (
              <div
                key={criterion.id}
                className="flex items-center gap-4 p-4 bg-white rounded-xl border border-neutral-200"
              >
                <GripVertical className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-neutral-900">{criterion.name}</p>
                  {criterion.description && (
                    <p className="text-xs text-neutral-400">{criterion.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-neutral-500">
                  <span>/ {criterion.max_score} pts</span>
                  <Badge variant="default">{criterion.weight}%</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-400 hover:text-red-600"
                  onClick={() => handleDeleteCriterion(criterion.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scoring Grid */}
      {activeTab === "scoring" && (
        <div className="overflow-x-auto">
          {criteria.length === 0 || teams.length === 0 ? (
            <p className="text-neutral-500 text-center py-12">
              {locale === "fr"
                ? "Ajoutez des critères et des équipes pour noter."
                : "Add criteria and teams to start scoring."}
            </p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left text-sm font-medium text-neutral-500 px-4 py-3 min-w-[120px]">
                    {t("members")}
                  </th>
                  <th className="text-left text-sm font-medium text-neutral-500 px-4 py-3 min-w-[140px]">
                    {locale === "fr" ? "Équipe" : "Team"}
                  </th>
                  {criteria.map((c) => (
                    <th
                      key={c.id}
                      className="text-center text-sm font-medium text-neutral-500 px-4 py-3 min-w-[120px]"
                    >
                      <div>{c.name}</div>
                      <div className="text-xs text-neutral-400">/ {c.max_score}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {juryMembers.flatMap((jury) =>
                  teams.map((team) => (
                    <tr
                      key={`${jury.id}-${team.id}`}
                      className="border-b border-neutral-100 hover:bg-neutral-50"
                    >
                      <td className="px-4 py-3 text-sm text-neutral-600">
                        {jury.first_name} {jury.last_name}
                      </td>
                      <td className="px-4 py-3 font-medium text-neutral-900">{team.name}</td>
                      {criteria.map((criterion) => {
                        const eval_ = evaluations.find(
                          (e) =>
                            e.jury_member_id === jury.id &&
                            e.team_id === team.id &&
                            e.criterion_id === criterion.id
                        );
                        return (
                          <td key={criterion.id} className="px-4 py-3 text-center">
                            <Input
                              type="number"
                              min="0"
                              max={criterion.max_score}
                              step="0.5"
                              defaultValue={eval_?.score ?? ""}
                              className="w-20 text-center mx-auto"
                              onBlur={(e) => {
                                const value = parseFloat(e.target.value);
                                if (!isNaN(value)) {
                                  handleScoreChange(jury.id, team.id, criterion.id, value);
                                }
                              }}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Ranking */}
      {activeTab === "ranking" && (
        <div>
          {rankedTeams.length === 0 ? (
            <p className="text-neutral-500 text-center py-12">
              {locale === "fr"
                ? "Aucune note enregistrée pour le moment."
                : "No scores recorded yet."}
            </p>
          ) : (
            <div className="space-y-3">
              {rankedTeams.map((ts, index) => (
                <div
                  key={ts.team.id}
                  className={`flex items-center gap-4 p-5 rounded-xl border ${
                    index === 0
                      ? "bg-yellow-50 border-yellow-200"
                      : index === 1
                        ? "bg-neutral-50 border-neutral-200"
                        : index === 2
                          ? "bg-orange-50 border-orange-200"
                          : "bg-white border-neutral-200"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                      index === 0
                        ? "bg-yellow-400 text-white"
                        : index === 1
                          ? "bg-neutral-400 text-white"
                          : index === 2
                            ? "bg-orange-400 text-white"
                            : "bg-neutral-200 text-neutral-600"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-neutral-900">{ts.team.name}</h3>
                    <p className="text-xs text-neutral-400">
                      {ts.juryCount} {locale === "fr" ? "juré(s)" : "juror(s)"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary-900">{ts.score}</p>
                    <p className="text-xs text-neutral-400">/ 100</p>
                  </div>
                  {index < 3 && (
                    <Medal
                      className={`h-6 w-6 ${
                        index === 0
                          ? "text-yellow-400"
                          : index === 1
                            ? "text-neutral-400"
                            : "text-orange-400"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dialog invitation jury */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("invite")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Prénom</Label>
                <Input
                  value={inviteFirstName}
                  onChange={(e) => setInviteFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input
                  value={inviteLastName}
                  onChange={(e) => setInviteLastName(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              {tCommon("cancel")}
            </Button>
            <Button variant="accent" onClick={handleInviteJury} disabled={isLoading || !inviteEmail}>
              {tCommon("send")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog critère */}
      <Dialog open={showCriterionDialog} onOpenChange={setShowCriterionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addCriterion")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("criterionName")} *</Label>
              <Input value={criterionName} onChange={(e) => setCriterionName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("weight")} *</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={criterionWeight}
                  onChange={(e) => setCriterionWeight(e.target.value)}
                />
                {totalWeight + parseFloat(criterionWeight || "0") > 100 && (
                  <p className="text-xs text-error">{t("weightError")}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>{t("maxScore")}</Label>
                <Input
                  type="number"
                  min="1"
                  value={criterionMaxScore}
                  onChange={(e) => setCriterionMaxScore(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCriterionDialog(false)}>
              {tCommon("cancel")}
            </Button>
            <Button
              variant="accent"
              onClick={handleAddCriterion}
              disabled={isLoading || !criterionName}
            >
              {tCommon("add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
