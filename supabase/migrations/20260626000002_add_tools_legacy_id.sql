-- public.tools was missing legacy_id, unlike every other core table
alter table public.tools add column legacy_id text unique;
