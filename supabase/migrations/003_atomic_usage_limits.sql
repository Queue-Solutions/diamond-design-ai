alter table public.usage_events
  add column if not exists status text not null default 'succeeded'
    check (status in ('reserved', 'succeeded', 'failed')),
  add column if not exists latency_ms integer null,
  add column if not exists error_code text null;

create index if not exists usage_events_status_idx on public.usage_events(status);

create or replace function public.consume_image_credit(
  p_user_id uuid,
  p_session_id uuid,
  p_event_type text,
  p_provider text,
  p_model text,
  p_estimated_cost numeric,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  usage_event_id uuid,
  daily_remaining integer,
  monthly_remaining integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_daily_used integer;
  v_monthly_used integer;
  v_event_id uuid;
  v_day_start timestamptz := date_trunc('day', now());
  v_month_start timestamptz := date_trunc('month', now());
begin
  if p_event_type not in ('image_generation', 'image_edit') then
    raise exception 'INVALID_IMAGE_USAGE_EVENT';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if v_profile.is_blocked then
    raise exception 'USER_BLOCKED';
  end if;

  select coalesce(sum(units), 0)::integer
  into v_daily_used
  from public.usage_events
  where user_id = p_user_id
    and event_type in ('image_generation', 'image_edit')
    and status in ('reserved', 'succeeded')
    and created_at >= v_day_start;

  select coalesce(sum(units), 0)::integer
  into v_monthly_used
  from public.usage_events
  where user_id = p_user_id
    and event_type in ('image_generation', 'image_edit')
    and status in ('reserved', 'succeeded')
    and created_at >= v_month_start;

  if v_daily_used >= v_profile.daily_image_limit then
    raise exception 'DAILY_IMAGE_LIMIT_EXCEEDED';
  end if;

  if v_monthly_used >= v_profile.monthly_image_limit then
    raise exception 'MONTHLY_IMAGE_LIMIT_EXCEEDED';
  end if;

  insert into public.usage_events (
    user_id,
    session_id,
    event_type,
    provider,
    model,
    units,
    estimated_cost,
    metadata,
    status
  )
  values (
    p_user_id,
    p_session_id,
    p_event_type,
    p_provider,
    p_model,
    1,
    p_estimated_cost,
    coalesce(p_metadata, '{}'::jsonb),
    'reserved'
  )
  returning id into v_event_id;

  usage_event_id := v_event_id;
  daily_remaining := greatest(0, v_profile.daily_image_limit - v_daily_used - 1);
  monthly_remaining := greatest(0, v_profile.monthly_image_limit - v_monthly_used - 1);
  return next;
end;
$$;

grant execute on function public.consume_image_credit(uuid, uuid, text, text, text, numeric, jsonb) to service_role;

notify pgrst, 'reload schema';
