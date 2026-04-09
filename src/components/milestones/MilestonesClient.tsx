"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  getMilestoneStatusColor,
  calculateCompletionRate,
  formatDateTime,
} from "@/lib/utils";
import {
  Plus,
  FileText,
  Link as LinkIcon,
  AlignLeft,
  FormInput,
  Clock,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Milestone, MilestoneType, MilestoneStatus, Submission } from "@/types/database";

interface MilestoneWithDetails extends Milestone {
  form_fields: Array<{ id: string }>;
  submissions: Array<Pick<Submission, "id" | "status" | "participant_id" | "team_id">>;
}

interface MilestonesClientProps {
  locale: string;
  eventId: string;
  milestones: MilestoneWithDetails[];
  participantCount: number;
}

const TYPE_ICONS: Record<MilestoneType, React.ComponentType<{ className?: string }>> = {
  file: FileText,
  url: LinkIcon,
  text: AlignLeft,
  form: FormInput,
};

export function MilestonesClient({
  locale,
  eventId,
  milestones: initialMilestones,
  participantCount,
}: MilestonesClientProps) {
  const t = useTranslations("milestones");
  const tCommon = useTranslations("common");
  const [milestones, setMilestones] = useState(initialMilestones);
  const [showDialog, setShowDialog] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<MilestoneWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<MilestoneType>("file");
  const [openAt, setOpenAt] = useState("");
  const [closeAt, setCloseAt] = useState("");

  const supabase = createClient();

  const openCreate = () => {
    setEditingMilestone(null);
    setName("");
    setDescription("");
    setType("file");
    setOpenAt("");
    setCloseAt("");
    setShowDialog(true);
  };

  const openEdit = (milestone: MilestoneWithDetails) => {
    setEditingMilestone(milestone);
    setName(milestone.name);
    setDescription(milestone.description ?? "");
    setType(milestone.type);
    setOpenAt(milestone.open_at?.slice(0, 16) ?? "");
    setCloseAt(milestone.close_at?.slice(0, 16) ?? "");
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!name) return;
    setIsLoading(true);

    try {
      const data = {
        event_id: eventId,
        name,
        description: description || null,
        type,
        open_at: openAt ? new Date(openAt).toISOString() : null,
        close_at: closeAt ? new Date(closeAt).toISOString() : null,
        order_index: editingMilestone?.order_index ?? milestones.length,
      };

      if (editingMilestone) {
        const { error } = await supabase
          .from("milestones")
          .update(data)
          .eq("id", editingMilestone.id);

        if (error) {
          toast({ title: tCommon("errorOccurred"), variant: "destructive" });
          return;
        }
        toast({ title: t("updated") });
      } else {
        const { data: newMilestone, error } = await supabase
          .from("milestones")
          .insert(data)
          .select(`*, form_fields(*), submissions(id, status, participant_id, team_id)`)
          .single();

        if (error) {
          toast({ title: tCommon("errorOccurred"), variant: "destructive" });
          return;
        }
        toast({ title: t("created") });
        setMilestones((prev) => [...prev, newMilestone as MilestoneWithDetails]);
        setShowDialog(false);
        return;
      }

      // Recharger
      const { data: updated } = await supabase
        .from("milestones")
        .select(`*, form_fields(*), submissions(id, status, participant_id, team_id)`)
        .eq("event_id", eventId)
        .order("order_index");
      if (updated) setMilestones(updated as MilestoneWithDetails[]);
      setShowDialog(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("milestones").delete().eq("id", id);
    if (!error) {
      setMilestones((prev) => prev.filter((m) => m.id !== id));
      toast({ title: t("deleted") });
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("title")}</h1>
          <p className="text-neutral-500 mt-1">{milestones.length} jalons</p>
        </div>
        <Button variant="accent" size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" />
          {t("create")}
        </Button>
      </div>

      {milestones.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-xl border border-neutral-300">
          <Clock className="h-12 w-12 text-neutral-300 mb-4" />
          <h3 className="text-neutral-600 font-medium mb-2">{t("noMilestones")}</h3>
          <p className="text-neutral-400 text-sm mb-6 max-w-xs">{t("noMilestonesDescription")}</p>
          <Button variant="accent" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            {t("create")}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {milestones.map((milestone, index) => {
            const Icon = TYPE_ICONS[milestone.type];
            const submitted = milestone.submissions.filter(
              (s) => s.status !== "not_submitted"
            ).length;
            const completion = calculateCompletionRate(submitted, participantCount);

            return (
              <Card key={milestone.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="mt-0.5 w-8 h-8 bg-neutral-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="h-4 w-4 text-neutral-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-neutral-400 font-medium">
                            #{index + 1}
                          </span>
                          <h3 className="font-semibold text-neutral-900">{milestone.name}</h3>
                          <span className={`badge ${getMilestoneStatusColor(milestone.status)}`}>
                            {t(`statuses.${milestone.status as MilestoneStatus}`)}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {t(`types.${milestone.type}`)}
                          </Badge>
                        </div>
                        {milestone.description && (
                          <p className="text-sm text-neutral-500 mb-2">{milestone.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-neutral-400">
                          {milestone.open_at && (
                            <span>
                              {locale === "fr" ? "Ouvre" : "Opens"}:{" "}
                              {formatDateTime(milestone.open_at, locale as "fr" | "en")}
                            </span>
                          )}
                          {milestone.close_at && (
                            <span>
                              {locale === "fr" ? "Ferme" : "Closes"}:{" "}
                              {formatDateTime(milestone.close_at, locale as "fr" | "en")}
                            </span>
                          )}
                        </div>
                        {participantCount > 0 && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
                              <span>
                                {t("submissionsCount", {
                                  submitted,
                                  total: participantCount,
                                })}
                              </span>
                              <span>{completion}%</span>
                            </div>
                            <Progress value={completion} className="h-1.5" />
                          </div>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(milestone)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          {tCommon("edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(milestone.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {tCommon("delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog création/édition */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingMilestone ? t("edit") : t("create")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("name")} *</Label>
              <Input
                placeholder={t("namePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("description")}</Label>
              <Textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("type")}</Label>
              <Select value={type} onValueChange={(v) => setType(v as MilestoneType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="file">{t("types.file")}</SelectItem>
                  <SelectItem value="form">{t("types.form")}</SelectItem>
                  <SelectItem value="url">{t("types.url")}</SelectItem>
                  <SelectItem value="text">{t("types.text")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("openAt")}</Label>
                <Input
                  type="datetime-local"
                  value={openAt}
                  onChange={(e) => setOpenAt(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("closeAt")}</Label>
                <Input
                  type="datetime-local"
                  value={closeAt}
                  onChange={(e) => setCloseAt(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              {tCommon("cancel")}
            </Button>
            <Button variant="accent" onClick={handleSave} disabled={isLoading || !name}>
              {tCommon("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
