"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import {
  getParticipantStatusColor,
  getFullName,
  getInitials,
  downloadCSV,
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
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Participant, ParticipantStatus } from "@/types/database";

interface ParticipantWithTeam extends Participant {
  team_members: Array<{
    team_id: string;
    teams: { id: string; name: string };
  }>;
}

interface ParticipantsClientProps {
  locale: string;
  eventId: string;
  eventName: string;
  participants: ParticipantWithTeam[];
}

export function ParticipantsClient({
  locale,
  eventId,
  eventName,
  participants: initialParticipants,
}: ParticipantsClientProps) {
  const t = useTranslations("participants");
  const tCommon = useTranslations("common");
  const [participants, setParticipants] = useState(initialParticipants);
  const [search, setSearch] = useState("");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteLastName, setInviteLastName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  const filtered = participants.filter(
    (p) =>
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.from("participants").insert({
        event_id: eventId,
        email: inviteEmail,
        first_name: inviteFirstName || null,
        last_name: inviteLastName || null,
        status: "invited",
      });

      if (error) {
        if (error.code === "23505") {
          toast({
            title: locale === "fr" ? "Email déjà invité" : "Email already invited",
            variant: "destructive",
          });
          return;
        }
        toast({ title: tCommon("errorOccurred"), variant: "destructive" });
        return;
      }

      // Envoyer l'invitation par email via l'API
      await fetch("/api/notifications/invite-participant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          firstName: inviteFirstName,
          eventId,
          eventName,
          locale,
        }),
      });

      toast({ title: t("invited", { email: inviteEmail }) });
      setShowInviteDialog(false);
      setInviteEmail("");
      setInviteFirstName("");
      setInviteLastName("");

      // Recharger
      const { data } = await supabase
        .from("participants")
        .select(`*, team_members(team_id, teams(id, name))`)
        .eq("event_id", eventId)
        .order("invited_at", { ascending: false });
      if (data) setParticipants(data as ParticipantWithTeam[]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const Papa = (await import("papaparse")).default;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as Array<{
          email?: string;
          first_name?: string;
          last_name?: string;
        }>;
        const valid = rows.filter((r) => r.email);

        const inserts = valid.map((r) => ({
          event_id: eventId,
          email: r.email!,
          first_name: r.first_name || null,
          last_name: r.last_name || null,
          status: "invited" as ParticipantStatus,
        }));

        const { error } = await supabase.from("participants").upsert(inserts, {
          onConflict: "event_id,email",
          ignoreDuplicates: true,
        });

        if (error) {
          toast({ title: tCommon("errorOccurred"), variant: "destructive" });
          return;
        }

        toast({ title: t("csvImported", { count: inserts.length }) });

        const { data } = await supabase
          .from("participants")
          .select(`*, team_members(team_id, teams(id, name))`)
          .eq("event_id", eventId)
          .order("invited_at", { ascending: false });
        if (data) setParticipants(data as ParticipantWithTeam[]);
      },
    });

    // Reset
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemove = async (participantId: string) => {
    const { error } = await supabase
      .from("participants")
      .delete()
      .eq("id", participantId);

    if (!error) {
      setParticipants((prev) => prev.filter((p) => p.id !== participantId));
      toast({ title: t("removed") });
    }
  };

  const handleExport = () => {
    downloadCSV(
      participants.map((p) => ({
        email: p.email,
        first_name: p.first_name ?? "",
        last_name: p.last_name ?? "",
        status: p.status,
        team: p.team_members?.[0]?.teams?.name ?? "",
        invited_at: p.invited_at,
      })),
      `participants-${eventId}`
    );
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("title")}</h1>
          <p className="text-neutral-500 mt-1">{participants.length} {tCommon("total").toLowerCase()}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1.5" />
            {tCommon("export")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-1.5" />
            {t("importCsv")}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleCSVImport}
          />
          <Button variant="accent" size="sm" onClick={() => setShowInviteDialog(true)}>
            <UserPlus className="h-4 w-4 mr-1.5" />
            {t("invite")}
          </Button>
        </div>
      </div>

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
                  <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">
                    {t("name")}
                  </th>
                  <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">
                    {t("email")}
                  </th>
                  <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">
                    {t("team")}
                  </th>
                  <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">
                    {t("status")}
                  </th>
                  <th className="w-10 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((participant) => {
                  const team = participant.team_members?.[0]?.teams;
                  return (
                    <tr
                      key={participant.id}
                      className="border-b border-neutral-100 hover:bg-neutral-50 last:border-0"
                    >
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
                      <td className="px-4 py-3 text-sm text-neutral-600">
                        {team ? (
                          <Badge variant="secondary">{team.name}</Badge>
                        ) : (
                          <span className="text-neutral-400">{t("noTeam")}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`badge ${getParticipantStatusColor(participant.status)}`}
                        >
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
                            <DropdownMenuItem
                              onClick={() => handleRemove(participant.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {tCommon("remove")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Dialog invitation */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("invite")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("name").split(" ")[0]}</Label>
                <Input
                  placeholder="Jean"
                  value={inviteFirstName}
                  onChange={(e) => setInviteFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Nom</Label>
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
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              {tCommon("cancel")}
            </Button>
            <Button variant="accent" onClick={handleInvite} disabled={isLoading || !inviteEmail}>
              <Mail className="mr-2 h-4 w-4" />
              {tCommon("send")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
