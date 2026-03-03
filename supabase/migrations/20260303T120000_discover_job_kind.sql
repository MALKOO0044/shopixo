-- Allow Discover background jobs in admin_jobs
alter table if exists public.admin_jobs
  drop constraint if exists admin_jobs_kind_check;

alter table if exists public.admin_jobs
  add constraint admin_jobs_kind_check
  check (kind in ('finder', 'import', 'sync', 'scanner', 'media', 'discover'));
