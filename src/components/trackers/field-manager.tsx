"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { createField, deleteField } from "@/lib/actions/trackers";
import { slugify } from "@/lib/utils";
import type { TrackerField } from "@/lib/types/domain";

const FIELD_TYPES: { value: TrackerField["field_type"]; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "long_text", label: "Long Text" },
  { value: "number", label: "Number" },
  { value: "decimal", label: "Decimal" },
  { value: "date", label: "Date" },
  { value: "datetime", label: "Date & Time" },
  { value: "url", label: "URL" },
  { value: "image", label: "Image URL" },
  { value: "boolean", label: "Yes/No" },
  { value: "select", label: "Select" },
  { value: "multi_select", label: "Multi-select" },
  { value: "rating", label: "Rating" },
];

export function FieldManager({ trackerId, fields }: { trackerId: string; fields: TrackerField[] }) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [fieldType, setFieldType] = useState<TrackerField["field_type"]>("text");
  const [isPersonal, setIsPersonal] = useState(false);
  const [showInCard, setShowInCard] = useState(false);
  const [optionsDraft, setOptionsDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<TrackerField | null>(null);
  const [deleting, setDeleting] = useState(false);

  const needsOptions = fieldType === "select" || fieldType === "multi_select";

  async function handleAdd() {
    if (!label.trim()) return;
    setSaving(true);
    const options = needsOptions
      ? optionsDraft
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => ({ value: slugify(s).replace(/-/g, "_"), label: s }))
      : undefined;

    const res = await createField(trackerId, {
      key: slugify(label).replace(/-/g, "_"),
      label,
      field_type: fieldType,
      is_personal: isPersonal,
      is_required: false,
      show_in_card: showInCard,
      options,
    });
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setLabel("");
    setOptionsDraft("");
    setAdding(false);
    toast.success("Field added");
  }

  async function handleDelete() {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    const res = await deleteField(pendingDelete.id);
    setDeleting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setPendingDelete(null);
    toast.success("Field deleted");
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Custom Fields</h2>
        <Button size="sm" variant="secondary" onClick={() => setAdding((v) => !v)}>
          <Plus className="size-3.5" />
          Add
        </Button>
      </div>

      <div className="space-y-2">
        {fields.map((f) => (
          <div key={f.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <div className="flex items-center gap-2 text-sm">
              <span>{f.label}</span>
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">{f.field_type}</span>
              {f.is_personal && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">personal</span>}
            </div>
            <button onClick={() => setPendingDelete(f)} className="text-muted-2 hover:text-danger" aria-label={`Delete ${f.label} field`}>
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
        {fields.length === 0 && <p className="text-sm text-muted-2">No custom fields yet.</p>}
      </div>

      {adding && (
        <div className="mt-4 space-y-3 rounded-lg border border-border bg-surface-2 p-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="field-label">Label</Label>
              <Input id="field-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Cover Art" />
            </div>
            <div>
              <Label htmlFor="field-type">Type</Label>
              <Select id="field-type" value={fieldType} onChange={(e) => setFieldType(e.target.value as TrackerField["field_type"])}>
                {FIELD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {needsOptions && (
            <div>
              <Label htmlFor="field-options">Options (comma-separated)</Label>
              <Input
                id="field-options"
                value={optionsDraft}
                onChange={(e) => setOptionsDraft(e.target.value)}
                placeholder="e.g. Action, Comedy, Drama"
              />
            </div>
          )}

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={isPersonal} onChange={(e) => setIsPersonal(e.target.checked)} className="size-4 accent-[var(--accent)]" />
              Personal field (not external data)
            </label>
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={showInCard} onChange={(e) => setShowInCard(e.target.checked)} className="size-4 accent-[var(--accent)]" />
              Show on card
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setAdding(false);
                setOptionsDraft("");
              }}
            >
              <X className="size-3.5" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleAdd} loading={saving}>
              Add Field
            </Button>
          </div>
        </div>
      )}

      <Modal open={!!pendingDelete} onClose={() => setPendingDelete(null)} title="Delete field?">
        <p className="text-sm text-muted">
          This permanently deletes the <span className="text-foreground">{pendingDelete?.label}</span> field and its saved value on every
          item in this tracker. This can&apos;t be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setPendingDelete(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="danger" loading={deleting} onClick={handleDelete}>
            Delete Field
          </Button>
        </div>
      </Modal>
    </div>
  );
}
