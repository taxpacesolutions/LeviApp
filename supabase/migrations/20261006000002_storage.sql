-- Public bucket for optional reward / goal pictures.
-- Uploads happen only from the Next.js server (service role), so no
-- insert/update policies are granted to anon or authenticated users.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reward-images', 'reward-images', true, 5242880,
        array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do nothing;
