import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('ZEC Campus Hub — Task Permissions & Verification Invariants', () => {
  // Authorization guards mirroring RLS and backend rules
  function canCreateTask(role, bureauPosition) {
    if (role === 'admin') return true;
    if (role === 'bureau' && bureauPosition && bureauPosition !== 'none') return true;
    return false;
  }

  function canDeleteTask(role) {
    return role === 'admin';
  }

  function canAssignTask(role) {
    return role === 'admin' || role === 'bureau';
  }

  function canVerifyTask(user, task) {
    if (user.role === 'admin') return true;
    // Conflict of interest: Cannot verify own work
    if (user.id === task.assigneeId) return false;
    if (user.role === 'bureau') return true;
    return false;
  }

  function submitTaskForVerification(task, user) {
    if (task.assigneeId !== user.id) {
      throw new Error('Unauthorized: only assignee can submit task');
    }
    if (task.status === 'done') {
      throw new Error('Task already completed');
    }
    return {
      ...task,
      status: task.requiresVerification ? 'waiting_verification' : 'done',
    };
  }

  test('Ordinary Member CANNOT create tasks, assign tasks, or delete tasks', () => {
    assert.equal(canCreateTask('member', 'none'), false);
    assert.equal(canAssignTask('member'), false);
    assert.equal(canDeleteTask('member'), false);
  });

  test('Bureau officer and Admin CAN create tasks within their role', () => {
    assert.equal(canCreateTask('bureau', 'events_manager'), true);
    assert.equal(canCreateTask('bureau', 'treasurer'), true);
    assert.equal(canCreateTask('admin', 'none'), true);
  });

  test('Assignee member can submit assigned task for verification', () => {
    const member = { id: 'user-mem-1', role: 'member' };
    const task = {
      id: 'task-101',
      assigneeId: 'user-mem-1',
      status: 'in_progress',
      requiresVerification: true,
    };

    const updated = submitTaskForVerification(task, member);
    assert.equal(updated.status, 'waiting_verification');
  });

  test('Non-assignee member CANNOT submit someone else’s task', () => {
    const nonAssignee = { id: 'user-mem-2', role: 'member' };
    const task = {
      id: 'task-101',
      assigneeId: 'user-mem-1',
      status: 'in_progress',
      requiresVerification: true,
    };

    assert.throws(() => submitTaskForVerification(task, nonAssignee), /Unauthorized/);
  });

  test('Member CANNOT verify or approve their own task (Conflict of Interest)', () => {
    const member = { id: 'user-mem-1', role: 'member' };
    const task = {
      id: 'task-101',
      assigneeId: 'user-mem-1',
      status: 'waiting_verification',
    };

    assert.equal(canVerifyTask(member, task), false);
  });

  test('Authorized Bureau officer or Admin CAN verify member task', () => {
    const bureauLead = { id: 'user-bureau-1', role: 'bureau', position: 'project_manager' };
    const admin = { id: 'user-admin-1', role: 'admin' };
    const task = {
      id: 'task-101',
      assigneeId: 'user-mem-1',
      status: 'waiting_verification',
    };

    assert.equal(canVerifyTask(bureauLead, task), true);
    assert.equal(canVerifyTask(admin, task), true);
  });
});

describe('ZEC Campus Hub — XP Awarding & Anti-Abuse Invariants', () => {
  class XpSystem {
    constructor() {
      this.memberXp = new Map(); // userId -> { total_xp, completed_tasks }
      this.transactions = []; // array of records
      this.idempotencyKeys = new Set();
    }

    awardXp({ userId, points, reason, sourceType, sourceId, idempotencyKey, awardedBy }) {
      if (this.idempotencyKeys.has(idempotencyKey)) {
        return { success: false, duplicate: true, message: 'Already processed' };
      }
      this.idempotencyKeys.add(idempotencyKey);

      const current = this.memberXp.get(userId) || { total_xp: 0, completed_tasks: 0 };
      const newTotal = Math.max(0, current.total_xp + points);
      const newCompleted = sourceType === 'task' ? current.completed_tasks + 1 : current.completed_tasks;

      this.memberXp.set(userId, { total_xp: newTotal, completed_tasks: newCompleted });
      this.transactions.push({
        id: `tx-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        userId,
        points,
        reason,
        sourceType,
        sourceId,
        idempotencyKey,
        awardedBy,
        createdAt: new Date().toISOString(),
      });

      return { success: true, newTotal };
    }
  }

  test('Standard and high-priority tasks grant appropriate XP', () => {
    const xpSystem = new XpSystem();
    const res1 = xpSystem.awardXp({
      userId: 'user-1',
      points: 10,
      reason: 'Completed task: Audit inventory',
      sourceType: 'task',
      sourceId: 'task-1',
      idempotencyKey: 'task:task-1:user-1',
      awardedBy: 'admin-1',
    });
    assert.equal(res1.success, true);
    assert.equal(res1.newTotal, 10);

    const res2 = xpSystem.awardXp({
      userId: 'user-1',
      points: 20,
      reason: 'Completed high-priority task: Deploy hub upgrade',
      sourceType: 'task',
      sourceId: 'task-2',
      idempotencyKey: 'task:task-2:user-1',
      awardedBy: 'admin-1',
    });
    assert.equal(res2.success, true);
    assert.equal(res2.newTotal, 30);
    assert.equal(xpSystem.memberXp.get('user-1').completed_tasks, 2);
  });

  test('Anti-abuse: Duplicate requests with same idempotency key are rejected', () => {
    const xpSystem = new XpSystem();
    const payload = {
      userId: 'user-1',
      points: 20,
      reason: 'Task: Prepare booth',
      sourceType: 'task',
      sourceId: 'task-booth',
      idempotencyKey: 'task:task-booth:user-1',
      awardedBy: 'admin-1',
    };

    const firstAttempt = xpSystem.awardXp(payload);
    assert.equal(firstAttempt.success, true);
    assert.equal(firstAttempt.newTotal, 20);

    // Rapid double-click or replay attack
    const secondAttempt = xpSystem.awardXp(payload);
    assert.equal(secondAttempt.success, false);
    assert.equal(secondAttempt.duplicate, true);

    // Total points and transactions remain unchanged
    assert.equal(xpSystem.memberXp.get('user-1').total_xp, 20);
    assert.equal(xpSystem.transactions.length, 1);
  });
});

describe('ZEC Campus Hub — Deterministic Leaderboard Ranking', () => {
  function sortLeaderboard(members) {
    return [...members].sort((a, b) => {
      // 1. Higher XP wins
      if (b.total_xp !== a.total_xp) {
        return b.total_xp - a.total_xp;
      }
      // 2. Tie-break: More completed tasks
      if (b.completed_tasks !== a.completed_tasks) {
        return b.completed_tasks - a.completed_tasks;
      }
      // 3. Tie-break: Earlier achievement date
      return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
    });
  }

  test('Correctly breaks ties using completed tasks and earlier timestamp', () => {
    const members = [
      { id: 'user-c', total_xp: 200, completed_tasks: 5, updated_at: '2026-10-20T10:00:00Z' },
      { id: 'user-a', total_xp: 350, completed_tasks: 12, updated_at: '2026-10-22T10:00:00Z' },
      { id: 'user-b', total_xp: 200, completed_tasks: 8, updated_at: '2026-10-21T10:00:00Z' },
      { id: 'user-d', total_xp: 200, completed_tasks: 5, updated_at: '2026-10-18T10:00:00Z' }, // Earlier than user-c
    ];

    const sorted = sortLeaderboard(members);
    assert.equal(sorted[0].id, 'user-a'); // 350 XP
    assert.equal(sorted[1].id, 'user-b'); // 200 XP, 8 tasks
    assert.equal(sorted[2].id, 'user-d'); // 200 XP, 5 tasks, earlier (Oct 18)
    assert.equal(sorted[3].id, 'user-c'); // 200 XP, 5 tasks, later (Oct 20)
  });

  test('Periodic calculation filters by transaction date window rather than all-time total', () => {
    const transactions = [
      { userId: 'u1', points: 30, createdAt: '2026-10-05T12:00:00Z' },
      { userId: 'u1', points: 20, createdAt: '2026-09-15T12:00:00Z' }, // previous month
      { userId: 'u2', points: 40, createdAt: '2026-10-08T12:00:00Z' },
    ];

    const octoberStart = new Date('2026-10-01T00:00:00Z');
    const octoberEnd = new Date('2026-10-31T23:59:59Z');

    const monthlyMap = new Map();
    for (const tx of transactions) {
      const txDate = new Date(tx.createdAt);
      if (txDate >= octoberStart && txDate <= octoberEnd) {
        monthlyMap.set(tx.userId, (monthlyMap.get(tx.userId) || 0) + tx.points);
      }
    }

    assert.equal(monthlyMap.get('u1'), 30); // 20 XP excluded
    assert.equal(monthlyMap.get('u2'), 40);
  });
});

describe('ZEC Campus Hub — Rank Levels & Achievement Badges', () => {
  const RANK_LEVELS = [
    { name: 'Club Champion', minXp: 500, maxXp: null },
    { name: 'Dedicated Member', minXp: 300, maxXp: 499 },
    { name: 'Contributor', minXp: 150, maxXp: 299 },
    { name: 'Active Member', minXp: 50, maxXp: 149 },
    { name: 'New Member', minXp: 0, maxXp: 49 },
  ];

  function getRankLevel(xp) {
    return RANK_LEVELS.find((l) => xp >= l.minXp) || RANK_LEVELS[RANK_LEVELS.length - 1];
  }

  test('Accurately determines rank levels across thresholds', () => {
    assert.equal(getRankLevel(0).name, 'New Member');
    assert.equal(getRankLevel(49).name, 'New Member');
    assert.equal(getRankLevel(50).name, 'Active Member');
    assert.equal(getRankLevel(149).name, 'Active Member');
    assert.equal(getRankLevel(150).name, 'Contributor');
    assert.equal(getRankLevel(300).name, 'Dedicated Member');
    assert.equal(getRankLevel(500).name, 'Club Champion');
    assert.equal(getRankLevel(1200).name, 'Club Champion');
  });

  test('Unlocks milestone achievements based on verified task completion', () => {
    function evaluateAchievements(existingBadgeKeys, completedTasks) {
      const newBadges = [];
      if (completedTasks >= 1 && !existingBadgeKeys.includes('first_task')) {
        newBadges.push('first_task');
      }
      if (completedTasks >= 5 && !existingBadgeKeys.includes('five_tasks')) {
        newBadges.push('five_tasks');
      }
      if (completedTasks >= 10 && !existingBadgeKeys.includes('ten_tasks')) {
        newBadges.push('ten_tasks');
      }
      return newBadges;
    }

    // 1 task completed
    const step1 = evaluateAchievements([], 1);
    assert.deepEqual(step1, ['first_task']);

    // Already has first_task, now reached 5 tasks
    const step2 = evaluateAchievements(['first_task'], 5);
    assert.deepEqual(step2, ['five_tasks']);

    // Does not re-award already unlocked achievements
    const step3 = evaluateAchievements(['first_task', 'five_tasks'], 6);
    assert.deepEqual(step3, []);
  });
});
