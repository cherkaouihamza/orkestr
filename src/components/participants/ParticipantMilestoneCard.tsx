"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import {
  getMilestoneStatusColor,
  getSubmissionStatusColor,
  formatDateTime,
} from "@/lib/utils";
import {
  FileText,
  Link as LinkIcon,
  AlignLeft,
  FormInput,
  Upload,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react";
import type { Milestone, FormField, Submission, MilestoneType, SubmissionStatus } from "@/types/database";

interface ParticipantMilestoneCardProps {
  locale: string;
  milestone: Milestone & { form_fields: FormField[] };
  submission: Submission | null;
  participantId: string;
  teamId: string | null;
  eventId: string;
}

export function ParticipantMilestoneCard({
  locale,
  milestone,
  submission: initialSubmission,
  participantId,
  teamId,
  eventId,
}: ParticipantMilestoneCardProps) {
  const t = useTranslations("submissions");
  const tMilestones = useTranslations("milestones");
  const tCommon = useTranslations("common");
  const [submission, setSubmission] = useState(initialSubmission);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form values
  const [urlValue, setUrlValue] = useState(submission?.url ?? "");
  const [textValue, setTextValue] = useState(submission?.text_content ?? "");
  const [formValues, setFormValues] = useState<Record<string, string>>(
    (submission?.form_data as Record<string, string>) ?? {}
  );
  const [file, setFile] = useState<File | null>(null);

  const supabase = createClient();

  const isOpen = milestone.status === "open";
  const hasSubmitted =
    submission?.status === "submitted" || submission?.status === "validated";

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      let submissionData: Partial<Submission> = {
        milestone_id: milestone.id,
        status: "submitted",
        submitted_at: new Date().toISOString(),
        is_late: milestone.close_at ? new Date() > new Date(milestone.close_at) : false,
      };

      // Ajouter le owner
      if (teamId) {
        submissionData.team_id = teamId;
      } else {
        submissionData.participant_id = participantId;
      }

      if (milestone.type === "url") {
        submissionData.url = urlValue;
      } else if (milestone.type === "text") {
        submissionData.text_content = textValue;
      } else if (milestone.type === "form") {
        submissionData.form_data = formValues;
      } else if (milestone.type === "file" && file) {
        const path = `${eventId}/${milestone.id}/${participantId}/${Date.now()}-${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("submissions")
          .upload(path, file);

        if (uploadError) {
          toast({ title: tCommon("errorOccurred"), variant: "destructive" });
          return;
        }

        submissionData.file_url = uploadData.path;
        submissionData.file_name = file.name;
        submissionData.file_size = file.size;
      }

      if (submission) {
        const { data, error } = await supabase
          .from("submissions")
          .update(submissionData)
          .eq("id", submission.id)
          .select()
          .single();

        if (error) throw error;
        setSubmission(data);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await supabase
          .from("submissions")
          .insert(submissionData as any)
          .select()
          .single();

        if (error) throw error;
        setSubmission(data);
      }

      toast({ title: t("submitted") });
      setIsExpanded(false);
    } catch {
      toast({ title: tCommon("errorOccurred"), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const TYPE_ICONS: Record<MilestoneType, React.ComponentType<{ className?: string }>> = {
    file: FileText,
    url: LinkIcon,
    text: AlignLeft,
    form: FormInput,
  };

  const Icon = TYPE_ICONS[milestone.type];

  return (
    <Card className={hasSubmitted ? "border-green-200" : isOpen ? "" : "opacity-75"}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                hasSubmitted ? "bg-green-100" : "bg-neutral-100"
              }`}
            >
              {hasSubmitted ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <Icon className="h-4 w-4 text-neutral-600" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-neutral-900">{milestone.name}</h3>
                <span className={`badge ${getMilestoneStatusColor(milestone.status)}`}>
                  {tMilestones(`statuses.${milestone.status as any}`)}
                </span>
                {submission && (
                  <span className={`badge ${getSubmissionStatusColor(submission.status)}`}>
                    {t(`statuses.${submission.status as SubmissionStatus}`)}
                  </span>
                )}
              </div>
              {milestone.description && (
                <p className="text-sm text-neutral-500 mt-1">{milestone.description}</p>
              )}
              {milestone.close_at && (
                <p className="text-xs text-neutral-400 mt-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {locale === "fr" ? "Ferme" : "Closes"}:{" "}
                  {formatDateTime(milestone.close_at, locale as "fr" | "en")}
                </p>
              )}
            </div>
          </div>

          {isOpen && (
            <Button
              variant={hasSubmitted ? "outline" : "accent"}
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {hasSubmitted ? t("resubmit") : t("submit")}
            </Button>
          )}
        </div>

        {/* Formulaire de soumission */}
        {isExpanded && isOpen && (
          <div className="mt-5 pt-5 border-t border-neutral-200 space-y-4">
            {milestone.type === "url" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">URL *</label>
                <Input
                  type="url"
                  placeholder="https://..."
                  value={urlValue}
                  onChange={(e) => setUrlValue(e.target.value)}
                />
              </div>
            )}

            {milestone.type === "text" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {locale === "fr" ? "Votre réponse" : "Your answer"} *
                </label>
                <Textarea
                  rows={5}
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                />
              </div>
            )}

            {milestone.type === "file" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {locale === "fr" ? "Fichier" : "File"} *
                </label>
                <div className="flex items-center gap-3">
                  <Input
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  {file && (
                    <span className="text-sm text-neutral-500">{file.name}</span>
                  )}
                </div>
              </div>
            )}

            {milestone.type === "form" &&
              milestone.form_fields
                .sort((a, b) => a.order_index - b.order_index)
                .map((field) => (
                  <div key={field.id} className="space-y-2">
                    <label className="text-sm font-medium">
                      {field.label}
                      {field.required && " *"}
                    </label>
                    {field.type === "long_text" ? (
                      <Textarea
                        placeholder={field.placeholder ?? ""}
                        value={formValues[field.id] ?? ""}
                        onChange={(e) =>
                          setFormValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                        }
                        rows={3}
                      />
                    ) : field.type === "multiple_choice" && field.options ? (
                      <div className="space-y-2">
                        {field.options.map((opt) => (
                          <label key={opt} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={field.id}
                              value={opt}
                              checked={formValues[field.id] === opt}
                              onChange={() =>
                                setFormValues((prev) => ({ ...prev, [field.id]: opt }))
                              }
                            />
                            <span className="text-sm">{opt}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <Input
                        type={field.type === "url" ? "url" : "text"}
                        placeholder={field.placeholder ?? ""}
                        value={formValues[field.id] ?? ""}
                        onChange={(e) =>
                          setFormValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                        }
                      />
                    )}
                  </div>
                ))}

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setIsExpanded(false)}>
                {locale === "fr" ? "Annuler" : "Cancel"}
              </Button>
              <Button variant="accent" onClick={handleSubmit} disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {t("submit")}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
