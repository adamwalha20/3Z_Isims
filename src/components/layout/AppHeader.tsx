'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, ActiveRole } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/context';
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher';
import { isSuperAdminEmail } from '@/lib/constants/auth';
import { getSafeAvatar } from '@/lib/constants/avatars';
import { NotificationItem } from '@/types/database.types';
import {
  Bell,
  Shield,
  User,
  CheckCircle,
  ExternalLink,
  LogOut,
  ChevronDown,
  Calendar,
  CheckSquare,
  Sparkles,
  Megaphone,
  Award,
  AlertTriangle,
} from 'lucide-react';

export default function AppHeader() {
  const router = useRouter();
  const { t, isRtl } = useTranslation();
  const { user, activeRole, setActiveRole, activeBureauPosition, setActiveBureauPosition, bureauMembers, notifications, unreadNotificationCount, markNotificationRead, markAllNotificationsRead, signOut } = useAuth();
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  const unreadCount = unreadNotificationCount ?? notifications.filter((n) => !n.is_read && !n.read_at).length;
  const isSuperAdmin = isSuperAdminEmail(user?.email);

  const handleNotificationClick = (n: NotificationItem) => {
    markNotificationRead(n.id);
    setShowNotifPanel(false);
    if (n.destination_url) {
      router.push(n.destination_url);
    }
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'meetings':
        return <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />;
      case 'tasks':
      case 'deadlines':
        return <CheckSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
      case 'events':
        return <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />;
      case 'announcements':
        return <Megaphone className="w-3.5 h-3.5 text-purple-600 shrink-0" />;
      case 'xp_achievements':
        return <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
      case 'system_alerts':
      case 'bureau_updates':
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-slate-500 shrink-0" />;
    }
  };

  const allRoleOptions: { key: ActiveRole; label: string; desc: string; icon: string }[] = [
    { key: 'bureau', label: 'Bureau Officer', desc: 'Full operational & publishing privileges', icon: 'verified_user' },
    { key: 'admin', label: 'Administrator', desc: 'Membership approval & governance logs', icon: 'shield_person' },
    { key: 'lead', label: 'Department Lead', desc: 'Manage Training & Innovation unit', icon: 'stars' },
    { key: 'member', label: 'Active Member', desc: 'Student view, assigned tasks & badge pass', icon: 'person' },
  ];

  const roleOptions = allRoleOptions.filter((r) => r.key !== 'admin' || isSuperAdmin);

  const bureauPositionBase = [
    { key: 'vice_president', label: 'Vice President', icon: 'shield_with_heart' },
    { key: 'secretary_general', label: 'Secretary General', icon: 'history_edu' },
    { key: 'treasurer', label: 'Treasurer', icon: 'payments' },
    { key: 'hr_manager', label: 'HR Manager', icon: 'badge' },
    { key: 'marketing_design_manager', label: 'Marketing & Design', icon: 'palette' },
    { key: 'sustainable_campus_manager', label: 'Sustainable Campus', icon: 'eco' },
    { key: 'events_manager', label: 'Events Manager', icon: 'event' },
    { key: 'project_manager', label: 'Project Manager', icon: 'rocket_launch' },
    { key: 'partnerships_sponsorship_manager', label: 'Partnerships Lead', icon: 'handshake' },
    { key: 'all', label: 'All Bureau Modules', icon: 'dashboard' },
  ];

  const bureauPositionList = bureauPositionBase.map((item) => {
    if (item.key === 'all') return item;
    const bm = bureauMembers.find((m) => m.position_key === item.key);
    const holder = bm?.member_name && bm.member_name !== 'Unassigned' ? ` (${bm.member_name.split(' ')[0]})` : ' (Vacant)';
    return {
      ...item,
      label: `${item.label}${holder}`,
    };
  });

  const currentDisplayTitle =
    activeRole === 'bureau' && activeBureauPosition !== 'all'
      ? activeBureauPosition.replace(/_/g, ' ')
      : `${activeRole} role`;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 pt-safe bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="h-14 px-4 max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Logo & Campus Chapter */}
        <Link href="/" className="flex items-center gap-2.5 min-w-0 group">
          <div className="w-8 h-8 rounded-lg bg-emerald-800 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs transition-colors group-hover:bg-emerald-900">
            3Z
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[14px] tracking-tight text-slate-900">3ZERO CLUB</span>
              <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/70 px-1.5 py-0.2 rounded-md">
                ISIMS
              </span>
            </div>
            <span className="text-[10px] font-normal text-slate-500 truncate">{t('nav.chapterWorkspace')}</span>
          </div>
        </Link>

        {/* Center: Live Role Context Switcher Badge (Admin Only) */}
        {isSuperAdmin && (
          <div className="relative">
            <button
              onClick={() => setShowRoleDropdown(!showRoleDropdown)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium transition-colors shadow-xs"
              title={t('nav.switchRoleSimulation')}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              <span className="capitalize truncate max-w-[140px] sm:max-w-none">{currentDisplayTitle}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {showRoleDropdown && (
              <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 w-72 bg-white rounded-xl shadow-lg border border-slate-200 p-1.5 z-50 max-h-[80vh] overflow-y-auto no-scrollbar">
                <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  {t('nav.securityRoleMode')}
                </div>
                {roleOptions.map((role) => (
                  <button
                    key={role.key}
                    onClick={() => {
                      setActiveRole(role.key);
                      if (role.key !== 'bureau') {
                        setActiveBureauPosition('all');
                        setShowRoleDropdown(false);
                      }
                    }}
                    className={`w-full text-left p-2 rounded-lg flex items-center gap-2.5 transition-colors ${
                      activeRole === role.key ? 'bg-emerald-50 text-emerald-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px] text-emerald-700">{role.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium">{role.label}</div>
                      <div className="text-[10px] text-slate-500 truncate">{role.desc}</div>
                    </div>
                  </button>
                ))}

                {/* Functional Bureau Positions Switcher */}
                <div className="px-2 pt-2.5 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-t border-slate-100 mt-1.5">
                  {t('nav.bureauWorkspaces')}
                </div>
                <div className="grid grid-cols-1 gap-0.5">
                  {bureauPositionList.map((bp) => (
                    <button
                      key={bp.key}
                      onClick={() => {
                        setActiveRole('bureau');
                        setActiveBureauPosition(bp.key as any);
                        setShowRoleDropdown(false);
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2 text-xs transition-colors ${
                        activeBureauPosition === bp.key
                          ? 'bg-emerald-700 text-white font-semibold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">{bp.icon}</span>
                      <span className="truncate">{bp.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Right: NFC Ready Pill, Notification Bell & User Avatar */}
        <div className="flex items-center gap-2 shrink-0">
          {/* NFC Ready Capsule */}
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span className="text-[11px] font-medium tracking-wide">{t('nav.nfcPass')}</span>
          </div>

          {/* Quick Admin Role Management Shortcut */}
          {isSuperAdmin && (
            <Link
              href="/admin/roles"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200/70 text-rose-700 text-xs font-medium transition-colors"
            >
              <Shield className="w-3.5 h-3.5 text-rose-700" />
              <span>{t('nav.roles')}</span>
            </Link>
          )}

          {/* Language Switcher */}
          <LanguageSwitcher variant="header" />

          {/* Notifications Button */}
          <div className="relative">
            <button
              onClick={() => setShowNotifPanel(!showNotifPanel)}
              aria-label={t('notifications.title')}
              className="w-8 h-8 relative flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-600 ring-2 ring-white"></span>
              )}
            </button>

            {/* Notifications Panel */}
            {showNotifPanel && (
              <div className="absolute right-0 top-full mt-1.5 w-80 sm:w-92 bg-white rounded-xl shadow-lg border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs text-slate-900">{t('notifications.title')}</span>
                    {unreadCount > 0 ? (
                      <span className="px-1.5 py-0.2 rounded-md bg-rose-50 text-rose-700 border border-rose-200/60 text-[10px] font-medium">
                        {t('nav.newNotificationsCount', { count: unreadCount })}
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/60 text-[10px] font-medium">
                        {t('nav.allCaughtUp')}
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllNotificationsRead}
                      className="text-[10px] font-medium text-emerald-700 hover:text-emerald-900 transition-colors"
                    >
                      {t('common.markAllRead')}
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-1 max-h-80 overflow-y-auto pt-2 no-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      {t('nav.noNotifications')}
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((n) => {
                      const isUnread = !n.is_read && !n.read_at;
                      return (
                        <div
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={`p-2 rounded-lg text-left transition-colors cursor-pointer flex items-start gap-2.5 ${
                            isUnread
                              ? 'bg-emerald-50/60 hover:bg-emerald-50 border border-emerald-100'
                              : 'hover:bg-slate-50 border border-transparent'
                          }`}
                        >
                          <div className="p-1 rounded-md bg-white border border-slate-200/60 shrink-0 mt-0.5">
                            {getCategoryIcon(n.category)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-semibold text-slate-900 truncate">
                                {n.title}
                              </span>
                              {n.priority === 'urgent' && (
                                <span className="px-1 py-0.2 rounded bg-rose-100 text-rose-700 text-[9px] font-semibold uppercase shrink-0">
                                  {t('common.urgent')}
                                </span>
                              )}
                              {n.priority === 'high' && (
                                <span className="px-1 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-semibold uppercase shrink-0">
                                  {t('common.high')}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-snug">
                              {n.description || n.body}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400">
                              <span className="capitalize">{n.category?.replace('_', ' ') || 'Notification'}</span>
                              <span>•</span>
                              <span>
                                {n.created_at
                                  ? new Date(n.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })
                                  : t('time.now')}
                              </span>
                            </div>
                          </div>
                          {isUnread && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0 mt-2"></span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="pt-2 mt-1.5 border-t border-slate-100">
                  <Link
                    href="/notifications"
                    onClick={() => setShowNotifPanel(false)}
                    className="w-full text-center py-1.5 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 border border-slate-200"
                  >
                    <span>{t('nav.viewAllNotifications')}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Avatar */}
          <Link href="/profile" className="relative shrink-0">
            <div className="w-8 h-8 rounded-full border border-slate-200 overflow-hidden hover:ring-2 hover:ring-emerald-700 transition-all">
              <img
                src={getSafeAvatar(user?.avatar_path)}
                alt={user?.full_name || t('nav.memberProfile')}
                className="w-full h-full object-cover"
              />
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
