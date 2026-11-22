"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { TrackerFormDialog } from "@/components/trackers/tracker-form-dialog";
import { setTrackerArchived, deleteTracker } from "@/lib/actions/trackers";
import type { Tracker } from "@/lib/types/domain";

export function TrackerDangerZone({ tracker }: { tracker: Tracker }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleArchiveToggle() {
    if (archiving) return;
    setArchiving(true);
    const res = await setTrackerArchived(tracker.id, !tracker.is_archived);
    setArchiving(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(tracker.is_archived ? "Tracker restored" : "Tracker archived");
    router.refresh();
  }

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    // On success this redirects (throws NEXT_REDIRECT, unmounting the component);
    // it only returns a value on failure.
    const result = await deleteTracker(tracker.id);
    if (result && !result.ok) {
      setDeleting(false);
      toast.error(result.error);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="mb-4 text-sm font-semibold">Tracker Settings</h2>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="size-3.5" />
          Edit Tracker
        </Button>
        <Button variant="secondary" size="sm" onClick={handleArchiveToggle} loading={archiving}>
          {tracker.is_archived ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
          {tracker.is_archived ? "Restore" : "Archive"}
        </Button>
        <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
          <Trash2 className="size-3.5" />
          Delete Tracker
        </Button>
      </div>

      <TrackerFormDialog open={editOpen} onClose={() => setEditOpen(false)} tracker={tracker} />

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete tracker?">
        <p className="text-sm text-muted">
          This permanently deletes <span className="text-foreground">{tracker.name}</span> and every item, field, and status inside it.
          This can&apos;t be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDelete(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="danger" loading={deleting} onClick={handleDelete}>
            Delete Permanently
          </Button>
        </div>
      </Modal>
    </div>
  );
}
