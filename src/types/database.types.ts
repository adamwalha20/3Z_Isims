export type MembershipStatus = 'pending' | 'active' | 'suspended' | 'departed';
export type GlobalRoleKey = 'admin' | 'bureau' | 'member';
export type DepartmentRole = 'lead' | 'contributor';
export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
export type TaskStatus = 'todo' | 'in_progress' | 'waiting_verification' | 'blocked' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';
export type AttendanceStatus = 'unknown' | 'present' | 'absent' | 'excused';
export type DocumentVisibility = 'club' | 'department' | 'restricted';
export type DocumentCategory = 'charter' | 'minutes' | 'finance' | 'event_runbook' | 'training' | 'handover' | 'general';

export interface Profile {
  id: string;
  full_name: string;
  student_id: string;
  email?: string | null;
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
  membership?: ClubMembership | null;
  roles?: Role[];
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
  verified_by?: string | null;
  verified_at?: string | null;
  rejection_reason?: string | null;
  requires_verification?: boolean;
  xp_awarded?: boolean;
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

export type MeetingType =
  | 'bureau'
  | 'department'
  | 'general'
  | 'project'
  | 'event_prep'
  | 'other'
  | 'General Club Meeting'
  | 'Bureau Meeting'
  | 'Department Meeting'
  | 'Project Meeting'
  | 'Event Preparation Meeting'
  | 'Other';
export type MeetingStatus = 'scheduled' | 'live' | 'processing' | 'completed' | 'cancelled';
export type MeetingVisibility = 'club' | 'department' | 'confidential' | 'restricted' | 'public';
export type RecordingStatus = 'none' | 'requested' | 'live' | 'processing' | 'available' | 'failed';
export type RecordingConsentStatus = 'pending' | 'obtained' | 'exempt' | 'declined';
export type RecordingProvider =
  | 'upload'
  | 'google_drive'
  | 'manual_upload'
  | 'google_meet_import'
  | 'recall_ai'
  | 'meeting_baas'
  | 'custom_bot';

export interface MeetingRecording {
  id: string;
  meeting_id: string;
  provider: RecordingProvider;
  provider_recording_id?: string | null;
  storage_path?: string | null;
  duration_seconds: number;
  file_size?: number;
  file_size_bytes?: number;
  file_name?: string;
  storage_bucket?: string;
  playback_url?: string | null;
  mime_type?: string;
  processing_status?: 'uploading' | 'processing' | 'completed' | 'failed' | 'available';
  status?: 'uploading' | 'processing' | 'completed' | 'failed' | 'available';
  created_at?: string;
  completed_at?: string | null;
}

export interface MeetingTranscriptSegment {
  id?: string;
  transcript_id?: string;
  meeting_id?: string;
  speaker_label: string;
  start_seconds: number;
  end_seconds: number;
  content: string;
  created_at?: string;
}

export interface MeetingTranscript {
  id: string;
  meeting_id: string;
  recording_id?: string | null;
  language: string;
  content?: string;
  full_text?: string;
  is_edited?: boolean;
  edited_by?: string | null;
  processing_status?: 'processing' | 'completed' | 'failed' | 'ready';
  status?: 'processing' | 'completed' | 'failed' | 'ready';
  created_at?: string;
  updated_at?: string;
  segments?: MeetingTranscriptSegment[];
}

export interface MeetingSummaryItem {
  title?: string;
  task?: string;
  responsible?: string;
  assignee?: string;
  deadline?: string;
  transcript_timestamp?: string;
}

export interface MeetingSummaryContent {
  overview: string;
  key_topics: string[];
  important_updates: string[];
  decisions_made?: string[];
  decisions?: string[];
  problems_and_challenges?: string[];
  challenges?: string[];
  pending_questions?: string[];
  questions?: string[];
  action_items: MeetingSummaryItem[];
  next_steps: string[];
}

export interface MeetingSummary {
  id: string;
  meeting_id: string;
  summary_content?: MeetingSummaryContent;
  content?: MeetingSummaryContent;
  processing_status?: 'generating' | 'completed' | 'failed' | 'unavailable';
  review_status?: 'draft' | 'approved' | 'rejected';
  notes?: string | null;
  generated_at?: string;
  approved_by?: string | null;
  approved_at?: string | null;
  updated_at?: string;
  approver?: Profile;
}

export interface MeetingRecordingJob {
  id: string;
  meeting_id: string;
  provider: RecordingProvider;
  external_job_id?: string | null;
  status: 'requested' | 'bot_joining' | 'recording' | 'processing' | 'completed' | 'failed' | 'cancelled';
  idempotency_key: string;
  error_message?: string | null;
  started_at: string;
  completed_at?: string | null;
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
  date?: string;
  start_time?: string;
  end_time?: string;
  meeting_url?: string | null;
  meeting_platform?: string;
  meeting_type?: MeetingType;
  recording_enabled?: boolean;
  recording_status?: RecordingStatus;
  recording_consent_status?: RecordingConsentStatus;
  visibility?: MeetingVisibility;
  agenda?: string | null;
  status?: MeetingStatus;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  department?: Department | string;
  organizer?: Profile | string;
  minutes?: string | null;
  participant_ids?: string[];
  action_items?: MeetingAction[];
  recordings?: MeetingRecording[];
  transcript?: MeetingTranscript | null;
  transcripts?: MeetingTranscript[];
  summary?: MeetingSummary | null;
  recording_jobs?: MeetingRecordingJob[];
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

// ------------------------------------------------------------------------------
// Bureau Positions & Role-Specific Workspaces
// ------------------------------------------------------------------------------

export type BureauPositionKey =
  | 'vice_president'
  | 'secretary_general'
  | 'treasurer'
  | 'hr_manager'
  | 'marketing_design_manager'
  | 'sustainable_campus_manager'
  | 'communication_engagement_manager'
  | 'events_manager'
  | 'project_manager'
  | 'partnerships_sponsorship_manager';

export interface BureauPosition {
  id: string;
  key: BureauPositionKey;
  display_name: string;
  description?: string | null;
  initial_holder?: string | null;
  created_at: string;
}

export interface FinancialTransaction {
  id: string;
  amount: number;
  currency: string;
  transaction_type: 'income' | 'expense';
  category: 'sponsorship' | 'university_subsidy' | 'membership_fees' | 'logistics' | 'catering' | 'equipment' | 'marketing_print' | 'prizes' | 'misc';
  description: string;
  date: string;
  related_event_id?: string | null;
  related_project_id?: string | null;
  created_by?: string | null;
  approval_status: 'pending' | 'approved' | 'rejected';
  receipt_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  title: string;
  category: string;
  planned_amount: number;
  currency: string;
  period: string;
  related_event_id?: string | null;
  created_at: string;
}

export interface Partner {
  id: string;
  organization_name: string;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  pipeline_stage: 'prospect' | 'contacted' | 'meeting_scheduled' | 'proposal_sent' | 'negotiation' | 'confirmed' | 'declined' | 'archived';
  sponsorship_amount_tnd: number;
  deliverables: string[];
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketingCampaign {
  id: string;
  title: string;
  platform: 'instagram' | 'linkedin' | 'facebook' | 'tiktok' | 'posters' | 'all';
  status: 'idea' | 'brief_ready' | 'in_production' | 'in_review' | 'approved' | 'published';
  caption_draft?: string | null;
  planned_date?: string | null;
  asset_url?: string | null;
  assigned_creator_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SustainabilityInitiative {
  id: string;
  title: string;
  category: 'waste_reduction' | 'carbon_offset' | 'tree_planting' | 'energy_efficiency' | 'circular_economy' | 'awareness';
  status: 'proposed' | 'active' | 'milestone_reached' | 'completed';
  target_metric: number;
  current_metric: number;
  metric_unit: string;
  calculation_method?: string | null;
  lead_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Decision {
  id: string;
  meeting_id?: string | null;
  title: string;
  details?: string | null;
  status: 'adopted' | 'under_execution' | 'completed' | 'deferred';
  related_task_id?: string | null;
  decided_at: string;
}

export interface RecruitmentApplication {
  id: string;
  full_name: string;
  student_id: string;
  email: string;
  phone?: string | null;
  study_field: string;
  department_preference: string;
  status: 'submitted' | 'interview_scheduled' | 'accepted' | 'waitlisted' | 'declined';
  hr_notes?: string | null;
  reviewed_by?: string | null;
  created_at: string;
}

// ==============================================================================
// XP & Member Ranking Architecture
// ==============================================================================

export interface MemberXp {
  user_id: string;
  total_xp: number;
  completed_tasks_count: number;
  updated_at: string;
  profile?: Profile;
}

export interface XpTransaction {
  id: string;
  user_id: string;
  points: number;
  reason: string;
  source_type: 'task' | 'milestone' | 'event' | 'initiative' | 'adjustment';
  source_id?: string | null;
  idempotency_key: string;
  awarded_by?: string | null;
  created_at: string;
  user?: Profile;
  awarder?: Profile;
}

export interface XpRule {
  id: string;
  action_type: string;
  points: number;
  is_active: boolean;
  requires_verification: boolean;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemberAchievement {
  id: string;
  user_id: string;
  achievement_key: string;
  awarded_at: string;
  metadata?: {
    title?: string;
    description?: string;
    icon?: string;
  };
}

export interface RankLevel {
  name: string;
  minXp: number;
  maxXp: number | null;
  badgeColor: string;
  icon: string;
}

export const RANK_LEVELS: RankLevel[] = [
  { name: 'New Member', minXp: 0, maxXp: 49, badgeColor: 'bg-slate-100 text-slate-700 border-slate-200', icon: 'eco' },
  { name: 'Active Member', minXp: 50, maxXp: 149, badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: 'stars' },
  { name: 'Contributor', minXp: 150, maxXp: 299, badgeColor: 'bg-teal-100 text-teal-800 border-teal-200', icon: 'bolt' },
  { name: 'Dedicated Member', minXp: 300, maxXp: 499, badgeColor: 'bg-sky-100 text-sky-800 border-sky-200', icon: 'military_tech' },
  { name: 'Club Champion', minXp: 500, maxXp: null, badgeColor: 'bg-amber-100 text-amber-900 border-amber-300', icon: 'workspace_premium' },
];

export function getRankLevel(xp: number): RankLevel {
  for (let i = RANK_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= RANK_LEVELS[i].minXp) {
      return RANK_LEVELS[i];
    }
  }
  return RANK_LEVELS[0];
}

