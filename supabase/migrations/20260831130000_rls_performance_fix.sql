-- Wrap auth.uid() in (select ...) so Postgres evaluates it once per query
-- instead of once per row (flagged by Supabase's performance advisor —
-- auth_rls_initplan — across all 9 owner policies).
drop policy "trackers_owner" on trackers;
create policy "trackers_owner" on trackers for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy "tracker_statuses_owner" on tracker_statuses;
create policy "tracker_statuses_owner" on tracker_statuses for all
  using (exists (select 1 from trackers t where t.id = tracker_id and t.user_id = (select auth.uid())))
  with check (exists (select 1 from trackers t where t.id = tracker_id and t.user_id = (select auth.uid())));

drop policy "tracker_fields_owner" on tracker_fields;
create policy "tracker_fields_owner" on tracker_fields for all
  using (exists (select 1 from trackers t where t.id = tracker_id and t.user_id = (select auth.uid())))
  with check (exists (select 1 from trackers t where t.id = tracker_id and t.user_id = (select auth.uid())));

drop policy "tracker_field_options_owner" on tracker_field_options;
create policy "tracker_field_options_owner" on tracker_field_options for all
  using (exists (
    select 1 from tracker_fields f join trackers t on t.id = f.tracker_id
    where f.id = field_id and t.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from tracker_fields f join trackers t on t.id = f.tracker_id
    where f.id = field_id and t.user_id = (select auth.uid())
  ));

drop policy "items_owner" on items;
create policy "items_owner" on items for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy "item_field_values_owner" on item_field_values;
create policy "item_field_values_owner" on item_field_values for all
  using (exists (select 1 from items i where i.id = item_id and i.user_id = (select auth.uid())))
  with check (exists (select 1 from items i where i.id = item_id and i.user_id = (select auth.uid())));

drop policy "tags_owner" on tags;
create policy "tags_owner" on tags for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy "item_tags_owner" on item_tags;
create policy "item_tags_owner" on item_tags for all
  using (exists (select 1 from items i where i.id = item_id and i.user_id = (select auth.uid())))
  with check (exists (select 1 from items i where i.id = item_id and i.user_id = (select auth.uid())));

drop policy "item_enrichment_records_owner" on item_enrichment_records;
create policy "item_enrichment_records_owner" on item_enrichment_records for all
  using (exists (select 1 from items i where i.id = item_id and i.user_id = (select auth.uid())))
  with check (exists (select 1 from items i where i.id = item_id and i.user_id = (select auth.uid())));
