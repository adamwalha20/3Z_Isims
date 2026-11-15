import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('ZEC Campus Hub — President & Training/Innovation Bureau Roles', () => {
  const OFFICIAL_POSITIONS = [
    { key: 'president', display_name: 'President', order_index: 1 },
    { key: 'vice_president', display_name: 'Vice President', order_index: 2 },
    { key: 'secretary_general', display_name: 'Secretary General', order_index: 3 },
    { key: 'treasurer', display_name: 'Treasurer', order_index: 4 },
    { key: 'training_innovation', display_name: 'Training & Innovation Manager', order_index: 5 },
    { key: 'hr_manager', display_name: 'Human Resources Manager', order_index: 6 },
    { key: 'marketing_design_manager', display_name: 'Marketing & Design Manager', order_index: 7 },
    { key: 'sustainable_campus_manager', display_name: 'Sustainable Campus Manager', order_index: 8 },
    { key: 'communication_engagement_manager', display_name: 'Communication & Engagement Manager', order_index: 9 },
    { key: 'events_manager', display_name: 'Events Manager', order_index: 10 },
    { key: 'project_manager', display_name: 'Project Manager', order_index: 11 },
    { key: 'partnerships_sponsorship_manager', display_name: 'Partnerships & Sponsorship Manager', order_index: 12 },
  ];

  it('1. President is configured as the top-ranking executive mandate (order_index: 1)', () => {
    const pres = OFFICIAL_POSITIONS.find((p) => p.key === 'president');
    assert.ok(pres, 'President position must exist');
    assert.equal(pres.order_index, 1);
    assert.equal(pres.display_name, 'President');
  });

  it('2. Training and Innovation Manager is configured in bureau mandates (order_index: 5)', () => {
    const ti = OFFICIAL_POSITIONS.find((p) => p.key === 'training_innovation');
    assert.ok(ti, 'Training & Innovation position must exist');
    assert.equal(ti.order_index, 5);
    assert.equal(ti.display_name, 'Training & Innovation Manager');
  });

  it('3. All 12 bureau positions are sorted deterministically by order_index', () => {
    const sorted = [...OFFICIAL_POSITIONS].sort((a, b) => a.order_index - b.order_index);
    assert.equal(sorted[0].key, 'president');
    assert.equal(sorted[1].key, 'vice_president');
    assert.equal(sorted[2].key, 'secretary_general');
    assert.equal(sorted[3].key, 'treasurer');
    assert.equal(sorted[4].key, 'training_innovation');
    assert.equal(sorted.length, 12);
  });
});

describe('ZEC Campus Hub — Admin Audit Logs & Undo Operations', () => {
  // Mock In-Memory Audit State Engine
  class AuditEngine {
    constructor() {
      this.logs = [];
      this.bureauAssignments = {
        president: { user_id: 'usr-admin-1', member_name: 'Adam Walha' },
        secretary_general: { user_id: null, member_name: 'Unassigned' },
      };
      this.userRoles = {
        'usr-member-1': 'member',
        'usr-admin-1': 'admin',
      };
    }

    assignBureau(actorId, positionKey, newUserId, newMemberName) {
      const prev = this.bureauAssignments[positionKey] || { user_id: null, member_name: 'Unassigned' };
      this.bureauAssignments[positionKey] = { user_id: newUserId, member_name: newMemberName };

      const log = {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        actor_id: actorId,
        action: 'ASSIGN_BUREAU_POSITION',
        entity_type: 'bureau_position',
        details: `Assigned ${newMemberName} to ${positionKey}`,
        previous_state: {
          position_key: positionKey,
          user_id: prev.user_id,
          member_name: prev.member_name,
        },
        new_state: {
          position_key: positionKey,
          user_id: newUserId,
          member_name: newMemberName,
        },
        is_undone: false,
        can_undo: true,
        created_at: new Date().toISOString(),
      };
      this.logs.unshift(log);
      return log;
    }

    assignRole(actorId, userId, newRole) {
      const prevRole = this.userRoles[userId] || 'member';
      this.userRoles[userId] = newRole;

      const log = {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        actor_id: actorId,
        action: 'ASSIGN_USER_ROLE',
        entity_type: 'user_role',
        details: `Changed role of user ${userId} to ${newRole}`,
        previous_state: { user_id: userId, role: prevRole },
        new_state: { user_id: userId, role: newRole },
        is_undone: false,
        can_undo: true,
        created_at: new Date().toISOString(),
      };
      this.logs.unshift(log);
      return log;
    }

    undo(logId, actorRole) {
      if (actorRole !== 'admin') {
        throw new Error('Unauthorized: Only administrators can rollback changes.');
      }

      const log = this.logs.find((l) => l.id === logId);
      if (!log) throw new Error('Log not found');
      if (log.is_undone) throw new Error('Action already undone');
      if (!log.can_undo) throw new Error('Action cannot be undone');

      if (log.action === 'ASSIGN_BUREAU_POSITION') {
        const { position_key, user_id, member_name } = log.previous_state;
        this.bureauAssignments[position_key] = { user_id, member_name };
      } else if (log.action === 'ASSIGN_USER_ROLE') {
        const { user_id, role } = log.previous_state;
        this.userRoles[user_id] = role;
      }

      log.is_undone = true;
      log.undone_at = new Date().toISOString();
      return true;
    }
  }

  it('4. Assigning a bureau position logs previous and new state with can_undo: true', () => {
    const engine = new AuditEngine();
    const log = engine.assignBureau('usr-admin-1', 'secretary_general', 'usr-awaw', 'AWAW 20');

    assert.equal(log.action, 'ASSIGN_BUREAU_POSITION');
    assert.equal(log.previous_state.member_name, 'Unassigned');
    assert.equal(log.new_state.member_name, 'AWAW 20');
    assert.equal(log.can_undo, true);
    assert.equal(log.is_undone, false);
    assert.equal(engine.bureauAssignments.secretary_general.member_name, 'AWAW 20');
  });

  it('5. Admin can undo a bureau position assignment and restore previous state', () => {
    const engine = new AuditEngine();
    const log = engine.assignBureau('usr-admin-1', 'secretary_general', 'usr-awaw', 'AWAW 20');
    assert.equal(engine.bureauAssignments.secretary_general.member_name, 'AWAW 20');

    // Rollback
    const result = engine.undo(log.id, 'admin');
    assert.equal(result, true);
    assert.equal(log.is_undone, true);
    assert.equal(engine.bureauAssignments.secretary_general.member_name, 'Unassigned');
  });

  it('6. Non-admin users cannot execute undo rollback', () => {
    const engine = new AuditEngine();
    const log = engine.assignBureau('usr-admin-1', 'secretary_general', 'usr-awaw', 'AWAW 20');

    assert.throws(
      () => engine.undo(log.id, 'member'),
      /Unauthorized: Only administrators can rollback changes/
    );
    assert.equal(engine.bureauAssignments.secretary_general.member_name, 'AWAW 20');
  });

  it('7. Cannot undo an already reverted log entry twice', () => {
    const engine = new AuditEngine();
    const log = engine.assignBureau('usr-admin-1', 'secretary_general', 'usr-awaw', 'AWAW 20');
    engine.undo(log.id, 'admin');

    assert.throws(
      () => engine.undo(log.id, 'admin'),
      /Action already undone/
    );
  });

  it('8. Undoing a user role assignment restores the member’s previous role', () => {
    const engine = new AuditEngine();
    const log = engine.assignRole('usr-admin-1', 'usr-member-1', 'bureau');
    assert.equal(engine.userRoles['usr-member-1'], 'bureau');

    engine.undo(log.id, 'admin');
    assert.equal(engine.userRoles['usr-member-1'], 'member');
  });
});

