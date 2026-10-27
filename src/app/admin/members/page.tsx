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
} from 'lucide-react';

export default function AdminMembersApprovalPage() {
  const { user } = useAuth();
  const [pendingApplicants, setPendingApplicants] = useState([
    { id: 'app-01', name: 'Oussema Cherif', matricule: 'ISIMS-2024-9102', study: 'L1 Computer Science', applied: '2 days ago' },
    { id: 'app-02', name: 'Nour El Houda', matricule: 'ISIMS-2023-4180', study: 'L2 DSI / Multimedia', applied: '3 days ago' },
    { id: 'app-03', name: 'Ahmed Ghorbel', matricule: 'ISIMS-2024-1189', study: 'L1 Computer Science', applied: 'Yesterday' },
  ]);

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

  const handleApprove = (id: string, name: string) => {
    setPendingApplicants((prev) => prev.filter((a) => a.id !== id));
    alert(`Approved ${name}. Student matricule verified with ISIMS Administration.`);
  };

  const handleReject = (id: string, name: string) => {
    setPendingApplicants((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <AppShell>
      <div className="pt-4 flex flex-col gap-4 max-w-4xl mx-auto w-full pb-20">
        <div className="flex items-center gap-2">
          <Link href="/admin" className="p-2 rounded-xl bg-white text-slate-600 hover:text-slate-900 shadow-xs">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-extrabold text-lg sm:text-xl text-slate-900">Member Applications</h1>
            <p className="text-xs text-slate-500">Verify university credentials before granting portal access</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {pendingApplicants.map((app) => (
            <div
              key={app.id}
              className="p-4 rounded-3xl bg-white border border-slate-100 flex items-center justify-between gap-3 shadow-xs"
            >
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold text-sm text-slate-900 truncate">{app.name}</span>
                <span className="font-mono text-xs text-emerald-700 font-semibold mt-0.5">{app.matricule}</span>
                <span className="text-[11px] text-slate-500">{app.study} • Applied {app.applied}</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleReject(app.id, app.name)}
                  className="p-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition-colors"
                  title="Reject"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleApprove(app.id, app.name)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 text-xs font-bold transition-colors flex items-center gap-1 shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>Verify & Activate</span>
                </button>
              </div>
            </div>
          ))}

          {pendingApplicants.length === 0 && (
            <div className="p-10 text-center text-xs text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
              All member applications have been processed and verified!
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
