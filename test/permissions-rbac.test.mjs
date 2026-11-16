import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  hasPermission,
  canAccessDepartment,
  canManageDepartment,
  canAccessPage,
  canManageTask,
  canVerifyTask,
  canViewFinancialData,
  canManageFinances,
  canManageHR,
  canManagePartnerships,
  canAccessAttendanceScanner,
  canUndoAuditLog,
} from '../src/lib/permissions/index.ts';

describe('ZEC Campus Hub — Centralized RBAC Permission Architecture', () => {
  // Test Contexts
  const adminCtx = {
    userId: 'usr-admin-001',
    email: 'adamwalha20@gmail.com',
    role: 'admin',
  };

  const presidentCtx = {
    userId: 'usr-pres-001',
    email: 'president@isims.tn',
    role: 'bureau',
    activeBureauPosition: 'president',
    bureauPositions: ['president'],
  };

  const vpCtx = {
    userId: 'usr-vp-001',
    email: 'vp@isims.tn',
    role: 'bureau',
    activeBureauPosition: 'vice_president',
    bureauPositions: ['vice_president'],
  };

  const secretaryGeneralCtx = {
    userId: 'usr-sec-001',
    email: 'secretary@isims.tn',
    role: 'bureau',
    activeBureauPosition: 'secretary_general',
    bureauPositions: ['secretary_general'],
  };

  const treasurerCtx = {
    userId: 'usr-treas-001',
    email: 'treasurer@isims.tn',
    role: 'bureau',
    activeBureauPosition: 'treasurer',
    bureauPositions: ['treasurer'],
  };

  const hrManagerCtx = {
    userId: 'usr-hr-001',
    email: 'hr@isims.tn',
    role: 'bureau',
    activeBureauPosition: 'hr_manager',
    bureauPositions: ['hr_manager'],
  };

  const trainingLeadCtx = {
    userId: 'usr-train-001',
    email: 'training@isims.tn',
    role: 'bureau',
    activeBureauPosition: 'training_innovation',
    bureauPositions: ['training_innovation'],
    departmentSlug: 'training-innovation',
  };

  const eventsLeadCtx = {
    userId: 'usr-events-001',
    email: 'events@isims.tn',
    role: 'bureau',
    activeBureauPosition: 'events_manager',
    bureauPositions: ['events_manager'],
    departmentSlug: 'events-logistics',
  };

  const ordinaryMemberCtx = {
    userId: 'usr-member-001',
    email: 'student@isims.tn',
    role: 'member',
    bureauPositions: [],
  };

  test('1. Administrator has universal administrative access', () => {
    assert.equal(hasPermission(adminCtx, 'members:manage'), true);
    assert.equal(hasPermission(adminCtx, 'departments:manage_all'), true);
    assert.equal(hasPermission(adminCtx, 'finance:disburse'), true);
    assert.equal(hasPermission(adminCtx, 'audit:undo'), true);
    assert.equal(canAccessPage(adminCtx, '/admin').allowed, true);
    assert.equal(canAccessAttendanceScanner(adminCtx), true);
  });

  test('2. President has executive oversight but cannot disburse finances alone or undo audit logs', () => {
    assert.equal(hasPermission(presidentCtx, 'members:manage'), true);
    assert.equal(hasPermission(presidentCtx, 'departments:manage_all'), true);
    assert.equal(canAccessAttendanceScanner(presidentCtx), true);
    assert.equal(canViewFinancialData(presidentCtx, true), true); // Can review ledger
    assert.equal(canManageFinances(presidentCtx), false); // Only Treasurer/Admin can disburse
    assert.equal(canUndoAuditLog(presidentCtx), false); // Exclusive to Admin
  });

  test('3. Secretary General has operational access (attendance scanner, tasks, meetings)', () => {
    assert.equal(canAccessAttendanceScanner(secretaryGeneralCtx), true);
    assert.equal(hasPermission(secretaryGeneralCtx, 'attendance:manage_sessions'), true);
    assert.equal(hasPermission(secretaryGeneralCtx, 'tasks:create'), true);
    assert.equal(canManageFinances(secretaryGeneralCtx), false);
    assert.equal(canManageHR(secretaryGeneralCtx), false);
  });

  test('4. Treasurer has exclusive authority over financial disbursements and ledger management', () => {
    assert.equal(canManageFinances(treasurerCtx), true);
    assert.equal(canViewFinancialData(treasurerCtx, true), true);
    assert.equal(canAccessAttendanceScanner(treasurerCtx), false); // Treasurer cannot operate scanner
    assert.equal(canManageHR(treasurerCtx), false); // Treasurer cannot manage recruitment
  });

  test('5. HR Manager has authority over recruitment applications and pipeline', () => {
    assert.equal(canManageHR(hrManagerCtx), true);
    assert.equal(canManageFinances(hrManagerCtx), false);
    assert.equal(canAccessAttendanceScanner(hrManagerCtx), false);
  });

  test('6. Department Isolation: Training Lead cannot manage or access private tools of Events department', () => {
    assert.equal(canAccessDepartment(trainingLeadCtx, 'training-innovation'), true);
    assert.equal(canManageDepartment(trainingLeadCtx, 'training-innovation'), true);
    assert.equal(canAccessDepartment(trainingLeadCtx, 'events-logistics'), false);
    assert.equal(canManageDepartment(trainingLeadCtx, 'events-logistics'), false);
  });

  test('7. Department Isolation: Events Lead cannot manage Training department', () => {
    assert.equal(canAccessDepartment(eventsLeadCtx, 'events-logistics'), true);
    assert.equal(canManageDepartment(eventsLeadCtx, 'events-logistics'), true);
    assert.equal(canAccessDepartment(eventsLeadCtx, 'training-innovation'), false);
    assert.equal(canManageDepartment(eventsLeadCtx, 'training-innovation'), false);
  });

  test('8. Ordinary Member has strictly limited read and assigned task verification access', () => {
    assert.equal(canAccessPage(ordinaryMemberCtx, '/admin').allowed, false);
    assert.equal(canAccessPage(ordinaryMemberCtx, '/attendance/scanner').allowed, false);
    assert.equal(canManageTask(ordinaryMemberCtx), false);
    assert.equal(canManageFinances(ordinaryMemberCtx), false);
    assert.equal(canManageHR(ordinaryMemberCtx), false);
    assert.equal(hasPermission(ordinaryMemberCtx, 'tasks:submit_verification'), true);
    assert.equal(hasPermission(ordinaryMemberCtx, 'attendance:view_own'), true);
  });

  test('9. Conflict of Interest: Assignee cannot verify or approve their own task', () => {
    const ownTask = {
      id: 'tsk-001',
      title: 'Solar Panel Layout CAD Draft',
      assigned_user_id: 'usr-train-001',
    };
    const otherTask = {
      id: 'tsk-002',
      title: 'Post Workshop Clean-Up Logistics',
      assigned_user_id: 'usr-member-001',
    };

    // Training lead cannot verify their own task
    assert.equal(canVerifyTask(trainingLeadCtx, ownTask), false);
    // Training lead CAN verify an assigned member's task
    assert.equal(canVerifyTask(trainingLeadCtx, otherTask), true);
  });
});
