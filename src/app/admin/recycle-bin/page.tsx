'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/context';
import {
  Trash2,
  RotateCcw,
  Undo2,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  Search,
  Filter,
  Calendar,
  Layers,
  FileText,
  User,
  Megaphone,
  CheckSquare,
  Video,
  Lock,
  X,
  ShieldAlert,
} from 'lucide-react';
import { formatTunisDate, formatTunisTime } from '@/lib/email/timezone-utils';
import { isSuperAdminEmail } from '@/lib/constants/auth';

interface DeletedItem {
  id: string;
  title: string;
  entityType: string;
  tableName: string;
  deletedAt: string;
  deletedBy: string;
  deletionReason: string;
  metadata?: Record<string, any>;
}

export default function AdminRecycleBinPage() {
  const { user, isAdmin, activeRole, restoreRecycleBinRecord, permanentPurgeRecord } = useAuth();
  const { t } = useTranslation();

  const [items, setItems] = useState<DeletedItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedTab, setSelectedTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [operatingId, setOperatingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const isSuperAdmin = isSuperAdminEmail(user?.email);
  const isAuthorized = isAdmin || activeRole === 'admin' || isSuperAdmin;

  const fetchDeleted = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/recycle-bin');
      const data = await res.json();
      if (res.ok && data.success) {
        setItems(data.items || []);
      }
    } catch (err: any) {
      console.warn('Failed to load recycle bin:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchDeleted();
    }
  }, [isAuthorized]);

  const handleRestore = async (item: DeletedItem) => {
    setOperatingId(item.id);
    setFeedback(null);
    try {
      const res = await restoreRecycleBinRecord(item.entityType, item.id);
      if (res.success) {
        setFeedback({ text: t('admin.itemRestored'), type: 'success' });
        setItems((prev) => prev.filter((i) => i.id !== item.id));
      } else {
        setFeedback({ text: res.error || 'Failed to restore item.', type: 'error' });
      }
    } catch (err: any) {
      setFeedback({ text: err?.message || 'Error executing restore.', type: 'error' });
    } finally {
      setOperatingId(null);
    }
  };

  const handlePurge = async (item: DeletedItem) => {
    if (!confirm(t('admin.confirmPurge'))) {
      return;
    }

    setOperatingId(item.id);
    setFeedback(null);
    try {
      const res = await permanentPurgeRecord(item.entityType, item.id);
      if (res.success) {
        setFeedback({ text: t('admin.itemPurged'), type: 'success' });
        setItems((prev) => prev.filter((i) => i.id !== item.id));
      } else {
        setFeedback({ text: res.error || 'Failed to purge item.', type: 'error' });
      }
    } catch (err: any) {
      setFeedback({ text: err?.message || 'Error executing purge.', type: 'error' });
    } finally {
      setOperatingId(null);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedTab !== 'all') {
        const tabLower = selectedTab.toLowerCase();
        if (tabLower === 'events' && item.entityType !== 'event') return false;
        if (tabLower === 'meetings' && item.entityType !== 'meeting') return false;
        if (tabLower === 'tasks' && item.entityType !== 'task') return false;
        if (tabLower === 'projects' && item.entityType !== 'project') return false;
        if (tabLower === 'documents' && item.entityType !== 'document') return false;
        if (tabLower === 'announcements' && item.entityType !== 'announcement') return false;
        if (tabLower === 'members' && item.entityType !== 'member') return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchReason = item.deletionReason.toLowerCase().includes(q);
        const matchDeleter = item.deletedBy.toLowerCase().includes(q);
        if (!matchTitle && !matchReason && !matchDeleter) return false;
      }

      return true;
    });
  }, [items, selectedTab, searchQuery]);

  if (!isAuthorized) {
    return (
      <AppShell>
        <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-base font-extrabold text-slate-900">{t('admin.adminOnly')}</h2>
          <p className="text-xs text-slate-500 max-w-sm">{t('admin.adminOnlyDesc')}</p>
        </div>
      </AppShell>
    );
  }

  const tabOptions = [
    { key: 'all', label: t('admin.allTypes'), count: items.length },
    { key: 'events', label: t('admin.eventsTab'), count: items.filter((i) => i.entityType === 'event').length },
    { key: 'meetings', label: t('admin.meetingsTab'), count: items.filter((i) => i.entityType === 'meeting').length },
    { key: 'tasks', label: t('admin.tasksTab'), count: items.filter((i) => i.entityType === 'task').length },
    { key: 'projects', label: t('admin.projectsTab'), count: items.filter((i) => i.entityType === 'project').length },
    { key: 'documents', label: t('admin.documentsTab'), count: items.filter((i) => i.entityType === 'document').length },
    { key: 'announcements', label: t('admin.announcementsTab'), count: items.filter((i) => i.entityType === 'announcement').length },
    { key: 'members', label: t('admin.membersTab'), count: items.filter((i) => i.entityType === 'member').length },
  ];

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 pb-24">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Link
            href="/admin/audit-logs"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Activity & Audit Logs</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl text-xs font-extrabold uppercase bg-rose-100 text-rose-900 border border-rose-300 flex items-center gap-1.5">
              <Trash2 className="w-4 h-4 text-rose-700" />
              <span>{t('admin.recycleBinTitle')}</span>
            </span>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between border shadow-xs animate-in fade-in duration-200 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Header Banner */}
        <div className="bg-white rounded-3xl p-5 md:p-6 border border-emerald-900/10 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>{t('admin.recycleBinTitle')}</span>
              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                {items.length} Archived
              </span>
            </h1>
            <p className="text-xs text-slate-500">{t('admin.recycleBinSubtitle')}</p>
          </div>

          <button
            onClick={fetchDeleted}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5 border border-slate-200 self-start md:self-center shadow-xs"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Vault</span>
          </button>
        </div>

        {/* Tab & Search Bar */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold">
            {tabOptions.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedTab(tab.key)}
                className={`px-3.5 py-1.5 rounded-full transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  selectedTab === tab.key
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  selectedTab === tab.key ? 'bg-emerald-950 text-emerald-200' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by title, reason, or who deleted..."
              className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-700 shadow-xs"
            />
          </div>
        </div>

        {/* Deleted Items List */}
        <div className="flex flex-col gap-3">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
              <RotateCcw className="w-5 h-5 animate-spin mx-auto text-emerald-700 mb-2" />
              <span className="text-xs font-semibold">Scanning soft-deleted archives...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200 flex flex-col items-center gap-2">
              <Trash2 className="w-8 h-8 text-slate-300" />
              <span className="text-xs font-bold text-slate-600">{t('admin.noRecycleItems')}</span>
              <span className="text-[11px] text-slate-400 max-w-sm">
                Records soft-deleted by Bureau officers or HR Managers will appear here for one-click restoration.
              </span>
            </div>
          ) : (
            filteredItems.map((item) => {
              const isOperating = operatingId === item.id;

              return (
                <div
                  key={`${item.entityType}-${item.id}`}
                  className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs hover:border-emerald-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-700 border border-rose-100 flex items-center justify-center shrink-0">
                      {item.entityType === 'event' ? (
                        <Calendar className="w-5 h-5" />
                      ) : item.entityType === 'meeting' ? (
                        <Video className="w-5 h-5" />
                      ) : item.entityType === 'task' ? (
                        <CheckSquare className="w-5 h-5" />
                      ) : item.entityType === 'project' ? (
                        <Layers className="w-5 h-5" />
                      ) : item.entityType === 'document' ? (
                        <FileText className="w-5 h-5" />
                      ) : item.entityType === 'announcement' ? (
                        <Megaphone className="w-5 h-5" />
                      ) : (
                        <User className="w-5 h-5" />
                      )}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 text-slate-700">
                          {item.entityType}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {t('admin.deletedAt')} {formatTunisDate(item.deletedAt)} • {formatTunisTime(item.deletedAt)}
                        </span>
                      </div>

                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate mt-0.5">
                        {item.title}
                      </h4>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        <span className="font-semibold text-slate-700">{t('admin.deletedBy')}: {item.deletedBy}</span>
                        {item.deletionReason && (
                          <>
                            <span>•</span>
                            <span className="italic truncate">"{item.deletionReason}"</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => handleRestore(item)}
                      disabled={isOperating}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${isOperating ? 'animate-spin' : ''}`} />
                      <span>{t('admin.restoreItem')}</span>
                    </button>

                    {isSuperAdmin && (
                      <button
                        onClick={() => handlePurge(item)}
                        disabled={isOperating}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-colors flex items-center gap-1 disabled:opacity-50"
                        title={t('admin.permanentDelete')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Purge</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </AppShell>
  );
}
