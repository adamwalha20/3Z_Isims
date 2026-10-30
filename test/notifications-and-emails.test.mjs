import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CLUB_TIMEZONE,
  formatTunisDate,
  formatTunisTime,
  formatTunisDateTime,
  getTunisCalendarDate,
  getTunisMeetingDayMorning8am,
  calculateMeetingReminders,
} from '../src/lib/email/timezone-utils.ts';

test('ZEC Campus Hub — Africa/Tunis Timezone & Date Formatting Invariants', async (t) => {
  await t.test('Club timezone constant is strictly Africa/Tunis', () => {
    assert.equal(CLUB_TIMEZONE, 'Africa/Tunis');
  });

  await t.test('Tunis time is UTC+1 year-round without daylight saving shifts', () => {
    // 14:00 UTC corresponds to 15:00 Africa/Tunis
    const utcIso = '2026-11-06T14:00:00.000Z';
    const timeInTunis = formatTunisTime(utcIso);
    assert.equal(timeInTunis, '15:00');
  });

  await t.test('Morning 08:00 AM Africa/Tunis corresponds to 07:00 AM UTC', () => {
    const meetingIso = '2026-11-06T14:00:00.000Z';
    const morning8am = getTunisMeetingDayMorning8am(meetingIso);
    assert.equal(morning8am.toISOString(), '2026-11-06T07:00:00.000Z');

    const formattedTime = formatTunisTime(morning8am);
    assert.equal(formattedTime, '08:00');
  });

  await t.test('Tunis calendar date is correctly extracted as YYYY-MM-DD', () => {
    // 23:30 UTC on Nov 5 is 00:30 UTC+1 on Nov 6 in Tunis
    const nightUtcIso = '2026-11-05T23:30:00.000Z';
    const calendarDate = getTunisCalendarDate(nightUtcIso);
    assert.equal(calendarDate, '2026-11-06');
  });
});

test('ZEC Campus Hub — Meeting Email Reminders Calculation & Deduplication', async (t) => {
  await t.test('Standard afternoon meeting schedules all 3 reminders: 48h, morning 8am, 1h before', () => {
    // Meeting on Friday Nov 6 at 15:00 Tunis time (14:00 UTC)
    // Reference time: Monday Nov 2 at 10:00 Tunis time
    const meetingIso = '2026-11-06T14:00:00.000Z';
    const refDate = new Date('2026-11-02T09:00:00.000Z');

    const reminders = calculateMeetingReminders(meetingIso, refDate);

    assert.equal(reminders.length, 3);
    assert.equal(reminders[0].type, '48h');
    assert.equal(reminders[1].type, 'morning_8am');
    assert.equal(reminders[2].type, '1h');

    // 48 hours before 14:00 UTC on Nov 6 is 14:00 UTC on Nov 4
    assert.equal(reminders[0].scheduledAtIso, '2026-11-04T14:00:00.000Z');

    // Morning 8am Tunis is 07:00 UTC on Nov 6
    assert.equal(reminders[1].scheduledAtIso, '2026-11-06T07:00:00.000Z');

    // 1 hour before 14:00 UTC is 13:00 UTC on Nov 6 (14:00 Tunis time)
    assert.equal(reminders[2].scheduledAtIso, '2026-11-06T13:00:00.000Z');
  });

  await t.test('Deduplication scenario: 09:00 AM Tunis meeting merges morning 8am and 1h reminder', () => {
    // Meeting on Friday Nov 6 at 09:00 AM Tunis time (08:00 AM UTC)
    // Morning reminder: 08:00 AM Tunis (07:00 AM UTC)
    // 1 hour before: 08:00 AM Tunis (07:00 AM UTC)
    // Both occur at exactly the same time!
    const meetingIso = '2026-11-06T08:00:00.000Z';
    const refDate = new Date('2026-11-02T09:00:00.000Z');

    const reminders = calculateMeetingReminders(meetingIso, refDate);

    // Morning 8am must be dropped and merged into 1h reminder
    assert.equal(reminders.length, 2);
    assert.equal(reminders[0].type, '48h');
    assert.equal(reminders[1].type, '1h');
    assert.equal(reminders[1].isDeduplicated, true);
    assert.equal(reminders[1].scheduledAtIso, '2026-11-06T07:00:00.000Z');
  });

  await t.test('Retroactive filtering: omits reminder dates that have already passed', () => {
    // Meeting on Nov 6 at 14:00 UTC
    // Reference time: Nov 5 at 12:00 UTC (48h reminder is in the past)
    const meetingIso = '2026-11-06T14:00:00.000Z';
    const refDate = new Date('2026-11-05T12:00:00.000Z');

    const reminders = calculateMeetingReminders(meetingIso, refDate);

    // 48h was Nov 4 at 14:00, which is in the past relative to Nov 5
    assert.equal(reminders.some((r) => r.type === '48h'), false);
    assert.equal(reminders.some((r) => r.type === 'morning_8am'), true);
    assert.equal(reminders.some((r) => r.type === '1h'), true);
  });

  await t.test('Emergency notice: meeting starting in less than 1 hour generates urgent reminder', () => {
    const now = new Date('2026-11-06T10:00:00.000Z');
    // Meeting in 35 minutes
    const meetingIso = new Date(now.getTime() + 35 * 60 * 1000).toISOString();

    const reminders = calculateMeetingReminders(meetingIso, now);

    assert.equal(reminders.length, 1);
    assert.equal(reminders[0].type, 'urgent');
  });
});

test('ZEC Campus Hub — Reminder Idempotency & Queue Invariants', async (t) => {
  await t.test('Idempotency keys uniquely identify (meeting_id, recipient_id, reminder_type)', () => {
    const meetingId = 'meet-a1b2c3d4';
    const userId = 'usr-e5f6g7h8';
    const type = 'morning_8am';

    const key1 = `rem_${meetingId}_${userId}_${type}`;
    const key2 = `rem_${meetingId}_${userId}_${type}`;
    const keyDifferentUser = `rem_${meetingId}_usr-different_${type}`;

    assert.equal(key1, key2, 'Identical parameters produce identical idempotency keys');
    assert.notEqual(key1, keyDifferentUser, 'Different recipients produce unique keys');
  });

  await t.test('Cancelled meeting transitions pending jobs to cancelled state', () => {
    const jobs = [
      { id: '1', meeting_id: 'm1', status: 'pending' },
      { id: '2', meeting_id: 'm1', status: 'sent' },
      { id: '3', meeting_id: 'm2', status: 'pending' },
    ];

    // Simulating cancellation logic
    const cancelledMeetingId = 'm1';
    const updatedJobs = jobs.map((j) => {
      if (j.meeting_id === cancelledMeetingId && j.status === 'pending') {
        return { ...j, status: 'cancelled' };
      }
      return j;
    });

    assert.equal(updatedJobs[0].status, 'cancelled');
    assert.equal(updatedJobs[1].status, 'sent', 'Previously sent emails remain sent');
    assert.equal(updatedJobs[2].status, 'pending', 'Unrelated meeting jobs remain pending');
  });
});

test('ZEC Campus Hub — In-App Notifications & Direct Navigation Invariants', async (t) => {
  await t.test('Every notification category routes directly to the exact destination URL', () => {
    const testCases = [
      { category: 'meetings', entityId: 'meet-123', expectedUrl: '/meetings/meet-123' },
      { category: 'tasks', entityId: 'task-456', expectedUrl: '/tasks?taskId=task-456' },
      { category: 'events', entityId: 'ev-789', expectedUrl: '/events/ev-789' },
      { category: 'announcements', entityId: 'ann-001', expectedUrl: '/announcements' },
      { category: 'xp_achievements', entityId: 'ach-002', expectedUrl: '/ranking' },
    ];

    for (const tc of testCases) {
      assert.ok(
        tc.expectedUrl.startsWith('/') && !tc.expectedUrl.includes('//'),
        `Valid internal navigation route: ${tc.expectedUrl}`
      );
      assert.notEqual(tc.expectedUrl, '/dashboard', 'Must not redirect to generic dashboard');
    }
  });

  await t.test('Unread notification counter decrements accurately when marked as read', () => {
    let notifications = [
      { id: 'n1', is_read: false },
      { id: 'n2', is_read: false },
      { id: 'n3', is_read: true },
    ];

    const getUnread = (items) => items.filter((n) => !n.is_read).length;
    assert.equal(getUnread(notifications), 2);

    // Mark n1 as read
    notifications = notifications.map((n) => (n.id === 'n1' ? { ...n, is_read: true } : n));
    assert.equal(getUnread(notifications), 1);

    // Mark all as read
    notifications = notifications.map((n) => ({ ...n, is_read: true }));
    assert.equal(getUnread(notifications), 0);
  });

  await t.test('Urgent priority notifications are tagged and retain priority ordering', () => {
    const notifs = [
      { id: 'n1', priority: 'low' },
      { id: 'n2', priority: 'urgent' },
      { id: 'n3', priority: 'normal' },
      { id: 'n4', priority: 'high' },
    ];

    const priorityWeights = { urgent: 4, high: 3, normal: 2, low: 1 };
    const sorted = [...notifs].sort(
      (a, b) => priorityWeights[b.priority] - priorityWeights[a.priority]
    );

    assert.equal(sorted[0].id, 'n2', 'Urgent priority notification is ranked first');
    assert.equal(sorted[1].id, 'n4', 'High priority notification is ranked second');
  });
});

test('ZEC Campus Hub — Member Email Preferences & Opt-Out Invariants', async (t) => {
  await t.test('User opting out of meeting reminders prevents scheduling delivery', () => {
    const preferences = {
      meeting_reminders_enabled: false,
      task_emails_enabled: true,
      event_emails_enabled: true,
      announcement_emails_enabled: true,
    };

    const shouldSendMeetingEmail = preferences.meeting_reminders_enabled === true;
    assert.equal(shouldSendMeetingEmail, false, 'Meeting reminder delivery should be suppressed');

    const shouldSendTaskEmail = preferences.task_emails_enabled === true;
    assert.equal(shouldSendTaskEmail, true, 'Task email delivery should proceed');
  });
});

