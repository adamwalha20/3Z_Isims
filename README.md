# ZEC Campus Hub — Operations Platform
**ZERO EXCLUSION CARBON POVERTY — Campus Club ISIMS (Sfax Chapter)**

ZEC Campus Hub is an enterprise-grade, secure, multi-department operational workspace designed for university club management. It centralizes member rosters, bureau governance, departmental projects, task dispatching, meeting records (PV), events with dynamic digital 3ZERO passes, announcements, and a secure Club Memory / Handover Vault.

The user interface is faithfully implemented from the **Google Stitch Design** (`3Z Campus club chatgpt`), featuring the **Forest Modernist Productivity** / **Eco-Tech Campus** visual language with high contrast, crisp typography (Plus Jakarta Sans & Inter), tabular metrics (JetBrains Mono), and animated feedback states.

---

## 🌿 System Architecture & Tech Stack

- **Framework**: [Next.js](https://nextjs.org) (App Router, React 19, TypeScript strict mode)
- **Styling**: [Tailwind CSS](https://tailwindcss.com) with custom ecological tokens (`#006948`, `#006E2A`, `#EAF4ED`, `#F4F9F6`) and elevated luminous card treatments
- **Database & Auth**: [Supabase](https://supabase.com) (PostgreSQL, Row-Level Security, Auth SSR Cookies, Storage)
- **Iconography**: Google Material Symbols Outlined & Lucide Icons
- **Deployment**: Vercel (Edge & Serverless Next.js runtime)

---

## 🚀 Key Functional Modules

| Module | Route | Capabilities |
| :--- | :--- | :--- |
| **Main Dashboard** | `/` | 3Z-PASS digital card, live countdown ticker, animated QR check-in widget, club KPI scoreboard, quick action drawer, priority task toggles, upcoming flagship preview. |
| **Task Management** | `/tasks` | Multi-view (Board / List), category filter chips, status groupings (`todo`, `in_progress`, `blocked`, `done`), priority indicators (`urgent`, `high`, `medium`, `low`), inline quick task creation. |
| **3Z Lab Initiatives** | `/projects` | Incubation portfolio, progress gauges calculated from real tasks, department tags, milestone tracking, and project proposal modals. |
| **Events & Calendar** | `/events` | Agenda and calendar perspectives, seat capacity meter, attendance status tracking, dynamic interactive QR pass generator modal. |
| **Meetings & PVs** | `/meetings` | Assembly scheduling, attendance logs, meeting decisions, actionable task generation linked directly to the task engine. |
| **Announcements** | `/announcements` | Club-wide and department-specific broadcasts, pinned priority notices, audience badge indicators. |
| **Members Directory** | `/members` | Searchable club roster, role tags (`Admin`, `Bureau`, `Lead`, `Member`), department units, and access to the Club Memory Handover Vault. |
| **Departments** | `/departments` | Autonomous department hubs with dedicated focus on **Training & Innovation**, Communications, Events, Partnerships, and Governance. |
| **Document Vault** | `/documents` | Category-filtered repository (Templates, Legal/PVs, Brand Assets, Reports) with secure file upload simulator and access control tags. |
| **Governance & Admin** | `/admin` & `/admin/members` | Bureau governance portal, active membership requests, approval/rejection workflows, role adjustments, and system audit logs. |
| **Profile & Settings** | `/profile` | Member ID card, student number, notification preferences, security credentials, and active session management. |
| **Onboarding & Auth** | `/signup` & `/login` | Student onboarding registration (Matricule, Study Field, Department choice) & secure sign-in with live Supabase Auth. |

---

## 🛡️ Database Schema & Security (Supabase)

The database schema is organized into 3 modular, version-controlled migrations located in `supabase/migrations/`:

1. [`20261027000001_initial_schema.sql`](supabase/migrations/20261027000001_initial_schema.sql):
   - Tables: `profiles`, `club_memberships`, `roles`, `user_roles`, `departments`, `department_members`, `projects`, `project_members`, `tasks`, `task_assignees`, `task_comments`, `task_activity`, `events`, `event_registrations`, `meetings`, `meeting_participants`, `meeting_minutes`, `meeting_actions`, `announcements`, `announcement_reads`, `notifications`, `documents`, `handover_records`, `audit_logs`.
   - Automatic `updated_at` triggers and performance indexes on foreign keys.

2. [`20261027000002_rls_policies.sql`](supabase/migrations/20261027000002_rls_policies.sql):
   - Non-recursive `SECURITY DEFINER` authorization helpers:
     - `is_active_member(user_uuid)`
     - `is_admin(user_uuid)`
     - `is_bureau(user_uuid)`
     - `is_department_lead(user_uuid, dept_uuid)`
     - `is_department_member(user_uuid, dept_uuid)`
   - Granular RLS policies on all tables ensuring non-admins cannot escalate privileges, members only edit permitted fields, and department private documents remain isolated.

3. [`20261027000003_seed_reference_data.sql`](supabase/migrations/20261027000003_seed_reference_data.sql):
   - Core roles: `admin`, `bureau`, `member`.
   - Core departments: `training-innovation` (Training & Innovation), `communications`, `events-logistics`, `partnerships`, `governance`.

---

## ⚙️ Environment Configuration

Create a `.env.local` file in the root directory (based on `.env.example`):

```bash
# Supabase Project Credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Optional (for initial provisioning scripts)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

*Note: If no live Supabase project is connected yet, the application gracefully initializes in **Interactive Standalone Mode** with instant role switching (`bureau`, `admin`, `lead`, `member`) accessible directly in the top navigation bar.*

---

## 🛠️ Local Development & Quality Verification

```bash
# 1. Install dependencies
npm install

# 2. Run automated test suite
npm test

# 3. Run ESLint code checks
npm run lint

# 4. Verify production build
npm run build

# 5. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🚢 Production Deployment to Vercel

1. **Push to Git**:
   ```bash
   git add .
   git commit -m "feat: complete ZEC Campus Hub implementation"
   git push origin main
   ```
2. **Import into Vercel**:
   - Go to [vercel.com](https://vercel.com) and import the repository.
   - Set framework preset to **Next.js**.
3. **Configure Environment Variables**:
   - Add `NEXT_PUBLIC_SUPABASE_URL`
   - Add `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. **Deploy**:
   - Trigger deployment. Next.js will build and deploy all static/SSR pages and Edge routes seamlessly.

---

## 👥 Role Matrix & Permissions

| Role | Scope | Privileges |
| :--- | :--- | :--- |
| **Admin** | Club-wide | Full user management, role grants, department creation, audit log access, platform settings. |
| **Bureau** | Operational | Publish club announcements, coordinate cross-department initiatives, schedule general meetings, manage documents. |
| **Dept Lead** | Department | Manage department-specific tasks, lead projects, convene department meetings, review handover notes. |
| **Member** | Assigned / Public | View club initiatives, manage assigned tasks, register for events, access public documents, receive notifications. |

---

## 🏛️ Official Bureau Positions & Tailored Workspaces

| Position | Initial Holder | Dedicated Operational Workspace & Capabilities |
| :--- | :--- | :--- |
| **Vice President** | Heba Sanaa | Cross-department execution oversight, urgent bottleneck mitigation, assembly decision tracking & follow-up coordination. |
| **Secretary General** | Nawress | Official assembly minutes (PV), adopted decisions register, decision-to-task converters, and Handover Vault. |
| **Treasurer** | Ahmed Bahri | Financial ledger in TND (Inflows, Outflows, Net Cash), budget vs actual spending gauges, expense reviews & receipt verification. |
| **Human Resources Manager** | Med Aziz Turky | Student recruitment pipeline (Submitted, Interview, Accepted), onboarding checklists, member directory & team dispatch. |
| **Marketing & Design Manager** | Sa | Social media campaign planner (Instagram, LinkedIn, Posters), content lifecycle (Idea -> Review -> Published), creative briefs. |
| **Sustainable Campus Manager** | Oussema | Ecological impact telemetry (Trees planted, kg waste recycled, standby energy draw), calculation methodology documentation. |
| **Comms & Engagement Manager** | drvcou | Circular drafting, audience targeting (Club vs Dept), circular readership analytics & engagement stats. |
| **Events Manager** | Chaima Besbes | Flagship summit logistics, venue preparation checklists, seating capacity meter, attendee check-in readiness & post-mortems. |
| **Project Manager** | Ayoub | 3Z Lab incubation portfolio, real task progress tracking, blocker detection, and milestone delivery. |
| **Partnerships & Sponsorship Manager** | Open Role | Sponsor directory & CRM pipeline (Prospect -> Proposal Sent -> Negotiation -> Confirmed), committed amounts in TND & deliverables tracking. |
| *General Member* | Ahmed Triki & Students | Digital 3Z Pass, assigned tasks, project participation, event registration, and ideas submission. |

---

© 2026 ZERO EXCLUSION CARBON POVERTY (3Z) — Campus Club ISIMS (Higher Institute of Computer Science and Multimedia of Sfax).
