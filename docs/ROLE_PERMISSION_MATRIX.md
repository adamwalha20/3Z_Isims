# ZEC CAMPUS HUB — ROLE & PERMISSION MATRIX

**Project:** ZEC Campus Hub (3Zero Club ISIMS)  
**Security Model:** Role-Based Access Control (RBAC) & Department Boundary Isolation  
**Version:** 2.0 (November 2026)  
**Database Reference:** Supabase Project `zplvfgfmurgghezoyjxh`

---

## 1. Overview & Architectural Principles

ZEC Campus Hub organizes permissions according to real-world club hierarchy and departmental ownership. The permission model is enforced through two layers:
1. **Database Layer:** Supabase Row Level Security (RLS) policies, PostgreSQL triggers, and foreign key constraints.
2. **Application Layer:** Server-side API guards (`route-permissions.ts`, `permission-checks.ts`, `department-access.ts`), server actions, and client-side view customization.

### Core Isolation Rules
- **No Global Admin Privileges for Bureau Members:** Bureau officers possess management capabilities strictly tailored to their mandate and department.
- **Strict Department Boundary Isolation:** Department Leads and Managers can create, update, and manage resources only within their assigned department.
- **Executive Board Oversight:** The President, Vice President, and Secretary General maintain broad operational oversight across departments.
- **Conflict of Interest Protection:** Users cannot approve or verify their own tasks or disburse finances to themselves.
- **Append-Only Immutability:** Audit logs cannot be deleted by any user or administrator (guaranteed via PostgreSQL trigger `trg_prevent_audit_log_deletion`).

---

## 2. Roles & Mandates Hierarchy

The system defines 3 global database roles and 12 specialized bureau mandates:

### 2.1 Global Roles (`public.roles`)
| Role Key | Display Name | Scope |
| :--- | :--- | :--- |
| `admin` | Club Administrator | Unrestricted governance, settings, user elevation, permanent deletion, undo engine |
| `bureau` | Bureau Officer | Department leadership, task creation, project ownership, event scheduling |
| `member` | Active Club Member | Task execution, attendance check-in, event registration, profile management |

### 2.2 Bureau Positions (`public.bureau_positions`)
| Position Key | Title | Native Department | Order Index |
| :--- | :--- | :--- | :--- |
| `president` | President | General Secretariat & Governance (`governance`) | 1 |
| `vice_president` | Vice President | General Secretariat & Governance (`governance`) | 2 |
| `secretary_general` | Secretary General | General Secretariat & Governance (`governance`) | 3 |
| `treasurer` | Treasurer | General Secretariat & Governance (`governance`) | 4 |
| `training_innovation` | Training & Innovation Manager | Training & Innovation (`training-innovation`) | 5 |
| `hr_manager` | Human Resources Manager | General Secretariat & Governance (`governance`) | 6 |
| `marketing_design_manager` | Marketing & Design Manager | Communications & Media (`comms-media`) | 7 |
| `sustainable_campus_manager`| Sustainable Campus Manager | Training & Innovation (`training-innovation`) | 8 |
| `communication_engagement_manager` | Comms & Engagement Manager | Communications & Media (`comms-media`) | 9 |
| `events_manager` | Events Manager | Events & Logistics (`events-logistics`) | 10 |
| `project_manager` | Project Manager | Events & Logistics (`events-logistics`) | 11 |
| `partnerships_sponsorship_manager` | Partnerships & Sponsorship Manager | Partnerships & Sponsorships (`partnerships`) | 12 |

---

## 3. Comprehensive Permission Capability Matrix

| Capability / Action | Permission Key | Admin | President | VP | SecGen | Treasurer | HR Manager | Dept Leads | Ordinary Member |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **System Settings** | `system:manage_settings` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Recycle Bin & Purge** | `recycle_bin:*` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Undo Audit Logs** | `audit:undo` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **View Audit Logs** | `audit:view` | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Assign Bureau Roles** | `members:assign_roles` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Remove Member** | `members:remove` | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Suspend Member** | `members:suspend` | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Delete Member Account**| `members:delete_account` | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Disburse Finances** | `finance:disburse` | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **View Financial Ledger**| `finance:view_ledger` | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Attendance Scanner** | `attendance:scan` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Manage Attendance Sessions** | `attendance:manage_sessions` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Create Tasks** | `tasks:create` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (Dept) | ❌ |
| **Verify Tasks** | `tasks:verify` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (Dept)* | ❌ |
| **Manage Events** | `events:create` / `edit` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ (Events Mgr)| ❌ |
| **Manage Projects** | `projects:create` / `edit` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ (Prj/Sust Mgr)| ❌ |
| **Partnership Deals** | `partnerships:commit_sponsorship` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ (Partnerships)| ❌ |
| **View Club Tasks** | `tasks:view_department` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (Dept) | Assigned Only |
| **Check-in Attendance** | `attendance:view_own` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

*\*Subject to Conflict-of-Interest invariant: an officer cannot verify a task assigned to themselves.*

---

## 4. Department Isolation Matrix

| Department | Lead Position(s) | Lead Full Access | Executive Oversight | Foreign Department Leads | Ordinary Members |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **General Secretariat & Governance** | President, VP, SecGen, Treasurer, HR | Full read/write | Full read/write | Restricted | Restricted |
| **Communications & Media** | Marketing & Design, Comms & Engagement | Full read/write | Full read/write | Denied | Club-wide only |
| **Events & Logistics** | Events Manager, Project Manager | Full read/write | Full read/write | Denied | Club-wide only |
| **Training & Innovation** | Training Lead, Sustainability Lead | Full read/write | Full read/write | Denied | Contributor read/execute |
| **Partnerships & Sponsorships** | Partnerships & Sponsorship Manager | Full read/write | Full read/write | Denied | Restricted |

---

## 5. Security Invariants & Protections

1. **Self-Suspension / Self-Deletion Safeguard:**  
   No user can remove, suspend, or delete their own profile (`target.id !== ctx.userId`).
2. **Admin Account Protection:**  
   HR Managers and officers cannot remove, suspend, or delete accounts holding the `admin` role or primary admin emails (`isSuperAdminEmail`).
3. **Audit Immutability Invariant:**  
   Audit records are permanently preserved in `public.audit_logs`. Deletion is prohibited by database trigger.
4. **Idempotent Check-in Guard:**  
   Session check-ins require unique `check_in_idempotency_key`, preventing double XP awarding.
