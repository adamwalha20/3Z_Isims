'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { NotificationItem, NotificationCategory } from '@/types/database.types';
import {
  Bell,
  CheckCircle2,
  Trash2,
  Search,
  Filter,
  Calendar,
  CheckSquare,
  Sparkles,
  Megaphone,
  Award,
  AlertTriangle,
  ArrowRight,
  Clock,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

type FilterTab = 'all' | 'unread' | 'meetings' | 'tasks' | 'events' | 'announcements' | 'other';

export default function NotificationsPage() {
  const router = useRouter();
  const {
    notifications,
    unreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    clearAllNotifications,
    activeRole,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const unreadCount = unreadNotificationCount ?? notifications.filter((n) => !n.is_read && !n.read_at).length;

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // Tab filter
      if (activeTab === 'unread') {
        if (n.is_read || n.read_at) return false;
      } else if (activeTab === 'meetings') {
        if (n.category !== 'meetings') return false;
      } else if (activeTab === 'tasks') {
        if (n.category !== 'tasks' && n.category !== 'deadlines') return false;
      } else if (activeTab === 'events') {
        if (n.category !== 'events') return false;
      } else if (activeTab === 'announcements') {
        if (n.category !== 'announcements') return false;
      } else if (activeTab === 'other') {
        if (['meetings', 'tasks', 'deadlines', 'events', 'announcements'].includes(n.category)) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = n.title?.toLowerCase().includes(q);
        const matchesDesc = (n.description || n.body || '').toLowerCase().includes(q);
        const matchesCat = n.category?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesCat) return false;
      }

      return true;
    });
  }, [notifications, activeTab, searchQuery]);

  const handleNotificationClick = (n: NotificationItem) => {
    markNotificationRead(n.id);
    if (n.destination_url) {
      router.push(n.destination_url);
    }
  };

  const getCategoryIcon = (category?: NotificationCategory | string) => {
    switch (category) {
      case 'meetings':
        return <Calendar className="w-5 h-5 text-blue-600" />;
      case 'tasks':
      case 'deadlines':
        return <CheckSquare className="w-5 h-5 text-emerald-600" />;
      case 'events':
        return <Sparkles className="w-5 h-5 text-amber-600" />;
      case 'announcements':
        return <Megaphone className="w-5 h-5 text-purple-600" />;
      case 'xp_achievements':
        return <Award className="w-5 h-5 text-amber-500" />;
      case 'bureau_updates':
      case 'system_alerts':
        return <ShieldAlert className="w-5 h-5 text-rose-600" />;
      default:
        return <Bell className="w-5 h-5 text-slate-600" />;
    }
  };

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-100 text-rose-700 animate-pulse border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
            Urgent
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
            High
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
            Low
          </span>
        );
      default:
        return null;
    }
  };

  const tabs: { key: FilterTab; label: string; count?: number }[] = [
    { key: 'all', label: 'All', count: notifications.length },
    { key: 'unread', label: 'Unread', count: unreadCount },
    { key: 'meetings', label: 'Meetings' },
    { key: 'tasks', label: 'Tasks' },
    { key: 'events', label: 'Events' },
    { key: 'announcements', label: 'Announcements' },
    { key: 'other', label: 'Other' },
  ];

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header Banner */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-emerald-900/10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
              <Bell className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Notification Center</h1>
                {unreadCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 font-extrabold text-xs">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              <p className="text-xs md:text-sm text-slate-500 mt-1">
                Stay updated with meetings, task assignments, verified achievements, and club announcements.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {unreadCount > 0 && (
              <button
                onClick={markAllNotificationsRead}
                className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>Mark All Read</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Clear all notifications? This cannot be undone.')) {
                    clearAllNotifications();
                  }
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Clear all notifications"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar & Search */}
        <div className="bg-white rounded-3xl p-4 border border-emerald-900/10 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search notifications by title, details, category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-800"
              />
            </div>
          </div>

          {/* Tab Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-2.5">
          {filteredNotifications.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-emerald-900/10 shadow-sm space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-extrabold text-slate-800">No Notifications</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery
                  ? `No notifications found matching "${searchQuery}".`
                  : activeTab === 'unread'
                  ? "You're all caught up! No unread notifications to review."
                  : 'No notification records match this filter.'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const isUnread = !notif.is_read && !notif.read_at;
              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`group bg-white rounded-2xl p-4 border transition-all cursor-pointer relative hover:shadow-md ${
                    isUnread
                      ? 'border-emerald-300 ring-1 ring-emerald-200/50 bg-gradient-to-r from-emerald-50/40 via-white to-white'
                      : 'border-slate-100 hover:border-emerald-200'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    {/* Category Icon */}
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                      {getCategoryIcon(notif.category)}
                    </div>

                    {/* Notification Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                            {notif.title}
                          </h4>
                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0"></span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {getPriorityBadge(notif.priority)}
                          <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {notif.created_at
                              ? new Date(notif.created_at).toLocaleDateString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Recently'}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        {notif.description || notif.body}
                      </p>

                      {/* Footer Metadata & Direct Action Link */}
                      <div className="pt-2 flex items-center justify-between gap-3 text-[11px] font-semibold">
                        <div className="flex items-center gap-2 text-slate-400">
                          <span className="capitalize px-2 py-0.5 bg-slate-50 rounded-lg text-slate-600 border border-slate-100 text-[10px]">
                            {notif.category?.replace('_', ' ') || 'Notification'}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-emerald-700 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                            <span>Open details</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notif.id);
                            }}
                            className="text-slate-300 hover:text-rose-600 p-1 rounded-lg transition-colors"
                            title="Delete notification"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
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
