-- True Crew core tables migration
-- Run in Supabase SQL Editor or via: psql / supabase db execute

-- ---------------------------------------------------------------------------
-- Extensions & helpers
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- tools
-- Monitored services and infrastructure (APIs, frontends, workers, etc.)
-- used for health tracking, deploys, and incident linkage.
-- ---------------------------------------------------------------------------

CREATE TABLE public.tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('api', 'frontend', 'worker', 'database', 'integration', 'internal_tool')),
  status TEXT NOT NULL DEFAULT 'unknown' CHECK (status IN ('healthy', 'degraded', 'down', 'maintenance', 'unknown')),
  environment TEXT NOT NULL DEFAULT 'production' CHECK (environment IN ('production', 'staging', 'preview', 'local')),
  owner TEXT NOT NULL CHECK (owner IN ('founder', 'operator', 'observer')),
  url TEXT,
  health_check_url TEXT,
  github_repo TEXT,
  deploy_method TEXT NOT NULL DEFAULT 'manual' CHECK (deploy_method IN ('github_actions', 'netlify', 'vercel', 'manual', 'other')),
  current_version TEXT,
  last_deployed_at TIMESTAMPTZ,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.tools IS
  'Registered services and infrastructure components tracked for health, deploys, and incidents.';

-- ---------------------------------------------------------------------------
-- workflows
-- Multi-step operational workflows (builds, deploys, repairs, tickets, etc.)
-- that group related work and track overall progress.
-- ---------------------------------------------------------------------------

CREATE TABLE public.workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('build', 'deploy', 'repair', 'ticket', 'onboarding', 'decision')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
  stage TEXT NOT NULL CHECK (stage IN ('Inbox', 'Triage', 'Planned', 'In Progress', 'Waiting', 'Review', 'Done', 'Logged')),
  owner TEXT NOT NULL CHECK (owner IN ('founder', 'operator', 'observer')),
  summary TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.workflows IS
  'Operational workflows that coordinate builds, deploys, repairs, tickets, and other multi-step work.';

-- ---------------------------------------------------------------------------
-- workflow_stages
-- Ordered stages within a workflow, each with its own status and lifecycle.
-- ---------------------------------------------------------------------------

CREATE TABLE public.workflow_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'skipped', 'blocked')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workflow_id, sort_order)
);

COMMENT ON TABLE public.workflow_stages IS
  'Individual ordered stages inside a workflow, tracking step-by-step progress and completion.';

-- ---------------------------------------------------------------------------
-- tasks
-- Actionable work items tied to workflows, with priority, stage, and GitHub links.
-- ---------------------------------------------------------------------------

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE SET NULL,
  workflow_stage_id UUID REFERENCES public.workflow_stages(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'blocked', 'done', 'cancelled')),
  stage TEXT NOT NULL CHECK (stage IN ('Inbox', 'Triage', 'Planned', 'In Progress', 'Waiting', 'Review', 'Done', 'Logged')),
  workflow_type TEXT NOT NULL CHECK (workflow_type IN ('build', 'deploy', 'repair', 'ticket', 'onboarding', 'decision')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  assignee TEXT CHECK (assignee IN ('founder', 'operator', 'observer')),
  due_at TIMESTAMPTZ,
  blocker TEXT,
  github_repo TEXT,
  github_issue_number INTEGER,
  github_pr_number INTEGER,
  github_head_sha TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.tasks IS
  'Individual actionable work items with kanban stage, priority, and optional GitHub integration.';

-- ---------------------------------------------------------------------------
-- incidents
-- Production incidents linked to affected tools and optional repair workflows.
-- ---------------------------------------------------------------------------

CREATE TABLE public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  severity SMALLINT NOT NULL CHECK (severity BETWEEN 1 AND 4),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'mitigating', 'mitigated', 'resolved', 'post_mortem_filed')),
  service_id UUID REFERENCES public.tools(id) ON DELETE SET NULL,
  service_name TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  linked_repair_id UUID REFERENCES public.workflows(id) ON DELETE SET NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  mitigated_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.incidents IS
  'Operational incidents with severity, lifecycle status, and links to affected services and repair workflows.';

-- ---------------------------------------------------------------------------
-- customers
-- Customer accounts with tier, health score, and onboarding lifecycle status.
-- ---------------------------------------------------------------------------

CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  tier TEXT NOT NULL CHECK (tier IN ('starter', 'growth', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'prospect' CHECK (status IN ('prospect', 'onboarding', 'active', 'churned')),
  stage TEXT NOT NULL CHECK (stage IN ('Inbox', 'Triage', 'Planned', 'In Progress', 'Waiting', 'Review', 'Done', 'Logged')),
  primary_contact TEXT NOT NULL,
  email TEXT NOT NULL,
  health_score INTEGER NOT NULL DEFAULT 0 CHECK (health_score BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.customers IS
  'Customer accounts tracked through onboarding and lifecycle with tier and health metrics.';

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX idx_tools_user_id ON public.tools(user_id);
CREATE INDEX idx_tools_status ON public.tools(status);

CREATE INDEX idx_workflows_user_id ON public.workflows(user_id);
CREATE INDEX idx_workflows_stage ON public.workflows(stage);
CREATE INDEX idx_workflows_status ON public.workflows(status);

CREATE INDEX idx_workflow_stages_workflow_id ON public.workflow_stages(workflow_id);
CREATE INDEX idx_workflow_stages_user_id ON public.workflow_stages(user_id);
CREATE INDEX idx_workflow_stages_status ON public.workflow_stages(status);

CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_workflow_id ON public.tasks(workflow_id);
CREATE INDEX idx_tasks_stage ON public.tasks(stage);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_github_repo_issue ON public.tasks(github_repo, github_issue_number);

CREATE INDEX idx_incidents_user_id ON public.incidents(user_id);
CREATE INDEX idx_incidents_status ON public.incidents(status);
CREATE INDEX idx_incidents_service_id ON public.incidents(service_id);

CREATE INDEX idx_customers_user_id ON public.customers(user_id);
CREATE INDEX idx_customers_status ON public.customers(status);

-- ---------------------------------------------------------------------------
-- Updated-at triggers
-- ---------------------------------------------------------------------------

CREATE TRIGGER tools_set_updated_at
  BEFORE UPDATE ON public.tools
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER workflows_set_updated_at
  BEFORE UPDATE ON public.workflows
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER workflow_stages_set_updated_at
  BEFORE UPDATE ON public.workflow_stages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tasks_set_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER incidents_set_updated_at
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER customers_set_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY tools_user_access ON public.tools
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY workflows_user_access ON public.workflows
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY workflow_stages_user_access ON public.workflow_stages
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY tasks_user_access ON public.tasks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY incidents_user_access ON public.incidents
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY customers_user_access ON public.customers
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
