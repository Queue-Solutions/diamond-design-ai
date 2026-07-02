update storage.buckets
set public = false
where id = 'design-images';

insert into storage.buckets (id, name, public)
values ('design-images', 'design-images', false)
on conflict (id) do update set public = false;

alter table public.design_images
  alter column image_url drop not null;

drop policy if exists "design_images_storage_select" on storage.objects;
drop policy if exists "design_images_storage_insert_own" on storage.objects;
drop policy if exists "design_images_storage_update_own" on storage.objects;

create policy "design_images_storage_select_own_or_admin"
on storage.objects for select
using (
  bucket_id = 'design-images'
  and (
    auth.uid()::text = (storage.foldername(name))[2]
    or public.is_admin()
  )
);

create policy "design_images_storage_insert_own_or_admin"
on storage.objects for insert
with check (
  bucket_id = 'design-images'
  and (
    auth.uid()::text = (storage.foldername(name))[2]
    or public.is_admin()
  )
);

create policy "design_images_storage_update_own_or_admin"
on storage.objects for update
using (
  bucket_id = 'design-images'
  and (
    auth.uid()::text = (storage.foldername(name))[2]
    or public.is_admin()
  )
)
with check (
  bucket_id = 'design-images'
  and (
    auth.uid()::text = (storage.foldername(name))[2]
    or public.is_admin()
  )
);

notify pgrst, 'reload schema';
