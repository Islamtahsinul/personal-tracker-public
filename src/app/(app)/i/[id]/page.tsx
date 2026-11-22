import { notFound } from "next/navigation";
import { getItemById } from "@/lib/data/items";
import { getTrackerWithConfigById } from "@/lib/data/trackers";
import { getAllTags } from "@/lib/data/tags";
import { ItemHeader } from "@/components/items/item-header";
import { ItemDetailPanel } from "@/components/items/item-detail-panel";
import { FieldValueDisplay } from "@/components/items/field-value-display";

export default async function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getItemById(id);
  if (!item) notFound();

  const [tracker, allTags] = await Promise.all([getTrackerWithConfigById(item.tracker_id), getAllTags()]);
  if (!tracker) notFound();

  const externalFields = tracker.fields.filter((f) => !f.is_personal && f.key !== "description");
  const descriptionField = tracker.fields.find((f) => !f.is_personal && f.key === "description");
  const description = descriptionField ? (item.fieldValues["description"] as string | undefined) : undefined;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <ItemHeader item={item} tracker={tracker} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="mb-4 text-sm font-semibold">External Information</h2>
            {description && <p className="mb-5 text-sm leading-relaxed text-muted whitespace-pre-wrap">{description}</p>}
            {externalFields.length === 0 && !description ? (
              <p className="text-sm text-muted-2">No external details yet — use Edit to add some.</p>
            ) : (
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                {externalFields.map((field) => (
                  <div key={field.id}>
                    <dt className="text-xs font-medium text-muted-2">{field.label}</dt>
                    <dd className="mt-1 text-sm">
                      <FieldValueDisplay field={field} value={item.fieldValues[field.key]} />
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>

        <div>
          <ItemDetailPanel item={item} tracker={tracker} allTagNames={(allTags ?? []).map((t) => t.name)} />
        </div>
      </div>
    </div>
  );
}
