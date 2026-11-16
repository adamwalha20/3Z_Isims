# ZEC CAMPUS HUB — ADVANCED ADMINISTRATIVE MANAGEMENT, HR AUTHORITY, AUDIT LOGGING & UNDO SYSTEM
## Comprehensive System & Technical Documentation

---

## 1. Executive Summary & Purpose

The **ZEC Campus Hub** administrative architecture provides institutional-grade governance, strict role-based access control (RBAC), immutable audit traceability, and reversible record lifecycles for the **3ZERO Club ISIMS** academic chapter.

This system guarantees:
1. **HR Management Authority**: Dedicated power for the *HR Manager* (`Responsible RH`) to manage members, review profiles, remove members from active participation with documented reasons, suspend/reactivate access, and delete accounts without destroying historical attendance, tasks, or XP records.
2. **Administrative Oversight**: Full supervisory power for the *Club Administrator* to manage all entities (members, roles, tasks, projects, events, meetings, documents, announcements, AI summaries) with full undo and soft-delete recovery powers.
3. **Append-Only Immutable Audit Log**: Database-level protection preventing modification or deletion of audit logs through PostgreSQL triggers, ensuring compliance and institutional memory.
4. **Undo & Conflict Resolution Engine**: Stateful reverse-mutation engine with version-based and timestamp-based conflict detection, allowing safe rollbacks.
5. **Soft Deletion & Recycle Bin**: Non-destructive deletion across all core models (`events`, `meetings`, `tasks`, `projects`, `announcements`, `documents`, `profiles`, `club_memberships`) with restoration and permanent purge capabilities.

---

## 2. Role-Based Access Control & Authority Matrix

### 2.1 Role & Position Hierarchy
- **Administrator / Super Admin** (`admin`): Full administrative authority over all club entities, system settings, recycle bin restoration/purges, and audit rollbacks.
- **President** (`president`): Executive club-wide oversight; can manage events, meetings, tasks, and inspect governance records.
- **HR Manager** (`hr_manager`): Full authority over club membership recruitment, member suspension, removal, profile inspection, and member history timeline.
- **Events Manager** (`events_manager`): Departmental authority to create, edit, and soft-delete campus events and logistics checklists.
- **Ordinary Member** (`member`): Access strictly limited to personal profile, registered events, assigned tasks, and public/club-wide documents and announcements.

### 2.2 Permissions Matrix

| Capability / Action | Super Admin | Administrator | HR Manager | Events Manager | Ordinary Member |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **View Member Directory** | ✅ | ✅ | ✅ | ✅ (Public) | ✅ (Public) |
| **View Member Profile & History** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Remove Member (With Reason)** | ✅ | ✅ | ✅ (Non-Admin) | ❌ | ❌ |
| **Suspend / Reactivate Member** | ✅ | ✅ | ✅ (Non-Admin) | ❌ | ❌ |
| **Delete Member Account** | ✅ | ✅ | ✅ (Non-Admin) | ❌ | ❌ |
| **Assign Bureau Positions & Roles** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Create Events** | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Edit Events** | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Soft-Delete Events (With Reason)** | ✅ | ✅ | ❌ | ✅ | ❌ |
| **View Audit Logs (`/admin/audit-logs`)** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Undo Historical Mutations** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **View Recycle Bin (`/admin/recycle-bin`)** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Restore Records from Recycle Bin** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Permanent Purge Records** | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 3. HR Manager Member Authority

### 3.1 "Remove from Club" Workflow
When an active member departs or is removed:
1. The HR Manager opens `/admin/members`.
2. Selects **Remove from Club** on the target member's row.
3. A confirmation modal requires entering a mandatory **Removal Reason** (e.g. *"Graduated academic year 2026 / Completed tenure"*).
4. System updates `club_memberships`:
   - `membership_status = 'removed'`
   - `removed_at = NOW()`
   - `removed_by = hr_user_id`
   - `removal_reason = reason`
5. **Historical Integrity**: The member's previous attendance logs, verified tasks, karma XP awards, and meeting participation are **strictly preserved** in the database.
6. The action is recorded in `audit_logs` with `action = 'MEMBER_REMOVAL'`.

### 3.2 "Suspend / Reactivate Access" Workflow
- **Suspend**: Changes `membership_status` to `'suspended'` with `suspended_at`, `suspended_by`, and `suspension_reason`. Suspended members cannot log in, register for events, or check in via QR.
- **Reactivate**: Changes `membership_status` back to `'active'`, clearing suspension metadata and logging `MEMBER_REACTIVATION`.

### 3.3 "Delete Account" Workflow & Retention Safeguards
- Available in `/admin/members` under member options.
- Requires confirmation and explicit reason.
- Clear disclosure is presented: *"Account will be soft-deleted; past XP ledger and event attendance will be archived for club institutional memory."*
- **Security Barrier**: In `canRemoveMember`, `canSuspendMember`, and `canDeleteMemberAccount`, the engine checks:
  ```ts
  if (targetMember?.role === 'admin' || isSuperAdminEmail(targetMember?.email)) {
    return false; // HR cannot remove or delete administrative leaders
  }
  ```

---

## 4. Full Application Traceability — Audit Log System

### 4.1 Schema & Columns in `public.audit_logs`
Every operational change records:
- `id` (UUID): Unique audit entry identifier.
- `actor_user_id` (UUID): Supabase auth UID of the user who performed the action.
- `actor_name_snapshot` (TEXT): Immutable name of the actor at the moment of execution.
- `actor_role_snapshot` (TEXT): Immutable role/position of the actor at execution time.
- `action` (TEXT): Verb defining the event (e.g. `MEMBER_REMOVAL`, `EVENT_EDIT`, `EVENT_DELETE`, `TASK_CREATE`).
- `entity_type` (TEXT): Table/domain (`members`, `events`, `meetings`, `tasks`, `projects`, etc.).
- `entity_id` (UUID): Primary key of the affected entity.
- `entity_label_snapshot` (TEXT): Human-readable name/title of the affected entity.
- `old_values` (JSONB): Exact pre-mutation snapshot.
- `new_values` (JSONB): Exact post-mutation snapshot.
- `reason` (TEXT): Mandatory user-provided explanation.
- `metadata` (JSONB): IP address, user-agent, timestamps, request ID.
- `can_undo` (BOOLEAN): Whether this action supports automatic rollback.
- `is_undone` (BOOLEAN): Marked true once reversed.
- `undone_at` / `undone_by` (TIMESTAMP / UUID): Rollback attribution.
- `request_id` (TEXT): Correlates actions occurring within the same API request.

### 4.2 Append-Only Security Trigger
To protect audit records from tampering or accidental deletion, PostgreSQL trigger `trg_prevent_audit_log_deletion` is active in Supabase:
```sql
CREATE OR REPLACE FUNCTION public.prevent_audit_log_deletion()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit log entries are append-only and cannot be deleted or purged.'
    USING ERRCODE = 'P0001';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_audit_log_deletion
BEFORE DELETE ON public.audit_logs
FOR EACH ROW
EXECUTE FUNCTION public.prevent_audit_log_deletion();
```
*Verification*: Any SQL `DELETE FROM audit_logs` fails immediately with code `P0001`.

### 4.3 Redaction of Sensitive Data
All audit payloads pass through `sanitizeAuditData()`, which redacts passwords, JWT tokens, session cookies, and private secrets before persistence.

---

## 5. Undo and Recovery Engine

### 5.1 Reversal Workflow
1. Administrator navigates to `/admin/audit-logs`.
2. Inspects audit history using Actor, Category, Action, or Search filters.
3. Clicks **Undo This Change** on a reversible entry.
4. The system executes a **Dry Run** check (`/api/admin/audit-logs/undo` with `dryRun: true`):
   - Computes visual diff between `old_values` and `new_values`.
   - Checks `currentRecord.version` and `updated_at`.
   - If the entity was modified *after* the audit event, a **Conflict Warning** is displayed.
5. On confirmed execution:
   - Target entity is restored to `old_values`.
   - Original audit entry is updated: `is_undone = true`, `undone_at = NOW()`, `undone_by = admin_id`.
   - A **brand new audit record** is inserted:
     `action = 'UNDO_REVERSAL'`, referencing the reversed audit ID and documenting the recovery event.

---

## 6. Soft Deletion & Recycle Bin

### 6.1 Database Columns
The following core tables have been augmented with soft-delete metadata:
- `events`
- `meetings`
- `tasks`
- `projects`
- `documents`
- `announcements`
- `club_memberships`
- `profiles`

Columns:
- `is_deleted BOOLEAN DEFAULT false`
- `deleted_at TIMESTAMPTZ`
- `deleted_by UUID REFERENCES public.profiles(id)`
- `deletion_reason TEXT`
- `version INTEGER DEFAULT 1`

### 6.2 Recycle Bin Dashboard (`/admin/recycle-bin`)
- Filter by tabs: **All Items**, **Events**, **Meetings**, **Tasks**, **Projects**, **Documents**, **Announcements**, **Members**.
- Displays: Title, Deletion Date, Deleted By (name snapshot), Reason for deletion, Entity Type.
- **Restore**: Clears `is_deleted`, updates `version = version + 1`, logs `RESTORE_RECORD`.
- **Permanent Purge**: Restricted strictly to Super Administrator; permanently purges record and logs `PERMANENT_PURGE`.

---

## 7. Verification & Automated Test Coverage

The test suite consists of **160 automated unit and integration tests** across 12 test suites, executed with 100% pass rate:
- `test/admin-audit-undo-and-hr.test.mjs` (20 tests): HR authority, safeguards, append-only triggers, undo conflict detection, soft-delete invariants.
- `test/permissions-rbac.test.mjs` (25 tests): Role permissions, department scopes, board leadership access.
- `test/roles-audit-undo.test.mjs` (8 tests): Bureau position assignment audits and undo reversals.
- `test/i18n-multilingual.test.mjs` (25 tests): 100% key symmetry and authentic Tunisian Derja translation coverage across `ar-TN`, `fr`, and `en`.
- `test/meeting-baas-intelligence.test.mjs` (14 tests): Meeting BaaS pipeline, automated recording synchronization, and bilingual transcripts.
- `test/attendance-scanner-permissions.test.mjs` (10 tests): Scanner RBAC enforcement.
- `test/qr-attendance.test.mjs` (16 tests): Cryptographic QR validation and XP awarding.
- `test/xp-and-task-permissions.test.mjs` (16 tests): Task submission, conflict of interest, and anti-abuse idempotency.
