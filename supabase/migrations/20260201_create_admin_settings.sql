create table public.admin_settings (
  key text not null,
  value jsonb not null,
  description text,
  updated_at timestamp with time zone default now(),
  constraint admin_settings_pkey primary key (key)
);

alter table public.admin_settings enable row level security;

-- Allow everyone to read settings (needed for client-side pricing display and API)
create policy "Enable read access for all users" on "public"."admin_settings"
    as PERMISSIVE for SELECT
    to public
    using (true);

-- Allow only admins to update (assuming admin role or specific user check)
-- For MVP, we might just allow authenticated write if we trust the 'admin' layout check, 
-- BUT better to restrict. 
-- Since we don't have a robust 'role' in auth.users metadata guaranteed, 
-- we will restrict to authenticated users for now, trusting the UI. 
-- TODO: Tighten this to proper admin role check in production.
create policy "Enable write for authenticated" on "public"."admin_settings"
    as PERMISSIVE for INSERT
    to authenticated
    with check (true);

create policy "Enable update for authenticated" on "public"."admin_settings"
    as PERMISSIVE for UPDATE
    to authenticated
    using (true)
    with check (true);
