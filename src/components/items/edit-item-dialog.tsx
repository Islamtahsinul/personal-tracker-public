"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { FieldInput } from "@/components/items/field-input";
import { updateItemCore, updateItemFieldValues } from "@/lib/actions/items";
import type { ItemWithValues, TrackerWithConfig } from "@/lib/types/domain";

export function EditItemDialog({
  open,
  onClose,
  item,
  tracker,
}: {
  open: boolean;
  onClose: () => void;
  item: ItemWithValues;
  tracker: TrackerWithConfig;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(item.title);
  const [subtitle, setSubtitle] = useState(item.subtitle ?? "");
  const [imageUrl, setImageUrl] = useState(item.image_url ?? "");
  const [backdropUrl, setBackdropUrl] = useState(item.backdrop_url ?? "");
  const [values, setValues] = useState<Record<string, unknown>>(item.fieldValues);
  const [saving, setSaving] = useState(false);

  const externalFields = tracker.fields.filter((f) => !f.is_personal);

  async function handleSave() {
    setSaving(true);
    const [coreResult, fieldsResult] = await Promise.all([
      updateItemCore(item.id, {
        title,
        subtitle,
        image_url: imageUrl,
        backdrop_url: backdropUrl,
        status_id: item.status_id ?? "",
        rating: item.rating,
        notes: item.notes ?? "",
      }),
      updateItemFieldValues(item.id, tracker.id, values),
    ]);
    setSaving(false);

    if (!coreResult.ok) {
      toast.error(coreResult.error);
      return;
    }
    if (!fieldsResult.ok) {
      toast.error(fieldsResult.error);
      return;
    }
    toast.success("Saved");
    onClose();
    router.refresh();
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Details" size="lg">
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="edit-title">Title</Label>
            <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="edit-subtitle">Subtitle</Label>
            <Input id="edit-subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="edit-image">Image URL</Label>
            <Input id="edit-image" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="edit-backdrop">Backdrop URL</Label>
            <Input id="edit-backdrop" value={backdropUrl} onChange={(e) => setBackdropUrl(e.target.value)} />
          </div>
        </div>

        {externalFields.length > 0 && (
          <div className="space-y-4 border-t border-border pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-2">Details</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {externalFields.map((field) => (
                <div key={field.id} className={field.field_type === "long_text" || field.field_type === "multi_select" ? "sm:col-span-2" : ""}>
                  <Label>{field.label}</Label>
                  <FieldInput field={field} value={values[field.key]} onChange={(v) => setValues((prev) => ({ ...prev, [field.key]: v }))} />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving}>
            Save Changes
          </Button>
        </div>
      </div>
    </Modal>
  );
}
