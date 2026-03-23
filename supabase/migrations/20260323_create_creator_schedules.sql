-- Migration: Create creator_schedules table
create table if not exists public.creator_schedules (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  room_type text not null,
  title text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  created_at timestamptz default now()
);

-- Index for fast lookups by creator
create index idx_creator_schedules_creator_id on public.creator_schedules(creator_id);
-- Index for date range queries
create index idx_creator_schedules_start_time on public.creator_schedules(start_time);

-- RLS
alter table public.creator_schedules enable row level security;

-- Anyone can read schedules
create policy "Anyone can view schedules"
  on public.creator_schedules for select
  using (true);

-- Only the creator can insert their own schedules
create policy "Creators can insert own schedules"
  on public.creator_schedules for insert
  with check (auth.uid() = creator_id);

-- Only the creator can update their own schedules
create policy "Creators can update own schedules"
  on public.creator_schedules for update
  using (auth.uid() = creator_id);

-- Only the creator can delete their own schedules
create policy "Creators can delete own schedules"
  on public.creator_schedules for delete
  using (auth.uid() = creator_id);
