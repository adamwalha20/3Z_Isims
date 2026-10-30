import { createClient } from '@/lib/supabase/server';
import {
  NotificationCategory,
  NotificationPriority,
  NotificationItem,
  Meeting,
  Profile,
} from '@/types/database.types';
import { calculateMeetingReminders } from '@/lib/email/timezone-utils';

export interface CreateNotificationParams {
  recipientUserId: string;
  title: string;
  description: string;
  category: NotificationCategory;
  destinationUrl: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  priority?: NotificationPriority;
  expiresAt?: string;
}

/**
 * Creates an in-app notification in Supabase database
 */
export async function createNotification(params: CreateNotificationParams): Promise<{ success: boolean; notification?: NotificationItem; error?: string }> {
  const {
    recipientUserId,
    title,
    description,
    category,
    destinationUrl,
    relatedEntityType,
    relatedEntityId,
    priority = 'normal',
    expiresAt,
  } = params;

  try {
    const supabase = await createClient();
    if (!supabase) {
      return { success: false, error: 'Database connection unavailable' };
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        recipient_user_id: recipientUserId,
        recipient_id: recipientUserId,
        title,
        description,
        body: description,
        category,
        destination_url: destinationUrl,
        related_entity_type: relatedEntityType || null,
        target_type: relatedEntityType || null,
        related_entity_id: relatedEntityId || null,
        target_id: relatedEntityId && /^[0-9a-fA-F-]{36}$/.test(relatedEntityId) ? relatedEntityId : null,
        priority,
        is_read: false,
        expires_at: expiresAt || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[ZEC Notification Service] Insert error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, notification: data as unknown as NotificationItem };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown notification error';
    return { success: false, error: msg };
  }
}

/**
 * Schedules the 3 automated email reminders for meeting attendees in public.scheduled_email_reminders
 */
export async function scheduleMeetingReminders(
  meeting: Meeting,
  attendees: Profile[]
): Promise<{ success: boolean; scheduledCount: number; error?: string }> {
  if (!meeting.starts_at && !meeting.date) {
    return { success: false, scheduledCount: 0, error: 'Meeting lacks start date' };
  }

  const startsAt = meeting.starts_at || `${meeting.date}T10:00:00.000Z`;
  const reminders = calculateMeetingReminders(startsAt);

  if (reminders.length === 0) {
    return { success: true, scheduledCount: 0 };
  }

  try {
    const supabase = await createClient();
    if (!supabase) return { success: false, scheduledCount: 0, error: 'No db' };

    let totalInserted = 0;

    for (const attendee of attendees) {
      if (!attendee.id) continue;

      for (const rem of reminders) {
        const idempotencyKey = `rem_${meeting.id}_${attendee.id}_${rem.type}`;

        const { error } = await supabase.from('scheduled_email_reminders').upsert(
          {
            meeting_id: meeting.id,
            recipient_user_id: attendee.id,
            reminder_type: rem.type,
            scheduled_at: rem.scheduledAtIso,
            status: 'pending',
            idempotency_key: idempotencyKey,
            attempts: 0,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'idempotency_key' }
        );

        if (!error) {
          totalInserted++;
        }
      }
    }

    return { success: true, scheduledCount: totalInserted };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to schedule meeting reminders';
    return { success: false, scheduledCount: 0, error: msg };
  }
}

/**
 * Cancels all pending reminders for a meeting (e.g. upon cancellation or rescheduling)
 */
export async function cancelPendingMeetingReminders(meetingId: string): Promise<void> {
  try {
    const supabase = await createClient();
    if (supabase) {
      await supabase
        .from('scheduled_email_reminders')
        .update({
          status: 'cancelled',
          error_message: 'Meeting cancelled or rescheduled',
          updated_at: new Date().toISOString(),
        })
        .eq('meeting_id', meetingId)
        .eq('status', 'pending');
    }
  } catch (err) {
    console.error('[ZEC Notification Service] Cancel reminders error:', err);
  }
}

/**
 * Reschedules reminders when a meeting's date/time is modified
 */
export async function rescheduleMeetingReminders(
  meeting: Meeting,
  attendees: Profile[]
): Promise<void> {
  await cancelPendingMeetingReminders(meeting.id);
  await scheduleMeetingReminders(meeting, attendees);
}
