-- CJ Search Jobs - Background job system for long-running product searches
-- Allows searches for 50-3000+ products without timing out

create table if not exists cj_search_jobs (
    id uuid primary key default gen_random_uuid(),
    status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed', 'cancelled')),
    
    -- Search parameters (stored as JSON for flexibility)
    params jsonb not null,
    
    -- Progress tracking
    requested_quantity integer not null,
    found_count integer not null default 0,
    processed_count integer not null default 0,
    progress_message text,
    
    -- Results stored as JSONB array (can be large for 3000 products)
    results jsonb,
    
    -- Error tracking
    error_message text,
    
    -- Timestamps
    created_at timestamptz not null default now(),
    started_at timestamptz,
    finished_at timestamptz,
    last_updated_at timestamptz not null default now()
);

-- Index for efficient status queries
create index if not exists idx_cj_search_jobs_status on cj_search_jobs(status);
create index if not exists idx_cj_search_jobs_created_at on cj_search_jobs(created_at desc);

-- RLS policies: Only service role can access (admin-only feature)
alter table cj_search_jobs enable row level security;

drop policy if exists "Service role can manage search jobs" on cj_search_jobs;
create policy "Service role can manage search jobs" on cj_search_jobs
    for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- Allow public read for job status (needed for SSE polling)
drop policy if exists "Public can read search job status" on cj_search_jobs;
create policy "Public can read search job status" on cj_search_jobs
    for select using (true);
