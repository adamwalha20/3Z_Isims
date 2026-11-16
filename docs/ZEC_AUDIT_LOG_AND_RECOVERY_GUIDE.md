# ZEC CAMPUS HUB — AUDIT LOG & RECOVERY USER GUIDE
## Step-by-Step Practical Manual for Administrators

---

## 1. Overview

This guide explains how administrators and leadership officers inspect historical changes in the **ZEC Campus Hub**, trace who performed specific actions, restore mistakenly deleted items, and execute state rollbacks using the built-in **Audit Trail & Undo System**.

---

## 2. Navigating the Audit Dashboard

To access the Audit Trail:
1. Sign in with an account having **Administrator** or **Bureau Leadership** access.
2. In the navigation sidebar, click on **Audit Logs & Undo** (or visit `/admin/audit-logs`).
3. You will see 7 summary metrics at the top:
   - **Total Actions**: All actions recorded since installation.
   - **Actions Today**: Activity logged in the current calendar day.
   - **Member Removals**: Count of members removed from active roster.
   - **Account Deletions**: Permanent or soft deletions of member accounts.
   - **Event Modifications**: Changes to campus event details, dates, or locations.
   - **Permission Changes**: Bureau assignments or global role promotions.
   - **Reversible Actions**: Count of events that can be rolled back via one click.

---

## 3. Finding an Action & Inspecting History

### 3.1 Searching and Filtering
Use the filter controls above the activity table:
- **Search bar**: Type any keyword (e.g., student name, matricule, meeting title, event name, or action keyword).
- **Category Filter**: Filter by domain — *Members*, *Events*, *Meetings*, *Tasks*, *Recycle Bin*, *Roles*, or *System*.
- **Action Type**: Filter specifically for `MEMBER_REMOVAL`, `EVENT_EDIT`, `EVENT_DELETE`, `RESTORE_RECORD`, etc.
- **Reversible Only**: Toggle this checkbox to view only actions that can be automatically undone.

### 3.2 Reading an Audit Entry
Each row in the audit log displays:
- **Timestamp**: Exact date and time (in `Africa/Tunis` local time).
- **Actor Snapshot**: Name and position of the officer who performed the action (e.g. `Adam Walha • Admin`).
- **Action Badge**: Highlighting the nature of the event.
- **Entity**: The affected record and title (e.g. `Green Tech Hackathon 2026`).
- **Reason**: The mandatory explanation submitted by the actor (e.g. *"Updated auditorium room and expanded seating capacity"*).

---

## 4. How to Undo an Edit

When a record (such as an event, task, or member role) was edited incorrectly:

1. Locate the modification entry in `/admin/audit-logs`.
2. Check that the row has a green **Undo This Change** button.
3. Click **Undo This Change**.
4. The **Audit Inspection & Rollback Modal** opens, showing a visual side-by-side diff:
   - **Previous State (Snapshot Before)**: Highlighted in green — what will be restored.
   - **New State (Current State)**: Highlighted in amber — what will be overwritten.
5. Review the changes carefully.
6. Click **Confirm & Restore Previous State**.
7. The system:
   - Restores the entity fields to their exact previous values.
   - Marks the original audit entry as `is_undone = true`.
   - Creates a **brand new audit entry** (`UNDO_REVERSAL`) documenting that you restored the record.

---

## 5. Handling Recovery Conflicts

### What is a conflict?
A conflict occurs when another officer made further changes to a record *after* the audit log entry occurred.

### Conflict Detection Mechanism:
When you click "Undo", the engine compares:
- The `version` number on the live record vs. the `version` in the audit entry.
- The `updated_at` timestamp on the live record vs. the audit timestamp.

### If a conflict is detected:
1. The modal displays a prominent warning:
   > ⚠️ **Concurrent Modification Detected**: This record was updated by another user after this change was logged. Reversing will overwrite subsequent updates.
2. Review the live values and verify whether restoring is appropriate.
3. If confirmed, click **Force Undo (Overwrite Current)** to proceed.

---

## 6. How to Restore Deleted Records (Recycle Bin)

When an event, meeting, task, project, document, or member was deleted:

1. Navigate to **Recycle Bin** (`/admin/recycle-bin`).
2. Select the relevant entity tab (e.g., **Events**, **Tasks**, or **Members**).
3. Review the soft-deleted items:
   - Displays who deleted the item (`Deleted By`).
   - Displays the exact time and date.
   - Displays the **Reason for Deletion**.
4. Click **Restore**.
5. The system immediately reactivates the record, removes it from the Recycle Bin, increments its version, and creates a `RESTORE_RECORD` audit entry.

---

## 7. Reversible vs. Non-Reversible Actions

| Action Type | Can Be Undone? | Recovery Method |
| :--- | :---: | :--- |
| **Event Edit** | ✅ Yes | One-click Undo in Audit Logs |
| **Event Soft-Deletion** | ✅ Yes | Click "Restore" in Recycle Bin |
| **Member Role Change** | ✅ Yes | One-click Undo in Audit Logs |
| **Member Removal** | ✅ Yes | Click "Reactivate Member" in `/admin/members` |
| **Member Account Soft-Deletion** | ✅ Yes | Click "Restore" in Recycle Bin |
| **Attendance Check-in Status** | ✅ Yes | Update status in Bureau Attendance Scanner |
| **Permanent Account Purge** | ❌ No | Irreversible; restricted strictly to Super Admin |
| **Direct Audit Log Deletion** | ❌ Blocked | Blocked at PostgreSQL engine level |

---

## 8. Append-Only Integrity Notice

The audit log table is protected by a PostgreSQL trigger (`trg_prevent_audit_log_deletion`). Even if an administrator attempts to delete an audit log through SQL or the user interface, the database raises an exception (`P0001: Audit log entries are append-only`). 

To correct an audit entry, administrators must create a new documented administrative event rather than erasing the historical past.
