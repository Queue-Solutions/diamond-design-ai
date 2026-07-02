grant usage on schema public to anon, authenticated, service_role;

grant select, update on public.profiles to authenticated, service_role;
grant select, insert, update on public.design_sessions to authenticated, service_role;
grant select, insert, update on public.design_images to authenticated, service_role;
grant select, insert on public.usage_events to authenticated, service_role;

grant select on public.profiles to anon;

notify pgrst, 'reload schema';
