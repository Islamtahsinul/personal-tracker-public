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
  const externalId = request.nextUrl.searchParams.get("externalId") ?? "";

  const provider = getProviderForCategory(category);
  if (!provider || !externalId) {
    return NextResponse.json({ item: null });
  }

  try {
    const item = await provider.getDetails(externalId);
    return NextResponse.json({ item, providerId: provider.id });
  } catch (error) {
    if (error instanceof ProviderUnavailableError) {
      return NextResponse.json({ item: null, reason: error.message });
    }
    console.error("Enrichment details failed", error);
    return NextResponse.json({ item: null, error: "Could not fetch details from the external source." });
  }
}
