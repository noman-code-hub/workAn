create table if not exists public.resume_template_definitions (
  id text primary key default gen_random_uuid()::text,
  slug text not null unique,
  name text not null,
  description text,
  category text,
  thumbnail_url text,
  is_active boolean not null default true,
  definition jsonb not null,
  created_by text references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists resume_template_definitions_active_idx
  on public.resume_template_definitions(is_active);

create index if not exists resume_template_definitions_created_at_idx
  on public.resume_template_definitions(created_at desc);

create trigger resume_template_definitions_set_updated_at
before update on public.resume_template_definitions
for each row execute function public.set_updated_at();

alter table public.resume_template_definitions enable row level security;

create policy "Resume templates are viewable"
on public.resume_template_definitions for select
using (true);

create policy "Admins can manage resume templates"
on public.resume_template_definitions for all
using (public.is_admin())
with check (public.is_admin());
