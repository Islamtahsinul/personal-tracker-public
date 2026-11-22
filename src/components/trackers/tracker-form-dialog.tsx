"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { IconPicker, ColorPicker } from "./icon-color-picker";
import { createTracker, updateTracker } from "@/lib/actions/trackers";
import type { Tracker } from "@/lib/types/domain";

const CATEGORY_OPTIONS = [
  { value: "generic", label: "Generic" },
  { value: "movie", label: "Movie" },
  { value: "tv", label: "TV" },
  { value: "game", label: "Game" },
  { value: "book", label: "Book" },
  { value: "car", label: "Car" },
  { value: "motorcycle", label: "Motorcycle" },
];

export function TrackerFormDialog({
  open,
  onClose,
  tracker,
}: {
  open: boolean;
  onClose: () => void;
  tracker?: Tracker;
}) {
  const router = useRouter();
  const isEdit = !!tracker;
  const [name, setName] = useState(tracker?.name ?? "");
  const [description, setDescription] = useState(tracker?.description ?? "");
  const [icon, setIcon] = useState(tracker?.icon ?? "library");
  const [color, setColor] = useState(tracker?.color ?? "#6366f1");
  const [category, setCategory] = useState(tracker?.category ?? "generic");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const input = { name, description, icon, color, category };
    const result = isEdit
      ? await updateTracker(tracker!.id, input)
      : await createTracker(input);

    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(isEdit ? "Tracker updated" : `${name} tracker created`);
    onClose();
    if (!isEdit && "slug" in result && result.slug) {
      router.push(`/t/${result.slug}`);
    }
    router.refresh();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Tracker" : "New Tracker"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="tracker-name">Name</Label>
          <Input id="tracker-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Watches" />
        </div>
        <div>
          <Label htmlFor="tracker-description">Description</Label>
          <Textarea
            id="tracker-description"
            value={description ?? ""}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What are you tracking here?"
            rows={2}
          />
        </div>
        <div>
          <Label>Category</Label>
          <p className="mb-2 text-xs text-muted-2">
            Drives automatic data lookup when adding items. Choose &quot;Generic&quot; if none fit — you can still add items manually.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCategory(opt.value)}
                aria-pressed={category === opt.value}
                className={
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
                  (category === opt.value
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-border bg-surface-2 text-muted hover:text-foreground")
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label>Icon</Label>
          <IconPicker value={icon} onChange={setIcon} />
        </div>
        <div>
          <Label>Color</Label>
          <ColorPicker value={color} onChange={setColor} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? "Save Changes" : "Create Tracker"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
