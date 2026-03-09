-- Speed optimization: enable native upsert conflict key for discover run items.
-- We keep the newest row per (job_id, cj_product_id), then enforce uniqueness.

do $$
begin
  if to_regclass('public.admin_job_items') is null then
    return;
  end if;

  with ranked_duplicates as (
    select
      id,
      row_number() over (
        partition by job_id, cj_product_id
        order by id desc
      ) as row_rank
    from public.admin_job_items
    where cj_product_id is not null
  )
  delete from public.admin_job_items target
  using ranked_duplicates dup
  where target.id = dup.id
    and dup.row_rank > 1;

  create unique index if not exists idx_admin_job_items_job_pid_unique
    on public.admin_job_items(job_id, cj_product_id);
end $$;
