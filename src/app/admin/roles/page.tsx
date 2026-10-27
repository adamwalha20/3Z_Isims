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
} from 'lucide-react';

export default function AdminRolesPage() {
  const { activeRole, bureauMembers, assignBureauPosition, members } = useAuth();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState('');
  const [customName, setCustomName] = useState('');

  const isAuthorized = activeRole === 'admin' || activeRole === 'bureau';

  if (!isAuthorized) {
    return (
      <AppShell>
        <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-base font-extrabold text-slate-900">Permission Denied</h2>
          <p className="text-xs text-slate-500 max-w-sm">
            Managing executive bureau positions requires Administrator permissions.
          </p>
        </div>
      </AppShell>
    );
  }

  const handleSave = (key: string) => {
    const finalName = selectedMember === 'custom' ? customName.trim() : (selectedMember || customName.trim());
    if (finalName) {
      assignBureauPosition(key, finalName);
    }
    setEditingKey(null);
    setSelectedMember('');
    setCustomName('');
  };

  return (
    <AppShell>
      <div className="pt-4 flex flex-col gap-5 max-w-4xl mx-auto w-full pb-20">
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
            Mandate 2025-2026
          </span>
        </div>

        {/* Header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900">Bureau Responsibilities & Role Assignments</h1>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              10 Positions
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Configure the 10 official executive bureau mandates. Changes immediately grant access to role-tailored operational cockpits.
          </p>
        </div>

        {/* Roles List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {bureauMembers.map((bm) => {
            const isEditing = editingKey === bm.position_key;
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
                        setCustomName(bm.member_name);
                      }}
                      className="text-slate-400 hover:text-slate-900 p-1 rounded-lg transition-colors"
                      title="Edit role assignment"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3 className="font-extrabold text-sm text-slate-900 mt-2">{bm.position_name}</h3>

                  {isEditing ? (
                    <div className="mt-3 flex flex-col gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 animate-in fade-in">
                      <label className="text-[11px] font-bold text-slate-700">Assign Member:</label>
                      <select
                        value={selectedMember}
                        onChange={(e) => setSelectedMember(e.target.value)}
                        className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white"
                      >
                        <option value="">Select from active member roster</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.full_name}>
                            {m.full_name} ({m.student_id})
                          </option>
                        ))}
                        <option value="custom">-- Type Custom Member Name --</option>
                      </select>

                      {(selectedMember === 'custom' || !selectedMember) && (
                        <input
                          type="text"
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          placeholder="Type member full name (e.g. Ahmed Triki)"
                          className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white"
                        />
                      )}

                      <div className="flex justify-end gap-2 mt-1">
                        <button
                          onClick={() => setEditingKey(null)}
                          className="px-2.5 py-1 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSave(bm.position_key)}
                          className="px-3 py-1 text-xs font-bold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800"
                        >
                          Confirm Assignment
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 mt-3">
                      <div className="w-9 h-9 rounded-full ring-2 ring-emerald-500 overflow-hidden bg-slate-100 shrink-0">
                        <img src={bm.avatar} alt={bm.member_name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-slate-900 truncate">{bm.member_name}</span>
                        <span className="text-[10px] text-slate-400 font-mono truncate">{bm.email}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Permission Scope: Operational Bureau</span>
                  <span className="text-emerald-700 font-bold">Active</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
