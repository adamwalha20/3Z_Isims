import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  canAccessDepartment,
  canViewDepartment,
  canManageDepartment,
  canViewDepartmentDocument,
  canManageTask,
  canViewTask,
  canEditProject,
  canDeleteProject,
  canViewMeeting,
  canEditMeeting,
  canDeleteMeeting,
} from '../src/lib/permissions/index.ts';

describe('ZEC Campus Hub — Department Isolation & Boundary Enforcement', () => {
  // Department slugs:
  // - 'governance' (General Secretariat & Governance)
  // - 'comms-media' (Communications & Media)
  // - 'events-logistics' (Events & Logistics)
  // - 'training-innovation' (Training & Innovation)
  // - 'partnerships' (Partnerships & Sponsorships)

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

  const marketingLeadCtx = {
    userId: 'c0000000-0000-0000-0000-000000000007',
    email: 'marketing.test@zec-campus.tn',
    role: 'bureau',
    activeBureauPosition: 'marketing_design_manager',
    bureauPositions: ['marketing_design_manager'],
    departmentSlug: 'comms-media',
  };

  const eventsLeadCtx = {
    userId: 'c0000000-0000-0000-0000-000000000009',
    email: 'events.test@zec-campus.tn',
    role: 'bureau',
    activeBureauPosition: 'events_manager',
    bureauPositions: ['events_manager'],
    departmentSlug: 'events-logistics',
  };

  const trainingLeadCtx = {
    userId: 'c0000000-0000-0000-0000-000000000013',
    email: 'training.test@zec-campus.tn',
    role: 'bureau',
    activeBureauPosition: 'training_innovation',
    bureauPositions: ['training_innovation'],
    departmentSlug: 'training-innovation',
  };

  const partnershipsLeadCtx = {
    userId: 'c0000000-0000-0000-0000-000000000012',
    email: 'partnerships.test@zec-campus.tn',
    role: 'bureau',
    activeBureauPosition: 'partnerships_sponsorship_manager',
    bureauPositions: ['partnerships_sponsorship_manager'],
    departmentSlug: 'partnerships',
  };

  const ordinaryMemberCtx = {
    userId: 'c0000000-0000-0000-0000-000000000014',
    email: 'member.test@zec-campus.tn',
    role: 'member',
    bureauPositions: [],
    departmentSlug: 'training-innovation',
  };

  test('1. Department Boundary Access: Own Department vs Foreign Department', () => {
    // Marketing Lead can access Comms & Media
    assert.equal(canAccessDepartment(marketingLeadCtx, 'comms-media'), true);
    assert.equal(canViewDepartment(marketingLeadCtx, 'comms-media'), true);

    // Marketing Lead CANNOT access Training & Innovation or Partnerships
    assert.equal(canAccessDepartment(marketingLeadCtx, 'training-innovation'), false);
    assert.equal(canAccessDepartment(marketingLeadCtx, 'partnerships'), false);
    assert.equal(canViewDepartment(marketingLeadCtx, 'events-logistics'), false);

    // Training Lead can access Training & Innovation
    assert.equal(canAccessDepartment(trainingLeadCtx, 'training-innovation'), true);

    // Training Lead CANNOT access Comms or Partnerships
    assert.equal(canAccessDepartment(trainingLeadCtx, 'comms-media'), false);
    assert.equal(canAccessDepartment(trainingLeadCtx, 'partnerships'), false);

    // Partnerships Lead can access Partnerships
    assert.equal(canAccessDepartment(partnershipsLeadCtx, 'partnerships'), true);
    assert.equal(canAccessDepartment(partnershipsLeadCtx, 'events-logistics'), false);
  });

  test('2. Executive Board & Admin Oversight across All Departments', () => {
    // Admin has club-wide oversight
    assert.equal(canAccessDepartment(adminCtx, 'comms-media'), true);
    assert.equal(canAccessDepartment(adminCtx, 'training-innovation'), true);
    assert.equal(canAccessDepartment(adminCtx, 'events-logistics'), true);
    assert.equal(canAccessDepartment(adminCtx, 'partnerships'), true);

    // President has club-wide operational oversight
    assert.equal(canAccessDepartment(presidentCtx, 'comms-media'), true);
    assert.equal(canAccessDepartment(presidentCtx, 'training-innovation'), true);
    assert.equal(canAccessDepartment(presidentCtx, 'events-logistics'), true);
    assert.equal(canAccessDepartment(presidentCtx, 'partnerships'), true);

    assert.equal(canManageDepartment(presidentCtx, 'training-innovation'), true);
  });

  test('3. Cross-Department Task Management Isolation', () => {
    const trainingTask = {
      id: 'task-trn-001',
      title: 'Python AI Workshop Curriculum',
      department_slug: 'training-innovation',
      creator_id: trainingLeadCtx.userId,
    };

    const commsTask = {
      id: 'task-comms-001',
      title: 'Instagram Hackathon Campaign',
      department_slug: 'comms-media',
      creator_id: marketingLeadCtx.userId,
    };

    // Training Lead can manage Training task, but NOT Comms task
    assert.equal(canManageTask(trainingLeadCtx, trainingTask), true);
    assert.equal(canManageTask(trainingLeadCtx, commsTask), false);

    // Marketing Lead can manage Comms task, but NOT Training task
    assert.equal(canManageTask(marketingLeadCtx, commsTask), true);
    assert.equal(canManageTask(marketingLeadCtx, trainingTask), false);

    // Events Lead CANNOT manage Training task
    assert.equal(canManageTask(eventsLeadCtx, trainingTask), false);

    // Ordinary Member in Training can view Training task but CANNOT manage it
    assert.equal(canViewTask(ordinaryMemberCtx, trainingTask), true);
    assert.equal(canManageTask(ordinaryMemberCtx, trainingTask), false);
    assert.equal(canViewTask(ordinaryMemberCtx, commsTask), false);
  });

  test('4. Cross-Department Project Isolation', () => {
    const commsProject = {
      id: 'prj-comms-001',
      name: 'Zero Waste Media Sprint',
      department_slug: 'comms-media',
      owner_id: marketingLeadCtx.userId,
      created_by: marketingLeadCtx.userId,
    };

    const partnershipsProject = {
      id: 'prj-part-001',
      name: 'Corporate Green Tech Alliance',
      department_slug: 'partnerships',
      owner_id: partnershipsLeadCtx.userId,
      created_by: partnershipsLeadCtx.userId,
    };

    // Marketing Lead can edit Comms project, but CANNOT edit Partnerships project
    assert.equal(canEditProject(marketingLeadCtx, commsProject), true);
    assert.equal(canEditProject(marketingLeadCtx, partnershipsProject), false);

    // Partnerships Lead can edit Partnerships project, but CANNOT edit Comms project
    assert.equal(canEditProject(partnershipsLeadCtx, partnershipsProject), true);
    assert.equal(canEditProject(partnershipsLeadCtx, commsProject), false);

    // Non-owner, non-lead cannot delete project
    assert.equal(canDeleteProject(marketingLeadCtx, partnershipsProject), false);
    assert.equal(canDeleteProject(ordinaryMemberCtx, commsProject), false);
  });

  test('5. Confidential & Department-Restricted Documents', () => {
    const publicDoc = {
      id: 'doc-001',
      visibility: 'public',
      department_slug: 'governance',
    };

    const clubDoc = {
      id: 'doc-002',
      visibility: 'club',
      department_slug: 'training-innovation',
    };

    const confidentialCommsDoc = {
      id: 'doc-003',
      visibility: 'department',
      department_slug: 'comms-media',
    };

    // Public and club-wide docs are visible to all members
    assert.equal(canViewDepartmentDocument(ordinaryMemberCtx, publicDoc), true);
    assert.equal(canViewDepartmentDocument(ordinaryMemberCtx, clubDoc), true);

    // Department-restricted doc is visible ONLY to Comms members or Executive/Admin
    assert.equal(canViewDepartmentDocument(marketingLeadCtx, confidentialCommsDoc), true);
    assert.equal(canViewDepartmentDocument(adminCtx, confidentialCommsDoc), true);
    assert.equal(canViewDepartmentDocument(presidentCtx, confidentialCommsDoc), true);

    // Other departments and ordinary members are DENIED access
    assert.equal(canViewDepartmentDocument(trainingLeadCtx, confidentialCommsDoc), false);
    assert.equal(canViewDepartmentDocument(partnershipsLeadCtx, confidentialCommsDoc), false);
    assert.equal(canViewDepartmentDocument(ordinaryMemberCtx, confidentialCommsDoc), false);
  });

  test('6. Confidential Department Meetings Isolation', () => {
    const confidentialCommsMeeting = {
      id: 'mtg-comms-001',
      title: 'Private Comms Strategy',
      visibility: 'confidential',
      organizer_id: marketingLeadCtx.userId,
      created_by: marketingLeadCtx.userId,
      participant_ids: [marketingLeadCtx.userId],
    };

    // Organizer, Admin, and Executive can view
    assert.equal(canViewMeeting(marketingLeadCtx, confidentialCommsMeeting), true);
    assert.equal(canViewMeeting(adminCtx, confidentialCommsMeeting), true);
    assert.equal(canViewMeeting(presidentCtx, confidentialCommsMeeting), true);

    // Outside members cannot view confidential meeting
    assert.equal(canViewMeeting(ordinaryMemberCtx, confidentialCommsMeeting), false);
  });
});
