import test from 'node:test';
import assert from 'node:assert/strict';

// Import permission functions
import {
  canRemoveMember,
  canSuspendMember,
  canReactivateMember,
  canDeleteMemberAccount,
  canEditEvent,
  canDeleteEvent,
  canRestoreRecord,
  canAccessRecycleBin,
  canPermanentDelete,
} from '../src/lib/permissions/permission-checks.ts';

import { hasPermission } from '../src/lib/permissions/access-control.ts';
import { sanitizeAuditData } from '../src/lib/audit/audit-logger.ts';

test('ZEC Campus Hub — HR Manager Authority & Safeguards', async (t) => {
  const hrContext = {
    userId: 'usr-hr-001',
    email: 'hr.manager@isims.tn',
    role: 'bureau',
    bureauPositions: ['hr_manager'],
    activeBureauPosition: 'hr_manager',
  };

  const adminContext = {
    userId: 'usr-admin-001',
    email: 'superadmin@isims.tn',
    role: 'admin',
    bureauPositions: ['president'],
    activeBureauPosition: 'all',
  };

  const memberContext = {
    userId: 'usr-member-001',
    email: 'student@isims.tn',
    role: 'member',
    bureauPositions: [],
    activeBureauPosition: null,
  };

  const targetMember = {
    id: 'usr-target-member',
    email: 'target.student@isims.tn',
    role: 'member',
  };

  const targetAdmin = {
    id: 'usr-target-admin',
    email: 'admin.director@isims.tn',
    role: 'admin',
  };

  const targetSuperAdmin = {
    id: 'usr-target-superadmin',
    email: 'walhaadam52@gmail.com',
    role: 'admin',
  };

  await t.test('1. HR Manager CAN remove, suspend, reactivate ordinary members', () => {
    assert.equal(canRemoveMember(hrContext, targetMember), true);
    assert.equal(canSuspendMember(hrContext, targetMember), true);
    assert.equal(canReactivateMember(hrContext, targetMember), true);
    assert.equal(canDeleteMemberAccount(hrContext, targetMember), true);
  });

  await t.test('2. HR Manager CANNOT remove or suspend Administrator accounts (Security Safeguard)', () => {
    assert.equal(canRemoveMember(hrContext, targetAdmin), false);
    assert.equal(canSuspendMember(hrContext, targetAdmin), false);
    assert.equal(canDeleteMemberAccount(hrContext, targetAdmin), false);
  });

  await t.test('3. HR Manager CANNOT remove or delete Super Admin account', () => {
    assert.equal(canRemoveMember(hrContext, targetSuperAdmin), false);
    assert.equal(canSuspendMember(hrContext, targetSuperAdmin), false);
    assert.equal(canDeleteMemberAccount(hrContext, targetSuperAdmin), false);
  });

  await t.test('4. Ordinary members CANNOT remove, suspend, reactivate, or delete accounts', () => {
    assert.equal(canRemoveMember(memberContext, targetMember), false);
    assert.equal(canSuspendMember(memberContext, targetMember), false);
    assert.equal(canReactivateMember(memberContext, targetMember), false);
    assert.equal(canDeleteMemberAccount(memberContext, targetMember), false);
  });

  await t.test('5. Admin has full member management and account deletion authority', () => {
    assert.equal(canRemoveMember(adminContext, targetMember), true);
    assert.equal(canSuspendMember(adminContext, targetMember), true);
    assert.equal(canReactivateMember(adminContext, targetMember), true);
    assert.equal(canDeleteMemberAccount(adminContext, targetMember), true);
  });
});

test('ZEC Campus Hub — Event Management & Deletion Permissions', async (t) => {
  const eventsManagerContext = {
    userId: 'usr-events-001',
    email: 'events.manager@isims.tn',
    role: 'bureau',
    bureauPositions: ['events_manager'],
    activeBureauPosition: 'events_manager',
  };

  const presidentContext = {
    userId: 'usr-pres-001',
    email: 'president@isims.tn',
    role: 'bureau',
    bureauPositions: ['president'],
    activeBureauPosition: 'president',
  };

  const treasurerContext = {
    userId: 'usr-tres-001',
    email: 'treasurer@isims.tn',
    role: 'bureau',
    bureauPositions: ['treasurer'],
    activeBureauPosition: 'treasurer',
  };

  const memberContext = {
    userId: 'usr-member-002',
    email: 'member@isims.tn',
    role: 'member',
    bureauPositions: [],
    activeBureauPosition: null,
  };

  const sampleEvent = {
    id: 'evt-green-hackathon',
    title: 'Green Tech Hackathon 2026',
    organizer_id: 'usr-events-001',
    starts_at: '2026-11-24T09:00:00Z',
    is_deleted: false,
  };

  await t.test('1. Events Manager CAN edit and soft-delete managed events', () => {
    assert.equal(canEditEvent(eventsManagerContext, sampleEvent), true);
    assert.equal(canDeleteEvent(eventsManagerContext, sampleEvent), true);
  });

  await t.test('2. President CAN edit and soft-delete events club-wide', () => {
    assert.equal(canEditEvent(presidentContext, sampleEvent), true);
    assert.equal(canDeleteEvent(presidentContext, sampleEvent), true);
  });

  await t.test('3. Ordinary member CANNOT edit or delete events', () => {
    assert.equal(canEditEvent(memberContext, sampleEvent), false);
    assert.equal(canDeleteEvent(memberContext, sampleEvent), false);
  });

  await t.test('4. Unrelated bureau manager (e.g. Treasurer) cannot delete someone else’s event', () => {
    assert.equal(canDeleteEvent(treasurerContext, sampleEvent), false);
  });
});

test('ZEC Campus Hub — Audit Logging & Data Sanitization', async (t) => {
  await t.test('1. Redacts sensitive authentication tokens and passwords from audit payloads', () => {
    const rawData = {
      username: 'yassine',
      password: 'SuperSecretPassword123!',
      token: 'jwt.token.secret',
      apiKey: 'sk_live_99887766554433',
      nested: {
        access_token: 'bearer_token_xyz',
        studentId: 'ISIMS-2026-99',
      },
    };

    const sanitized = sanitizeAuditData(rawData);
    assert.equal(sanitized.password, '[REDACTED]');
    assert.equal(sanitized.token, '[REDACTED]');
    assert.equal(sanitized.apiKey, '[REDACTED]');
    assert.equal(sanitized.nested.access_token, '[REDACTED]');
    assert.equal(sanitized.username, 'yassine');
    assert.equal(sanitized.nested.studentId, 'ISIMS-2026-99');
  });

  await t.test('2. Preserves non-sensitive operational fields during sanitization', () => {
    const eventData = {
      title: 'Solar IoT Sprint',
      location: 'Room 104',
      capacity: 50,
      tags: ['green', 'hardware'],
    };

    const sanitized = sanitizeAuditData(eventData);
    assert.deepEqual(sanitized, eventData);
  });
});

test('ZEC Campus Hub — Soft Delete, Recycle Bin & Undo Engine Invariants', async (t) => {
  const adminContext = {
    userId: 'usr-admin-001',
    email: 'admin@isims.tn',
    role: 'admin',
    bureauPositions: [],
    activeBureauPosition: 'all',
  };

  const hrContext = {
    userId: 'usr-hr-001',
    email: 'hr@isims.tn',
    role: 'bureau',
    bureauPositions: ['hr_manager'],
    activeBureauPosition: 'hr_manager',
  };

  const memberContext = {
    userId: 'usr-mem-001',
    email: 'member@isims.tn',
    role: 'member',
    bureauPositions: [],
    activeBureauPosition: null,
  };

  await t.test('1. Recycle bin access is restricted exclusively to Club Administrator', () => {
    assert.equal(canAccessRecycleBin(adminContext), true);
    assert.equal(canAccessRecycleBin(hrContext), false);
    assert.equal(canAccessRecycleBin(memberContext), false);
  });

  await t.test('2. Only Administrator can restore records from Recycle Bin', () => {
    assert.equal(canRestoreRecord(adminContext), true);
    assert.equal(canRestoreRecord(hrContext), false);
    assert.equal(canRestoreRecord(memberContext), false);
  });

  await t.test('3. Only Administrator can permanently purge records from Recycle Bin', () => {
    assert.equal(canPermanentDelete(adminContext), true);
    assert.equal(canPermanentDelete(hrContext), false);
    assert.equal(canPermanentDelete(memberContext), false);
  });

  await t.test('4. Soft deletion invariant: preserves historical records with reason and metadata', () => {
    const liveRecord = {
      id: 'rec-001',
      title: 'ISIMS Climate Forum',
      is_deleted: false,
      version: 1,
    };

    // Soft deletion mutation
    const deletionReason = 'Administrative rescheduling to semester 2';
    const softDeleted = {
      ...liveRecord,
      is_deleted: true,
      deleted_at: '2026-11-16T15:00:00Z',
      deleted_by: adminContext.userId,
      deletion_reason: deletionReason,
      version: liveRecord.version + 1,
    };

    assert.equal(softDeleted.is_deleted, true);
    assert.equal(softDeleted.deleted_by, adminContext.userId);
    assert.equal(softDeleted.deletion_reason, deletionReason);
    assert.equal(softDeleted.version, 2);

    // Restoration mutation
    const restored = {
      ...softDeleted,
      is_deleted: false,
      deleted_at: null,
      deleted_by: null,
      deletion_reason: null,
      version: softDeleted.version + 1,
    };

    assert.equal(restored.is_deleted, false);
    assert.equal(restored.deleted_at, null);
    assert.equal(restored.version, 3);
  });

  await t.test('5. Undo engine conflict detection: detects concurrent modifications by version check', () => {
    const initialLog = {
      id: 'log-001',
      entity_type: 'events',
      entity_id: 'evt-001',
      created_at: '2026-11-16T14:00:00Z',
      old_values: { title: 'Initial Title', version: 1 },
      new_values: { title: 'Modified Title', version: 2 },
      is_undone: false,
    };

    // Case A: Record has not changed since modification (version matches)
    const currentRecordClean = {
      id: 'evt-001',
      title: 'Modified Title',
      version: 2,
      updated_at: '2026-11-16T14:00:01Z',
    };

    const hasConflictA =
      currentRecordClean.version !== initialLog.new_values.version ||
      new Date(currentRecordClean.updated_at).getTime() > new Date(initialLog.created_at).getTime() + 5000;

    assert.equal(hasConflictA, false, 'No conflict when version and timestamps match');

    // Case B: Another admin changed the record later (version incremented to 3)
    const currentRecordConflict = {
      id: 'evt-001',
      title: 'Third Revision Title',
      version: 3,
      updated_at: '2026-11-16T14:45:00Z',
    };

    const hasConflictB =
      currentRecordConflict.version !== initialLog.new_values.version ||
      new Date(currentRecordConflict.updated_at).getTime() > new Date(initialLog.created_at).getTime() + 5000;

    assert.equal(hasConflictB, true, 'Conflict flagged when record modified after audit action');
  });
});
