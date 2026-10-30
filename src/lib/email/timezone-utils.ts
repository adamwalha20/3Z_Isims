/**
 * ZEC CAMPUS HUB — TIMEZONE & REMINDER CALCULATION UTILITIES
 * Default Club Timezone: Africa/Tunis (UTC+1, Standard Time)
 */

export const CLUB_TIMEZONE = 'Africa/Tunis';

export interface CalculatedReminder {
  type: '48h' | 'morning_8am' | '1h' | 'urgent';
  scheduledAt: Date;
  scheduledAtIso: string;
  label: string;
  isDeduplicated?: boolean;
}

/**
 * Returns formatted date string in Africa/Tunis timezone (e.g. "Vendredi 6 Novembre 2026")
 */
export function formatTunisDate(dateOrIso: string | Date): string {
  const d = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
  return new Intl.DateTimeFormat('fr-TN', {
    timeZone: CLUB_TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

/**
 * Returns formatted time string in Africa/Tunis timezone (e.g. "14:00")
 */
export function formatTunisTime(dateOrIso: string | Date): string {
  const d = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
  return new Intl.DateTimeFormat('fr-TN', {
    timeZone: CLUB_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

/**
 * Returns full readable date and time string in Africa/Tunis timezone
 */
export function formatTunisDateTime(dateOrIso: string | Date): string {
  return `${formatTunisDate(dateOrIso)} à ${formatTunisTime(dateOrIso)}`;
}

/**
 * Returns the calendar date in Africa/Tunis as YYYY-MM-DD
 */
export function getTunisCalendarDate(dateOrIso: string | Date): string {
  const d = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CLUB_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * Computes 08:00 AM on the meeting's calendar day in Africa/Tunis.
 * Note: Tunisia is in UTC+1 standard time year-round.
 * 08:00 AM Tunis is 07:00 AM UTC.
 */
export function getTunisMeetingDayMorning8am(startsAtIso: string | Date): Date {
  const dateStrInTunis = getTunisCalendarDate(startsAtIso);
  // Construct 07:00:00 UTC which is exactly 08:00:00 Africa/Tunis
  return new Date(`${dateStrInTunis}T07:00:00.000Z`);
}

/**
 * Calculates the 3 automatic reminder times for a meeting:
 * 1. REMINDER 1: Exactly 48 hours before the meeting starts.
 * 2. REMINDER 2: On the meeting day at 08:00 AM Africa/Tunis time.
 * 3. REMINDER 3: Exactly 1 hour before the meeting starts.
 *
 * Deduplication rule:
 * If Reminder 2 (08:00 AM morning) and Reminder 3 (1h before) occur at or nearly the same time
 * (e.g., meeting at 09:00 AM Tunis time), deduplicate them into a single 1h reminder.
 *
 * Retroactive rule:
 * Reminders in the past relative to referenceTime (default: now) are omitted.
 */
export function calculateMeetingReminders(
  startsAtIso: string,
  referenceTime: Date = new Date()
): CalculatedReminder[] {
  const meetingDate = new Date(startsAtIso);
  const meetingTimeMs = meetingDate.getTime();
  const refTimeMs = referenceTime.getTime();

  if (isNaN(meetingTimeMs)) {
    return [];
  }

  const reminders: CalculatedReminder[] = [];

  // Reminder 1: Exactly 48 hours before
  const twoDaysBefore = new Date(meetingTimeMs - 48 * 3600 * 1000);

  // Reminder 2: Meeting day at 08:00 AM Africa/Tunis
  const morning8am = getTunisMeetingDayMorning8am(meetingDate);

  // Reminder 3: Exactly 1 hour before
  const oneHourBefore = new Date(meetingTimeMs - 1 * 3600 * 1000);

  // Check if meeting starts in less than 1 hour from reference time
  const msUntilMeeting = meetingTimeMs - refTimeMs;
  if (msUntilMeeting > 0 && msUntilMeeting < 60 * 60 * 1000) {
    // Meeting starts in less than 1 hour -> schedule immediate urgent reminder
    return [
      {
        type: 'urgent',
        scheduledAt: new Date(refTimeMs + 60 * 1000), // 1 min from now
        scheduledAtIso: new Date(refTimeMs + 60 * 1000).toISOString(),
        label: 'Your meeting starts in less than one hour',
      },
    ];
  }

  // 1. Add 48h reminder if still in future
  if (twoDaysBefore.getTime() > refTimeMs) {
    reminders.push({
      type: '48h',
      scheduledAt: twoDaysBefore,
      scheduledAtIso: twoDaysBefore.toISOString(),
      label: 'Your meeting is in two days',
    });
  }

  // Check collision between morning 8am and 1h before
  // If difference is <= 30 minutes, deduplicate to single 1h reminder
  const diffMorningAnd1hMinutes = Math.abs(morning8am.getTime() - oneHourBefore.getTime()) / (60 * 1000);
  const isCollision = diffMorningAnd1hMinutes <= 30;

  if (isCollision) {
    // Meeting is around 08:30 - 09:30 AM.
    // Send single combined reminder at 1h before (or 08:00 AM)
    if (oneHourBefore.getTime() > refTimeMs) {
      reminders.push({
        type: '1h',
        scheduledAt: oneHourBefore,
        scheduledAtIso: oneHourBefore.toISOString(),
        label: 'Your meeting starts in one hour (Today at ' + formatTunisTime(meetingDate) + ')',
        isDeduplicated: true,
      });
    }
  } else {
    // Both reminders are distinct.
    // Add morning 8am if morning time is strictly BEFORE 1h before AND in the future
    if (morning8am.getTime() < oneHourBefore.getTime() && morning8am.getTime() > refTimeMs) {
      reminders.push({
        type: 'morning_8am',
        scheduledAt: morning8am,
        scheduledAtIso: morning8am.toISOString(),
        label: 'Your meeting is today',
      });
    }

    // Add 1h before reminder if in future
    if (oneHourBefore.getTime() > refTimeMs) {
      reminders.push({
        type: '1h',
        scheduledAt: oneHourBefore,
        scheduledAtIso: oneHourBefore.toISOString(),
        label: 'Your meeting starts in one hour',
      });
    }
  }

  return reminders;
}

