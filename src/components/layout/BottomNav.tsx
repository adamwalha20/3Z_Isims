'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
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
  const { user, activeRole } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Quick primary tabs for the bar
  const primaryTabs = [
    { label: 'Home', href: '/', icon: 'home' },
    { label: 'Tasks', href: '/tasks', icon: 'check_box' },
    { label: '3Z Lab', href: '/projects', icon: 'rocket_launch' },
    { label: 'Events', href: '/events', icon: 'calendar_month' },
  ];

  // All pages grouped for the expanded mobile drawer
  const navigationSections = [
    {
      title: 'Operations Hub',
      items: [
        { label: 'Dashboard & Pass', href: '/', icon: 'home', desc: 'Scoreboard, digital pass & priority tasks', badge: 'Live' },
        { label: 'Task Management', href: '/tasks', icon: 'check_box', desc: 'Board & list view, dispatch & status' },
        { label: '3Z Lab Projects', href: '/projects', icon: 'rocket_launch', desc: 'Incubation portfolio & milestones' },
        { label: 'Calendar & Events', href: '/events', icon: 'calendar_month', desc: 'Summits, workshops & QR check-in' },
        { label: 'Assemblies & PVs', href: '/meetings', icon: 'groups', desc: 'Official minutes & action items' },
      ],
    },
    {
      title: 'Coordination & Memory',
      items: [
        { label: 'Announcements', href: '/announcements', icon: 'campaign', desc: 'Bureau broadcasts & pinned circulars' },
        { label: 'Members Directory', href: '/members', icon: 'badge', desc: 'Student roster & Handover Vault' },
        { label: 'Department Units', href: '/departments', icon: 'domain', desc: 'Training & Innovation, Comms, Logistics' },
        { label: 'Document Vault', href: '/documents', icon: 'folder_open', desc: 'Charters, templates & safe storage' },
      ],
    },
    {
      title: 'Account & Bureau Governance',
      items: [
        { label: 'Digital Pass & Profile', href: '/profile', icon: 'qr_code_2', desc: 'Student ID, NFC pass & settings' },
        { label: 'Bureau Administration', href: '/admin', icon: 'admin_panel_settings', desc: 'Membership approval & audit logs', badge: activeRole === 'admin' || activeRole === 'bureau' ? 'Admin' : undefined },
        { label: 'Sign In', href: '/login', icon: 'login', desc: 'Switch user session' },
        { label: 'Student Registration', href: '/signup', icon: 'person_add', desc: 'Onboard new member application', highlight: true },
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
            className={`flex flex-col items-center justify-center gap-0.5 w-16 h-12 rounded-xl transition-all relative ${
              isMenuOpen || isMoreActive
                ? 'text-emerald-700 font-bold bg-emerald-50/80'
                : 'text-slate-500 hover:text-emerald-700 font-medium'
            }`}
            aria-label="All Pages Navigation Menu"
          >
            <div className="relative">
              <span
                className="material-symbols-outlined text-[22px]"
                style={isMenuOpen || isMoreActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {isMenuOpen ? 'close' : 'grid_view'}
              </span>
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse"></span>
            </div>
            <span className="text-[10px]">{isMenuOpen ? 'Close' : 'All Pages'}</span>
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
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
          />

          {/* Drawer Card */}
          <div className="relative w-full max-h-[85vh] bg-[#f8faf9] rounded-t-3xl shadow-2xl border-t border-emerald-900/15 flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* Drawer Header Handle & Title */}
            <div className="p-4 bg-white border-b border-emerald-900/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-800 to-emerald-500 p-0.5 shadow-sm flex items-center justify-center">
                  <div className="w-full h-full bg-white rounded-[9px] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px] text-emerald-700 font-bold">eco</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-sm text-slate-900">3ZERO Workspace</span>
                    <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full uppercase">
                      ISIMS
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">All 11 Platform Modules</span>
                </div>
              </div>

              <button
                onClick={() => setIsMenuOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Navigation Body */}
            <div className="p-4 overflow-y-auto max-h-[calc(85vh-75px)] flex flex-col gap-5 pb-20 no-scrollbar">
              {/* Member Quick Card */}
              <div className="p-3.5 bg-gradient-to-br from-emerald-900 to-emerald-800 rounded-2xl text-white shadow-md flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full ring-2 ring-emerald-400 overflow-hidden bg-white/10 shrink-0">
                    <img
                      src={user?.avatar_path || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'}
                      alt="User avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="font-bold text-xs">{user?.full_name || 'Active Member'}</div>
                    <div className="text-[10px] text-emerald-200 font-mono">{user?.student_id || 'ISIMS-2024-8891'}</div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-700/80 border border-emerald-500/30 px-2 py-0.5 rounded-full text-emerald-100">
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
