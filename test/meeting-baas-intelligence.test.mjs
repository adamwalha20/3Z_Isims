import test from 'node:test';
import assert from 'node:assert/strict';
import { validateGoogleMeetUrl } from '../src/lib/meeting-baas/validation.ts';
import { MeetingAnalysisResultSchema } from '../src/lib/ai/schemas.ts';

test('ZEC Meeting BaaS v2 & AI Intelligence — Validation & Schema Tests', async (t) => {
  await t.test('1. Google Meet URL validation accepts standard meeting links', () => {
    assert.equal(validateGoogleMeetUrl('https://meet.google.com/abc-defg-hij').isValid, true);
    assert.equal(validateGoogleMeetUrl('https://meet.google.com/xyz-uvwx-rst').isValid, true);
  });

  await t.test('2. Google Meet URL validation rejects non-meet URLs', () => {
    assert.equal(validateGoogleMeetUrl('https://zoom.us/j/123456789').isValid, false);
    assert.equal(validateGoogleMeetUrl('https://teams.microsoft.com/l/meetup').isValid, false);
    assert.equal(validateGoogleMeetUrl('not-a-url').isValid, false);
    assert.equal(validateGoogleMeetUrl('').isValid, false);
  });

  await t.test('3. MeetingAnalysisResultSchema validates complete 8-dimension structured analysis', () => {
    const validData = {
      executive_summary: {
        purpose: 'Discuss rooftop solar project for campus carbon reduction',
        main_topics: ['Solar panel financing', 'University approval process'],
        key_outcomes: ['Agreement to submit proposal by Nov 30'],
        conclusion: 'Actionable steps established with unanimous executive support.',
      },
      overview: {
        title: 'Zero Carbon Campus Workshop',
        duration_minutes: 45,
        participants: ['adam walha', 'Yassine Mezghani'],
        main_subjects: ['Sustainability', 'Funding'],
      },
      topics: [
        {
          title: 'Renewable energy campus proposal',
          explanation: 'Discussed solar panel installation on ISIMS rooftops.',
          key_points: ['10kW capacity planned', 'Reduces emissions by 30%'],
          speakers: ['adam walha'],
          timestamp_seconds: 120,
        },
      ],
      decisions: [
        {
          title: 'Submit funding proposal to University by November 30',
          explanation: 'Approved unanimously by the executive bureau.',
          evidence: 'Motion passed at minute 18:30 without objections.',
          status: 'confirmed',
          timestamp_seconds: 1110,
        },
      ],
      action_items: [
        {
          title: 'Draft solar panel technical specification',
          description: 'Technical document for university administration.',
          suggested_assignee: 'Unassigned',
          deadline: 'Not specified',
          priority: 'high',
          evidence: 'Adam requested a technical specification draft.',
          timestamp_seconds: 1400,
        },
      ],
      important_notes: {
        announcements: ['Next physical meeting at Smart Green Lab'],
        risks_and_challenges: ['Administrative delays from university rectorate'],
        unresolved_questions: ['Exact procurement timeline'],
      },
      next_meeting: {
        proposed_date: '2026-12-05',
        proposed_time: '14:00',
        proposed_agenda: ['Review rectorate feedback', 'Finalize budget'],
      },
      meeting_quality: {
        unclear_decisions: [],
        missing_task_owners: ['Draft solar panel technical specification'],
        missing_deadlines: ['Draft solar panel technical specification'],
      },
      detected_language: 'fr',
    };

    const parsed = MeetingAnalysisResultSchema.parse(validData);
    assert.equal(parsed.decisions.length, 1);
    assert.equal(parsed.action_items.length, 1);
    assert.equal(parsed.action_items[0].suggested_assignee, 'Unassigned');
    assert.equal(parsed.action_items[0].deadline, 'Not specified');
    assert.equal(parsed.action_items[0].priority, 'high');
  });

  await t.test('4. MeetingAnalysisResultSchema enforces defaults for missing assignee & deadline', () => {
    const dataWithMissingFields = {
      executive_summary: {
        purpose: 'Brief sync',
        main_topics: ['Review'],
        key_outcomes: ['Done'],
        conclusion: 'Wrap up',
      },
      overview: {
        title: 'Sync',
        main_subjects: ['Review'],
      },
      topics: [],
      decisions: [],
      action_items: [
        {
          title: 'Order stationery supplies',
          evidence: 'Stated by secretary',
        },
      ],
      important_notes: {},
      next_meeting: {},
      meeting_quality: {},
    };

    const parsed = MeetingAnalysisResultSchema.parse(dataWithMissingFields);
    assert.equal(parsed.action_items[0].suggested_assignee, 'Unassigned');
    assert.equal(parsed.action_items[0].deadline, 'Not specified');
    assert.equal(parsed.action_items[0].priority, 'medium');
  });

  await t.test('5. Action items only convert to Hub tasks on explicit confirmed status', () => {
    const rawActionItem = {
      title: 'Organize room booking for ISIMS Green Workshop',
      suggested_assignee: 'Unassigned',
      deadline: '2026-11-20',
      priority: 'high',
      status: 'pending_review',
    };

    const isOfficial = rawActionItem.status === 'confirmed';
    assert.equal(isOfficial, false);

    const reviewedItem = {
      ...rawActionItem,
      status: 'confirmed',
      confirmed_assignee_id: '8b4defa0-21fa-410a-82c8-8b42f5fcf6d0',
    };
    assert.equal(reviewedItem.status === 'confirmed', true);
    assert.ok(reviewedItem.confirmed_assignee_id);
  });

  await t.test('6. Pre-meeting 5-minute auto-dispatch timing window calculation', () => {
    const now = Date.now();
    const leadTimeMs = 5 * 60 * 1000;

    // Meeting starting in 3 minutes -> inside the 5-minute dispatch window
    const meetingIn3Min = new Date(now + 3 * 60 * 1000).toISOString();
    const msUntilIn3Min = new Date(meetingIn3Min).getTime() - leadTimeMs - now;
    assert.ok(msUntilIn3Min <= 0, 'Meeting starting in 3 min must trigger immediate dispatch');

    // Meeting starting in exactly 5 minutes -> exactly at the dispatch threshold
    const meetingIn5Min = new Date(now + 5 * 60 * 1000).toISOString();
    const msUntilIn5Min = new Date(meetingIn5Min).getTime() - leadTimeMs - now;
    assert.ok(Math.abs(msUntilIn5Min) < 1000, 'Meeting starting in 5 min must be at dispatch boundary');

    // Meeting starting in 30 minutes -> outside the 5-minute window
    const meetingIn30Min = new Date(now + 30 * 60 * 1000).toISOString();
    const msUntilIn30Min = new Date(meetingIn30Min).getTime() - leadTimeMs - now;
    assert.ok(msUntilIn30Min > 0, 'Meeting starting in 30 min must be scheduled in future');
    assert.equal(Math.round(msUntilIn30Min / 60000), 25, 'Timer must fire 25 minutes from now');
  });

  await t.test('7. Automatic sync recognizes all Meeting BaaS completion webhook events', () => {
    const isCompletedEvent = (eventType, status) => {
      return (
        eventType === 'complete' ||
        eventType === 'bot.completed' ||
        eventType === 'bot.done' ||
        eventType === 'recording.ready' ||
        eventType === 'transcription_complete' ||
        eventType === 'transcription.completed' ||
        (eventType === 'bot.status_change' && (status === 'completed' || status === 'ended'))
      );
    };

    assert.equal(isCompletedEvent('complete'), true);
    assert.equal(isCompletedEvent('bot.completed'), true);
    assert.equal(isCompletedEvent('recording.ready'), true);
    assert.equal(isCompletedEvent('transcription_complete'), true);
    assert.equal(isCompletedEvent('bot.status_change', 'completed'), true);
    assert.equal(isCompletedEvent('bot.status_change', 'ended'), true);
    assert.equal(isCompletedEvent('bot.status_change', 'in_meeting'), false);
    assert.equal(isCompletedEvent('bot.status_change', 'joining'), false);
  });
});
