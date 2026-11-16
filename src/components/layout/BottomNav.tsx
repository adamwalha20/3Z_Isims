'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/context';
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher';
import { canAccessAttendanceScanner } from '@/lib/attendance/attendance-auth';
import { isSuperAdminEmail } from '@/lib/constants/auth';
import {
  X,
  ChevronRight,
  Shield,
  Home,
  CheckSquare,
  Rocket,
  Calendar,
  Users,
  Building2,
  FileText,
  Megaphone,
  UserCheck,
  CreditCard,
  LogIn,
  UserPlus,
  Compass,
} from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();
  const { user, activeRole, isAdmin, userBureauPositions, activeBureauPosition } = useAuth();
  const { t, isRtl } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isBureauOrAdmin = activeRole === 'bureau' || activeRole === 'admin' || isSuperAdminEmail(user?.email) || isAdmin;
  const canScan = canAccessAttendanceScanner({
    activeRole,
    isAdmin,
    userEmail: user?.email,
    userBureauPositions,
    activeBureauPosition,
  });

  // Quick primary tabs for the bar matching simple general navigation: Home, Tasks, Ranking, Events
  const primaryTabs = [
    { label: t('nav.home'), href: '/', icon: 'home' },
    { label: t('nav.tasks'), href: '/tasks', icon: 'check_box' },
    { label: t('nav.ranking'), href: '/ranking', icon: 'trophy' },
    { label: t('nav.events'), href: '/events', icon: 'calendar_month' },
  ];

  // All pages grouped for the expanded mobile drawer
  const navigationSections = [
    {
      title: t('common.appName'),
      items: [
        { label: `${t('nav.dashboard')} & ${t('attendance.myQrTab')}`, href: '/', icon: 'home', desc: t('dashboard.overview'), badge: 'Live' },
        { label: t('nav.attendance'), href: '/attendance', icon: 'qr_code_scanner', desc: t('attendance.subtitle'), badge: 'QR' },
        { label: t('nav.tasks'), href: '/tasks', icon: 'check_box', desc: t('tasks.subtitle') },
        { label: t('nav.meetings'), href: '/meetings', icon: 'groups', desc: t('meetings.subtitle'), badge: 'Hub' },
        { label: t('nav.ranking'), href: '/ranking', icon: 'trophy', desc: t('ranking.subtitle'), badge: 'XP' },
        { label: t('nav.events'), href: '/events', icon: 'calendar_month', desc: t('events.subtitle') },
        { label: t('nav.announcements'), href: '/announcements', icon: 'campaign', desc: t('common.chapterName') },
      ],
    },
    ...(isBureauOrAdmin
      ? [
          {
            title: t('nav.bureauModules'),
            items: [
              ...(canScan
                ? [{ label: t('nav.attendanceScanner'), href: '/attendance/scanner', icon: 'camera_alt', desc: t('attendance.scannerSubtitle'), badge: 'Live' }]
                : []),
              { label: t('nav.bureauAttendance'), href: '/admin/attendance', icon: 'analytics', desc: t('admin.healthSubtitle') },
              { label: t('nav.projects'), href: '/projects', icon: 'rocket_launch', desc: t('projects.subtitle') },
              { label: t('nav.departments'), href: '/departments', icon: 'domain', desc: t('members.departmentsCount') },
              { label: t('nav.documents'), href: '/documents', icon: 'folder_open', desc: t('meetings.meetingMinutes') },
              { label: t('nav.members'), href: '/members', icon: 'badge', desc: t('members.subtitle') },
            ],
          },
        ]
      : []),
    {
      title: t('nav.adminControls'),
      items: [
        { label: t('nav.profile'), href: '/profile', icon: 'qr_code_2', desc: t('profile.subtitle') },
        ...(isSuperAdminEmail(user?.email)
          ? [
              { label: t('nav.adminGovernance'), href: '/admin', icon: 'admin_panel_settings', desc: t('bureau.subtitle'), badge: 'Admin' },
              { label: t('bureau.mandatesTab', { count: 12 }), href: '/admin/roles', icon: 'shield_person', desc: t('bureau.subtitle') },
            ]
          : []),
        { label: t('nav.signIn'), href: '/login', icon: 'login', desc: t('auth.loginSubtitle') },
        { label: t('nav.studentRegistration'), href: '/signup', icon: 'person_add', desc: t('auth.signupSubtitle'), highlight: true },
      ],
    },
  ];

  const isMoreActive = !primaryTabs.some((t) => t.href === pathname);

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 pb-safe bg-white/95 backdrop-blur-xl border-t border-emerald-900/10 shadow-[0_-4px_25px_rgba(0,0,0,0.06)]">
        <div className="flex justify-around items-center h-16 px-1 max-w-lg mx-auto">
          {primaryTabs.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className={`flex flex-col items-center justify-center gap-0.5 w-16 h-12 rounded-xl transition-all relative ${
                  isActive ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-emerald-700 font-medium'
                }`}
              >
                <div className="relative">
                  <span
                    className="material-symbols-outlined text-[22px]"
                    style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    {item.icon}
                  </span>
                </div>
                <span className="text-[10px]">{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-emerald-600"></span>
                )}
              </Link>
            );
          })}

          {/* 5th Button: All Pages / Menu Trigger */}
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`flex flex-col items-center justify-center gap-0.5 w-16 h-12 rounded-lg transition-colors relative ${
              isMenuOpen || isMoreActive
                ? 'text-emerald-800 font-semibold bg-emerald-50'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
            aria-label="All Pages Navigation Menu"
          >
            <div className="relative">
              <span
                className="material-symbols-outlined text-[20px]"
                style={isMenuOpen || isMoreActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {isMenuOpen ? 'close' : 'grid_view'}
              </span>
            </div>
            <span className="text-[10px]">{isMenuOpen ? t('common.close') : t('nav.allPages')}</span>
            {isMoreActive && !isMenuOpen && (
              <span className="absolute bottom-1 w-1 h-1 rounded-full bg-emerald-600"></span>
            )}
          </button>
        </div>
      </nav>

      {/* Slide-Up Mobile Navigation Drawer Modal */}
      {isMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setIsMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
          />

          {/* Drawer Card */}
          <div className="relative w-full max-h-[85vh] bg-slate-50 rounded-t-2xl shadow-xl border-t border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
            {/* Drawer Header Handle & Title */}
            <div className="p-3.5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-800 text-white flex items-center justify-center font-bold text-xs">
                  3Z
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm text-slate-900">3ZERO Workspace</span>
                    <span className="text-[9px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/70 px-1.5 py-0.2 rounded-md uppercase">
                      ISIMS
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">Platform Modules</span>
                </div>
              </div>

              <button
                onClick={() => setIsMenuOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Navigation Body */}
            <div className="p-3.5 overflow-y-auto max-h-[calc(85vh-75px)] flex flex-col gap-4 pb-20 no-scrollbar">
              {/* Member Quick Card */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl text-slate-900 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full border border-slate-200 overflow-hidden bg-slate-100 shrink-0">
                    <img
                      src={user?.avatar_path || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'}
                      alt="User avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-slate-900">{user?.full_name || 'Active Member'}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{user?.student_id || 'ISIMS-2024-8891'}</div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] font-medium uppercase tracking-wide bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md text-slate-700">
                    {activeRole} view
                  </span>
                  <Link
                    href="/profile"
                    onClick={() => setIsMenuOpen(false)}
                    className="text-[10px] text-emerald-300 font-semibold hover:underline"
                  >
                    View Pass →
                  </Link>
                </div>
              </div>

              {/* Language Selector */}
              <LanguageSwitcher variant="mobile" />

              {/* Navigation Sections */}
              {navigationSections.map((sec) => (
                <div key={sec.title} className="flex flex-col gap-2">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-1">
                    {sec.title}
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {sec.items.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsMenuOpen(false)}
                          className={`p-2.5 rounded-2xl flex items-center justify-between transition-all ${
                            isActive
                              ? 'bg-emerald-100/80 text-emerald-950 font-bold border border-emerald-300/50 shadow-xs'
                              : item.highlight
                              ? 'bg-white hover:bg-emerald-50/60 border border-emerald-200 shadow-xs'
                              : 'bg-white hover:bg-slate-100/80 border border-slate-100 shadow-xs'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                isActive
                                  ? 'bg-emerald-700 text-white'
                                  : item.highlight
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-slate-50 text-slate-700 border border-slate-100'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                            </div>
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-900 truncate">{item.label}</span>
                                {item.badge && (
                                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-500 truncate">{item.desc}</span>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
