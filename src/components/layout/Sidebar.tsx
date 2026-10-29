'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard,
  CheckSquare,
  Rocket,
  Calendar,
  FileText,
  Megaphone,
  FolderLock,
  Layers,
  Users,
  ShieldCheck,
  UserCheck,
  Settings,
  HelpCircle,
  Trophy,
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const { activeRole, user, isAdmin } = useAuth();
  const isSuperAdmin = user?.email?.toLowerCase() === 'adamwalha20@gmail.com' || isAdmin;
  const isBureauOrAdmin = activeRole === 'bureau' || activeRole === 'admin' || isSuperAdmin;

  // General Navigation for all members
  const coreNavLinks = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'My Tasks', href: '/tasks', icon: CheckSquare, badge: 'Tasks' },
    { label: 'Ranking & Leaderboard', href: '/ranking', icon: Trophy, badge: 'XP' },
    { label: 'Calendar & Events', href: '/events', icon: Calendar },
    { label: 'Announcements', href: '/announcements', icon: Megaphone },
  ];

  // Role-restricted management modules (Bureau & Admin only)
  const bureauNavLinks = [
    { label: '3Z Lab Projects', href: '/projects', icon: Rocket },
    { label: 'Meetings & PV', href: '/meetings', icon: FileText },
    { label: 'Document Vault', href: '/documents', icon: FolderLock },
    { label: 'Departments', href: '/departments', icon: Layers },
    { label: 'Members Directory', href: '/members', icon: Users },
  ];

  const adminLinks = [
    { label: 'Admin Governance', href: '/admin', icon: ShieldCheck },
    { label: 'Member Approvals', href: '/admin/members', icon: UserCheck },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-emerald-900/10 min-h-[calc(100vh-4rem)] pt-6 pb-8 px-3 shrink-0">
      {/* Chapter Context Banner */}
      <div className="px-3 py-2.5 mb-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50/60 border border-emerald-200/60 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
          3Z
        </div>
        <div className="min-w-0">
          <div className="text-xs font-extrabold text-emerald-950 truncate">ISIMS Sfax Chapter</div>
          <div className="text-[10px] text-emerald-700 font-medium">Verified Academic Node</div>
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 flex flex-col gap-1 overflow-y-auto no-scrollbar">
        <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Chapter Hub
        </div>
        {coreNavLinks.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200/70 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        {/* Bureau Operations (Visible to Bureau Officers & Admins) */}
        {isBureauOrAdmin && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-1">
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
              <span>Bureau Modules</span>
            </div>
            {bureauNavLinks.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200/70 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Administration Section (Available only to Admins) */}
        {isSuperAdmin && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-1">
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1">
              <span>Admin & Controls</span>
            </div>
            {adminLinks.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-rose-50 text-rose-900 font-bold border border-rose-200/70'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-rose-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Info & Member Settings */}
      <div className="mt-auto pt-4 border-t border-slate-100 flex flex-col gap-1.5">
        <Link
          href="/profile"
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
        >
          <Settings className="w-4 h-4 text-slate-400" />
          <span>My Profile & Preferences</span>
        </Link>
        <div className="flex items-center justify-between px-3 py-1 text-[11px] font-semibold text-emerald-800">
          <Link href="/signup" className="hover:underline flex items-center gap-1">
            <span>+ Apply to Join</span>
          </Link>
          <Link href="/login" className="text-slate-500 hover:text-slate-900 hover:underline">
            Switch User
          </Link>
        </div>
        <div className="px-3 py-1.5 rounded-xl bg-slate-50 text-[10px] text-slate-500 font-mono flex items-center justify-between">
          <span>v2.0 • Sfax Release</span>
          <span className="text-emerald-700 font-bold">LIVE DB</span>
        </div>
      </div>
    </aside>
  );
}
