import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  hasPermission,
  canAccessDepartment,
  canManageDepartment,
  canAccessPage,
  canAccessRoute,
  canAccessAdminPanel,
  canManageTask,
  canVerifyTask,
  canViewTask,
  canViewEvent,
  canManageEvent,
  canEditEvent,
  canDeleteEvent,
  canViewMeeting,
  canEditMeeting,
  canDeleteMeeting,
  canEditProject,
  canDeleteProject,
  canViewFinancialData,
  canManageFinances,
  canManageHR,
  canManagePartnerships,
  canAccessAttendanceScanner,
  canRemoveMember,
  canSuspendMember,
  canReactivateMember,
  canDeleteMemberAccount,
  canAssignRoles,
  canUndoAuditLog,
  canAccessRecycleBin,
  canRestoreRecord,
  canPermanentDelete,
} from '../src/lib/permissions/index.ts';

describe('ZEC Campus Hub — Full 14-Role RBAC Permission Matrix', () => {
  // 14 Role Contexts matching our test environment
  const adminCtx = {
    userId: 'c0000000-0000-0000-0000-000000000001',
    email: 'admin.test@zec-campus.tn',
    role: 'admin',
    departmentSlug: 'governance',
  };

  const presidentCtx = {
    userId: 'c0000000-0000-0000-0000-000000000002',
    email: 'president.test@zec-campus.tn',
    role: 'bureau',
    activeBureauPosition: 'president',
    bureauPositions: ['president'],
    departmentSlug: 'governance',
  };

  const vpCtx = {
    userId: 'c0000000-0000-0000-0000-000000000003',
    email: 'vp.test@zec-campus.tn',
    role: 'bureau',
    activeBureauPosition: 'vice_president',
    bureauPositions: ['vice_president'],
    departmentSlug: 'governance',
  };

  const secretaryCtx = {
    userId: 'c0000000-0000-0000-0000-000000000004',
    email: 'secretary.test@zec-campus.tn',
    role: 'bureau',
    activeBureauPosition: 'secretary_general',
    bureauPositions: ['secretary_general'],
    departmentSlug: 'governance',
  };

  const treasurerCtx = {
    userId: 'c0000000-0000-0000-0000-000000000005',
    email: 'treasurer.test@zec-campus.tn',
    role: 'bureau',
    activeBureauPosition: 'treasurer',
    bureauPositions: ['treasurer'],
    departmentSlug: 'governance',
  };

  const hrCtx = {
    userId: 'c0000000-0000-0000-0000-000000000006',
    email: 'hr.test@zec-campus.tn',
    role: 'bureau',
    activeBureauPosition: 'hr_manager',
    bureauPositions: ['hr_manager'],
    departmentSlug: 'governance',
  };

  const marketingCtx = {
    userId: 'c0000000-0000-0000-0000-000000000007',
    email: 'marketing.test@zec-campus.tn',
    role: 'bureau',
    activeBureauPosition: 'marketing_design_manager',
    bureauPositions: ['marketing_design_manager'],
    departmentSlug: 'comms-media',
  };

  const commsCtx = {
    userId: 'c0000000-0000-0000-0000-000000000008',
    email: 'comms.test@zec-campus.tn',
    role: 'bureau',
    activeBureauPosition: 'communication_engagement_manager',
    bureauPositions: ['communication_engagement_manager'],
    departmentSlug: 'comms-media',
  };

  const eventsCtx = {
    userId: 'c0000000-0000-0000-0000-000000000009',
    email: 'events.test@zec-campus.tn',
    role: 'bureau',
    activeBureauPosition: 'events_manager',
    bureauPositions: ['events_manager'],
    departmentSlug: 'events-logistics',
  };

  const projectsCtx = {
    userId: 'c0000000-0000-0000-0000-000000000010',
    email: 'projects.test@zec-campus.tn',
    role: 'bureau',
    activeBureauPosition: 'project_manager',
    bureauPositions: ['project_manager'],
    departmentSlug: 'events-logistics',
  };

  const sustainabilityCtx = {
    userId: 'c0000000-0000-0000-0000-000000000011',
    email: 'sustainability.test@zec-campus.tn',
    role: 'bureau',
    activeBureauPosition: 'sustainable_campus_manager',
    bureauPositions: ['sustainable_campus_manager'],
    departmentSlug: 'training-innovation',
  };

  const partnershipsCtx = {
    userId: 'c0000000-0000-0000-0000-000000000012',
    email: 'partnerships.test@zec-campus.tn',
    role: 'bureau',
    activeBureauPosition: 'partnerships_sponsorship_manager',
    bureauPositions: ['partnerships_sponsorship_manager'],
    departmentSlug: 'partnerships',
  };

  const trainingCtx = {
    userId: 'c0000000-0000-0000-0000-000000000013',
    email: 'training.test@zec-campus.tn',
    role: 'bureau',
    activeBureauPosition: 'training_innovation',
    bureauPositions: ['training_innovation'],
    departmentSlug: 'training-innovation',
  };

  const memberCtx = {
    userId: 'c0000000-0000-0000-0000-000000000014',
    email: 'member.test@zec-campus.tn',
    role: 'member',
    bureauPositions: [],
    departmentSlug: 'training-innovation',
  };

  test('1. System Administration & High-Privilege Isolation', () => {
    // Only Admin can access Admin Portal and Settings
    assert.equal(canAccessAdminPanel(adminCtx), true);
    assert.equal(canAccessAdminPanel(presidentCtx), false);
    assert.equal(canAccessAdminPanel(vpCtx), false);
    assert.equal(canAccessAdminPanel(memberCtx), false);

    assert.equal(hasPermission(adminCtx, 'system:manage_settings'), true);
    assert.equal(hasPermission(presidentCtx, 'system:manage_settings'), false);
    assert.equal(hasPermission(secretaryCtx, 'system:manage_settings'), false);
    assert.equal(hasPermission(memberCtx, 'system:manage_settings'), false);

    // Only Admin can access Recycle Bin, Restore, and Permanent Purge
    assert.equal(canAccessRecycleBin(adminCtx), true);
    assert.equal(canAccessRecycleBin(presidentCtx), false);
    assert.equal(canRestoreRecord(adminCtx), true);
    assert.equal(canRestoreRecord(presidentCtx), false);
    assert.equal(canPermanentDelete(adminCtx), true);
    assert.equal(canPermanentDelete(presidentCtx), false);

    // Only Admin can execute Undo Rollback
    assert.equal(canUndoAuditLog(adminCtx), true);
    assert.equal(canUndoAuditLog(presidentCtx), false);
    assert.equal(canUndoAuditLog(secretaryCtx), false);
  });

  test('2. Member Management, HR Authority & Safeguards', () => {
    const ordinaryTarget = { id: 'usr-target-001', role: 'member', email: 'student@zec-campus.tn' };
    const adminTarget = { id: 'c0000000-0000-0000-0000-000000000001', role: 'admin', email: 'admin.test@zec-campus.tn' };

    // HR and Executive Board can manage ordinary members
    assert.equal(canRemoveMember(hrCtx, ordinaryTarget), true);
    assert.equal(canSuspendMember(hrCtx, ordinaryTarget), true);
    assert.equal(canReactivateMember(hrCtx, ordinaryTarget), true);
    assert.equal(canDeleteMemberAccount(hrCtx, ordinaryTarget), true);

    assert.equal(canRemoveMember(presidentCtx, ordinaryTarget), true);
    assert.equal(canRemoveMember(secretaryCtx, ordinaryTarget), true);

    // Non-HR managers cannot remove members
    assert.equal(canRemoveMember(marketingCtx, ordinaryTarget), false);
    assert.equal(canRemoveMember(trainingCtx, ordinaryTarget), false);
    assert.equal(canRemoveMember(memberCtx, ordinaryTarget), false);

    // Safeguard: HR CANNOT remove or suspend Administrator accounts
    assert.equal(canRemoveMember(hrCtx, adminTarget), false);
    assert.equal(canSuspendMember(hrCtx, adminTarget), false);
    assert.equal(canDeleteMemberAccount(hrCtx, adminTarget), false);
  });

  test('3. Attendance Scanner Permissions', () => {
    // Authorized: Secretary General, President, VP, Admin
    assert.equal(canAccessAttendanceScanner(adminCtx), true);
    assert.equal(canAccessAttendanceScanner(presidentCtx), true);
    assert.equal(canAccessAttendanceScanner(vpCtx), true);
    assert.equal(canAccessAttendanceScanner(secretaryCtx), true);

    // Denied: Treasurer, HR, Marketing, Events, Projects, Sustainability, Partnerships, Training, Member
    assert.equal(canAccessAttendanceScanner(treasurerCtx), false);
    assert.equal(canAccessAttendanceScanner(hrCtx), false);
    assert.equal(canAccessAttendanceScanner(marketingCtx), false);
    assert.equal(canAccessAttendanceScanner(eventsCtx), false);
    assert.equal(canAccessAttendanceScanner(projectsCtx), false);
    assert.equal(canAccessAttendanceScanner(sustainabilityCtx), false);
    assert.equal(canAccessAttendanceScanner(partnershipsCtx), false);
    assert.equal(canAccessAttendanceScanner(trainingCtx), false);
    assert.equal(canAccessAttendanceScanner(memberCtx), false);
  });

  test('4. Financial Management & Ledger Access', () => {
    // Ledger: Treasurer, President, VP, Admin
    assert.equal(canViewFinancialData(treasurerCtx, true), true);
    assert.equal(canViewFinancialData(presidentCtx, true), true);
    assert.equal(canViewFinancialData(vpCtx, true), true);
    assert.equal(canViewFinancialData(adminCtx, true), true);

    // Denied Ledger: Marketing, Events, Training, Member
    assert.equal(canViewFinancialData(marketingCtx, true), false);
    assert.equal(canViewFinancialData(eventsCtx, true), false);
    assert.equal(canViewFinancialData(trainingCtx, true), false);
    assert.equal(canViewFinancialData(memberCtx, true), false);

    // Disbursal & Approvals: Strictly Treasurer or Admin
    assert.equal(canManageFinances(treasurerCtx), true);
    assert.equal(canManageFinances(adminCtx), true);
    assert.equal(canManageFinances(presidentCtx), false);
    assert.equal(canManageFinances(secretaryCtx), false);
    assert.equal(canManageFinances(memberCtx), false);
  });

  test('5. Task Creation & Verification Invariants', () => {
    const trainingTask = {
      id: 'task-trn-01',
      department_slug: 'training-innovation',
      assigned_user_id: memberCtx.userId,
      creator_id: trainingCtx.userId,
    };

    // Bureau officers can create tasks in their scope
    assert.equal(canManageTask(trainingCtx, trainingTask), true);
    assert.equal(canManageTask(adminCtx, trainingTask), true);

    // Ordinary member CANNOT create tasks
    assert.equal(canManageTask(memberCtx, trainingTask), false);

    // Conflict of interest: Assignee cannot verify their own task
    assert.equal(canVerifyTask(memberCtx, trainingTask), false);

    // Authorized officer can verify task
    assert.equal(canVerifyTask(trainingCtx, trainingTask), true);
    assert.equal(canVerifyTask(adminCtx, trainingTask), true);
  });

  test('6. Event Management & Deletion Authorization', () => {
    const eventLogistics = {
      id: 'evt-01',
      organizer_id: eventsCtx.userId,
      department_id: 'b63e6baf-df40-4599-b917-e6527ba69814',
    };

    // Events Manager and Admin can manage and delete
    assert.equal(canManageEvent(eventsCtx, eventLogistics), true);
    assert.equal(canDeleteEvent(eventsCtx, eventLogistics), true);
    assert.equal(canDeleteEvent(adminCtx, eventLogistics), true);
    assert.equal(canDeleteEvent(presidentCtx, eventLogistics), true);

    // Ordinary member cannot edit or delete
    assert.equal(canManageEvent(memberCtx, eventLogistics), false);
    assert.equal(canDeleteEvent(memberCtx, eventLogistics), false);
  });

  test('7. Project Management Authorization', () => {
    const greenProject = {
      id: 'prj-01',
      owner_id: sustainabilityCtx.userId,
      department_slug: 'training-innovation',
    };

    assert.equal(canEditProject(sustainabilityCtx, greenProject), true);
    assert.equal(canEditProject(projectsCtx, greenProject), true);
    assert.equal(canEditProject(adminCtx, greenProject), true);
    assert.equal(canEditProject(memberCtx, greenProject), false);
  });

  test('8. Route-Level Guards & Middleware Authorization', () => {
    // Admin routes
    assert.equal(canAccessRoute(adminCtx, '/admin').allowed, true);
    assert.equal(canAccessRoute(presidentCtx, '/admin').allowed, false);
    assert.equal(canAccessRoute(memberCtx, '/admin').allowed, false);

    // Audit logs: accessible to Admin, HR, Secretary General
    assert.equal(canAccessRoute(adminCtx, '/admin/audit-logs').allowed, true);
    assert.equal(canAccessRoute(hrCtx, '/admin/audit-logs').allowed, true);
    assert.equal(canAccessRoute(secretaryCtx, '/admin/audit-logs').allowed, true);
    assert.equal(canAccessRoute(marketingCtx, '/admin/audit-logs').allowed, false);
    assert.equal(canAccessRoute(memberCtx, '/admin/audit-logs').allowed, false);

    // Scanner route
    assert.equal(canAccessRoute(secretaryCtx, '/attendance/scanner').allowed, true);
    assert.equal(canAccessRoute(treasurerCtx, '/attendance/scanner').allowed, false);
    assert.equal(canAccessRoute(memberCtx, '/attendance/scanner').allowed, false);
  });
});
