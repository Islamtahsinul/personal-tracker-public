"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Heart, Trash2, Archive, ArchiveRestore, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, Textarea, Label } from "@/components/ui/input";
import { RatingStars } from "@/components/ui/rating-stars";
import { FieldInput } from "@/components/items/field-input";
import { Modal } from "@/components/ui/modal";
import { useDebouncedCallback } from "@/lib/hooks/use-debounced-callback";
import { useSerialQueue } from "@/lib/hooks/use-serial-queue";
import {
  setItemFavorite,
  setItemStatus,
  setItemRating,
  setItemNotes,
  updateItemFieldValues,
  archiveItem,
  deleteItem,
  setItemTags,
} from "@/lib/actions/items";
import type { ItemWithValues, TrackerWithConfig } from "@/lib/types/domain";

export function ItemDetailPanel({
  item,
  tracker,
  allTagNames,
}: {
  item: ItemWithValues;
  tracker: TrackerWithConfig;
  allTagNames: string[];
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(item.notes ?? "");
  const [favorite, setFavorite] = useState(item.is_favorite);
  const [rating, setRating] = useState(item.rating);
  const [statusId, setStatusId] = useState(item.status_id ?? "");
  const [tags, setTags] = useState(item.tags.map((t) => t.name));
  const [tagDraft, setTagDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [personalValues, setPersonalValues] = useState<Record<string, unknown>>(item.fieldValues);

  const personalFields = tracker.fields.filter((f) => f.is_personal);

  // Every handler below sends a full snapshot of desired state ("favourite = true",
  // "tags = [a, b]"). Firing them independently would let network responses land out
  // of order and silently overwrite newer data with an older snapshot — enqueue keeps
  // writes serialized in the order the user triggered them.
  const enqueue = useSerialQueue();

  const debouncedNotes = useDebouncedCallback((value: string) => {
    enqueue(async () => {
      await setItemNotes(item.id, value);
    });
  }, 700);

  const debouncedFieldSave = useDebouncedCallback((values: Record<string, unknown>) => {
    enqueue(async () => {
      await updateItemFieldValues(item.id, tracker.id, values);
    });
  }, 600);

  function toggleFavorite() {
    const next = !favorite;
    setFavorite(next);
    enqueue(async () => {
      const res = await setItemFavorite(item.id, next);
      if (!res.ok) {
        setFavorite(!next);
        toast.error(res.error);
      }
    });
  }

  function handleStatusChange(value: string) {
    setStatusId(value);
    enqueue(async () => {
      const res = await setItemStatus(item.id, value || null);
      if (!res.ok) toast.error(res.error);
    });
  }

  function handleRatingChange(value: number | null) {
    setRating(value);
    enqueue(async () => {
      const res = await setItemRating(item.id, value);
      if (!res.ok) toast.error(res.error);
    });
  }

  function handlePersonalFieldChange(key: string, value: unknown) {
    const next = { ...personalValues, [key]: value };
    setPersonalValues(next);
    debouncedFieldSave({ [key]: value });
  }

  function commitTags(next: string[]) {
    setTags(next);
    enqueue(async () => {
      const res = await setItemTags(item.id, next);
      if (!res.ok) toast.error(res.error);
    });
  }

  const [archiving, setArchiving] = useState(false);
  function handleArchiveToggle() {
    if (archiving) return;
    setArchiving(true);
    enqueue(async () => {
      const res = await archiveItem(item.id, !item.archived_at);
      setArchiving(false);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(item.archived_at ? "Restored" : "Archived");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">My Information</h2>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" onClick={toggleFavorite} aria-label="Toggle favourite" aria-pressed={favorite}>
            <Heart className={favorite ? "size-4 fill-rose-500 text-rose-500" : "size-4"} />
          </Button>
        </div>
      </div>

      {tracker.statuses.length > 0 && (
        <div>
          <Label htmlFor="status-select">Status</Label>
          <Select id="status-select" value={statusId} onChange={(e) => handleStatusChange(e.target.value)}>
            <option value="">—</option>
            {tracker.statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div>
        <Label>Rating</Label>
        <RatingStars value={rating} onChange={handleRatingChange} />
      </div>

      {personalFields.map((field) => (
        <div key={field.id}>
          <Label>{field.label}</Label>
          <FieldInput field={field} value={personalValues[field.key]} onChange={(v) => handlePersonalFieldChange(field.key, v)} />
        </div>
      ))}

      <div>
        <Label htmlFor="tags">Tags</Label>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span key={t} className="flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs">
              {t}
              <button
                onClick={() => commitTags(tags.filter((x) => x !== t))}
                className="text-muted-2 hover:text-foreground"
                aria-label={`Remove tag ${t}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
        <input
          id="tags"
          list="tag-suggestions"
          value={tagDraft}
          onChange={(e) => setTagDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && tagDraft.trim()) {
              e.preventDefault();
              if (!tags.includes(tagDraft.trim())) commitTags([...tags, tagDraft.trim()]);
              setTagDraft("");
            }
          }}
          placeholder="Add a tag and press Enter…"
          className="mt-2 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
        />
        <datalist id="tag-suggestions">
          {allTagNames.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            debouncedNotes(e.target.value);
          }}
          rows={4}
          placeholder="Your thoughts, context, anything worth remembering…"
        />
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <p className="text-xs text-muted-2">Added {new Date(item.created_at).toLocaleDateString()}</p>
        {item.external_url && (
          <a
            href={item.external_url}
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-center gap-1.5 text-xs text-muted hover:text-accent"
          >
            <ExternalLink className="size-3.5" />
            View source ({item.external_source})
          </a>
        )}
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" size="sm" onClick={handleArchiveToggle} loading={archiving} className="flex-1">
            {item.archived_at ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
            {item.archived_at ? "Restore" : "Archive"}
          </Button>
          <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete item?">
        <p className="text-sm text-muted">
          This permanently deletes <span className="text-foreground">{item.title}</span> and all its notes, ratings, and field values. This
          can&apos;t be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDelete(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={deleting}
            onClick={async () => {
              if (deleting) return;
              setDeleting(true);
              // On success this redirects (throws NEXT_REDIRECT, unmounting the component);
              // it only returns a value on failure.
              const result = await deleteItem(item.id, tracker.slug);
              if (result && !result.ok) {
                setDeleting(false);
                toast.error(result.error);
              }
            }}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
