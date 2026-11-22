import "server-only";
import { createClient } from "./server";

/**
 * RLS is the real ownership boundary — a query scoped to another user's row
 * simply returns zero rows, never another user's data. But without this
 * check, a mutation called with no session at all still returns `{ ok: true }`
 * (Postgres "0 rows updated" isn't an error), which is a misleading response
 * for a call that did nothing. This makes "not signed in" an explicit,
 * reported failure instead of a silent no-op.
 */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}
