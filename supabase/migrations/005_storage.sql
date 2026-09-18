
-- 005_storage.sql
insert into storage.buckets(id,name,public)
values('profile-pictures','profile-pictures',false)
on conflict(id) do nothing;

create policy "profile pictures read approved"
on storage.objects for select to authenticated
using(bucket_id='profile-pictures' and public.is_approved());

create policy "profile pictures write approved"
on storage.objects for insert to authenticated
with check(bucket_id='profile-pictures' and public.is_approved());

create policy "profile pictures update approved"
on storage.objects for update to authenticated
using(bucket_id='profile-pictures' and public.is_approved());

create policy "profile pictures delete approved"
on storage.objects for delete to authenticated
using(bucket_id='profile-pictures' and public.is_approved());
