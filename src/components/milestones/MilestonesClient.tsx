"use client";

import { useState, useRef } from "react";
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
import { getMilestoneStatusColor, calculateCompletionRate, formatDateTime, formatDate } from "@/lib/utils";
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
  List,
  Calendar,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Upload,
  Download,
  Star,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Milestone, MilestoneType, MilestoneStatus, Submission, FormField, FormFieldType } from "@/types/database";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MilestoneWithDetails extends Milestone {
  form_fields: FormField[];
  submissions: Array<Pick<Submission, "id" | "status" | "participant_id" | "team_id">>;
}

interface MilestonesClientProps {
  locale: string;
  eventId: string;
  eventStartDate: string | null;
  eventEndDate: string | null;
  milestones: MilestoneWithDetails[];
  participantCount: number;
}

interface DraftField {
  id: string; // temp or real
  type: FormFieldType;
  label: string;
  placeholder: string;
  required: boolean;
  options: string; // newline-separated
  order_index: number;
  isNew: boolean;
}

type ViewMode = "list" | "calendar" | "timeline";

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<MilestoneType, React.ComponentType<{ className?: string }>> = {
  file: FileText,
  url: LinkIcon,
  text: AlignLeft,
  form: FormInput,
};

const STATUS_DOT: Record<MilestoneStatus, string> = {
  upcoming: "bg-neutral-400",
  open: "bg-success",
  closed: "bg-red-400",
  evaluated: "bg-primary-900",
};

const FIELD_TYPE_NEEDS_OPTIONS: FormFieldType[] = ["radio", "multiple_choice", "checkbox"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function tempId() {
  return `tmp_${Math.random().toString(36).slice(2)}`;
}

// ── FormBuilder sub-component ─────────────────────────────────────────────────

function FormBuilder({
  locale,
  milestone,
  onClose,
  onSaved,
}: {
  locale: string;
  milestone: MilestoneWithDetails;
  onClose: () => void;
  onSaved: (fields: FormField[]) => void;
}) {
  const tM = useTranslations("milestones");
  const tC = useTranslations("common");
  const supabase = createClient();
  const [isSaving, setIsSaving] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const initialFields: DraftField[] = milestone.form_fields.map((f, i) => ({
    id: f.id,
    type: f.type,
    label: f.label,
    placeholder: f.placeholder ?? "",
    required: f.required,
    options: Array.isArray(f.options) ? (f.options as string[]).join("\n") : "",
    order_index: f.order_index ?? i,
    isNew: false,
  }));

  const [fields, setFields] = useState<DraftField[]>(initialFields);

  const addField = () => {
    setFields((prev) => [
      ...prev,
      {
        id: tempId(),
        type: "short_text",
        label: "",
        placeholder: "",
        required: false,
        options: "",
        order_index: prev.length,
        isNew: true,
      },
    ]);
  };

  const removeField = (id: string) => setFields((prev) => prev.filter((f) => f.id !== id));

  const updateField = (id: string, patch: Partial<DraftField>) =>
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const handleDragStart = (i: number) => setDragIdx(i);
  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === i) return;
    setFields((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(i, 0, moved);
      return next.map((f, idx) => ({ ...f, order_index: idx }));
    });
    setDragIdx(i);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Delete all existing fields then re-insert
      await supabase.from("form_fields").delete().eq("milestone_id", milestone.id);

      if (fields.length > 0) {
        const inserts = fields.map((f, i) => ({
          milestone_id: milestone.id,
          type: f.type,
          label: f.label || (locale === "fr" ? "Sans titre" : "Untitled"),
          placeholder: f.placeholder || null,
          required: f.required,
          options: FIELD_TYPE_NEEDS_OPTIONS.includes(f.type)
            ? f.options.split("\n").map((s) => s.trim()).filter(Boolean)
            : null,
          order_index: i,
        }));
        const { data, error } = await supabase
          .from("form_fields")
          .insert(inserts)
          .select();
        if (error) {
          toast({ title: tC("errorOccurred"), variant: "destructive" });
          return;
        }
        onSaved(data as FormField[]);
      } else {
        onSaved([]);
      }
      toast({
        title: locale === "fr" ? "Formulaire enregistré" : "Form saved",
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const FIELD_TYPES: { value: FormFieldType; label: string }[] = [
    { value: "short_text", label: tM("fieldTypes.short_text") },
    { value: "long_text", label: tM("fieldTypes.long_text") },
    { value: "number", label: tM("fieldTypes.number") },
    { value: "date", label: tM("fieldTypes.date") },
    { value: "file", label: tM("fieldTypes.file") },
    { value: "url", label: tM("fieldTypes.url") },
    { value: "radio", label: tM("fieldTypes.radio") },
    { value: "multiple_choice", label: tM("fieldTypes.multiple_choice") },
    { value: "checkbox", label: tM("fieldTypes.checkbox") },
    { value: "rating", label: tM("fieldTypes.rating") },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-neutral-900">
          {tM("formBuilderTitle")} — {milestone.name}
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="text-sm text-neutral-400 text-center py-6 border-2 border-dashed border-neutral-200 rounded-lg">
          {tM("noFormFields")}
        </p>
      ) : (
        <div className="space-y-2">
          {fields.map((field, i) => (
            <div
              key={field.id}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDragEnd={() => setDragIdx(null)}
              className="border border-neutral-200 rounded-lg p-3 bg-white space-y-2"
            >
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-neutral-300 cursor-grab flex-shrink-0" />
                <Select
                  value={field.type}
                  onValueChange={(v) => updateField(field.id, { type: v as FormFieldType })}
                >
                  <SelectTrigger className="w-44 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((ft) => (
                      <SelectItem key={ft.value} value={ft.value} className="text-xs">
                        {ft.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <label className="flex items-center gap-1.5 text-xs text-neutral-500 ml-auto">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => updateField(field.id, { required: e.target.checked })}
                    className="accent-orange-500"
                  />
                  {tM("fieldRequired")}
                </label>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-neutral-300 hover:text-red-500"
                  onClick={() => removeField(field.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 ml-6">
                <Input
                  className="h-8 text-sm"
                  placeholder={tM("fieldLabel")}
                  value={field.label}
                  onChange={(e) => updateField(field.id, { label: e.target.value })}
                />
                <Input
                  className="h-8 text-sm"
                  placeholder={tM("fieldPlaceholder")}
                  value={field.placeholder}
                  onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                />
              </div>
              {FIELD_TYPE_NEEDS_OPTIONS.includes(field.type) && (
                <div className="ml-6">
                  <Textarea
                    className="text-xs"
                    rows={3}
                    placeholder={tM("fieldOptions")}
                    value={field.options}
                    onChange={(e) => updateField(field.id, { options: e.target.value })}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={addField}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          {tM("addField")}
        </Button>
        <Button variant="accent" size="sm" onClick={handleSave} disabled={isSaving} className="ml-auto">
          {tM("saveForm")}
        </Button>
      </div>
    </div>
  );
}

// ── CalendarView ──────────────────────────────────────────────────────────────

function CalendarView({
  locale,
  milestones,
  onSelectMilestone,
}: {
  locale: string;
  milestones: MilestoneWithDetails[];
  onSelectMilestone: (m: MilestoneWithDetails) => void;
}) {
  const [monthOffset, setMonthOffset] = useState(0);
  const now = new Date();
  const year = new Date(now.getFullYear(), now.getMonth() + monthOffset).getFullYear();
  const month = new Date(now.getFullYear(), now.getMonth() + monthOffset).getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  // Grid starts on Monday
  const startOffset = (firstDay.getDay() + 6) % 7;
  const totalCells = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7;

  const days: Array<Date | null> = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startOffset + 1;
    if (dayNum < 1 || dayNum > lastDay.getDate()) {
      days.push(null);
    } else {
      days.push(new Date(year, month, dayNum));
    }
  }

  const milestonesByDay = new Map<string, MilestoneWithDetails[]>();
  for (const m of milestones) {
    if (!m.close_at) continue;
    const d = new Date(m.close_at);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!milestonesByDay.has(key)) milestonesByDay.set(key, []);
    milestonesByDay.get(key)!.push(m);
  }

  const monthLabel = new Date(year, month, 1).toLocaleString(locale === "fr" ? "fr-FR" : "en-US", {
    month: "long",
    year: "numeric",
  });

  const dayHeaders = locale === "fr"
    ? ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"]
    : ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonthOffset((o) => o - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold text-neutral-900 capitalize">{monthLabel}</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonthOffset((o) => o + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7">
        {dayHeaders.map((h) => (
          <div key={h} className="text-center text-xs font-medium text-neutral-400 py-2 border-b border-neutral-100">
            {h}
          </div>
        ))}
        {days.map((day, i) => {
          const key = day ? `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}` : "";
          const dayMilestones = day ? (milestonesByDay.get(key) ?? []) : [];
          const isToday = day?.toDateString() === new Date().toDateString();

          return (
            <div
              key={i}
              className={`min-h-[72px] p-1.5 border-b border-r border-neutral-100 ${!day ? "bg-neutral-50" : ""}`}
            >
              {day && (
                <>
                  <div className={`text-xs mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-accent text-white font-semibold" : "text-neutral-500"}`}>
                    {day.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {dayMilestones.slice(0, 3).map((m) => (
                      <button
                        key={m.id}
                        onClick={() => onSelectMilestone(m)}
                        className={`w-full text-left text-[10px] leading-tight px-1 py-0.5 rounded truncate font-medium ${
                          m.status === "open" ? "bg-green-100 text-green-700" :
                          m.status === "closed" ? "bg-red-100 text-red-600" :
                          m.status === "evaluated" ? "bg-primary-100 text-primary-900" :
                          "bg-neutral-100 text-neutral-600"
                        }`}
                      >
                        {m.name}
                      </button>
                    ))}
                    {dayMilestones.length > 3 && (
                      <p className="text-[10px] text-neutral-400 pl-1">+{dayMilestones.length - 3}</p>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── TimelineView ──────────────────────────────────────────────────────────────

function TimelineView({
  locale,
  milestones,
  eventStartDate,
  eventEndDate,
  onSelectMilestone,
}: {
  locale: string;
  milestones: MilestoneWithDetails[];
  eventStartDate: string | null;
  eventEndDate: string | null;
  onSelectMilestone: (m: MilestoneWithDetails) => void;
}) {
  const start = eventStartDate ? new Date(eventStartDate).getTime() : null;
  const end = eventEndDate ? new Date(eventEndDate).getTime() : null;
  const span = start && end ? end - start : null;

  if (!span || span <= 0) {
    return (
      <div className="text-center py-12 text-neutral-400 text-sm">
        {locale === "fr"
          ? "Définissez les dates de début et fin de l'événement pour afficher la timeline."
          : "Set event start and end dates to display the timeline."}
      </div>
    );
  }

  const getPercent = (dateStr: string) => {
    const t = new Date(dateStr).getTime();
    return Math.max(0, Math.min(100, ((t - start!) / span!) * 100));
  };

  const todayPercent = getPercent(new Date().toISOString());

  const sorted = [...milestones]
    .filter((m) => m.close_at)
    .sort((a, b) => new Date(a.close_at!).getTime() - new Date(b.close_at!).getTime());

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-6 overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Date labels */}
        <div className="flex justify-between text-xs text-neutral-400 mb-3">
          <span>{formatDate(eventStartDate!, locale as "fr" | "en")}</span>
          <span>{formatDate(eventEndDate!, locale as "fr" | "en")}</span>
        </div>

        {/* Track */}
        <div className="relative h-2 bg-neutral-100 rounded-full mb-8">
          {/* Today marker */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent z-10"
            style={{ left: `${todayPercent}%` }}
          />
          {/* Milestone dots */}
          {sorted.map((m) => {
            const pct = getPercent(m.close_at!);
            return (
              <button
                key={m.id}
                onClick={() => onSelectMilestone(m)}
                style={{ left: `${pct}%` }}
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white shadow z-20 transition-transform hover:scale-125 ${
                  m.status === "open" ? "bg-success" :
                  m.status === "closed" ? "bg-red-400" :
                  m.status === "evaluated" ? "bg-primary-900" :
                  "bg-neutral-400"
                }`}
                title={m.name}
              />
            );
          })}
        </div>

        {/* Labels below */}
        <div className="relative h-24">
          {sorted.map((m, idx) => {
            const pct = getPercent(m.close_at!);
            const above = idx % 2 === 0;
            return (
              <button
                key={m.id}
                onClick={() => onSelectMilestone(m)}
                style={{ left: `${pct}%`, top: above ? "0" : "40px" }}
                className="absolute -translate-x-1/2 text-left max-w-[120px] group"
              >
                <div className="text-[11px] font-medium text-neutral-700 group-hover:text-primary-900 truncate leading-tight">
                  {m.name}
                </div>
                <div className="text-[10px] text-neutral-400">
                  {new Date(m.close_at!).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", { day: "numeric", month: "short" })}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function MilestonesClient({
  locale,
  eventId,
  eventStartDate,
  eventEndDate,
  milestones: initialMilestones,
  participantCount,
}: MilestonesClientProps) {
  const t = useTranslations("milestones");
  const tCommon = useTranslations("common");
  const supabase = createClient();

  const [milestones, setMilestones] = useState(initialMilestones);
  const [view, setView] = useState<ViewMode>("list");

  // Create/edit dialog
  const [showDialog, setShowDialog] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<MilestoneWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<MilestoneType>("file");
  const [openAt, setOpenAt] = useState("");
  const [closeAt, setCloseAt] = useState("");
  const [allowLate, setAllowLate] = useState(false);
  const [visible, setVisible] = useState(true);
  const [dateError, setDateError] = useState<string | null>(null);

  // Form builder
  const [formBuilderMilestone, setFormBuilderMilestone] = useState<MilestoneWithDetails | null>(null);

  // Import
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importPreview, setImportPreview] = useState<Array<{
    name: string;
    description: string;
    type: MilestoneType;
    open_at: string;
    close_at: string;
    visible: boolean;
    allow_late_submission: boolean;
    valid: boolean;
    warning?: string;
  }>>([]);
  const [isImporting, setIsImporting] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  // Drag & drop for list reorder
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const reload = async () => {
    const { data } = await supabase
      .from("milestones")
      .select(`*, form_fields(*), submissions(id, status, participant_id, team_id)`)
      .eq("event_id", eventId)
      .order("order_index");
    if (data) setMilestones(data as MilestoneWithDetails[]);
  };

  const validateDates = (oa: string, ca: string): string | null => {
    if (!ca) return locale === "fr" ? "La date de fermeture est obligatoire" : "Close date is required";
    const closeDate = new Date(ca);
    if (eventStartDate && closeDate < new Date(eventStartDate)) {
      return locale === "fr"
        ? `La date doit être après le ${formatDate(eventStartDate, locale as "fr" | "en")}`
        : `Date must be after ${formatDate(eventStartDate, locale as "fr" | "en")}`;
    }
    if (eventEndDate && closeDate > new Date(eventEndDate)) {
      return locale === "fr"
        ? `La date doit être avant le ${formatDate(eventEndDate, locale as "fr" | "en")}`
        : `Date must be before ${formatDate(eventEndDate, locale as "fr" | "en")}`;
    }
    if (oa && ca && new Date(oa) >= new Date(ca)) {
      return locale === "fr"
        ? "La date d'ouverture doit être avant la date de fermeture"
        : "Open date must be before close date";
    }
    return null;
  };

  // ── Dialog helpers ────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingMilestone(null);
    setName(""); setDescription(""); setType("file");
    setOpenAt(""); setCloseAt("");
    setAllowLate(false); setVisible(true); setDateError(null);
    setShowDialog(true);
  };

  const openEdit = (m: MilestoneWithDetails) => {
    setEditingMilestone(m);
    setName(m.name);
    setDescription(m.description ?? "");
    setType(m.type);
    setOpenAt(m.open_at?.slice(0, 16) ?? "");
    setCloseAt(m.close_at?.slice(0, 16) ?? "");
    setAllowLate(m.allow_late_submission);
    setVisible((m.settings?.visible as boolean) !== false);
    setDateError(null);
    setShowDialog(true);
  };

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!name.trim()) return;
    const err = validateDates(openAt, closeAt);
    if (err) { setDateError(err); return; }
    setDateError(null);
    setIsLoading(true);
    try {
      const payload = {
        event_id: eventId,
        name: name.trim(),
        description: description || null,
        type,
        open_at: openAt ? new Date(openAt).toISOString() : null,
        close_at: closeAt ? new Date(closeAt).toISOString() : null,
        allow_late_submission: allowLate,
        settings: { visible },
        order_index: editingMilestone?.order_index ?? milestones.length,
      };

      if (editingMilestone) {
        const { error } = await supabase.from("milestones").update(payload).eq("id", editingMilestone.id);
        if (error) { toast({ title: tCommon("errorOccurred"), variant: "destructive" }); return; }
        toast({ title: t("updated") });
      } else {
        const { data: newM, error } = await supabase
          .from("milestones")
          .insert(payload)
          .select(`*, form_fields(*), submissions(id, status, participant_id, team_id)`)
          .single();
        if (error || !newM) { toast({ title: tCommon("errorOccurred"), variant: "destructive" }); return; }
        toast({ title: t("created") });
        setMilestones((prev) => [...prev, newM as MilestoneWithDetails]);
        setShowDialog(false);
        return;
      }

      await reload();
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

  // ── Drag & drop reorder ───────────────────────────────────────────────────

  const handleListDragStart = (i: number) => setDragIdx(i);

  const handleListDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === i) return;
    setMilestones((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(i, 0, moved);
      return next;
    });
    setDragIdx(i);
  };

  const handleListDragEnd = async () => {
    setDragIdx(null);
    // Persist new order_index values
    await Promise.all(
      milestones.map((m, i) =>
        supabase.from("milestones").update({ order_index: i }).eq("id", m.id)
      )
    );
  };

  // ── Import ────────────────────────────────────────────────────────────────

  const handleDownloadTemplate = async () => {
    const XLSX = await import("xlsx");
    const rows = [
      { name: "Dépôt du pitch deck", description: "Présentation du projet", type: "file", open_at: "2026-05-01 09:00", close_at: "2026-05-15 23:59", visible: "true", allow_late_submission: "false" },
      { name: "Formulaire idée", description: "Décrivez votre idée", type: "form", open_at: "2026-05-01 09:00", close_at: "2026-05-10 23:59", visible: "true", allow_late_submission: "true" },
      { name: "Lien prototype", description: "URL du prototype en ligne", type: "url", open_at: "", close_at: "2026-05-20 23:59", visible: "true", allow_late_submission: "false" },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 28 }, { wch: 35 }, { wch: 8 }, { wch: 20 }, { wch: 20 }, { wch: 8 }, { wch: 22 }];
    const instructions = [
      ["Champ", "Obligatoire", "Valeurs acceptées"],
      ["name", "Oui", "Texte libre"],
      ["description", "Non", "Texte libre"],
      ["type", "Oui", "file | url | text | form"],
      ["open_at", "Non", "YYYY-MM-DD HH:mm"],
      ["close_at", "Oui", "YYYY-MM-DD HH:mm"],
      ["visible", "Non", "true | false (défaut: true)"],
      ["allow_late_submission", "Non", "true | false (défaut: false)"],
    ];
    const wsI = XLSX.utils.aoa_to_sheet(instructions);
    wsI["!cols"] = [{ wch: 22 }, { wch: 14 }, { wch: 35 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Jalons");
    XLSX.utils.book_append_sheet(wb, wsI, "Instructions");
    XLSX.writeFile(wb, "modele_import_jalons.xlsx");
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

    const VALID_TYPES: MilestoneType[] = ["file", "url", "text", "form"];

    const preview = rows
      .filter((r) => r.name?.trim())
      .map((r) => {
        const milestoneType = r.type?.trim() as MilestoneType;
        let valid = true;
        let warning: string | undefined;

        if (!VALID_TYPES.includes(milestoneType)) {
          valid = false;
          warning = locale === "fr" ? `Type invalide: ${r.type}` : `Invalid type: ${r.type}`;
        } else if (!r.close_at?.trim()) {
          valid = false;
          warning = locale === "fr" ? "close_at obligatoire" : "close_at is required";
        } else {
          const close = new Date(r.close_at.trim());
          if (isNaN(close.getTime())) {
            valid = false;
            warning = locale === "fr" ? "Date close_at invalide" : "Invalid close_at date";
          } else if (eventStartDate && close < new Date(eventStartDate)) {
            warning = locale === "fr" ? "Date avant le début de l'événement" : "Date before event start";
          } else if (eventEndDate && close > new Date(eventEndDate)) {
            warning = locale === "fr" ? "Date après la fin de l'événement" : "Date after event end";
          }
        }

        return {
          name: r.name.trim(),
          description: r.description?.trim() ?? "",
          type: VALID_TYPES.includes(milestoneType) ? milestoneType : "file" as MilestoneType,
          open_at: r.open_at?.trim() ?? "",
          close_at: r.close_at?.trim() ?? "",
          visible: r.visible?.toLowerCase() !== "false",
          allow_late_submission: r.allow_late_submission?.toLowerCase() === "true",
          valid,
          warning,
        };
      });

    setImportPreview(preview);
    setShowImportDialog(true);
  };

  const handleConfirmImport = async () => {
    setIsImporting(true);
    try {
      const validRows = importPreview.filter((r) => r.valid);
      const inserts = validRows.map((r, i) => ({
        event_id: eventId,
        name: r.name,
        description: r.description || null,
        type: r.type,
        open_at: r.open_at ? new Date(r.open_at).toISOString() : null,
        close_at: r.close_at ? new Date(r.close_at).toISOString() : null,
        allow_late_submission: r.allow_late_submission,
        settings: { visible: r.visible },
        order_index: milestones.length + i,
      }));

      const { error } = await supabase.from("milestones").insert(inserts);
      if (error) { toast({ title: tCommon("errorOccurred"), variant: "destructive" }); return; }

      toast({
        title: locale === "fr"
          ? `${validRows.length} jalon(s) importé(s) avec succès`
          : `${validRows.length} milestone(s) imported successfully`,
      });
      setShowImportDialog(false);
      await reload();
    } finally {
      setIsImporting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("title")}</h1>
          <p className="text-neutral-500 mt-1">
            {milestones.length} {locale === "fr" ? "jalon(s)" : "milestone(s)"}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <Download className="h-4 w-4 mr-1.5" />
            {t("importTemplate")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => importFileRef.current?.click()}>
            <Upload className="h-4 w-4 mr-1.5" />
            {t("importMilestones")}
          </Button>
          <input ref={importFileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportFile} />
          <Button variant="accent" size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            {t("create")}
          </Button>
        </div>
      </div>

      {/* View switcher */}
      <div className="flex gap-1 mb-4 bg-neutral-100 rounded-lg p-1 w-fit">
        {(["list", "calendar", "timeline"] as ViewMode[]).map((v) => {
          const Icon = v === "list" ? List : v === "calendar" ? Calendar : ArrowRight;
          const label = v === "list" ? t("viewList") : v === "calendar" ? t("viewCalendar") : t("viewTimeline");
          return (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === v ? "bg-white text-primary-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          );
        })}
      </div>

      {/* Form builder panel */}
      {formBuilderMilestone && (
        <div className="bg-white rounded-xl border border-accent/30 p-5 mb-4">
          <FormBuilder
            locale={locale}
            milestone={formBuilderMilestone}
            onClose={() => setFormBuilderMilestone(null)}
            onSaved={(fields) => {
              setMilestones((prev) =>
                prev.map((m) => m.id === formBuilderMilestone.id ? { ...m, form_fields: fields } : m)
              );
              setFormBuilderMilestone(null);
            }}
          />
        </div>
      )}

      {/* Views */}
      {view === "calendar" && (
        <CalendarView
          locale={locale}
          milestones={milestones}
          onSelectMilestone={openEdit}
        />
      )}

      {view === "timeline" && (
        <TimelineView
          locale={locale}
          milestones={milestones}
          eventStartDate={eventStartDate}
          eventEndDate={eventEndDate}
          onSelectMilestone={openEdit}
        />
      )}

      {view === "list" && (
        milestones.length === 0 ? (
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
          <div className="space-y-3">
            {milestones.map((milestone, index) => {
              const Icon = TYPE_ICONS[milestone.type];
              const submitted = milestone.submissions.filter((s) => s.status !== "not_submitted").length;
              const completion = calculateCompletionRate(submitted, participantCount);
              const isFormEmpty = milestone.type === "form" && milestone.form_fields.length === 0;
              const visible = (milestone.settings?.visible as boolean) !== false;

              return (
                <div
                  key={milestone.id}
                  draggable
                  onDragStart={() => handleListDragStart(index)}
                  onDragOver={(e) => handleListDragOver(e, index)}
                  onDragEnd={handleListDragEnd}
                  className={`bg-white rounded-xl border transition-shadow ${dragIdx === index ? "shadow-lg opacity-70 border-accent" : "border-neutral-200 hover:shadow-sm"}`}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <GripVertical className="h-4 w-4 text-neutral-300 mt-1 flex-shrink-0 cursor-grab" />
                        <div className="w-8 h-8 bg-neutral-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Icon className="h-4 w-4 text-neutral-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs text-neutral-400 font-medium">#{index + 1}</span>
                            <h3 className="font-semibold text-neutral-900">{milestone.name}</h3>
                            <span className={`badge ${getMilestoneStatusColor(milestone.status)}`}>
                              {t(`statuses.${milestone.status as MilestoneStatus}`)}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {t(`types.${milestone.type}`)}
                            </Badge>
                            {!visible && (
                              <Badge variant="outline" className="text-xs text-neutral-400">
                                {locale === "fr" ? "Masqué" : "Hidden"}
                              </Badge>
                            )}
                            {isFormEmpty && (
                              <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                                {t("formNotConfigured")}
                              </Badge>
                            )}
                          </div>
                          {milestone.description && (
                            <p className="text-sm text-neutral-500 mb-2">{milestone.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-neutral-400 flex-wrap">
                            {milestone.open_at && (
                              <span>{locale === "fr" ? "Ouvre" : "Opens"}: {formatDateTime(milestone.open_at, locale as "fr" | "en")}</span>
                            )}
                            {milestone.close_at && (
                              <span>{locale === "fr" ? "Ferme" : "Closes"}: {formatDateTime(milestone.close_at, locale as "fr" | "en")}</span>
                            )}
                          </div>
                          {participantCount > 0 && (
                            <div className="mt-3">
                              <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
                                <span>{t("submissionsCount", { submitted, total: participantCount })}</span>
                                <span>{completion}%</span>
                              </div>
                              <Progress value={completion} className="h-1.5" />
                            </div>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(milestone)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {tCommon("edit")}
                          </DropdownMenuItem>
                          {milestone.type === "form" && (
                            <DropdownMenuItem onClick={() => setFormBuilderMilestone(milestone)}>
                              <FormInput className="mr-2 h-4 w-4" />
                              {t("configureForm")}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleDelete(milestone.id)} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            {tCommon("delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── Create / Edit Dialog ───────────────────────────────────────────── */}
      <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) setDateError(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMilestone ? t("edit") : t("create")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Event date context */}
            {(eventStartDate || eventEndDate) && (
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700">
                  {locale === "fr" ? "Dates de l'événement : " : "Event dates: "}
                  {eventStartDate ? formatDate(eventStartDate, locale as "fr" | "en") : "—"}
                  {" → "}
                  {eventEndDate ? formatDate(eventEndDate, locale as "fr" | "en") : "—"}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>{t("name")} *</Label>
              <Input placeholder={t("namePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>{t("description")}</Label>
              <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>{t("type")}</Label>
              <Select value={type} onValueChange={(v) => setType(v as MilestoneType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="file">{t("types.file")}</SelectItem>
                  <SelectItem value="form">{t("types.form")}</SelectItem>
                  <SelectItem value="url">{t("types.url")}</SelectItem>
                  <SelectItem value="text">{t("types.text")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {type === "form" && !editingMilestone && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700">{t("formTypeInfo")}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>
                  {t("openAt")}{" "}
                  <span className="text-neutral-400 text-xs">({tCommon("optional")})</span>
                </Label>
                <Input
                  type="datetime-local"
                  value={openAt}
                  onChange={(e) => { setOpenAt(e.target.value); setDateError(null); }}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("closeAt")} *</Label>
                <Input
                  type="datetime-local"
                  value={closeAt}
                  onChange={(e) => { setCloseAt(e.target.value); setDateError(null); }}
                  className={dateError ? "border-red-400 focus-visible:ring-red-400" : ""}
                />
              </div>
            </div>
            {dateError && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                {dateError}
              </p>
            )}

            {/* Toggles */}
            <div className="space-y-2 pt-1 border-t border-neutral-100">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-neutral-700">{t("visible")}</span>
                <button
                  type="button"
                  onClick={() => setVisible((v) => !v)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${visible ? "bg-accent" : "bg-neutral-300"}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${visible ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-neutral-700">{t("allowLateSubmission")}</span>
                <button
                  type="button"
                  onClick={() => setAllowLate((v) => !v)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${allowLate ? "bg-accent" : "bg-neutral-300"}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${allowLate ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>{tCommon("cancel")}</Button>
            <Button variant="accent" onClick={handleSave} disabled={isLoading || !name.trim()}>
              {editingMilestone ? tCommon("save") : tCommon("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Import Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t("importPreview")} — {importPreview.length} {locale === "fr" ? "jalon(s)" : "milestone(s)"}
            </DialogTitle>
          </DialogHeader>

          {importPreview.some((r) => !r.valid || r.warning) && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700">
                {locale === "fr"
                  ? "Les lignes invalides (rouge) seront ignorées. Les avertissements (orange) seront importés."
                  : "Invalid rows (red) will be skipped. Warnings (orange) will still be imported."}
              </p>
            </div>
          )}

          <div className="border border-neutral-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="text-left text-xs font-medium text-neutral-500 px-3 py-2">{t("name")}</th>
                  <th className="text-left text-xs font-medium text-neutral-500 px-3 py-2">{t("type")}</th>
                  <th className="text-left text-xs font-medium text-neutral-500 px-3 py-2">{t("closeAt")}</th>
                  <th className="w-8 px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {importPreview.map((row, i) => (
                  <tr
                    key={i}
                    className={`border-b border-neutral-100 last:border-0 ${!row.valid ? "bg-red-50" : row.warning ? "bg-amber-50/50" : ""}`}
                  >
                    <td className="px-3 py-2 text-neutral-700 font-medium">{row.name}</td>
                    <td className="px-3 py-2">
                      <Badge variant="secondary" className="text-xs">{t(`types.${row.type}`)}</Badge>
                    </td>
                    <td className="px-3 py-2 text-neutral-500 text-xs font-mono">{row.close_at}</td>
                    <td className="px-3 py-2">
                      {row.warning && (
                        <AlertTriangle className="h-4 w-4 text-amber-500" title={row.warning} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>{tCommon("cancel")}</Button>
            <Button
              variant="accent"
              onClick={handleConfirmImport}
              disabled={isImporting || importPreview.filter((r) => r.valid).length === 0}
            >
              {locale === "fr"
                ? `Importer ${importPreview.filter((r) => r.valid).length} jalon(s)`
                : `Import ${importPreview.filter((r) => r.valid).length} milestone(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
