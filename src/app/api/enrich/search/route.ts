import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProviderForCategory } from "@/lib/providers/registry";
import { ProviderUnavailableError } from "@/lib/providers/types";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const category = request.nextUrl.searchParams.get("category") ?? "";
  const query = request.nextUrl.searchParams.get("q") ?? "";

  if (!query.trim()) {
    return NextResponse.json({ results: [] });
  }

  const provider = getProviderForCategory(category);
  if (!provider) {
    return NextResponse.json({ results: [], providerAvailable: false });
  }

  try {
    const results = await provider.search(query.trim());
    return NextResponse.json({ results, providerAvailable: true, providerLabel: provider.label });
  } catch (error) {
    if (error instanceof ProviderUnavailableError) {
      return NextResponse.json({ results: [], providerAvailable: false, reason: error.message });
    }
    console.error("Enrichment search failed", error);
    return NextResponse.json(
      { results: [], providerAvailable: true, error: "The external search failed. Try again, or enter details manually." },
      { status: 200 },
    );
  }
}
