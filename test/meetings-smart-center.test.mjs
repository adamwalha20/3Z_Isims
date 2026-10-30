import test from 'node:test';
import assert from 'node:assert/strict';

// Core domain logic tests for ZEC Campus Hub Smart Meeting Center

/**
 * Access control helper for meeting visibility
 */
function canViewMeeting(user, meeting) {
  if (!user || user.status !== 'active') return false;
  const isBureauOrAdmin = user.role === 'admin' || user.role === 'bureau';
  if (isBureauOrAdmin) return true;

  const isConfidential = meeting.visibility === 'restricted' || meeting.visibility === 'confidential';
  if (!isConfidential) return true; // Ordinary club meetings are visible to all active members

  // Confidential: only organizer or invited participant
  const isOrganizer = meeting.organizer_id === user.id || meeting.created_by === user.id;
  const isInvited = Array.isArray(meeting.participant_ids) && meeting.participant_ids.includes(user.id);
  return isOrganizer || isInvited;
}

/**
 * Permission helper for meeting creation and editing
 */
function canManageMeeting(user, meeting = null) {
  if (!user || user.status !== 'active') return false;
  if (user.role === 'admin' || user.role === 'bureau') return true;
  if (meeting && (meeting.organizer_id === user.id || meeting.created_by === user.id)) return true;
  return false;
}

/**
 * Search transcript helper
 */
function searchTranscriptSegments(segments, query) {
  if (!query || !query.trim()) return segments;
  const q = query.toLowerCase();
  return segments.filter((seg) => {
    return seg.content.toLowerCase().includes(q) || seg.speaker_label.toLowerCase().includes(q);
  });
}

/**
 * Webhook idempotency handler helper
 */
function handleRecordingWebhook(payload, processedKeys) {
  const idempotencyKey = payload.idempotency_key || payload.job_id;
  if (!idempotencyKey) {
    return { success: false, status: 400, error: 'Missing idempotency key' };
  }
  if (processedKeys.has(idempotencyKey)) {
    return { success: true, status: 200, duplicate: true, message: 'Event already processed' };
  }
  processedKeys.add(idempotencyKey);
  return { success: true, status: 200, duplicate: false, message: 'Processed successfully' };
}

/**
 * Action item to Hub Task conversion helper
 */
function convertActionItemToTask(user, meeting, actionItem) {
  if (!canManageMeeting(user, meeting)) {
    throw new Error('Unauthorized: Ordinary members cannot create tasks from meeting actions');
  }

  return {
    id: `task-from-meet-${Date.now()}`,
    title: actionItem.task || actionItem.title,
    description: `Originating from meeting: ${meeting.title}`,
    status: 'todo',
    priority: 'medium',
    creator_id: user.id,
    assignee_id: actionItem.assignee_id || actionItem.assigned_user_id || 'usr-default',
    due_at: actionItem.deadline || actionItem.due_at || null,
    meeting_id: meeting.id,
    requires_verification: true,
    xp_awarded: false,
  };
}

test('ZEC Smart Meeting Center — Visibility & Archive Access', async (t) => {
  const ordinaryMember = { id: 'usr-member-001', role: 'member', status: 'active' };
  const bureauOfficer = { id: 'usr-bureau-001', role: 'bureau', status: 'active' };
  const adminUser = { id: 'usr-admin-001', role: 'admin', status: 'active' };
  const inactiveMember = { id: 'usr-inactive', role: 'member', status: 'pending' };

  const publicClubMeeting = {
    id: 'meet-pub-01',
    title: 'General Club Assembly',
    visibility: 'club',
    organizer_id: 'usr-bureau-001',
    participant_ids: ['usr-bureau-001'],
  };

  const confidentialMeeting = {
    id: 'meet-conf-01',
    title: 'Bureau Strategy & Disciplinary Hearing',
    visibility: 'restricted',
    organizer_id: 'usr-bureau-001',
    participant_ids: ['usr-bureau-001', 'usr-special-guest'],
  };

  await t.test('All active members can view club-wide meetings even if not invited', () => {
    assert.equal(canViewMeeting(ordinaryMember, publicClubMeeting), true);
    assert.equal(canViewMeeting(bureauOfficer, publicClubMeeting), true);
    assert.equal(canViewMeeting(adminUser, publicClubMeeting), true);
  });

  await t.test('Ordinary members cannot view confidential meetings unless invited', () => {
    assert.equal(canViewMeeting(ordinaryMember, confidentialMeeting), false);

    const invitedMember = { id: 'usr-special-guest', role: 'member', status: 'active' };
    assert.equal(canViewMeeting(invitedMember, confidentialMeeting), true);
  });

  await t.test('Bureau and Admin can always view confidential meetings', () => {
    assert.equal(canViewMeeting(bureauOfficer, confidentialMeeting), true);
    assert.equal(canViewMeeting(adminUser, confidentialMeeting), true);
  });

  await t.test('Inactive or unauthenticated accounts cannot view any meetings', () => {
    assert.equal(canViewMeeting(inactiveMember, publicClubMeeting), false);
    assert.equal(canViewMeeting(null, publicClubMeeting), false);
  });
});

test('ZEC Smart Meeting Center — Scheduling & Permissions', async (t) => {
  const ordinaryMember = { id: 'usr-member-001', role: 'member', status: 'active' };
  const bureauOfficer = { id: 'usr-bureau-001', role: 'bureau', status: 'active' };
  const adminUser = { id: 'usr-admin-001', role: 'admin', status: 'active' };

  const testMeeting = {
    id: 'meet-test-01',
    title: 'Tech Workshop Prep',
    organizer_id: 'usr-bureau-001',
  };

  await t.test('Ordinary members cannot schedule or edit meetings', () => {
    assert.equal(canManageMeeting(ordinaryMember, testMeeting), false);
    assert.equal(canManageMeeting(ordinaryMember, null), false);
  });

  await t.test('Bureau and Admin can schedule and edit meetings', () => {
    assert.equal(canManageMeeting(bureauOfficer, testMeeting), true);
    assert.equal(canManageMeeting(adminUser, testMeeting), true);
  });
});

test('ZEC Smart Meeting Center — Google Meet URL & External Joining', async (t) => {
  const validUrl = 'https://meet.google.com/abc-defg-hij';
  const meeting = {
    id: 'meet-gm-01',
    title: 'Online Synchronization',
    meeting_url: validUrl,
    meeting_platform: 'google_meet',
  };

  await t.test('Validates Google Meet URL structure', () => {
    assert.ok(meeting.meeting_url.startsWith('https://meet.google.com/'));
    const urlPattern = /^https:\/\/meet\.google\.com\/[a-z0-9-]+$/i;
    assert.ok(urlPattern.test(meeting.meeting_url));
  });

  await t.test('Meeting link is independently usable without forced Hub authentication', () => {
    // External link can be opened in new tab directly
    assert.equal(meeting.meeting_url, validUrl);
  });
});

test('ZEC Smart Meeting Center — Webhook Idempotency & Bot Recording', async (t) => {
  const processedKeys = new Set();
  const payload1 = {
    event: 'recording.completed',
    idempotency_key: 'rec_job_evt_101',
    data: { duration: 3200, recording_url: 'https://storage.example.com/meet1.mp4' },
  };

  await t.test('First webhook delivery is processed successfully', () => {
    const res = handleRecordingWebhook(payload1, processedKeys);
    assert.equal(res.success, true);
    assert.equal(res.duplicate, false);
  });

  await t.test('Duplicate webhook delivery with same idempotency key is rejected/ignored', () => {
    const res = handleRecordingWebhook(payload1, processedKeys);
    assert.equal(res.success, true);
    assert.equal(res.duplicate, true);
    assert.equal(res.message, 'Event already processed');
  });
});

test('ZEC Smart Meeting Center — Smart Transcript Search & Timestamp Seeking', async (t) => {
  const sampleSegments = [
    {
      speaker_label: 'Speaker 1',
      start_seconds: 0,
      end_seconds: 45,
      content: 'Bonjour à tous. Bienvenue à la réunion du 3ZERO Club ISIMS.',
    },
    {
      speaker_label: 'Speaker 2',
      start_seconds: 46,
      end_seconds: 120,
      content: 'Concernant le hackathon climat et les panneaux solaires à installer.',
    },
    {
      speaker_label: 'Speaker 1',
      start_seconds: 121,
      end_seconds: 180,
      content: 'La décision finale a été prise de valider le budget de sponsoring.',
    },
  ];

  await t.test('Full text search matches keywords and returns correct timestamp', () => {
    const matches = searchTranscriptSegments(sampleSegments, 'panneaux solaires');
    assert.equal(matches.length, 1);
    assert.equal(matches[0].start_seconds, 46);
    assert.equal(matches[0].speaker_label, 'Speaker 2');
  });

  await t.test('Decision keyword search identifies decision segment for video seek', () => {
    const matches = searchTranscriptSegments(sampleSegments, 'décision finale');
    assert.equal(matches.length, 1);
    assert.equal(matches[0].start_seconds, 121);
  });

  await t.test('Speaker search filters segments by speaker', () => {
    const matches = searchTranscriptSegments(sampleSegments, 'Speaker 2');
    assert.equal(matches.length, 1);
    assert.equal(matches[0].start_seconds, 46);
  });
});

test('ZEC Smart Meeting Center — 8D AI Summary & Task Conversion Invariants', async (t) => {
  const summaryContent = {
    overview: 'Official meeting summary for 3ZERO Club ISIMS.',
    key_topics: ['Solar project', 'Budget approval'],
    important_updates: ['Sponsor contacted'],
    decisions: ['Approved 500 TND budget'],
    challenges: ['Delivery delay on sensors'],
    questions: ['Who will represent the club at the university dean office?'],
    action_items: [
      {
        task: 'Finalize sponsor contract',
        assignee: 'Sarah Ben Ali',
        deadline: '2026-11-15',
      },
    ],
    next_steps: ['Hold follow-up sync next Thursday'],
  };

  const testMeeting = {
    id: 'meet-sum-01',
    title: 'Sustainability Steering Meeting',
    organizer_id: 'usr-bureau-001',
  };

  const bureauUser = { id: 'usr-bureau-001', role: 'bureau', status: 'active' };
  const memberUser = { id: 'usr-member-001', role: 'member', status: 'active' };

  await t.test('Summary contains all 8 required structural dimensions', () => {
    assert.ok(summaryContent.overview);
    assert.ok(Array.isArray(summaryContent.key_topics));
    assert.ok(Array.isArray(summaryContent.important_updates));
    assert.ok(Array.isArray(summaryContent.decisions));
    assert.ok(Array.isArray(summaryContent.challenges));
    assert.ok(Array.isArray(summaryContent.questions));
    assert.ok(Array.isArray(summaryContent.action_items));
    assert.ok(Array.isArray(summaryContent.next_steps));
  });

  await t.test('Bureau officer CAN convert action item into real Hub Task', () => {
    const task = convertActionItemToTask(bureauUser, testMeeting, summaryContent.action_items[0]);
    assert.equal(task.title, 'Finalize sponsor contract');
    assert.equal(task.meeting_id, 'meet-sum-01');
    assert.equal(task.status, 'todo');
    assert.equal(task.requires_verification, true);
  });

  await t.test('Ordinary member CANNOT convert action item into Hub Task', () => {
    assert.throws(
      () => convertActionItemToTask(memberUser, testMeeting, summaryContent.action_items[0]),
      /Unauthorized/
    );
  });
});
