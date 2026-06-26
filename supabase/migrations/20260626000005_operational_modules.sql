-- Operational modules: crews, assets, work_orders

-- ---------------------------------------------------------------------------
-- Crews
-- ---------------------------------------------------------------------------

create table if not exists public.crews (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  site_name text,
  capacity integer not null default 12 check (capacity > 0),
  availability text not null default 'available'
    check (availability in ('available', 'limited', 'unavailable')),
  lead_name text,
  notes text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger crews_set_updated_at before update on public.crews
  for each row execute function public.set_updated_at();

create index if not exists idx_crews_site_name on public.crews(site_name);
create index if not exists idx_crews_availability on public.crews(availability);

alter table public.crews enable row level security;

create policy "crews_select_authenticated"
  on public.crews for select to authenticated using (true);

create policy "crews_insert_authenticated"
  on public.crews for insert to authenticated with check (true);

create policy "crews_update_authenticated"
  on public.crews for update to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Assets
-- ---------------------------------------------------------------------------

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  name text not null,
  asset_type text not null default 'equipment'
    check (asset_type in ('equipment', 'vehicle', 'facility', 'tool', 'component')),
  site_name text,
  status text not null default 'operational'
    check (status in ('operational', 'maintenance', 'offline', 'retired')),
  serial_number text,
  manufacturer text,
  model text,
  crew_id uuid references public.crews(id) on delete set null,
  last_service_at timestamptz,
  next_service_at timestamptz,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger assets_set_updated_at before update on public.assets
  for each row execute function public.set_updated_at();

create index if not exists idx_assets_site_name on public.assets(site_name);
create index if not exists idx_assets_asset_type on public.assets(asset_type);
create index if not exists idx_assets_status on public.assets(status);
create index if not exists idx_assets_crew_id on public.assets(crew_id);

alter table public.assets enable row level security;

create policy "assets_select_authenticated"
  on public.assets for select to authenticated using (true);

create policy "assets_insert_authenticated"
  on public.assets for insert to authenticated with check (true);

create policy "assets_update_authenticated"
  on public.assets for update to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Work orders
-- ---------------------------------------------------------------------------

create table if not exists public.work_orders (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  title text not null,
  description text not null default '',
  status text not null default 'open'
    check (status in ('draft', 'open', 'in_progress', 'blocked', 'waiting', 'completed', 'cancelled')),
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'critical')),
  site_name text,
  sla_tier text not null default 'standard'
    check (sla_tier in ('critical', 'standard', 'routine')),
  due_at timestamptz,
  crew_id uuid references public.crews(id) on delete set null,
  asset_id uuid references public.assets(id) on delete set null,
  assignee text,
  blocker text,
  completed_at timestamptz,
  created_by text not null default 'system',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger work_orders_set_updated_at before update on public.work_orders
  for each row execute function public.set_updated_at();

create index if not exists idx_work_orders_status on public.work_orders(status);
create index if not exists idx_work_orders_site_name on public.work_orders(site_name);
create index if not exists idx_work_orders_sla_tier on public.work_orders(sla_tier);
create index if not exists idx_work_orders_crew_id on public.work_orders(crew_id);
create index if not exists idx_work_orders_due_at on public.work_orders(due_at);

alter table public.work_orders enable row level security;

create policy "work_orders_select_authenticated"
  on public.work_orders for select to authenticated using (true);

create policy "work_orders_insert_authenticated"
  on public.work_orders for insert to authenticated with check (true);

create policy "work_orders_update_authenticated"
  on public.work_orders for update to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Seed crews
-- ---------------------------------------------------------------------------

insert into public.crews (slug, name, site_name, capacity, availability, lead_name, notes) values
  ('field', 'Field Crew', 'Site A — Acme Corp', 8, 'available', 'Jordan Lee', 'Primary on-site response team'),
  ('maintenance', 'Maintenance Crew', 'HQ — Platform', 6, 'limited', 'Sam Rivera', 'Preventive and corrective maintenance'),
  ('operations', 'Operations Crew', 'HQ — Platform', 12, 'available', 'Alex Chen', 'Central dispatch and coordination'),
  ('admin', 'Admin Crew', 'HQ — Platform', 4, 'available', 'Morgan Patel', 'Back-office and compliance support')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Seed assets
-- ---------------------------------------------------------------------------

insert into public.assets (legacy_id, name, asset_type, site_name, status, serial_number, manufacturer, model, crew_id, last_service_at, next_service_at, notes)
select
  'asset-001',
  'HVAC Unit A-12',
  'equipment',
  'Site A — Acme Corp',
  'operational',
  'HVAC-A12-2022',
  'Carrier',
  'WeatherExpert 50XC',
  c.id,
  now() - interval '45 days',
  now() + interval '45 days',
  'Rooftop unit — quarterly PM schedule'
from public.crews c where c.slug = 'maintenance'
on conflict (legacy_id) do nothing;

insert into public.assets (legacy_id, name, asset_type, site_name, status, serial_number, manufacturer, model, crew_id, last_service_at, next_service_at, notes)
select
  'asset-002',
  'Service Van 03',
  'vehicle',
  'HQ — Platform',
  'operational',
  'VIN-TC-003',
  'Ford',
  'Transit 250',
  c.id,
  now() - interval '14 days',
  now() + interval '76 days',
  'Field crew primary transport'
from public.crews c where c.slug = 'field'
on conflict (legacy_id) do nothing;

insert into public.assets (legacy_id, name, asset_type, site_name, status, serial_number, manufacturer, model, crew_id, notes)
select
  'asset-003',
  'Generator G-7',
  'equipment',
  'Site A — Acme Corp',
  'maintenance',
  'GEN-G7-2019',
  'Caterpillar',
  'C15',
  c.id,
  'Offline for scheduled overhaul'
from public.crews c where c.slug = 'maintenance'
on conflict (legacy_id) do nothing;

insert into public.assets (legacy_id, name, asset_type, site_name, status, serial_number, manufacturer, model, crew_id, notes)
select
  'asset-004',
  'Platform Server Rack 2',
  'facility',
  'HQ — Platform',
  'operational',
  'RACK-PLT-02',
  'True Crew',
  'DC-Row-B',
  c.id,
  'Primary ops infrastructure'
from public.crews c where c.slug = 'operations'
on conflict (legacy_id) do nothing;

insert into public.assets (legacy_id, name, asset_type, site_name, status, serial_number, manufacturer, model, notes)
values
  ('asset-005', 'Retired Lift 01', 'equipment', 'HQ — Platform', 'retired', 'LIFT-RET-01', 'JLG', '450AJ', 'Decommissioned Q1')
on conflict (legacy_id) do nothing;

-- ---------------------------------------------------------------------------
-- Seed work orders
-- ---------------------------------------------------------------------------

insert into public.work_orders (legacy_id, title, description, status, priority, site_name, sla_tier, due_at, crew_id, asset_id, assignee, blocker)
select
  'wo-001',
  'Replace HVAC filter bank — Unit A-12',
  'Quarterly filter replacement and airflow verification.',
  'in_progress',
  'high',
  'Site A — Acme Corp',
  'standard',
  now() + interval '6 hours',
  c.id,
  a.id,
  'Sam Rivera',
  null
from public.crews c
cross join public.assets a
where c.slug = 'maintenance' and a.legacy_id = 'asset-001'
on conflict (legacy_id) do nothing;

insert into public.work_orders (legacy_id, title, description, status, priority, site_name, sla_tier, due_at, crew_id, assignee)
select
  'wo-002',
  'Emergency generator load test',
  'Verify generator G-7 output under full load after overhaul.',
  'blocked',
  'critical',
  'Site A — Acme Corp',
  'critical',
  now() - interval '2 hours',
  c.id,
  'Jordan Lee',
  'Awaiting parts delivery — control module'
from public.crews c where c.slug = 'field'
on conflict (legacy_id) do nothing;

insert into public.work_orders (legacy_id, title, description, status, priority, site_name, sla_tier, due_at, crew_id, assignee)
select
  'wo-003',
  'Van 03 — 90-day inspection',
  'Standard fleet inspection and fluid check.',
  'open',
  'medium',
  'HQ — Platform',
  'routine',
  now() + interval '3 days',
  c.id,
  'Jordan Lee'
from public.crews c where c.slug = 'field'
on conflict (legacy_id) do nothing;

insert into public.work_orders (legacy_id, title, description, status, priority, site_name, sla_tier, due_at, crew_id, assignee)
select
  'wo-004',
  'Rack 2 — cable management audit',
  'Document and re-route patch cables in row B.',
  'waiting',
  'low',
  'HQ — Platform',
  'routine',
  now() + interval '5 days',
  c.id,
  'Alex Chen'
from public.crews c where c.slug = 'operations'
on conflict (legacy_id) do nothing;

insert into public.work_orders (legacy_id, title, description, status, priority, site_name, sla_tier, due_at, crew_id, assignee, completed_at)
select
  'wo-005',
  'Fire extinguisher inspection — HQ',
  'Annual compliance check for all floor extinguishers.',
  'completed',
  'medium',
  'HQ — Platform',
  'standard',
  now() - interval '1 day',
  c.id,
  'Morgan Patel',
  now() - interval '6 hours'
from public.crews c where c.slug = 'admin'
on conflict (legacy_id) do nothing;

insert into public.work_orders (legacy_id, title, description, status, priority, site_name, sla_tier, due_at, crew_id)
select
  'wo-006',
  'Draft — Site B onboarding checklist',
  'Prepare initial asset inventory for new site.',
  'draft',
  'low',
  'Site B — Beta Inc',
  'routine',
  now() + interval '14 days',
  c.id
from public.crews c where c.slug = 'operations'
on conflict (legacy_id) do nothing;
