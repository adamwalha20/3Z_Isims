import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccessAttendanceScanner } from '../src/lib/attendance/attendance-auth.ts';

test('ZEC Smart QR Attendance — Scanner Role & Position Permissions', async (t) => {
  await t.test('1. President CAN access attendance scanner', () => {
    const allowed = canAccessAttendanceScanner({
      activeRole: 'bureau',
      userBureauPositions: ['president'],
      activeBureauPosition: 'president',
      userEmail: 'president@isims.tn',
    });
    assert.equal(allowed, true);
  });

  await t.test('2. Vice President CAN access attendance scanner', () => {
    const allowed = canAccessAttendanceScanner({
      activeRole: 'bureau',
      userBureauPositions: ['vice_president'],
      activeBureauPosition: 'vice_president',
      userEmail: 'vp@isims.tn',
    });
    assert.equal(allowed, true);
  });

  await t.test('3. Secretary General CAN access attendance scanner', () => {
    const allowed = canAccessAttendanceScanner({
      activeRole: 'bureau',
      userBureauPositions: ['secretary_general'],
      activeBureauPosition: 'secretary_general',
      userEmail: 'sg@isims.tn',
    });
    assert.equal(allowed, true);
  });

  await t.test('4. Club Administrator CAN access attendance scanner', () => {
    const allowedByEmail = canAccessAttendanceScanner({
      activeRole: 'member',
      userEmail: 'adamwalha20@gmail.com',
    });
    assert.equal(allowedByEmail, true);

    const allowedByRole = canAccessAttendanceScanner({
      activeRole: 'admin',
      isAdmin: true,
      userEmail: 'other-admin@isims.tn',
    });
    assert.equal(allowedByRole, true);
  });

  await t.test('5. Treasurer CANNOT access attendance scanner', () => {
    const allowed = canAccessAttendanceScanner({
      activeRole: 'bureau',
      userBureauPositions: ['treasurer'],
      activeBureauPosition: 'treasurer',
      userEmail: 'treasurer@isims.tn',
    });
    assert.equal(allowed, false);
  });

  await t.test('6. HR Manager CANNOT access attendance scanner', () => {
    const allowed = canAccessAttendanceScanner({
      activeRole: 'bureau',
      userBureauPositions: ['hr_manager'],
      activeBureauPosition: 'hr_manager',
      userEmail: 'hr@isims.tn',
    });
    assert.equal(allowed, false);
  });

  await t.test('7. Training & Innovation Manager CANNOT access attendance scanner', () => {
    const allowed = canAccessAttendanceScanner({
      activeRole: 'bureau',
      userBureauPositions: ['training_innovation'],
      activeBureauPosition: 'training_innovation',
      userEmail: 'training@isims.tn',
    });
    assert.equal(allowed, false);
  });

  await t.test('8. Marketing & Design Manager CANNOT access attendance scanner', () => {
    const allowed = canAccessAttendanceScanner({
      activeRole: 'bureau',
      userBureauPositions: ['marketing_design_manager'],
      activeBureauPosition: 'marketing_design_manager',
      userEmail: 'marketing@isims.tn',
    });
    assert.equal(allowed, false);
  });

  await t.test('9. Sustainable Campus Manager CANNOT access attendance scanner', () => {
    const allowed = canAccessAttendanceScanner({
      activeRole: 'bureau',
      userBureauPositions: ['sustainable_campus_manager'],
      activeBureauPosition: 'sustainable_campus_manager',
      userEmail: 'eco@isims.tn',
    });
    assert.equal(allowed, false);
  });

  await t.test('10. Ordinary Club Member CANNOT access attendance scanner', () => {
    const allowed = canAccessAttendanceScanner({
      activeRole: 'member',
      userBureauPositions: [],
      activeBureauPosition: undefined,
      userEmail: 'student@isims.tn',
    });
    assert.equal(allowed, false);
  });
});
