'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, ActiveRole } from '@/lib/auth-context';
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
  const { user, activeRole, setActiveRole, activeBureauPosition, setActiveBureauPosition, bureauMembers, notifications, unreadNotificationCount, markNotificationRead, markAllNotificationsRead, signOut } = useAuth();
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  const unreadCount = unreadNotificationCount ?? notifications.filter((n) => !n.is_read && !n.read_at).length;
  const isSuperAdmin = user?.email?.toLowerCase() === 'adamwalha20@gmail.com';

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
    <header className="fixed top-0 left-0 right-0 z-50 pt-safe bg-[#f4f9f6]/95 backdrop-blur-xl border-b border-emerald-900/10 shadow-xs">
      <div className="h-16 px-4 max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Logo & Campus Chapter */}
        <Link href="/" className="flex items-center gap-2.5 min-w-0 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-800 to-emerald-500 p-0.5 shadow-sm flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px] text-emerald-700 font-bold">eco</span>
            </div>
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-[16px] tracking-tight text-slate-900">3ZERO CLUB</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded-full">
                ISIMS
              </span>
            </div>
            <span className="text-[11px] font-medium text-slate-500 truncate">Sfax Chapter Workspace</span>
          </div>
        </Link>

        {/* Center: Live Role Context Switcher Badge (Admin Only) */}
        {isSuperAdmin && (
          <div className="relative">
            <button
              onClick={() => setShowRoleDropdown(!showRoleDropdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-900 text-xs font-bold transition-all shadow-xs"
              title="Click to simulate different access roles and functional bureau positions"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="capitalize truncate max-w-[140px] sm:max-w-none">{currentDisplayTitle}</span>
              <ChevronDown className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            </button>

            {showRoleDropdown && (
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-72 bg-white rounded-3xl shadow-2xl border border-slate-100 p-2 z-50 max-h-[80vh] overflow-y-auto no-scrollbar">
                <div className="px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Security Role Mode
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
                    className={`w-full text-left p-2 rounded-xl flex items-center gap-2.5 transition-colors ${
                      activeRole === role.key ? 'bg-emerald-50 text-emerald-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px] text-emerald-700">{role.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold">{role.label}</div>
                      <div className="text-[10px] text-slate-500 truncate">{role.desc}</div>
                    </div>
                  </button>
                ))}

                {/* Functional Bureau Positions Switcher */}
                <div className="px-2 pt-3 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-t border-slate-100 mt-2">
                  Bureau Position Workspaces
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {bureauPositionList.map((bp) => (
                    <button
                      key={bp.key}
                      onClick={() => {
                        setActiveRole('bureau');
                        setActiveBureauPosition(bp.key as any);
                        setShowRoleDropdown(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl flex items-center gap-2 text-xs transition-colors ${
                        activeBureauPosition === bp.key
                          ? 'bg-emerald-700 text-white font-bold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">{bp.icon}</span>
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
          {/* NFC Ready Capsule (from Stitch Badge reference) */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-bold tracking-wider uppercase">NFC Pass Ready</span>
          </div>

          {/* Quick Admin Role Management Shortcut */}
          {isSuperAdmin && (
            <Link
              href="/admin/roles"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-xs font-bold transition-all shadow-xs"
            >
              <Shield className="w-3.5 h-3.5 text-rose-700" />
              <span>Assign Roles</span>
            </Link>
          )}

          {/* Notifications Button */}
          <div className="relative">
            <button
              onClick={() => setShowNotifPanel(!showNotifPanel)}
              aria-label="Notifications"
              className="w-9 h-9 relative flex items-center justify-center rounded-xl bg-white border border-emerald-900/10 text-slate-700 hover:text-emerald-800 hover:bg-emerald-50 transition-all shadow-xs"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
                </span>
              )}
            </button>

            {/* Notifications Panel */}
            {showNotifPanel && (
              <div className="absolute right-0 top-full mt-2 w-84 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-100 p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-xs text-slate-900">Notifications</span>
                    {unreadCount > 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                        {unreadCount} new
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        All caught up
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllNotificationsRead}
                      className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 transition-colors"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 max-h-80 overflow-y-auto pt-2.5 no-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((n) => {
                      const isUnread = !n.is_read && !n.read_at;
                      return (
                        <div
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={`p-2.5 rounded-2xl text-left transition-all cursor-pointer flex items-start gap-2.5 group ${
                            isUnread
                              ? 'bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-100'
                              : 'hover:bg-slate-50 border border-transparent'
                          }`}
                        >
                          <div className="p-1.5 rounded-xl bg-white shadow-xs shrink-0 mt-0.5">
                            {getCategoryIcon(n.category)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold text-slate-900 truncate group-hover:text-emerald-800 transition-colors">
                                {n.title}
                              </span>
                              {n.priority === 'urgent' && (
                                <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[9px] font-extrabold uppercase animate-pulse shrink-0">
                                  Urgent
                                </span>
                              )}
                              {n.priority === 'high' && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-bold uppercase shrink-0">
                                  High
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-snug">
                              {n.description || n.body}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-medium">
                              <span className="capitalize">{n.category?.replace('_', ' ') || 'Notification'}</span>
                              <span>•</span>
                              <span>
                                {n.created_at
                                  ? new Date(n.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })
                                  : 'Recently'}
                              </span>
                            </div>
                          </div>
                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0 mt-2"></span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="pt-2.5 mt-2 border-t border-slate-100">
                  <Link
                    href="/notifications"
                    onClick={() => setShowNotifPanel(false)}
                    className="w-full text-center py-2 px-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 text-emerald-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-slate-100 hover:border-emerald-200"
                  >
                    <span>Open Notification Center</span>
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Avatar */}
          <Link href="/profile" className="relative shrink-0 group">
            <div className="w-9 h-9 rounded-full ring-2 ring-emerald-500 p-0.5 bg-white shadow-xs overflow-hidden group-hover:scale-105 transition-transform">
              <img
                src={user?.avatar_path || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'}
                alt={user?.full_name || 'Member profile'}
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></span>
          </Link>
        </div>
      </div>
    </header>
  );
}
