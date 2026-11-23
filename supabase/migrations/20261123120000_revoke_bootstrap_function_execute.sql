-- Same class of fix as add_trackers_for_user in
-- 20260917150000_harden_reference_and_tracker_functions.sql.
--
-- bootstrap_default_trackers(uuid) is SECURITY DEFINER and takes an arbitrary
-- p_user_id. Postgres grants EXECUTE on new functions to PUBLIC by default, so
-- without this revoke any caller with the publishable key (anon) or any
-- signed-in user could call it through PostgREST (/rest/v1/rpc/...) and insert
-- the starter trackers into a DIFFERENT user's account, bypassing RLS.
--
-- It is only meant to run from the on_auth_user_created trigger via
-- handle_new_user(), which is itself SECURITY DEFINER and so keeps working
-- after this revoke (it executes as the function owner, not the caller).
-- handle_new_user() is a trigger function and cannot be called over RPC, but
-- it is revoked too for defence in depth.

revoke execute on function bootstrap_default_trackers(uuid) from public, anon, authenticated;
revoke execute on function handle_new_user() from public, anon, authenticated;
