# ZEC CAMPUS HUB — TESTING GUIDE & USER MANUAL

**Purpose:** Comprehensive guide for testing all roles, features, and security boundaries in ZEC Campus Hub.  
**Version:** 2.0 (November 2026)  
**Standard Test Password:** `ZecTest2026!`

---

## 1. Quick Start Testing Instructions

To log into any of the test accounts:
1. Navigate to `http://localhost:3000/login` in your browser.
2. Enter the test email from the table below.
3. Enter the standard test password: `ZecTest2026!`.
4. Click **Sign In**.

---

## 2. Test Accounts Quick Reference

| Role / Mandate | Test Email | Key Features to Test |
| :--- | :--- | :--- |
| **Club Administrator** | `admin.test@zec-campus.tn` | Admin Portal (`/admin`), Audit Logs, Undo Engine, Recycle Bin, Health Check |
| **President** | `president.test@zec-campus.tn` | Club-wide Dashboard, Attendance Scanner (`/attendance/scanner`), Task Verification |
| **Vice President** | `vp.test@zec-campus.tn` | Attendance Scanner, Club Overview, Member Approvals |
| **Secretary General** | `secretary.test@zec-campus.tn` | Attendance Scanner, Session Creation, Meeting Minutes, Audit Logs View |
| **Treasurer** | `treasurer.test@zec-campus.tn` | Financial Ledgers, Disbursals, Budget Approvals |
| **HR Manager** | `hr.test@zec-campus.tn` | Member Directory, Member Removal, Suspension, Delete Account, Audit Logs |
| **Marketing & Design** | `marketing.test@zec-campus.tn` | Comms & Media Department Tools, Campaign Tasks, Media Assets |
| **Comms & Engagement** | `comms.test@zec-campus.tn` | Member Engagement Campaigns, Newsletters, Social Links |
| **Events Manager** | `events.test@zec-campus.tn` | Events Calendar (`/events`), Workshop Logistics, Event Scheduling |
| **Project Manager** | `projects.test@zec-campus.tn` | Projects Workspace (`/projects`), Milestones, Task Delegation |
| **Sustainable Campus** | `sustainability.test@zec-campus.tn` | Green Initiatives, Energy Audits, Sustainability Tasks |
| **Partnerships Lead** | `partnerships.test@zec-campus.tn` | Sponsorship Pipeline, Corporate Prospectus, Industry Deals |
| **Training & Innovation**| `training.test@zec-campus.tn` | Coding Bootcamps, IoT Workshops, Curriculum Tasks |
| **Ordinary Member** | `member.test@zec-campus.tn` | Member Pass (`/attendance`), My Tasks, Ranking, Public Events |

---

## 3. Step-by-Step Test Scenarios

### Scenario A: Testing System Administration & Undo Engine
1. Log in as `admin.test@zec-campus.tn`.
2. Notice the **Admin Governance** link in the sidebar leading to `/admin`.
3. Open `/admin/audit-logs`.
4. Verify the complete audit trail of club mutations.
5. Open `/admin/recycle-bin` to view soft-deleted records.
6. Notice that only the Administrator can access these governance tools.

### Scenario B: Testing QR Attendance Scanner
1. Log in as `secretary.test@zec-campus.tn` or `president.test@zec-campus.tn`.
2. In the sidebar, click on **Attendance Scanner** (`/attendance/scanner`).
3. Point your camera at a member's QR pass or input a test token to record check-in.
4. Log out and log in as `member.test@zec-campus.tn` or `treasurer.test@zec-campus.tn`.
5. Try navigating directly to `/attendance/scanner`.
6. Notice that you are redirected with an explicit access restriction message.

### Scenario C: Testing HR Management & Protection Safeguards
1. Log in as `hr.test@zec-campus.tn`.
2. Navigate to `/admin/members` or the Member Directory.
3. Open an ordinary member's profile (e.g., `member.test@zec-campus.tn`).
4. Notice the **Remove from Club** and **Suspend Access** actions.
5. Open an administrator's profile (e.g., `admin.test@zec-campus.tn`).
6. Notice that removal and suspension buttons are disabled or hidden to protect administrator accounts.

### Scenario D: Testing Department Isolation
1. Log in as `marketing.test@zec-campus.tn` (Communications & Media).
2. Navigate to `/departments` and click on **Training & Innovation**.
3. Notice that management controls are view-only or restricted to your own department (`comms-media`).
4. Try to edit or delete a task belonging to Training & Innovation.
5. Notice that you are prevented from modifying cross-department assets.

### Scenario E: Testing Task Verification & Anti-Conflict of Interest
1. Log in as `member.test@zec-campus.tn`.
2. Open `/tasks` and locate your assigned task: *Audit Amphi A & Labs Electrical Consumption*.
3. Click **Submit for Verification**.
4. Notice that you cannot verify or approve your own task.
5. Log in as `sustainability.test@zec-campus.tn` or `admin.test@zec-campus.tn`.
6. Open the task and verify it.
7. Notice that +30 XP is awarded and verified on the Leaderboard.

---

## 4. Running the Automated Test Suites

To run all 181 automated tests:
```bash
npm test
```

To run a specific test suite:
```bash
node --test test/role-permission-matrix.test.mjs
node --test test/department-isolation.test.mjs
```

To typecheck:
```bash
npx tsc --noEmit
```

To execute a production build:
```bash
npm run build
```
