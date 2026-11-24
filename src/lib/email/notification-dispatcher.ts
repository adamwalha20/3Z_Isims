import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { sendTransactionalEmail } from '@/lib/email/resend-service';
import {
  generateTaskEmailHtml,
  generateEventEmailHtml,
  generateAnnouncementEmailHtml,
  generateMeetingEmailHtml,
} from '@/lib/email/email-templates';

const isUuid = (val: any): boolean =>
  typeof val === 'string' &&
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val);

const DEFAULT_APP_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://3-z-isims.vercel.app';

// -------------------------------------------------------------
// 1. Task Assignment Notification
// -------------------------------------------------------------
export interface TaskAssignmentParams {
  taskId: string;
  taskTitle: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueAt?: string | null;
  assigneeUserIds: string[];
  assignedByName?: string;
  appUrl?: string;
}

export async function dispatchTaskAssignmentNotification(params: TaskAssignmentParams) {
  const {
    taskId,
    taskTitle,
    description,
    priority = 'medium',
    dueAt,
    assigneeUserIds,
    assignedByName = 'Bureau Exécutif',
    appUrl = DEFAULT_APP_URL,
  } = params;

  if (!assigneeUserIds || assigneeUserIds.length === 0) return { dispatched: 0 };

  const supabase = getSupabaseAdmin();
  const validUserIds = assigneeUserIds.filter(isUuid);
  if (validUserIds.length === 0) return { dispatched: 0 };

  // Fetch recipients
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', validUserIds);

  if (!profiles || profiles.length === 0) return { dispatched: 0 };

  // Fetch preferences
  const { data: prefsList } = await supabase
    .from('email_preferences')
    .select('user_id, task_emails_enabled')
    .in('user_id', validUserIds);

  const prefsMap = new Map((prefsList || []).map((p) => [p.user_id, p.task_emails_enabled]));

  let dispatched = 0;
  for (const profile of profiles) {
    if (!profile.email) continue;
    // Check preference: skip if explicitly false
    if (prefsMap.get(profile.id) === false) {
      console.log(`[Task Email] Recipient ${profile.email} opted out of task emails.`);
      continue;
    }

    const emailData = generateTaskEmailHtml({
      recipientName: profile.full_name || 'Membre ZEC',
      taskTitle,
      taskId,
      status: 'todo',
      priority,
      dueAt,
      assignedByName,
      notes: description,
      eventType: 'assigned',
      appUrl,
    });

    await sendTransactionalEmail({
      to: profile.email,
      recipientUserId: profile.id,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      emailType: 'task_assignment',
    });
    dispatched++;
  }

  return { dispatched };
}

// -------------------------------------------------------------
// 2. Task Verification / Rejection Notification
// -------------------------------------------------------------
export interface TaskVerificationParams {
  taskId: string;
  taskTitle: string;
  assigneeId: string;
  approved: boolean;
  points?: number;
  reviewerName?: string;
  feedback?: string;
  appUrl?: string;
}

export async function dispatchTaskVerificationNotification(params: TaskVerificationParams) {
  const {
    taskId,
    taskTitle,
    assigneeId,
    approved,
    points = 10,
    reviewerName = 'Bureau Exécutif',
    feedback,
    appUrl = DEFAULT_APP_URL,
  } = params;

  if (!isUuid(assigneeId)) return { dispatched: 0 };

  const supabase = getSupabaseAdmin();

  // Check preference
  const { data: prefs } = await supabase
    .from('email_preferences')
    .select('task_emails_enabled')
    .eq('user_id', assigneeId)
    .maybeSingle();

  if (prefs && prefs.task_emails_enabled === false) {
    console.log(`[Task Email] User ${assigneeId} opted out of task emails.`);
    return { dispatched: 0, skipped: true };
  }

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('id', assigneeId)
    .maybeSingle();

  if (!profile || !profile.email) return { dispatched: 0 };

  const emailData = generateTaskEmailHtml({
    recipientName: profile.full_name || 'Membre ZEC',
    taskTitle,
    taskId,
    status: approved ? 'done' : 'todo',
    priority: 'medium',
    assignedByName: reviewerName,
    notes: feedback,
    eventType: approved ? 'verified' : 'rejected',
    points,
    appUrl,
  });

  const res = await sendTransactionalEmail({
    to: profile.email,
    recipientUserId: profile.id,
    subject: emailData.subject,
    html: emailData.html,
    text: emailData.text,
    emailType: approved ? 'task_verified' : 'task_rejected',
  });

  return { dispatched: res.success ? 1 : 0 };
}

// -------------------------------------------------------------
// 3. Official Announcement Broadcast Notification
// -------------------------------------------------------------
export interface AnnouncementBroadcastParams {
  announcementId: string;
  title: string;
  body: string;
  authorName?: string;
  publishedAt?: string;
  isPinned?: boolean;
  audienceType?: 'club' | 'department';
  departmentName?: string;
  appUrl?: string;
}

export async function dispatchAnnouncementBroadcastNotification(params: AnnouncementBroadcastParams) {
  const {
    announcementId,
    title,
    body,
    authorName = 'Bureau Exécutif',
    publishedAt = new Date().toISOString(),
    isPinned = false,
    audienceType = 'club',
    departmentName,
    appUrl = DEFAULT_APP_URL,
  } = params;

  const supabase = getSupabaseAdmin();

  // Fetch all active members
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, account_status')
    .neq('account_status', 'suspended')
    .neq('account_status', 'removed');

  if (!profiles || profiles.length === 0) return { dispatched: 0 };

  // Fetch preferences for announcements
  const { data: prefsList } = await supabase
    .from('email_preferences')
    .select('user_id, announcement_emails_enabled');

  const prefsMap = new Map((prefsList || []).map((p) => [p.user_id, p.announcement_emails_enabled]));

  let dispatched = 0;
  for (const profile of profiles) {
    if (!profile.email) continue;
    if (prefsMap.get(profile.id) === false) continue; // Opted out

    const emailData = generateAnnouncementEmailHtml({
      recipientName: profile.full_name || 'Membre ZEC',
      announcementId,
      title,
      body,
      authorName,
      publishedAt,
      isPinned,
      audienceType,
      departmentName,
      appUrl,
    });

    await sendTransactionalEmail({
      to: profile.email,
      recipientUserId: profile.id,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      emailType: 'official_announcement',
    });
    dispatched++;
  }

  return { dispatched };
}

// -------------------------------------------------------------
// 4. Club Event Notification
// -------------------------------------------------------------
export interface ClubEventParams {
  eventId: string;
  eventTitle: string;
  startsAt: string;
  endsAt?: string;
  location?: string;
  description?: string;
  organizerName?: string;
  eventType?: 'published' | 'registered' | 'reminder';
  targetUserIds?: string[]; // If omitted, broadcasts to all members with event_emails_enabled
  appUrl?: string;
}

export async function dispatchClubEventNotification(params: ClubEventParams) {
  const {
    eventId,
    eventTitle,
    startsAt,
    endsAt,
    location,
    description,
    organizerName = 'Bureau Exécutif',
    eventType = 'published',
    targetUserIds,
    appUrl = DEFAULT_APP_URL,
  } = params;

  const supabase = getSupabaseAdmin();

  let query = supabase.from('profiles').select('id, full_name, email');
  if (targetUserIds && targetUserIds.length > 0) {
    query = query.in('id', targetUserIds.filter(isUuid));
  } else {
    query = query.neq('account_status', 'suspended').neq('account_status', 'removed');
  }

  const { data: profiles } = await query;
  if (!profiles || profiles.length === 0) return { dispatched: 0 };

  const { data: prefsList } = await supabase
    .from('email_preferences')
    .select('user_id, event_emails_enabled');

  const prefsMap = new Map((prefsList || []).map((p) => [p.user_id, p.event_emails_enabled]));

  let dispatched = 0;
  for (const profile of profiles) {
    if (!profile.email) continue;
    if (prefsMap.get(profile.id) === false) continue; // Opted out

    const emailData = generateEventEmailHtml({
      recipientName: profile.full_name || 'Membre ZEC',
      eventTitle,
      eventId,
      startsAt,
      endsAt,
      location,
      description,
      organizerName,
      eventType,
      appUrl,
    });

    await sendTransactionalEmail({
      to: profile.email,
      recipientUserId: profile.id,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      emailType: 'club_event',
    });
    dispatched++;
  }

  return { dispatched };
}

// -------------------------------------------------------------
// 5. Meeting Invitation / Scheduled Notification
// -------------------------------------------------------------
export interface MeetingInviteParams {
  meetingId: string;
  meetingTitle: string;
  startsAt: string;
  endsAt: string;
  description?: string;
  location?: string;
  meetingUrl?: string;
  organizerName?: string;
  agenda?: string;
  attendeeUserIds?: string[];
  appUrl?: string;
}

export async function dispatchMeetingInviteNotification(params: MeetingInviteParams) {
  const {
    meetingId,
    meetingTitle,
    startsAt,
    endsAt,
    description,
    meetingUrl,
    organizerName = 'Bureau Exécutif',
    agenda,
    attendeeUserIds,
    appUrl = DEFAULT_APP_URL,
  } = params;

  const supabase = getSupabaseAdmin();

  let query = supabase.from('profiles').select('id, full_name, email');
  if (attendeeUserIds && attendeeUserIds.length > 0) {
    query = query.in('id', attendeeUserIds.filter(isUuid));
  } else {
    query = query.neq('account_status', 'suspended').neq('account_status', 'removed');
  }

  const { data: profiles } = await query;
  if (!profiles || profiles.length === 0) return { dispatched: 0 };

  const { data: prefsList } = await supabase
    .from('email_preferences')
    .select('user_id, meeting_reminders_enabled');

  const prefsMap = new Map((prefsList || []).map((p) => [p.user_id, p.meeting_reminders_enabled]));

  let dispatched = 0;
  for (const profile of profiles) {
    if (!profile.email) continue;
    if (prefsMap.get(profile.id) === false) continue;

    const emailData = generateMeetingEmailHtml({
      recipientName: profile.full_name || 'Membre ZEC',
      meetingTitle,
      meetingId,
      startsAt,
      endsAt,
      description,
      organizerName,
      agenda,
      meetingUrl,
      reminderType: 'invitation',
      appUrl,
    });

    await sendTransactionalEmail({
      to: profile.email,
      recipientUserId: profile.id,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      meetingId: isUuid(meetingId) ? meetingId : null,
      emailType: 'meeting_invitation',
    });
    dispatched++;
  }

  return { dispatched };
}
