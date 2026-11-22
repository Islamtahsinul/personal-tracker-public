"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ColorPicker } from "@/components/trackers/icon-color-picker";
import { Modal } from "@/components/ui/modal";
import { createStatus, deleteStatus } from "@/lib/actions/trackers";
import { slugify } from "@/lib/utils";
import type { TrackerStatus } from "@/lib/types/domain";

export function StatusManager({ trackerId, statuses }: { trackerId: string; statuses: TrackerStatus[] }) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<TrackerStatus | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleAdd() {
    if (!label.trim()) return;
    setSaving(true);
    const res = await createStatus(trackerId, { key: slugify(label).replace(/-/g, "_"), label, color, is_default: statuses.length === 0 });
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setLabel("");
    setAdding(false);
  }

  async function handleDelete() {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    const res = await deleteStatus(pendingDelete.id);
    setDeleting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setPendingDelete(null);
    toast.success("Status deleted");
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Statuses</h2>
        <Button size="sm" variant="secondary" onClick={() => setAdding((v) => !v)}>
          <Plus className="size-3.5" />
          Add
        </Button>
      </div>

      <div className="space-y-2">
        {statuses.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-sm">{s.label}</span>
              {s.is_default && <span className="text-xs text-muted-2">(default)</span>}
            </div>
            <button onClick={() => setPendingDelete(s)} className="text-muted-2 hover:text-danger" aria-label={`Delete ${s.label} status`}>
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
        {statuses.length === 0 && <p className="text-sm text-muted-2">No statuses configured.</p>}
      </div>

      {adding && (
        <div className="mt-4 space-y-3 rounded-lg border border-border bg-surface-2 p-3">
          <div>
            <Label htmlFor="status-label">Label</Label>
            <Input id="status-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. On Hold" />
          </div>
          <div>
            <Label>Color</Label>
            <ColorPicker value={color} onChange={setColor} />
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAdd} loading={saving}>
              Add Status
            </Button>
          </div>
        </div>
      )}

      <Modal open={!!pendingDelete} onClose={() => setPendingDelete(null)} title="Delete status?">
        <p className="text-sm text-muted">
          This permanently deletes the <span className="text-foreground">{pendingDelete?.label}</span> status. Any items currently set to
          it will have their status cleared. This can&apos;t be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setPendingDelete(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="danger" loading={deleting} onClick={handleDelete}>
            Delete Status
          </Button>
        </div>
      </Modal>
    </div>
  );
}
