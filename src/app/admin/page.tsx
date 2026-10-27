'use client';

import React from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import {
  ShieldCheck,
  UserCheck,
  History,
  Lock,
  ChevronRight,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';

export default function AdminGovernancePage() {
  const { activeRole, auditLogs, members } = useAuth();

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
            Elevated governance requires Bureau Officer or Administrator access. Switch roles in the top bar to inspect this view.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="pt-4 flex flex-col gap-4 max-w-4xl mx-auto w-full pb-20">
        {/* Header Strip */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <h1 className="font-extrabold text-lg sm:text-xl text-slate-900">Admin Governance & Audit Logs</h1>
              <p className="text-xs text-slate-500">Immutable operations log and membership authorization</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold font-mono">
            ELEVATED
          </span>
        </div>

        {/* Quick Admin Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/admin/members"
            className="p-4 rounded-3xl bg-white shadow-xs border border-emerald-900/10 hover:border-emerald-300 transition-colors flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">Member Applications</h3>
                <p className="text-xs text-slate-500">Approve or suspend student matricules</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
              8 Pending
            </span>
          </Link>

          <div className="p-4 rounded-3xl bg-white shadow-xs border border-emerald-900/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-800 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">Export Audit Ledger</h3>
                <p className="text-xs text-slate-500">Official log for University Directorate</p>
              </div>
            </div>
            <button
              onClick={() => alert('Exporting signed audit ledger CSV.')}
              className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-black"
            >
              Export
            </button>
          </div>
        </div>

        {/* Immutable Audit Log Table */}
        <section className="bg-white rounded-3xl p-5 shadow-xs border border-emerald-900/10 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-700" />
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900">System Audit Traceability</h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">APPEND-ONLY SECURE</span>
          </div>

          <div className="flex flex-col gap-2">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-mono text-[10px] font-bold">
                    {log.action}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-slate-900 truncate">
                      {log.actor?.full_name || 'Sarah B.'} • {log.entity_type}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono truncate">
                      {JSON.stringify(log.metadata)}
                    </span>
                  </div>
                </div>

                <span className="text-[10px] font-mono text-slate-400 shrink-0">
                  {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
