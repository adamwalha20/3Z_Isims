-- ==============================================================================
-- ZEC Campus Hub — Seed Reference Data
-- ZERO EXCLUSION CARBON POVERTY - Campus Club ISIMS
-- (Only non-personal role definitions and official club departments)
-- ==============================================================================

-- 1. Insert Base System Roles
INSERT INTO public.roles (key, display_name, description)
VALUES
  ('admin', 'Club Administrator', 'Full governance access to memberships, global settings, audit logs, and system operations.'),
  ('bureau', 'Bureau Officer', 'Elected executive board member managing club-wide projects, events, meetings, and announcements.'),
  ('member', 'Active Club Member', 'General university club member participating in department initiatives and assigned tasks.')
ON CONFLICT (key) DO NOTHING;

-- 2. Insert Official ISIMS 3ZERO Departments
INSERT INTO public.departments (name, slug, description, icon)
VALUES
  ('Training & Innovation', 'training-innovation', 'Technical academy, climate tech prototyping, green AI research, and skills workshops.', 'psychology'),
  ('Communications & Media', 'comms-media', 'Campus outreach, social branding, photography, design systems, and public campaigns.', 'campaign'),
  ('Events & Logistics', 'events-logistics', 'Flagship summits, eco-hackathons, ground preparation, and university permits.', 'event'),
  ('Partnerships & Sponsorships', 'partnerships', 'External sponsor relations, CRDA forestry coordination, subsidies, and grant dossiers.', 'handshake'),
  ('General Secretariat & Governance', 'governance', 'Meeting minutes (PV), statutes, legal charters, member registries, and handover memory.', 'shield_person')
ON CONFLICT (slug) DO NOTHING;
