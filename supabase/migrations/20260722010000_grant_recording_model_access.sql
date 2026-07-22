-- Supabase's baseline default privileges grant only maintenance privileges on
-- new tables. Table grants are still required before RLS policies can apply.

grant select, insert, update, delete
  on table public.user_recording_data
  to authenticated;

grant select
  on table public.youtube_items, public.recording_youtube_items
  to authenticated;

grant all
  on table
    public.user_recording_data,
    public.youtube_items,
    public.recording_youtube_items
  to service_role;
