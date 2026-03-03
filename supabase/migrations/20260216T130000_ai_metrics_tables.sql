-- AI metrics and action logging tables (idempotent)

create table if not exists public.ai_actions (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  action_type text not null,
  agent_name text not null,
  status text not null default 'pending',
  severity text not null default 'info',
  explanation text,
  result_data jsonb,
  error_message text,
  updated_at timestamptz not null default now()
);

create index if not exists ai_actions_action_type_created_idx on public.ai_actions(action_type, created_at desc);

alter table public.ai_actions enable row level security;
drop policy if exists "Service role can manage ai_actions" on public.ai_actions;
create policy "Service role can manage ai_actions" on public.ai_actions
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create table if not exists public.ai_metrics (
  id bigserial primary key,
  metric_type text not null,
  agent_name text not null,
  value numeric not null,
  previous_value numeric null,
  delta numeric null,
  unit text not null,
  metadata jsonb,
  recorded_at timestamptz not null default now()
);

create index if not exists ai_metrics_metric_type_recorded_idx on public.ai_metrics(metric_type, recorded_at desc);
create index if not exists ai_metrics_agent_name_recorded_idx on public.ai_metrics(agent_name, recorded_at desc);

alter table public.ai_metrics enable row level security;
drop policy if exists "Service role can manage ai_metrics" on public.ai_metrics;
create policy "Service role can manage ai_metrics" on public.ai_metrics
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
