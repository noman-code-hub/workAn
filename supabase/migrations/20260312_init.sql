create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.users (
  id text primary key default gen_random_uuid()::text,
  email text not null,
  name text not null,
  role text,
  photo_url text,
  banner_url text,
  country text,
  profession text,
  skills text[] not null default '{}'::text[],
  resume_url text,
  interview_readiness_score integer,
  subscription text not null default 'free',
  credits integer not null default 10,
  about text,
  analytics jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();

create table if not exists public.blogs (
  id text primary key default gen_random_uuid()::text,
  user_id text references public.users(id) on delete set null,
  author_name text,
  author_avatar text,
  title text,
  content text,
  image_url text,
  likes integer not null default 0,
  comments_count integer not null default 0,
  type text not null default 'blog',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger blogs_set_updated_at
before update on public.blogs
for each row execute function public.set_updated_at();

create table if not exists public.posts (
  id text primary key default gen_random_uuid()::text,
  author_id text references public.users(id) on delete set null,
  author_name text,
  author_photo text,
  content text not null,
  image_url text,
  likes integer not null default 0,
  liked_by text[] not null default '{}'::text[],
  comments_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger posts_set_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

create table if not exists public.comments (
  id text primary key default gen_random_uuid()::text,
  post_id text not null references public.posts(id) on delete cascade,
  author_id text references public.users(id) on delete set null,
  author_name text,
  author_photo text,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  company text not null,
  description text,
  location text,
  salary_min integer,
  salary_max integer,
  salary_currency text,
  salary_text text,
  type text,
  requirements text[] not null default '{}'::text[],
  skills text[] not null default '{}'::text[],
  tags text[] not null default '{}'::text[],
  posted_by text references public.users(id) on delete set null,
  applicants_count integer not null default 0,
  apply_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger jobs_set_updated_at
before update on public.jobs
for each row execute function public.set_updated_at();

create table if not exists public.job_applicants (
  job_id text not null references public.jobs(id) on delete cascade,
  user_id text not null references public.users(id) on delete cascade,
  name text,
  email text,
  resume_url text,
  status text not null default 'pending',
  applied_at timestamptz not null default now(),
  notes text,
  primary key (job_id, user_id)
);

create index if not exists posts_created_at_idx on public.posts(created_at desc);
create index if not exists comments_post_id_idx on public.comments(post_id);
create index if not exists blogs_created_at_idx on public.blogs(created_at desc);
create index if not exists jobs_posted_by_idx on public.jobs(posted_by);
create index if not exists job_applicants_job_id_idx on public.job_applicants(job_id);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()::text
      and role = 'admin'
  );
$$;

alter table public.users enable row level security;
alter table public.blogs enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.jobs enable row level security;
alter table public.job_applicants enable row level security;

create policy "Public profiles are viewable"
on public.users for select
using (true);

create policy "Users can insert their profile"
on public.users for insert
with check (auth.uid()::text = id);

create policy "Users can update their profile"
on public.users for update
using (auth.uid()::text = id);

create policy "Blogs are viewable"
on public.blogs for select
using (true);

create policy "Users can create blogs"
on public.blogs for insert
with check (auth.uid()::text = user_id);

create policy "Users can update their blogs"
on public.blogs for update
using (auth.uid()::text = user_id or public.is_admin());

create policy "Users can delete their blogs"
on public.blogs for delete
using (auth.uid()::text = user_id or public.is_admin());

create policy "Posts are viewable"
on public.posts for select
using (true);

create policy "Users can create posts"
on public.posts for insert
with check (auth.uid()::text = author_id);

create policy "Users can update their posts"
on public.posts for update
using (auth.uid()::text = author_id or public.is_admin());

create policy "Users can delete their posts"
on public.posts for delete
using (auth.uid()::text = author_id or public.is_admin());

create policy "Comments are viewable"
on public.comments for select
using (true);

create policy "Users can create comments"
on public.comments for insert
with check (auth.uid()::text = author_id);

create policy "Users can delete their comments"
on public.comments for delete
using (auth.uid()::text = author_id or public.is_admin());

create policy "Jobs are viewable"
on public.jobs for select
using (true);

create policy "Users can create jobs"
on public.jobs for insert
with check (auth.uid()::text = posted_by);

create policy "Users can update their jobs"
on public.jobs for update
using (auth.uid()::text = posted_by or public.is_admin());

create policy "Users can delete their jobs"
on public.jobs for delete
using (auth.uid()::text = posted_by or public.is_admin());

create policy "Applicants view own or recruiter"
on public.job_applicants for select
using (
  auth.uid()::text = user_id
  or public.is_admin()
  or exists (
    select 1 from public.jobs j
    where j.id = job_id
      and j.posted_by = auth.uid()::text
  )
);

create policy "Users can apply to jobs"
on public.job_applicants for insert
with check (auth.uid()::text = user_id);

create policy "Users can update their application"
on public.job_applicants for update
using (
  auth.uid()::text = user_id
  or public.is_admin()
  or exists (
    select 1 from public.jobs j
    where j.id = job_id
      and j.posted_by = auth.uid()::text
  )
);

create policy "Users can delete their application"
on public.job_applicants for delete
using (
  auth.uid()::text = user_id
  or public.is_admin()
  or exists (
    select 1 from public.jobs j
    where j.id = job_id
      and j.posted_by = auth.uid()::text
  )
);
