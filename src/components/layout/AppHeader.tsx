'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth, ActiveRole } from '@/lib/auth-context';
import {
  Bell,
  Shield,
  User,
  CheckCircle,
  ExternalLink,
  LogOut,
  ChevronDown,
} from 'lucide-react';

export default function AppHeader() {
  const { user, activeRole, setActiveRole, notifications, markNotificationRead, markAllNotificationsRead, signOut } = useAuth();
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const roleOptions: { key: ActiveRole; label: string; desc: string; icon: string }[] = [
    { key: 'bureau', label: 'Bureau Officer', desc: 'Full operational & publishing privileges', icon: 'verified_user' },
    { key: 'admin', label: 'Administrator', desc: 'Membership approval & governance logs', icon: 'shield_person' },
    { key: 'lead', label: 'Department Lead', desc: 'Manage Training & Innovation unit', icon: 'stars' },
    { key: 'member', label: 'Active Member', desc: 'Student view, assigned tasks & badge pass', icon: 'person' },
  ];

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

        {/* Center: Live Role Context Switcher Badge */}
        <div className="relative">
          <button
            onClick={() => setShowRoleDropdown(!showRoleDropdown)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-900 text-xs font-bold transition-all shadow-xs"
            title="Click to simulate different access roles"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="capitalize">{activeRole} Role</span>
            <ChevronDown className="w-3.5 h-3.5 text-emerald-700" />
          </button>

          {showRoleDropdown && (
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-50">
              <div className="px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Switch Operational View
              </div>
              {roleOptions.map((role) => (
                <button
                  key={role.key}
                  onClick={() => {
                    setActiveRole(role.key);
                    setShowRoleDropdown(false);
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
            </div>
          )}
        </div>

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
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 p-3 z-50">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-slate-900">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllNotificationsRead}
                      className="text-[10px] font-bold text-emerald-700 hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pt-2 no-scrollbar">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                      className={`p-2 rounded-xl text-left transition-colors cursor-pointer ${
                        !n.read_at ? 'bg-emerald-50/70 border border-emerald-100' : 'bg-slate-50'
                      }`}
                    >
                      <div className="text-[11px] font-bold text-slate-900">{n.title}</div>
                      <div className="text-[10px] text-slate-600 line-clamp-2 mt-0.5">{n.body}</div>
                    </div>
                  ))}
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
