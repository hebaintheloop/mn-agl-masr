-- Event uploads stay private. Homepage gallery photos are intentionally public.
-- Upload capabilities are minted only by the authenticated leader gateway.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('event-images','event-images',false,2097152,array['image/jpeg']),
       ('site-images','site-images',true,2097152,array['image/jpeg'])
on conflict(id) do nothing;
