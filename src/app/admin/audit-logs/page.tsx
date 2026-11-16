'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/context';
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
  Trash2,
  ChevronRight,
  Eye,
  X,
  History,
  Undo2,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { formatTunisDate, formatTunisTime } from '@/lib/email/timezone-utils';
import { isSuperAdminEmail } from '@/lib/constants/auth';

interface AuditLogItem {
  id: string;
  actor_id?: string | null;
  actor_name_snapshot?: string | null;
  actor_role_snapshot?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  entity_label_snapshot?: string | null;
  details?: string | null;
  reason?: string | null;
  metadata?: Record<string, any>;
  previous_state?: Record<string, any> | null;
  old_values?: Record<string, any> | null;
  new_state?: Record<string, any> | null;
  new_values?: Record<string, any> | null;
  is_undone?: boolean;
  undone_at?: string | null;
  undone_by?: string | null;
  can_undo?: boolean;
  request_id?: string | null;
  created_at: string;
  actor?: {
    id: string;
    full_name: string;
    email: string;
    avatar_path?: string;
    student_id?: string;
  };
}

interface AuditStats {
  totalActions: number;
  actionsToday: number;
  memberRemovals: number;
  accountDeletions: number;
  eventModifications: number;
  permissionChanges: number;
  reversibleActions: number;
}

export default function AdminAuditLogsPage() {
  const { user, isAdmin, activeRole } = useAuth();
  const { t, formatDate, formatTime } = useTranslation();

  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [stats, setStats] = useState<AuditStats>({
    totalActions: 0,
    actionsToday: 0,
    memberRemovals: 0,
    accountDeletions: 0,
    eventModifications: 0,
    permissionChanges: 0,
    reversibleActions: 0,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [reversibleOnly, setReversibleOnly] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [undoingLogId, setUndoingLogId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  const isAuthorized =
    isAdmin ||
    activeRole === 'admin' ||
    isSuperAdminEmail(user?.email) ||
    Boolean(user?.student_id?.toUpperCase().startsWith('ISIMS-ADMIN'));

  const fetchLogs = async (page = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '25');
      if (filterCategory !== 'all') params.set('entityType', filterCategory);
      if (filterAction !== 'all') params.set('action', filterAction);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (reversibleOnly) params.set('reversible', 'true');

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setLogs(data.logs || []);
        setTotalCount(data.total || 0);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.warn('Audit logs load notice:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchLogs(currentPage);
    }
  }, [isAuthorized, filterCategory, filterAction, reversibleOnly, currentPage]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchLogs(1);
  };

  const inspectLogDetails = async (log: AuditLogItem) => {
    setSelectedLog(log);
    setConflictWarning(null);

    // Dry-run check for conflicts if log can be undone
    if (log.can_undo && !log.is_undone) {
      try {
        const res = await fetch('/api/admin/audit-logs/undo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ logId: log.id, dryRun: true }),
        });
        const data = await res.json();
        if (data.hasConflict) {
          setConflictWarning(data.conflictDetails || t('admin.undoConflict'));
        }
      } catch (e) {
        console.warn('Conflict dry run check notice:', e);
      }
    }
  };

  const handleUndo = async (logId: string, force = false) => {
    if (!confirm(t('admin.undoConfirm'))) {
      return;
    }

    setUndoingLogId(logId);
    setFeedbackMessage(null);

    try {
      const res = await fetch('/api/admin/audit-logs/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId, force }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedbackMessage({ text: data.message || t('admin.undoSuccess'), type: 'success' });
        setSelectedLog(null);
        await fetchLogs(currentPage);
      } else if (res.status === 409 && data.conflict) {
        setConflictWarning(data.conflictDetails || t('admin.undoConflict'));
        setFeedbackMessage({ text: data.error, type: 'error' });
      } else {
        setFeedbackMessage({ text: data.error || 'Failed to undo action.', type: 'error' });
      }
    } catch (err: any) {
      setFeedbackMessage({ text: err?.message || 'Server connection error.', type: 'error' });
    } finally {
      setUndoingLogId(null);
    }
  };

  if (!isAuthorized) {
    return (
      <AppShell>
        <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-base font-extrabold text-slate-900">{t('admin.adminOnly')}</h2>
          <p className="text-xs text-slate-500 max-w-sm">{t('admin.adminOnlyDesc')}</p>
          <div className="mt-2 text-[11px] font-mono text-slate-400">Account: {user?.email || 'Guest'}</div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 pb-24">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('admin.backToRoles')}</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/recycle-bin"
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-500" />
              <span>{t('admin.recycleBin')}</span>
            </Link>
            <span className="px-3 py-1.5 rounded-xl text-xs font-extrabold uppercase bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>{t('admin.auditConsole')}</span>
            </span>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div
            className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between border shadow-xs animate-in fade-in duration-200 ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {feedbackMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedbackMessage.text}</span>
            </div>
            <button onClick={() => setFeedbackMessage(null)} className="text-slate-400 hover:text-slate-600 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Header & 7 Statistical Highlights */}
        <div className="bg-white rounded-3xl p-5 md:p-6 border border-emerald-900/10 shadow-xs space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>{t('admin.auditLogsTitle')}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </h1>
              <p className="text-xs text-slate-500">{t('admin.auditLogsSubtitle')}</p>
            </div>

            <button
              onClick={() => fetchLogs(currentPage)}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5 border border-slate-200 self-start md:self-center shadow-xs"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {/* 7 Core Statistical Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 pt-3 border-t border-slate-100 text-xs">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">{t('admin.totalActions')}</span>
              <div className="text-base font-extrabold text-slate-900 mt-0.5">{stats.totalActions}</div>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100">
              <span className="text-[10px] font-bold text-emerald-800 uppercase block">{t('admin.actionsToday')}</span>
              <div className="text-base font-extrabold text-emerald-900 mt-0.5">{stats.actionsToday}</div>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-100">
              <span className="text-[10px] font-bold text-amber-800 uppercase block">{t('admin.memberRemovals')}</span>
              <div className="text-base font-extrabold text-amber-900 mt-0.5">{stats.memberRemovals}</div>
            </div>
            <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-100">
              <span className="text-[10px] font-bold text-rose-800 uppercase block">{t('admin.accountDeletions')}</span>
              <div className="text-base font-extrabold text-rose-900 mt-0.5">{stats.accountDeletions}</div>
            </div>
            <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-100">
              <span className="text-[10px] font-bold text-blue-800 uppercase block">{t('admin.eventModifications')}</span>
              <div className="text-base font-extrabold text-blue-900 mt-0.5">{stats.eventModifications}</div>
            </div>
            <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-100">
              <span className="text-[10px] font-bold text-purple-800 uppercase block">{t('admin.permissionChanges')}</span>
              <div className="text-base font-extrabold text-purple-900 mt-0.5">{stats.permissionChanges}</div>
            </div>
            <div className="p-3 rounded-2xl bg-teal-50/70 border border-teal-100">
              <span className="text-[10px] font-bold text-teal-800 uppercase block">{t('admin.reversibleActions')}</span>
              <div className="text-base font-extrabold text-teal-900 mt-0.5">{stats.reversibleActions}</div>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('admin.filterSearchPlaceholder')}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-700"
            />
          </form>

          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end text-xs">
            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-700 focus:outline-none"
            >
              <option value="all">{t('admin.allCategories')}</option>
              <option value="members">Members & HR</option>
              <option value="events">Events</option>
              <option value="meetings">Meetings</option>
              <option value="tasks">Tasks</option>
              <option value="projects">Projects</option>
              <option value="bureau_positions">Bureau Roles</option>
              <option value="user_roles">User Roles</option>
              <option value="attendance">Attendance & XP</option>
              <option value="documents">Documents</option>
            </select>

            {/* Reversible Only Toggle */}
            <button
              onClick={() => {
                setReversibleOnly((prev) => !prev);
                setCurrentPage(1);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                reversibleOnly
                  ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>{t('admin.reversibleOnly')}</span>
            </button>
          </div>
        </div>

        {/* Activity Table */}
        <div className="bg-white rounded-3xl border border-emerald-900/10 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">{t('admin.actorCol')}</th>
                  <th className="py-3.5 px-4">{t('admin.actionCol')}</th>
                  <th className="py-3.5 px-4">{t('admin.affectedItemCol')}</th>
                  <th className="py-3.5 px-4">{t('admin.dateCol')}</th>
                  <th className="py-3.5 px-4">{t('admin.reasonCol')}</th>
                  <th className="py-3.5 px-4 text-center">{t('admin.statusCol')}</th>
                  <th className="py-3.5 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="inline-flex items-center gap-2">
                        <RotateCcw className="w-4 h-4 animate-spin text-emerald-700" />
                        <span>Loading audit records...</span>
                      </div>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No audit log records match the current filter.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const isReversible = log.can_undo && !log.is_undone;
                    const actorName = log.actor_name_snapshot || log.actor?.full_name || log.actor?.email || 'System';
                    const actorRole = log.actor_role_snapshot || 'Admin';

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Actor */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[11px] shrink-0">
                              {actorName.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-slate-900 truncate">{actorName}</span>
                              <span className="text-[10px] text-slate-400 uppercase">{actorRole}</span>
                            </div>
                          </div>
                        </td>

                        {/* Action Pill */}
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase inline-block ${
                              log.action.includes('DELETE') || log.action.includes('REMOVE')
                                ? 'bg-rose-100 text-rose-800'
                                : log.action.includes('SUSPEND')
                                ? 'bg-amber-100 text-amber-800'
                                : log.action.includes('RESTORE') || log.action.includes('REACTIVATE')
                                ? 'bg-teal-100 text-teal-800'
                                : log.action.includes('UNDO')
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>

                        {/* Affected Item */}
                        <td className="py-3 px-4 max-w-[200px]">
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-slate-900 truncate">
                              {log.entity_label_snapshot || log.entity_type}
                            </span>
                            <span className="text-[10px] text-slate-400 capitalize">{log.entity_type}</span>
                          </div>
                        </td>

                        {/* Date & Time */}
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap text-[11px] font-mono">
                          {formatTunisDate(log.created_at)} • {formatTunisTime(log.created_at)}
                        </td>

                        {/* Reason */}
                        <td className="py-3 px-4 max-w-[220px]">
                          <span className="text-[11px] text-slate-600 truncate block" title={log.reason || log.details || ''}>
                            {log.reason || log.details || '—'}
                          </span>
                        </td>

                        {/* Status / Undo */}
                        <td className="py-3 px-4 text-center">
                          {log.is_undone ? (
                            <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-extrabold border border-purple-200">
                              {t('admin.undone')}
                            </span>
                          ) : isReversible ? (
                            <button
                              onClick={() => handleUndo(log.id)}
                              disabled={undoingLogId === log.id}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200 transition-colors inline-flex items-center gap-1 shadow-2xs"
                            >
                              <Undo2 className="w-3 h-3" />
                              <span>{t('admin.undoAction')}</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-semibold">{t('admin.notReversible')}</span>
                          )}
                        </td>

                        {/* Details Modal Trigger */}
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => inspectLogDetails(log)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-emerald-800 transition-colors"
                            title="Inspect full audit change"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {logs.length} of {totalCount} total audit records
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 font-bold"
              >
                Previous
              </button>
              <span className="px-2 font-mono font-bold text-slate-700">Page {currentPage}</span>
              <button
                disabled={logs.length < 25}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-3 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 font-bold"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            AUDIT RECORD DETAILS & VISUAL DIFF MODAL
        ========================================================================= */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <History className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">{t('admin.viewDetails')}</h3>
                    <span className="font-mono text-[10px] text-slate-400">ID: {selectedLog.id}</span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Conflict Alert Banner if detected */}
              {conflictWarning && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">{t('admin.undoConflict')}</p>
                    <p className="text-[11px] text-amber-800 mt-0.5">{conflictWarning}</p>
                  </div>
                </div>
              )}

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">{t('admin.actorCol')}</span>
                  <span className="font-bold text-slate-900">
                    {selectedLog.actor_name_snapshot || selectedLog.actor?.full_name || 'System'}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Role: {selectedLog.actor_role_snapshot || 'Admin'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">{t('admin.dateCol')}</span>
                  <span className="font-mono text-slate-900 font-bold">
                    {formatTunisDate(selectedLog.created_at)} at {formatTunisTime(selectedLog.created_at)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono block">Tunis UTC+1</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">{t('admin.actionCol')}</span>
                  <span className="font-extrabold text-emerald-800">{selectedLog.action}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">{t('admin.affectedItemCol')}</span>
                  <span className="font-bold text-slate-900 truncate block">
                    {selectedLog.entity_label_snapshot || selectedLog.entity_type}
                  </span>
                </div>
                {selectedLog.reason && (
                  <div className="col-span-2 pt-1 border-t border-slate-200/60">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">{t('admin.reasonCol')}</span>
                    <p className="text-slate-800 font-medium italic mt-0.5">"{selectedLog.reason}"</p>
                  </div>
                )}
              </div>

              {/* Visual Diff Section: Old vs New Values */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{t('admin.diffCol')}</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Previous State (Red / Old) */}
                  <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200">
                    <span className="text-[10px] font-bold text-rose-800 uppercase block mb-1.5">
                      {t('admin.diffRemoved')}
                    </span>
                    <pre className="font-mono text-[10px] text-rose-950 whitespace-pre-wrap break-all overflow-x-auto bg-white/60 p-2 rounded-xl">
                      {JSON.stringify(selectedLog.previous_state || selectedLog.old_values || 'None (Initial state)', null, 2)}
                    </pre>
                  </div>

                  {/* New State (Green / Current) */}
                  <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block mb-1.5">
                      {t('admin.diffAdded')}
                    </span>
                    <pre className="font-mono text-[10px] text-emerald-950 whitespace-pre-wrap break-all overflow-x-auto bg-white/60 p-2 rounded-xl">
                      {JSON.stringify(selectedLog.new_state || selectedLog.new_values || 'None', null, 2)}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                >
                  Close
                </button>

                {selectedLog.can_undo && !selectedLog.is_undone && (
                  <button
                    onClick={() => handleUndo(selectedLog.id, Boolean(conflictWarning))}
                    disabled={undoingLogId === selectedLog.id}
                    className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span>{conflictWarning ? 'Force Undo This Change' : t('admin.undoAction')}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
