export type MembershipStatus = 'pending' | 'active' | 'suspended' | 'departed';
export type GlobalRoleKey = 'admin' | 'bureau' | 'member';
export type DepartmentRole = 'lead' | 'contributor';
export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';
export type AttendanceStatus = 'unknown' | 'present' | 'absent' | 'excused';
export type DocumentVisibility = 'club' | 'department' | 'restricted';
export type DocumentCategory = 'charter' | 'minutes' | 'finance' | 'event_runbook' | 'training' | 'handover' | 'general';

export interface Profile {
  id: string;
  full_name: string;
  student_id: string;
  avatar_path?: string | null;
  bio?: string | null;
  phone?: string | null;
  study_field?: string | null;
  skills: string[];
  contact_preferences: {
    email: boolean;
    in_app: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface ClubMembership {
  id: string;
  user_id: string;
  membership_status: MembershipStatus;
  joined_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  key: GlobalRoleKey;
  display_name: string;
  description?: string | null;
}

export interface UserRole {
  user_id: string;
  role_id: string;
  assigned_by?: string | null;
  created_at: string;
  role?: Role;
}

export interface Department {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DepartmentMember {
  id: string;
  department_id: string;
  user_id: string;
  department_role: DepartmentRole;
  created_at: string;
  department?: Department;
  profile?: Profile;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  department_id?: string | null;
  owner_id: string;
  status: ProjectStatus;
  budget_tnd: number;
  start_date?: string | null;
  due_date?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  department?: Department;
  owner?: Profile;
  tasks_count?: number;
  completed_tasks_count?: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  project_id?: string | null;
  department_id?: string | null;
  creator_id: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  project?: Project;
  department?: Department;
  creator?: Profile;
  assignees?: Profile[];
  comments_count?: number;
  checklist_total?: number;
  checklist_done?: number;
}

export interface TaskComment {
  id: string;
  task_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  author?: Profile;
}

export interface EventItem {
  id: string;
  title: string;
  description?: string;
  department_id?: string | null;
  organizer_id: string;
  location?: string | null;
  starts_at: string;
  ends_at: string;
  status: EventStatus;
  capacity?: number | null;
  visibility: 'club' | 'department';
  created_at: string;
  updated_at: string;
  department?: Department;
  organizer?: Profile;
  registrations_count?: number;
  user_registered?: boolean;
}

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  department_id?: string | null;
  organizer_id: string;
  location?: string | null;
  starts_at: string;
  ends_at: string;
  created_at: string;
  updated_at: string;
  department?: Department;
  organizer?: Profile;
  minutes?: string | null;
  action_items?: MeetingAction[];
}

export interface MeetingAction {
  id: string;
  meeting_id: string;
  title: string;
  description?: string;
  task_id?: string | null;
  assigned_user_id?: string | null;
  due_at?: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  assigned_user?: Profile;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  author_id: string;
  audience_type: 'club' | 'department';
  department_id?: string | null;
  status: 'draft' | 'published' | 'archived';
  is_pinned: boolean;
  published_at?: string | null;
  created_at: string;
  author?: Profile;
  department?: Department;
  is_read?: boolean;
}

export interface NotificationItem {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  body: string;
  target_type?: string | null;
  target_id?: string | null;
  read_at?: string | null;
  created_at: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  description?: string | null;
  storage_path: string;
  category: DocumentCategory;
  visibility: DocumentVisibility;
  department_id?: string | null;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  department?: Department;
  uploader?: Profile;
}

export interface HandoverRecord {
  id: string;
  title: string;
  content: string;
  department_id?: string | null;
  created_by: string;
  status: 'draft' | 'final' | 'archived';
  created_at: string;
  updated_at: string;
  department?: Department;
  creator?: Profile;
}

export interface AuditLog {
  id: string;
  actor_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  actor?: Profile;
}
