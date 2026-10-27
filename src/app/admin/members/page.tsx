'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import {
  UserCheck,
  Check,
  X,
  ArrowLeft,
  Search,
  ShieldAlert,
  Lock,
  CheckCircle2,
  Mail,
  GraduationCap,
} from 'lucide-react';

export default function AdminMembersApprovalPage() {
  const { user, members, approveMembership, rejectMembership } = useAuth();
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
            Member approval and verification is exclusively accessible to the designated club administrator (adamwalha20@gmail.com).
          </p>
          <div className="mt-2 text-[11px] font-mono text-slate-400">
            Current account: {user?.email || 'Guest / Unverified'}
          </div>
        </div>
      </AppShell>
    );
  }

  const pendingMembers = members.filter(
    (m) => m.membership?.membership_status === 'pending' && m.email?.toLowerCase() !== 'adamwalha20@gmail.com'
  );

  const handleApprove = async (id: string, name: string) => {
    setStatusMessage(null);
    const res = await approveMembership(id);
    if (res.success) {
      setStatusMessage({ text: `Approved ${name}. Student matricule verified & portal access granted!`, type: 'success' });
    } else {
      setStatusMessage({ text: res.error || 'Failed to approve member.', type: 'error' });
    }
  };

  const handleReject = async (id: string, name: string) => {
    setStatusMessage(null);
    const res = await rejectMembership(id);
    if (res.success) {
      setStatusMessage({ text: `Application suspended for ${name}.`, type: 'success' });
    } else {
      setStatusMessage({ text: res.error || 'Failed to update application.', type: 'error' });
    }
  };

  return (
    <AppShell>
      <div className="pt-4 flex flex-col gap-4 max-w-4xl mx-auto w-full pb-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/admin" className="p-2 rounded-xl bg-white text-slate-600 hover:text-slate-900 shadow-xs border border-slate-200">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="font-extrabold text-lg sm:text-xl text-slate-900">Member Applications & Verification</h1>
              <p className="text-xs text-slate-500">Verify ISIMS university matricules and approve portal access</p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold font-mono">
            {pendingMembers.length} PENDING
          </span>
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

        <div className="flex flex-col gap-3">
          {pendingMembers.map((member) => (
            <div
              key={member.id}
              className="p-4 rounded-3xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs hover:border-emerald-300 transition-all"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-12 h-12 rounded-2xl overflow-hidden ring-2 ring-emerald-500 bg-slate-100 shrink-0">
                  <img
                    src={member.avatar_path || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'}
                    alt={member.full_name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-900 truncate">{member.full_name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                      Awaiting Verification
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs mt-0.5 flex-wrap">
                    <span className="font-mono text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                      {member.student_id || 'ID Pending'}
                    </span>
                    <span className="text-slate-500 font-medium">
                      {member.study_field || 'Computer Science & Multimedia'}
                    </span>
                  </div>

                  {member.email && (
                    <span className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                      {member.email}
                    </span>
                  )}

                  {member.skills && member.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {member.skills.map((sk) => (
                        <span
                          key={sk}
                          className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <button
                  onClick={() => handleReject(member.id, member.full_name)}
                  className="px-3 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition-colors flex items-center gap-1"
                  title="Suspend Application"
                >
                  <X className="w-4 h-4" />
                  <span>Suspend</span>
                </button>
                <button
                  onClick={() => handleApprove(member.id, member.full_name)}
                  className="px-4 py-2 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>Verify & Activate</span>
                </button>
              </div>
            </div>
          ))}

          {pendingMembers.length === 0 && (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-2 bg-white rounded-3xl border border-dashed border-slate-200">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Check className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">All member applications have been verified!</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                There are no students currently waiting for admission approval.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
