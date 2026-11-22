import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTrackerWithConfig } from "@/lib/data/trackers";
import { StatusManager } from "@/components/trackers/status-manager";
import { FieldManager } from "@/components/trackers/field-manager";
import { TrackerDangerZone } from "@/components/trackers/tracker-danger-zone";

export default async function TrackerSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tracker = await getTrackerWithConfig(slug);
  if (!tracker) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href={`/t/${tracker.slug}`} className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          Back to {tracker.name}
        </Link>
        <h1 className="mt-2 text-xl font-semibold">{tracker.name} Settings</h1>
      </div>

      <TrackerDangerZone tracker={tracker} />
      <StatusManager trackerId={tracker.id} statuses={tracker.statuses} />
      <FieldManager trackerId={tracker.id} fields={tracker.fields} />
    </div>
  );
}
