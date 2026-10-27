-- ==============================================================================
-- ZEC Campus Hub — Bureau Roles, Positions & Role-Specific Workspaces Migration
-- ZERO EXCLUSION CARBON POVERTY - Campus Club ISIMS
-- ==============================================================================

-- 1. Functional Bureau Positions Table
CREATE TABLE IF NOT EXISTS public.bureau_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL CHECK (key IN (
    'vice_president',
    'secretary_general',
    'treasurer',
    'hr_manager',
    'marketing_design_manager',
    'sustainable_campus_manager',
    'communication_engagement_manager',
    'events_manager',
    'project_manager',
    'partnerships_sponsorship_manager'
  )),
  display_name TEXT NOT NULL,
  description TEXT,
  initial_holder TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. User-to-Bureau-Position Mapping
CREATE TABLE IF NOT EXISTS public.user_bureau_positions (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  position_id UUID NOT NULL REFERENCES public.bureau_positions(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, position_id)
);

-- 3. Financial Transactions & Budgets (Treasurer Workspace)
CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'TND',
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense')),
  category TEXT NOT NULL CHECK (category IN (
    'sponsorship',
    'university_subsidy',
    'membership_fees',
    'logistics',
    'catering',
    'equipment',
    'marketing_print',
    'prizes',
    'misc'
  )),
  description TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  related_event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  related_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approval_status TEXT NOT NULL CHECK (approval_status IN ('pending', 'approved', 'rejected')) DEFAULT 'approved',
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_financial_transactions_updated_at
BEFORE UPDATE ON public.financial_transactions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  planned_amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'TND',
  period TEXT NOT NULL DEFAULT '2025-2026',
  related_event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Partner Pipeline & Sponsorships (Partnerships Manager Workspace)
CREATE TABLE IF NOT EXISTS public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  pipeline_stage TEXT NOT NULL CHECK (pipeline_stage IN (
    'prospect',
    'contacted',
    'meeting_scheduled',
    'proposal_sent',
    'negotiation',
    'confirmed',
    'declined',
    'archived'
  )) DEFAULT 'prospect',
  sponsorship_amount_tnd NUMERIC(10, 2) DEFAULT 0.00,
  deliverables TEXT[] DEFAULT '{}',
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_partners_updated_at
BEFORE UPDATE ON public.partners
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Marketing Campaigns & Content Calendar (Marketing & Design Workspace)
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'linkedin', 'facebook', 'tiktok', 'posters', 'all')) DEFAULT 'instagram',
  status TEXT NOT NULL CHECK (status IN ('idea', 'brief_ready', 'in_production', 'in_review', 'approved', 'published')) DEFAULT 'in_production',
  caption_draft TEXT,
  planned_date DATE,
  asset_url TEXT,
  assigned_creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_marketing_campaigns_updated_at
BEFORE UPDATE ON public.marketing_campaigns
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Sustainability Initiatives & Impact Metrics (Sustainable Campus Workspace)
CREATE TABLE IF NOT EXISTS public.sustainability_initiatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'waste_reduction',
    'carbon_offset',
    'tree_planting',
    'energy_efficiency',
    'circular_economy',
    'awareness'
  )),
  status TEXT NOT NULL CHECK (status IN ('proposed', 'active', 'milestone_reached', 'completed')) DEFAULT 'active',
  target_metric NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  current_metric NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  metric_unit TEXT NOT NULL,
  calculation_method TEXT,
  lead_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_sustainability_initiatives_updated_at
BEFORE UPDATE ON public.sustainability_initiatives
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Assembly Decisions Register (Secretary General Workspace)
CREATE TABLE IF NOT EXISTS public.decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL CHECK (status IN ('adopted', 'under_execution', 'completed', 'deferred')) DEFAULT 'under_execution',
  related_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Recruitment Pipeline & Member Applications (HR Manager Workspace)
CREATE TABLE IF NOT EXISTS public.recruitment_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  student_id TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  study_field TEXT NOT NULL,
  department_preference TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('submitted', 'interview_scheduled', 'accepted', 'waitlisted', 'declined')) DEFAULT 'submitted',
  hr_notes TEXT,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 9. Seed Official Bureau Positions
-- ------------------------------------------------------------------------------
INSERT INTO public.bureau_positions (key, display_name, description, initial_holder)
VALUES
  ('vice_president', 'Vice President', 'Cross-department operations coordinator, executive follow-ups, and initiative monitoring.', 'Heba Sanaa'),
  ('secretary_general', 'Secretary General', 'Official meetings (PV), assembly decisions, institutional memory, and legal compliance.', 'Nawress'),
  ('treasurer', 'Treasurer', 'Budget administration, income, event cashflow, expense reviews, and financial transparency.', 'Ahmed Bahri'),
  ('hr_manager', 'Human Resources Manager', 'Member directory, recruitment pipeline, integration checklists, and team development.', 'Med Aziz Turky'),
  ('marketing_design_manager', 'Marketing & Design Manager', 'Brand campaigns, visual identity assets, media production, and social publishing calendar.', 'Sa'),
  ('sustainable_campus_manager', 'Sustainable Campus Manager', 'Ecological projects, tree planting, waste metrics, and climate impact verification.', 'Oussema'),
  ('communication_engagement_manager', 'Communication & Engagement Manager', 'Internal announcements, audience targeting, circulars, and member engagement statistics.', 'drvcou'),
  ('events_manager', 'Events Manager', 'Summits, eco-hackathons, venue logistics, participant check-in, and post-mortems.', 'Chaima Besbes'),
  ('project_manager', 'Project Manager', '3Z Lab portfolio, task milestones, blockers, dependencies, and delivery retrospectives.', 'Ayoub'),
  ('partnerships_sponsorship_manager', 'Partnerships & Sponsorship Manager', 'Sponsorship pipeline, corporate partners, CRDA relations, and deliverable commitments.', NULL)
ON CONFLICT (key) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 10. Security Helpers & RLS Policies
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.has_bureau_position(user_uuid UUID, target_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_bureau_positions ubp
    JOIN public.bureau_positions bp ON ubp.position_id = bp.id
    WHERE ubp.user_id = user_uuid AND bp.key = target_key
  );
$$;

ALTER TABLE public.bureau_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bureau_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sustainability_initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_applications ENABLE ROW LEVEL SECURITY;

-- Bureau Positions Policies
CREATE POLICY "Positions are readable by authenticated members"
ON public.bureau_positions FOR SELECT
TO authenticated USING (true);

CREATE POLICY "User bureau positions are readable by active members"
ON public.user_bureau_positions FOR SELECT
TO authenticated USING (public.is_active_member(auth.uid()));

CREATE POLICY "Only admins can assign bureau positions"
ON public.user_bureau_positions FOR ALL
TO authenticated USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Financial Transactions Policies (Restricted to Treasurer, Admin, Bureau)
CREATE POLICY "Financials viewable only by authorized bureau & treasurer"
ON public.financial_transactions FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid()) OR
  public.has_bureau_position(auth.uid(), 'treasurer') OR
  public.has_bureau_position(auth.uid(), 'vice_president') OR
  public.is_bureau(auth.uid())
);

CREATE POLICY "Financials manageable by treasurer and admin"
ON public.financial_transactions FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_bureau_position(auth.uid(), 'treasurer'))
WITH CHECK (public.is_admin(auth.uid()) OR public.has_bureau_position(auth.uid(), 'treasurer'));

CREATE POLICY "Budgets viewable by bureau"
ON public.budgets FOR SELECT
TO authenticated
USING (public.is_bureau(auth.uid()));

CREATE POLICY "Budgets manageable by treasurer and admin"
ON public.budgets FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_bureau_position(auth.uid(), 'treasurer'))
WITH CHECK (public.is_admin(auth.uid()) OR public.has_bureau_position(auth.uid(), 'treasurer'));

-- Partners Policies (Restricted to Partnerships Manager, Bureau, Admin)
CREATE POLICY "Partners viewable by authorized bureau"
ON public.partners FOR SELECT
TO authenticated
USING (
  public.is_bureau(auth.uid()) OR
  public.has_bureau_position(auth.uid(), 'partnerships_sponsorship_manager')
);

CREATE POLICY "Partners manageable by partnerships manager and bureau"
ON public.partners FOR ALL
TO authenticated
USING (
  public.is_admin(auth.uid()) OR
  public.has_bureau_position(auth.uid(), 'partnerships_sponsorship_manager') OR
  public.is_bureau(auth.uid())
)
WITH CHECK (
  public.is_admin(auth.uid()) OR
  public.has_bureau_position(auth.uid(), 'partnerships_sponsorship_manager') OR
  public.is_bureau(auth.uid())
);

-- Marketing Campaigns Policies
CREATE POLICY "Campaigns readable by active members"
ON public.marketing_campaigns FOR SELECT
TO authenticated USING (public.is_active_member(auth.uid()));

CREATE POLICY "Campaigns manageable by marketing manager and bureau"
ON public.marketing_campaigns FOR ALL
TO authenticated
USING (
  public.is_bureau(auth.uid()) OR
  public.has_bureau_position(auth.uid(), 'marketing_design_manager')
)
WITH CHECK (
  public.is_bureau(auth.uid()) OR
  public.has_bureau_position(auth.uid(), 'marketing_design_manager')
);

-- Sustainability Initiatives Policies
CREATE POLICY "Sustainability readable by active members"
ON public.sustainability_initiatives FOR SELECT
TO authenticated USING (public.is_active_member(auth.uid()));

CREATE POLICY "Sustainability manageable by sustainable campus manager and bureau"
ON public.sustainability_initiatives FOR ALL
TO authenticated
USING (
  public.is_bureau(auth.uid()) OR
  public.has_bureau_position(auth.uid(), 'sustainable_campus_manager')
)
WITH CHECK (
  public.is_bureau(auth.uid()) OR
  public.has_bureau_position(auth.uid(), 'sustainable_campus_manager')
);

-- Decisions Policies
CREATE POLICY "Decisions readable by active members"
ON public.decisions FOR SELECT
TO authenticated USING (public.is_active_member(auth.uid()));

CREATE POLICY "Decisions manageable by secretary general and bureau"
ON public.decisions FOR ALL
TO authenticated
USING (
  public.is_bureau(auth.uid()) OR
  public.has_bureau_position(auth.uid(), 'secretary_general')
)
WITH CHECK (
  public.is_bureau(auth.uid()) OR
  public.has_bureau_position(auth.uid(), 'secretary_general')
);

-- Recruitment Applications Policies (Restricted to HR Manager and Admin)
CREATE POLICY "Applications viewable by HR and Admin"
ON public.recruitment_applications FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid()) OR
  public.has_bureau_position(auth.uid(), 'hr_manager') OR
  public.is_bureau(auth.uid())
);

CREATE POLICY "Applications manageable by HR and Admin"
ON public.recruitment_applications FOR ALL
TO authenticated
USING (
  public.is_admin(auth.uid()) OR
  public.has_bureau_position(auth.uid(), 'hr_manager')
)
WITH CHECK (
  public.is_admin(auth.uid()) OR
  public.has_bureau_position(auth.uid(), 'hr_manager')
);
