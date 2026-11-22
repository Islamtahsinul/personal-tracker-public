"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Loader2, PenLine, ArrowLeft, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { FieldInput } from "@/components/items/field-input";
import { createItem, createItemFromEnrichment, findPossibleDuplicates } from "@/lib/actions/items";
import type { TrackerWithConfig } from "@/lib/types/domain";
import type { NormalizedItem, ProviderSearchResult } from "@/lib/providers/types";

type Step = "search" | "review";

export function AddItemDialog({
  open,
  onClose,
  tracker,
}: {
  open: boolean;
  onClose: () => void;
  tracker: TrackerWithConfig;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("search");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<ProviderSearchResult[]>([]);
  const [providerAvailable, setProviderAvailable] = useState(true);
  const [providerLabel, setProviderLabel] = useState<string | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [saving, setSaving] = useState(false);

  const [source, setSource] = useState<{ providerId: string; normalized: NormalizedItem } | null>(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [statusId, setStatusId] = useState(tracker.statuses.find((s) => s.is_default)?.id ?? "");
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({});
  const [duplicates, setDuplicates] = useState<{ id: string; title: string; image_url: string | null }[]>([]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dupDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Cancel whatever search is still in flight — without this, a slow older
    // request can resolve after a newer one and clobber its results with a
    // stale response. At the volume this app is meant to handle (searching
    // repeatedly while adding many items), that's not a hypothetical.
    searchAbortRef.current?.abort();

    debounceRef.current = setTimeout(
      async () => {
        if (!query.trim()) {
          setResults([]);
          return;
        }
        const controller = new AbortController();
        searchAbortRef.current = controller;
        setSearching(true);
        try {
          const res = await fetch(`/api/enrich/search?category=${tracker.category}&q=${encodeURIComponent(query.trim())}`, {
            signal: controller.signal,
          });
          const data = await res.json();
          if (controller.signal.aborted) return;
          setResults(data.results ?? []);
          setProviderAvailable(data.providerAvailable ?? false);
          setProviderLabel(data.providerLabel ?? null);
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setResults([]);
        } finally {
          if (!controller.signal.aborted) setSearching(false);
        }
      },
      query.trim() ? 350 : 0,
    );
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      searchAbortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open]);

  // Warn (never block — a second copy can be legitimate) when the review title matches
  // something already in this tracker.
  useEffect(() => {
    if (dupDebounceRef.current) clearTimeout(dupDebounceRef.current);
    dupDebounceRef.current = setTimeout(
      async () => {
        if (step !== "review" || !title.trim()) {
          setDuplicates([]);
          return;
        }
        const matches = await findPossibleDuplicates(tracker.id, title, source?.providerId, source?.normalized.externalId);
        setDuplicates(matches);
      },
      step === "review" && title.trim() ? 400 : 0,
    );
    return () => {
      if (dupDebounceRef.current) clearTimeout(dupDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, title, tracker.id]);

  function resetState() {
    setStep("search");
    setQuery("");
    setResults([]);
    setSource(null);
    setTitle("");
    setSubtitle("");
    setImageUrl("");
    setFieldValues({});
    setDuplicates([]);
    setStatusId(tracker.statuses.find((s) => s.is_default)?.id ?? "");
  }

  function handleClose() {
    resetState();
    onClose();
  }

  async function selectCandidate(candidate: ProviderSearchResult) {
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/enrich/details?category=${tracker.category}&externalId=${encodeURIComponent(candidate.externalId)}`);
      const data = await res.json();
      const normalized: NormalizedItem | null = data.item;
      if (!normalized) {
        toast.error("Couldn't load details for that result. Try another, or enter manually.");
        return;
      }
      setSource({ providerId: data.providerId, normalized });
      setTitle(normalized.title);
      setSubtitle(normalized.subtitle ?? "");
      setImageUrl(normalized.imageUrl ?? "");
      setFieldValues(normalized.fields ?? {});
      setStep("review");
    } catch {
      toast.error("Something went wrong fetching details.");
    } finally {
      setLoadingDetails(false);
    }
  }

  function startManual() {
    setSource(null);
    setTitle(query);
    setSubtitle("");
    setImageUrl("");
    setFieldValues({});
    setStep("review");
  }

  async function handleSave() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    const result = source
      ? await createItemFromEnrichment(
          tracker.id,
          source.providerId,
          { ...source.normalized, title, subtitle, imageUrl, fields: fieldValues },
          statusId || null,
        )
      : await createItem({
          trackerId: tracker.id,
          title,
          subtitle,
          image_url: imageUrl,
          status_id: statusId || null,
          fieldValues,
        });
    setSaving(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`${title} added`);
    handleClose();
    if (result.itemId) router.push(`/i/${result.itemId}`);
    router.refresh();
  }

  return (
    <Modal open={open} onClose={handleClose} title={`Add to ${tracker.name}`} size={step === "review" ? "lg" : "md"}>
      {step === "search" && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
            <Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${tracker.name}…`} className="pl-9" />
          </div>

          {!providerAvailable && query.trim() && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <span>
                No automatic data source is configured for this tracker{providerLabel ? "" : " yet"}. You can still add items manually.
              </span>
            </div>
          )}

          <div className="max-h-80 space-y-1 overflow-y-auto">
            {searching && (
              <div className="flex items-center justify-center py-8 text-muted">
                <Loader2 className="size-5 animate-spin" />
              </div>
            )}
            {!searching &&
              results.map((r) => (
                <button
                  key={r.externalId}
                  onClick={() => selectCandidate(r)}
                  disabled={loadingDetails}
                  className="flex w-full items-center gap-3 rounded-lg border border-transparent p-2 text-left transition-colors hover:border-border hover:bg-white/5 disabled:opacity-50"
                >
                  <ImageWithFallback
                    src={r.imageUrl}
                    alt={r.title}
                    fallbackIconKey={tracker.icon}
                    fallbackColor={tracker.color}
                    className="h-14 w-10 shrink-0 rounded object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{r.title}</p>
                    {r.subtitle && <p className="text-xs text-muted">{r.subtitle}</p>}
                  </div>
                  {loadingDetails && <Loader2 className="ml-auto size-4 shrink-0 animate-spin text-muted" />}
                </button>
              ))}
            {!searching && query.trim() && results.length === 0 && (
              <p className="py-6 text-center text-sm text-muted">No matches found.</p>
            )}
          </div>

          <button
            onClick={startManual}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-2.5 text-sm text-muted transition-colors hover:border-accent/50 hover:text-accent"
          >
            <PenLine className="size-4" />
            Enter details manually instead
          </button>
        </div>
      )}

      {step === "review" && (
        <div className="space-y-5">
          <button onClick={() => setStep("search")} className="flex items-center gap-1 text-xs text-muted hover:text-foreground">
            <ArrowLeft className="size-3.5" />
            Back to search
          </button>

          <div className="flex gap-4">
            <ImageWithFallback
              src={imageUrl}
              alt={title}
              fallbackIconKey={tracker.icon}
              fallbackColor={tracker.color}
              className="h-32 w-24 shrink-0 rounded-lg object-cover"
            />
            <div className="flex-1 space-y-3">
              <div>
                <Label htmlFor="item-title">Title</Label>
                <Input id="item-title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="item-subtitle">Subtitle</Label>
                <Input id="item-subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Optional" />
              </div>
            </div>
          </div>

          {duplicates.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <span>
                Already in {tracker.name}:{" "}
                {duplicates.map((d, i) => (
                  <span key={d.id}>
                    {i > 0 && ", "}
                    <Link href={`/i/${d.id}`} target="_blank" className="underline hover:text-amber-200">
                      {d.title}
                    </Link>
                  </span>
                ))}
                . Saving will add a separate entry.
              </span>
            </div>
          )}

          <div>
            <Label htmlFor="item-image">Image URL</Label>
            <Input id="item-image" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
          </div>

          <div>
            <Label>Status</Label>
            <Select value={statusId} onChange={(e) => setStatusId(e.target.value)}>
              <option value="">—</option>
              {tracker.statuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>

          {tracker.fields.length > 0 && (
            <div className="space-y-4 border-t border-border pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-2">Details</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {tracker.fields.map((field) => (
                  <div key={field.id} className={field.field_type === "long_text" || field.field_type === "multi_select" ? "sm:col-span-2" : ""}>
                    <Label>{field.label}</Label>
                    <FieldInput
                      field={field}
                      value={fieldValues[field.key]}
                      onChange={(v) => setFieldValues((prev) => ({ ...prev, [field.key]: v }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              Save to {tracker.name}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
