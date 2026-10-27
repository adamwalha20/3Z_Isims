'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import {
  Shield,
  Users,
  CheckCircle2,
  Lock,
  ArrowLeft,
  Edit3,
  UserCheck,
  Award,
  Sparkles,
  Search,
  Check,
  X,
  UserPlus,
  Briefcase,
  GraduationCap,
} from 'lucide-react';

export default function AdminRolesPage() {
  const { user, bureauMembers, assignBureauPosition, setUserRole, members } = useAuth();
  const [activeTab, setActiveTab] = useState<'bureau' | 'users'>('bureau');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const isAuthorized = user?.email?.toLowerCase() === 'adamwalha20@gmail.com';

  if (!isAuthorized) {
    return (
      <AppShell>
        <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-base font-extrabold text-slate-900">Access Restricted</h2>
          <p className="text-xs text-slate-500 max-w-sm">
            Managing executive bureau positions and assigning roles is exclusively reserved for the designated administrator (adamwalha20@gmail.com).
          </p>
          <div className="mt-2 text-[11px] font-mono text-slate-400">
            Current account: {user?.email || 'Guest / Unverified'}
          </div>
        </div>
      </AppShell>
    );
  }

  const handleAssignBureau = async (positionKey: string) => {
    if (!selectedUserId) return;
    setStatusMessage(null);

    const targetUser = members.find((m) => m.id === selectedUserId);
    const memberName = targetUser?.full_name || 'Unassigned';

    const res = await assignBureauPosition(positionKey, selectedUserId, memberName);
    if (res.success) {
      setStatusMessage({ text: `Successfully updated ${positionKey.replace(/_/g, ' ')} assignment.`, type: 'success' });
      setEditingKey(null);
      setSelectedUserId('');
    } else {
      setStatusMessage({ text: res.error || 'Failed to update assignment.', type: 'error' });
    }
  };

  const handleUnassignBureau = async (positionKey: string) => {
    setStatusMessage(null);
    const res = await assignBureauPosition(positionKey, 'unassigned', 'Unassigned');
    if (res.success) {
      setStatusMessage({ text: `Position vacated.`, type: 'success' });
      setEditingKey(null);
    }
  };

  const handleChangeUserRole = async (userId: string, newRole: 'admin' | 'bureau' | 'member', userName: string) => {
    setStatusMessage(null);
    const res = await setUserRole(userId, newRole);
    if (res.success) {
      setStatusMessage({ text: `Updated ${userName}'s system role to ${newRole.toUpperCase()}.`, type: 'success' });
    } else {
      setStatusMessage({ text: res.error || 'Failed to update role.', type: 'error' });
    }
  };

  const filteredMembers = members.filter((m) => {
    const query = searchQuery.toLowerCase();
    return (
      m.full_name.toLowerCase().includes(query) ||
      (m.student_id && m.student_id.toLowerCase().includes(query)) ||
      (m.study_field && m.study_field.toLowerCase().includes(query)) ||
      (m.skills && m.skills.some((sk) => sk.toLowerCase().includes(query)))
    );
  });

  return (
    <AppShell>
      <div className="pt-4 flex flex-col gap-5 max-w-5xl mx-auto w-full pb-20">
        {/* Navigation Back */}
        <div className="flex items-center justify-between">
          <Link
            href="/admin"
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Governance Overview</span>
          </Link>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-0.5 rounded-full">
            Admin Console • Mandate 2025-2026
          </span>
        </div>

        {/* Header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900">Governance, Bureau Mandates & User Roles</h1>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              Live Supabase Synced
            </span>
          </div>
          <p className="text-xs text-slate-500">
            As the Club Administrator, assign registered students to official bureau positions and manage member access roles.
          </p>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div
            className={`p-3 rounded-2xl text-xs flex items-center justify-between border ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-semibold">{statusMessage.text}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="p-1 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 gap-6 text-xs font-bold">
          <button
            onClick={() => setActiveTab('bureau')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'bureau'
                ? 'border-emerald-700 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Bureau Mandates ({bureauMembers.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'users'
                ? 'border-emerald-700 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>All Registered Users & Roles ({members.length})</span>
          </button>
        </div>

        {/* =====================================================================
            TAB 1: BUREAU MANDATE ASSIGNMENTS
        ===================================================================== */}
        {activeTab === 'bureau' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {bureauMembers.map((bm) => {
              const isEditing = editingKey === bm.position_key;
              const isVacant = !bm.member_name || bm.member_name === 'Unassigned';

              return (
                <div
                  key={bm.position_key}
                  className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between gap-3 transition-all hover:border-emerald-300"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                        {bm.department}
                      </span>
                      <button
                        onClick={() => {
                          setEditingKey(isEditing ? null : bm.position_key);
                          setSelectedUserId('');
                        }}
                        className="px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-lg flex items-center gap-1 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>{isVacant ? 'Assign Officer' : 'Reassign'}</span>
                      </button>
                    </div>

                    <h3 className="font-extrabold text-sm text-slate-900 mt-2">{bm.position_name}</h3>

                    {isEditing ? (
                      <div className="mt-3 flex flex-col gap-2.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 animate-in fade-in">
                        <label className="text-[11px] font-bold text-slate-700">
                          Select Registered Member to Assign:
                        </label>
                        <select
                          value={selectedUserId}
                          onChange={(e) => setSelectedUserId(e.target.value)}
                          className="px-2.5 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                        >
                          <option value="">-- Choose registered student --</option>
                          {members.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.full_name} ({m.student_id || 'ID Pending'}) • {m.study_field || 'Student'}
                            </option>
                          ))}
                        </select>

                        <div className="flex justify-between items-center mt-1">
                          {!isVacant ? (
                            <button
                              type="button"
                              onClick={() => handleUnassignBureau(bm.position_key)}
                              className="text-[11px] text-rose-700 hover:underline font-bold"
                            >
                              Vacate Position
                            </button>
                          ) : (
                            <div />
                          )}

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingKey(null)}
                              className="px-3 py-1 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-lg"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={!selectedUserId}
                              onClick={() => handleAssignBureau(bm.position_key)}
                              className="px-3 py-1 text-xs font-bold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 disabled:opacity-50"
                            >
                              Confirm
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 mt-3">
                        <div className="w-10 h-10 rounded-full ring-2 ring-emerald-500 overflow-hidden bg-slate-100 shrink-0">
                          <img src={bm.avatar} alt={bm.member_name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {isVacant ? 'Unassigned' : bm.member_name}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                isVacant
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {isVacant ? 'Vacant' : 'Assigned'}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono truncate">{bm.email}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Executive Mandate</span>
                    <span className="text-emerald-700 font-bold">Operational Cockpit Enabled</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* =====================================================================
            TAB 2: REGISTERED USERS & SYSTEM ROLE MANAGEMENT
        ===================================================================== */}
        {activeTab === 'users' && (
          <div className="flex flex-col gap-4">
            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search registered members by name, student matricule, study field, or skills..."
                className="w-full pl-9 pr-4 py-2.5 text-xs rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-xs"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>

            {/* Members Cards List */}
            <div className="flex flex-col gap-3">
              {filteredMembers.map((member) => {
                const currentRole = member.roles?.[0]?.key || 'member';

                return (
                  <div
                    key={member.id}
                    className="p-4 bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-emerald-300 transition-all"
                  >
                    {/* User Info */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-full ring-2 ring-emerald-500 overflow-hidden bg-slate-100 shrink-0">
                        <img
                          src={member.avatar_path || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'}
                          alt={member.full_name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-slate-900">{member.full_name}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              currentRole === 'admin'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : currentRole === 'bureau'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}
                          >
                            {currentRole}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                            {member.student_id || 'ID Pending'}
                          </span>
                          <span>•</span>
                          <span className="font-semibold text-slate-700">{member.study_field || 'Computer Science'}</span>
                        </div>

                        {/* Skills Chips */}
                        {member.skills && member.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {member.skills.map((sk) => (
                              <span
                                key={sk}
                                className="px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] rounded-md border border-emerald-100 font-semibold"
                              >
                                {sk}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Role Change Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                      <span className="text-[11px] font-bold text-slate-400 mr-1 hidden sm:inline">Change Role:</span>

                      <button
                        onClick={() => handleChangeUserRole(member.id, 'member', member.full_name)}
                        className={`px-2.5 py-1 text-xs rounded-xl font-bold transition-all ${
                          currentRole === 'member'
                            ? 'bg-blue-700 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        Member
                      </button>

                      <button
                        onClick={() => handleChangeUserRole(member.id, 'bureau', member.full_name)}
                        className={`px-2.5 py-1 text-xs rounded-xl font-bold transition-all ${
                          currentRole === 'bureau'
                            ? 'bg-emerald-700 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        Bureau
                      </button>

                      <button
                        onClick={() => handleChangeUserRole(member.id, 'admin', member.full_name)}
                        className={`px-2.5 py-1 text-xs rounded-xl font-bold transition-all ${
                          currentRole === 'admin'
                            ? 'bg-rose-700 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        Admin
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredMembers.length === 0 && (
                <div className="p-10 text-center text-xs text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
                  No members found matching &quot;{searchQuery}&quot;.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
