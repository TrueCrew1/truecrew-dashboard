-- Librarian artifact index extensions on notes
alter table public.notes
  add column if not exists tags text[] not null default '{}',
  add column if not exists refinement_source text
    check (refinement_source in ('deterministic', 'ai')) default 'deterministic',
  add column if not exists agent text default 'librarian';

create index if not exists notes_source_task_id_idx on public.notes(source_task_id);
create unique index if not exists notes_obsidian_path_unique on public.notes(obsidian_path);
