-- Research requests: durable store for the Research lane queue.
-- Replaces the code-edit-only adapter backlog (src/lib/research/adapterRequests.ts)
-- and browser-only session rows as the source of truth when the live API rail is on.
-- Status vocabulary and transition rules mirror lib/research/status.ts.

create table public.research_requests (
  id text primary key,
  topic text not null,
  why_it_matters text not null,
  suggested_outcome text not null,
  source text not null default 'adapter'
    check (source in ('adapter', 'session')),
  status text not null default 'queued'
    check (status in ('queued', 'in_progress', 'done', 'blocked')),
  filed_path text,
  blocker_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_research_requests_updated_at
  on public.research_requests (updated_at desc);

alter table public.research_requests enable row level security;

-- Seed: current backlog, ids and timestamps preserved from
-- src/lib/research/adapterRequests.ts so existing references keep resolving.
insert into public.research_requests
  (id, topic, why_it_matters, suggested_outcome, source, status, created_at, updated_at)
values
  (
    'req-ms-painting-v2-debrand',
    'M&S Painting V2 — debranding audit',
    'Program card 1 (TrueCrew1/ms-painting): locate every hardcoded company-specific brand, logo, contact detail, and tenant assumption before multi-tenant work.',
    'Findings note in knowledge/sources/ linked from knowledge/projects/ms-painting-v2-debranding-audit.md.',
    'adapter', 'queued',
    '2026-07-21T12:00:00.000Z', '2026-07-21T12:00:00.000Z'
  ),
  (
    'req-ms-painting-v2-tenant-branding',
    'M&S Painting V2 — tenant-controlled branding model',
    'Program card 2 defines customer logos, company info, and document branding as settings — needs a researched options pass before Build Agent implementation.',
    'Short design note comparing settings-schema vs. asset-injection approaches for tenant branding.',
    'adapter', 'queued',
    '2026-07-21T12:05:00.000Z', '2026-07-21T12:05:00.000Z'
  ),
  (
    'req-ms-painting-v2-rollout',
    'M&S Painting V2 — rollout sequencing and gate order',
    'Program card 6 sequences debrand → tenant branding → documents → legal/IP. Operator sign-off is needed before Build Agent work starts on each phase.',
    'Rollout checklist aligned with knowledge/projects/ms-painting-v2-rollout-roadmap.md.',
    'adapter', 'queued',
    '2026-07-21T12:10:00.000Z', '2026-07-21T12:10:00.000Z'
  ),
  (
    'req-ms-painting-v2-market-scan',
    'Painter SaaS market scan — competitors, features, performance',
    'V2 program card ''Painter SaaS Market Scan'': ground the V2 estimating/CRM/proposal scope in what competing painter SaaS (Houzz Pro, Knowify, and the improvement plan''s cited roundups) actually ship, charge, and compete on.',
    'Findings note at knowledge/findings/m-and-s/painter-saas-market-scan.md — feature and pricing comparison plus a match-vs-skip verdict for V2.',
    'adapter', 'queued',
    '2026-07-22T13:00:00.000Z', '2026-07-22T13:00:00.000Z'
  ),
  (
    'req-ms-painting-v2-design-standard',
    'TrueCrew design standard — V1 layout and design uplift',
    'V2 program card ''TrueCrew Design Standard'': standardized TrueCrew formatting, color, and layout so the deployed product is a resellable TrueCrew asset rather than M&S-themed; includes the improvement plan''s V1 polish items (mobile navigation, error states, list performance).',
    'Findings note at knowledge/findings/m-and-s/truecrew-design-standard.md — design tokens, component conventions, and a prioritized V1 uplift list.',
    'adapter', 'queued',
    '2026-07-22T13:05:00.000Z', '2026-07-22T13:05:00.000Z'
  ),
  (
    'req-ms-painting-v2-legal-doc-set',
    'Standard legal document set for deployed SaaS instances',
    'V2 program card ''Legal / IP Protection'': every deployed instance should ship a standard legal set (terms of service, privacy policy, subscription/license terms). Research common SaaS practice only — final documents require attorney review, per the card''s standing blocker.',
    'Findings note under knowledge/findings/m-and-s/ listing the required document set, common contents, and open questions for counsel.',
    'adapter', 'queued',
    '2026-07-22T13:10:00.000Z', '2026-07-22T13:10:00.000Z'
  );
