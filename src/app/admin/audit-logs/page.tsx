'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import {
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
  Clock,
  User,
  Users,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Sparkles,
  Award,
  Calendar,
  Lock,
} from 'lucide-react';
import { formatTunisDate, formatTunisTime } from '@/lib/email/timezone-utils';

interface AuditLogItem {
  id: string;
  actor_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  details?: string | null;
  metadata?: Record<string, any>;
  previous_state?: Record<string, any> | null;
  new_state?: Record<string, any> | null;
  is_undone?: boolean;
  undone_at?: string | null;
  undone_by?: string | null;
  can_undo?: boolean;
  created_at: string;
  actor?: {
    id: string;
    full_name: string;
    email: string;
    avatar_path?: string;
    student_id?: string;
  };
}

export default function AdminAuditLogsPage() {
  const { user, isAdmin, activeRole } = useAuth();
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [undoingLogId, setUndoingLogId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const isAuthorized = isAdmin || activeRole === 'admin' || user?.email?.toLowerCase() === 'adamwalha20@gmail.com' || user?.email?.toLowerCase() === 'mahdihelmin@gmail.com';

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/audit-logs');
      const data = await res.json();
      if (res.ok && data.success && data.logs) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.warn('Audit logs load notice:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchLogs();
    }
  }, [isAuthorized]);

  const handleUndo = async (logId: string) => {
    if (!confirm('Are you sure you want to revert this administrative action? This will undo the changes in the database.')) {
      return;
    }

    setUndoingLogId(logId);
    setFeedbackMessage(null);

    try {
      const res = await fetch('/api/admin/audit-logs/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedbackMessage({ text: data.message || 'Action successfully undone!', type: 'success' });
        // Refresh logs list
        await fetchLogs();
      } else {
        setFeedbackMessage({ text: data.error || 'Failed to undo action.', type: 'error' });
      }
    } catch (err: any) {
      setFeedbackMessage({ text: err?.message || 'Server connection error.', type: 'error' });
    } finally {
      setUndoingLogId(null);
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (filterCategory !== 'all') {
        if (filterCategory === 'bureau' && !log.action.includes('BUREAU')) return false;
        if (filterCategory === 'role' && !log.action.includes('ROLE')) return false;
        if (filterCategory === 'attendance' && !log.action.includes('ATTENDANCE')) return false;
        if (filterCategory === 'xp' && !log.action.includes('XP')) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesAction = log.action.toLowerCase().includes(q);
        const matchesDetails = log.details?.toLowerCase().includes(q);
        const matchesActor = log.actor?.full_name?.toLowerCase().includes(q) || log.actor?.email?.toLowerCase().includes(q);
        if (!matchesAction && !matchesDetails && !matchesActor) return false;
      }

      return true;
    });
  }, [logs, filterCategory, searchQuery]);

  if (!isAuthorized) {
    return (
      <AppShell>
        <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-base font-extrabold text-slate-900">Admin Eyes Only</h2>
          <p className="text-xs text-slate-500 max-w-sm">
            Club audit logs and rollback controls are strictly restricted to authenticated Club Administrators.
          </p>
          <div className="mt-2 text-[11px] font-mono text-slate-400">
            Account: {user?.email || 'Guest'}
          </div>
        </div>
      </AppShell>
    );
  }

  const totalLogs = logs.length;
  const undoneCount = logs.filter((l) => l.is_undone).length;
  const bureauCount = logs.filter((l) => l.action.includes('BUREAU')).length;
  const attendanceCount = logs.filter((l) => l.action.includes('ATTENDANCE')).length;

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/admin/roles"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Governance & Roles</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Audit Console</span>
            </span>
          </div>
        </div>

        {/* Feedback Message Banner */}
        {feedbackMessage && (
          <div
            className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between border ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              )}
              <span>{feedbackMessage.text}</span>
            </div>
            <button
              onClick={() => setFeedbackMessage(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
        )}

        {/* Header Card */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-emerald-900/10 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                Governance Audit Logs & Undo History
              </h1>
              <p className="text-xs text-slate-500">
                Track all administrative modifications across bureau mandates, user roles, session attendance, and XP. Revert unauthorized or accidental changes with one click.
              </p>
            </div>

            <button
              onClick={fetchLogs}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5 self-start md:self-center"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Logs</span>
            </button>
          </div>

          {/* Metric Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total Operations</span>
              <div className="text-lg font-black text-slate-900">{totalLogs}</div>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Bureau Actions</span>
              <div className="text-lg font-black text-emerald-700">{bureauCount}</div>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Attendance Corrections</span>
              <div className="text-lg font-black text-blue-700">{attendanceCount}</div>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Reverted (Undone)</span>
              <div className="text-lg font-black text-amber-600">{undoneCount}</div>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white rounded-3xl p-4 border border-emerald-900/10 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by action, administrator, or details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-slate-900"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: 'all', label: 'All Operations' },
              { id: 'bureau', label: 'Bureau Mandates' },
              { id: 'role', label: 'User Roles' },
              { id: 'attendance', label: 'Attendance' },
              { id: 'xp', label: 'XP Adjustments' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterCategory(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  filterCategory === f.id
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Audit Logs Table Card */}
        <div className="bg-white rounded-3xl p-6 border border-emerald-900/10 shadow-sm space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Timestamp (Tunis)</th>
                  <th className="py-2.5 px-3">Administrator</th>
                  <th className="py-2.5 px-3">Action Type</th>
                  <th className="py-2.5 px-3">Description & State Delta</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Rollback Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Loading audit log records from Supabase...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No audit log records match the current filter.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const isUndone = log.is_undone;
                    const canUndo = log.can_undo !== false && !isUndone;

                    const actionBadge = (act: string) => {
                      if (act.includes('BUREAU')) return 'bg-emerald-100 text-emerald-800';
                      if (act.includes('ROLE')) return 'bg-purple-100 text-purple-800';
                      if (act.includes('ATTENDANCE')) return 'bg-blue-100 text-blue-800';
                      if (act.includes('XP')) return 'bg-amber-100 text-amber-800';
                      if (act.includes('UNDO')) return 'bg-rose-100 text-rose-800';
                      return 'bg-slate-100 text-slate-700';
                    };

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Timestamp */}
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          <div>{formatTunisDate(log.created_at)}</div>
                          <div className="text-[10px] text-slate-400">{formatTunisTime(log.created_at)}</div>
                        </td>

                        {/* Administrator */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px]">
                              {log.actor?.full_name?.[0] || 'A'}
                            </div>
                            <div>
                              <div className="font-extrabold text-slate-900">{log.actor?.full_name || 'System / Admin'}</div>
                              <div className="text-[10px] text-slate-400">{log.actor?.email || 'admin@isims.tn'}</div>
                            </div>
                          </div>
                        </td>

                        {/* Action Badge */}
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-tight ${actionBadge(log.action)}`}>
                            {log.action.replace(/_/g, ' ')}
                          </span>
                        </td>

                        {/* Description & Delta */}
                        <td className="py-3 px-3 max-w-sm">
                          <div className="font-medium text-slate-900 text-xs">
                            {log.details || log.action}
                          </div>
                          {log.previous_state && log.new_state && (
                            <div className="mt-1 flex items-center gap-1.5 text-[10px] font-mono">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 line-through">
                                {(log.previous_state as any).member_name || (log.previous_state as any).role || 'None'}
                              </span>
                              <span className="text-slate-400">→</span>
                              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold">
                                {(log.new_state as any).member_name || (log.new_state as any).role || 'Updated'}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3">
                          {isUndone ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 flex items-center gap-1 w-max">
                              <RotateCcw className="w-2.5 h-2.5" />
                              <span>Undone</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 flex items-center gap-1 w-max">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>Active</span>
                            </span>
                          )}
                        </td>

                        {/* Rollback Action Button */}
                        <td className="py-3 px-3 text-right">
                          {canUndo ? (
                            <button
                              onClick={() => handleUndo(log.id)}
                              disabled={undoingLogId === log.id}
                              className="px-3 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-[11px] transition-colors inline-flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
                            >
                              <RotateCcw className={`w-3 h-3 ${undoingLogId === log.id ? 'animate-spin' : ''}`} />
                              <span>{undoingLogId === log.id ? 'Reverting...' : 'Undo'}</span>
                            </button>
                          ) : isUndone ? (
                            <span className="text-[11px] text-slate-400 font-mono">
                              Reverted
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              System
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
