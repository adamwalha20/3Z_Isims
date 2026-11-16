/**
 * ZEC Campus Hub — System Permissions & Granular Capability Keys
 */

export type PermissionKey =
  // Members
  | 'members:view_public'
  | 'members:view_sensitive'
  | 'members:manage'
  | 'members:assign_roles'
  // Departments
  | 'departments:view'
  | 'departments:manage_own'
  | 'departments:manage_all'
  // Tasks
  | 'tasks:view_assigned'
  | 'tasks:view_department'
  | 'tasks:view_all'
  | 'tasks:create'
  | 'tasks:edit_own'
  | 'tasks:edit_any'
  | 'tasks:delete'
  | 'tasks:submit_verification'
  | 'tasks:verify'
  // Meetings & Bots
  | 'meetings:view_shared'
  | 'meetings:view_confidential'
  | 'meetings:create'
  | 'meetings:edit'
  | 'meetings:dispatch_bot'
  | 'meetings:sync'
  // Attendance
  | 'attendance:view_own'
  | 'attendance:view_all'
  | 'attendance:scan'
  | 'attendance:manage_sessions'
  | 'attendance:correct_records'
  // Finance
  | 'finance:view_overview'
  | 'finance:view_ledger'
  | 'finance:create_entry'
  | 'finance:approve_entry'
  | 'finance:disburse'
  // Recruitment & HR
  | 'hr:view_applications'
  | 'hr:review_applications'
  | 'hr:manage_pipeline'
  // Partnerships
  | 'partnerships:view'
  | 'partnerships:manage_pipeline'
  | 'partnerships:commit_sponsorship'
  // Audit Logs & Administration
  | 'audit:view'
  | 'audit:undo'
  | 'system:manage_settings';
