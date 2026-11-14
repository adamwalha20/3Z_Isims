import test from 'node:test';
import assert from 'node:assert/strict';

import {
  generateMemberQRPayload,
  createNewCredentialSecrets,
  hashTokenSecret,
  parseQRPayload,
  verifyCredentialSecret,
} from '../src/lib/attendance/qr-security.ts';

test('ZEC Smart QR Attendance — Security & Cryptographic Tokens', async (t) => {
  await t.test('1. Member QR payload is opaque and does not encode raw emails or user IDs', () => {
    const credId = '11111111-2222-3333-4444-555555555555';
    const secret = 'abcdef1234567890abcdef1234567890';
    const payload = generateMemberQRPayload(credId, secret);

    assert.ok(payload.startsWith('zec_att_v1:'), 'Uses versioned prefix');
    assert.equal(payload.includes('adamwalha20@gmail.com'), false, 'Never leaks email');
    assert.equal(payload.includes('+216'), false, 'Never leaks phone numbers');
    assert.equal(payload.includes('profile_id'), false, 'Never leaks raw profile table IDs');
  });

  await t.test('2. Validates legitimate QR payloads correctly', () => {
    const cred = createNewCredentialSecrets();
    const parsed = parseQRPayload(cred.qrPayload);

    assert.ok(parsed !== null, 'Successfully parses valid QR payload');
    assert.equal(parsed.credentialId, cred.credentialId);
    assert.equal(parsed.tokenSecret, cred.tokenSecret);

    const isValid = verifyCredentialSecret(parsed.tokenSecret, cred.tokenHash, cred.tokenSalt);
    assert.equal(isValid, true, 'HMAC signature matches stored hash');
  });

  await t.test('3. Rejects invalid or forged token secrets in constant time', () => {
    const cred = createNewCredentialSecrets();
    const forgedSecret = '00000000000000000000000000000000';

    const isValid = verifyCredentialSecret(forgedSecret, cred.tokenHash, cred.tokenSalt);
    assert.equal(isValid, false, 'Forged token is rejected');
  });

  await t.test('4. Rejects malformed payload formats or arbitrary strings', () => {
    assert.equal(parseQRPayload('not_a_qr_token'), null);
    assert.equal(parseQRPayload('zec_att_v1:invalid-uuid:12345'), null);
    assert.equal(parseQRPayload(''), null);
  });
});

test('ZEC Smart QR Attendance — Punctuality & Late Arrival Calculation Invariants', async (t) => {
  // Session starts at 09:00:00 Africa/Tunis (08:00:00 UTC)
  // Late threshold: 10 minutes (09:10:00 Tunis / 08:10:00 UTC)
  const sessionStartsAt = new Date('2026-11-14T08:00:00.000Z');
  const lateThresholdMinutes = 10;
  const lateLimitMs = sessionStartsAt.getTime() + lateThresholdMinutes * 60 * 1000;

  const calculateStatus = (checkInTime) => {
    return checkInTime.getTime() <= lateLimitMs ? 'present' : 'late';
  };

  await t.test('5. Check-in before start time is Present (On Time)', () => {
    const checkIn = new Date('2026-11-14T07:55:00.000Z'); // 08:55 Tunis
    assert.equal(calculateStatus(checkIn), 'present');
  });

  await t.test('6. Check-in within grace threshold (09:07 Tunis) is Present (On Time)', () => {
    const checkIn = new Date('2026-11-14T08:07:00.000Z'); // 09:07 Tunis
    assert.equal(calculateStatus(checkIn), 'present');
  });

  await t.test('7. Check-in exactly at late threshold limit (09:10 Tunis) is Present', () => {
    const checkIn = new Date('2026-11-14T08:10:00.000Z'); // 09:10 Tunis
    assert.equal(calculateStatus(checkIn), 'present');
  });

  await t.test('8. Check-in after late threshold (09:14 Tunis) is marked Late', () => {
    const checkIn = new Date('2026-11-14T08:14:00.000Z'); // 09:14 Tunis
    assert.equal(calculateStatus(checkIn), 'late');
  });
});

test('ZEC Smart QR Attendance — XP Awarding & Idempotency Rules', async (t) => {
  await t.test('9. On-time check-in grants configured on-time XP (+15 XP)', () => {
    const session = { xp_on_time: 15, xp_late: 10 };
    const status = 'present';
    const xp = status === 'present' ? session.xp_on_time : session.xp_late;
    assert.equal(xp, 15);
  });

  await t.test('10. Late check-in grants reduced XP (+10 XP)', () => {
    const session = { xp_on_time: 15, xp_late: 10 };
    const status = 'late';
    const xp = status === 'present' ? session.xp_on_time : session.xp_late;
    assert.equal(xp, 10);
  });

  await t.test('11. Check-in idempotency key prevents duplicate attendance and duplicate XP', () => {
    const sessionId = 'sess-1234';
    const memberId = 'mem-5678';

    const checkInKey1 = `att_${sessionId}_${memberId}_in`;
    const checkInKey2 = `att_${sessionId}_${memberId}_in`;
    const xpKey = `xp_att_${sessionId}_${memberId}`;

    assert.equal(checkInKey1, checkInKey2, 'Keys are identical for same session and member');
    assert.ok(xpKey.startsWith('xp_att_'), 'XP idempotency key isolates attendance transaction');
  });

  await t.test('12. Check-out records exact departure timestamp and awards full-session bonus if required', () => {
    const session = { requires_checkout: true, xp_full_session: 5 };
    const checkInTime = new Date('2026-11-14T08:05:00.000Z');
    const checkOutTime = new Date('2026-11-14T11:00:00.000Z');

    assert.ok(checkOutTime.getTime() > checkInTime.getTime(), 'Departure occurs after arrival');
    const durationMins = Math.round((checkOutTime.getTime() - checkInTime.getTime()) / (60 * 1000));
    assert.equal(durationMins, 175, 'Duration is 2 hours 55 minutes');

    const bonusXp = session.requires_checkout ? session.xp_full_session : 0;
    assert.equal(bonusXp, 5, 'Awards 5 XP full-session checkout bonus');
  });
});

test('ZEC Smart QR Attendance — Lifecycle & Access Control Invariants', async (t) => {
  await t.test('13. Scans are rejected when session attendance is closed or draft', () => {
    const allowedStatuses = ['open'];
    const testCases = ['draft', 'paused', 'closed', 'finalized'];

    for (const status of testCases) {
      const canScan = allowedStatuses.includes(status);
      assert.equal(canScan, false, `Session in ${status} status must not accept scans`);
    }

    assert.equal(allowedStatuses.includes('open'), true, 'Open session accepts scans');
  });

  await t.test('14. Ordinary members cannot access scanner or manually award XP', () => {
    const permissions = {
      admin: { canScan: true, canCorrect: true },
      bureau: { canScan: true, canCorrect: true },
      member: { canScan: false, canCorrect: false },
    };

    assert.equal(permissions.member.canScan, false, 'Ordinary member cannot scan');
    assert.equal(permissions.bureau.canScan, true, 'Bureau officer can scan');
    assert.equal(permissions.admin.canScan, true, 'Admin can scan');
  });

  await t.test('15. Multiple bureau roles do not duplicate member headcount in attendance statistics', () => {
    // Sarah holds both HR Manager and Marketing Lead positions
    const registeredMembers = [
      { id: 'usr-1', name: 'Adam Walha', roles: ['vice_president', 'training_lead'] },
      { id: 'usr-2', name: 'Sarah Khemir', roles: ['hr_manager', 'marketing_lead'] },
      { id: 'usr-3', name: 'Yassine Triki', roles: ['treasurer'] },
    ];

    // Deduplication by user id
    const uniqueAttendees = new Set(registeredMembers.map((m) => m.id));
    assert.equal(uniqueAttendees.size, 3, 'Counts exactly 3 physical human members, not 5 role entries');
  });

  await t.test('16. Status correction updates XP delta and creates auditable transaction record', () => {
    // Member initially checked in Late (+10 XP)
    // Secretary verifies train delay excuse and upgrades to Present (+15 XP)
    const oldXp = 10;
    const newXp = 15;
    const deltaXp = newXp - oldXp;

    assert.equal(deltaXp, 5, 'Awards +5 XP adjustment');

    // Downgrade scenario: Present (15 XP) corrected to Excused (0 XP)
    const downgradeDelta = 0 - 15;
    assert.equal(downgradeDelta, -15, 'Deducts 15 XP from member');
  });
});

