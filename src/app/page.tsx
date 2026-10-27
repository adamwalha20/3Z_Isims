'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  FolderPlus,
  Calendar,
  Share2,
  Download,
  Wallet,
  ArrowRight,
  Plus,
  Pin,
  QrCode,
  Flame,
  Award,
  Sparkles,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, activeRole, tasks, projects, events, announcements, toggleTaskDone, addTask } = useAuth();
  const [countdown, setCountdown] = useState(30);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickDept, setQuickDept] = useState('Training & Innovation');
  const [quickPriority, setQuickPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');

  // QR refresh ticker matching Stitch simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 30 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter tasks for priority section
  const openTasks = tasks.filter((t) => t.status !== 'done');
  const overdueTasks = tasks.filter((t) => t.priority === 'urgent' && t.status !== 'done');
  const priorityTasks = tasks.slice(0, 3);
  const activeProjectsCount = projects.filter((p) => p.status === 'active').length;
  const nextEvent = events[0];
  const pinnedAnnouncement = announcements.find((a) => a.is_pinned) || announcements[0];

  const handleCreateQuickTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    addTask({
      title: quickTitle.trim(),
      description: 'Quick task initiated from chapter dashboard.',
      status: 'todo',
      priority: quickPriority,
      creator_id: user?.id || 'usr-yassine-001',
      due_at: new Date(Date.now() + 86400000).toISOString(),
    });
    setQuickTitle('');
    setShowNewTaskModal(false);
  };

  return (
    <AppShell>
      <div className="pt-4 flex flex-col gap-5 max-w-4xl mx-auto w-full">
        {/* =========================================================================
            1. DYNAMIC HERO MEMBER CARD (Stitch 3ZERO Badge)
        ========================================================================= */}
        <section className="rounded-3xl overflow-hidden card-luminous border border-white/60 bg-white shadow-md relative">
          {/* Vibrant Top Gradient Header */}
          <div className="badge-gradient p-4 sm:p-5 text-white relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
            <div className="absolute right-12 top-6 w-24 h-24 bg-emerald-300/15 rounded-full blur-lg pointer-events-none"></div>

            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white font-extrabold text-xs shadow-inner">
                  3Z
                </div>
                <div>
                  <div className="font-extrabold text-sm sm:text-base leading-tight tracking-tight uppercase">
                    3ZERO DIGITAL PASS
                  </div>
                  <div className="text-[11px] text-emerald-100 font-medium tracking-wide">
                    ISIMS SFAX CHAPTER • #ZEC-8891
                  </div>
                </div>
              </div>

              {/* Verified Pass Glow Tag */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-bold shadow-xs">
                <span className="material-symbols-outlined text-[15px] text-emerald-300">verified</span>
                <span>PASS #04</span>
              </div>
            </div>
          </div>

          {/* Member Profile Details */}
          <div className="p-4 sm:p-5 bg-white flex flex-col gap-3.5">
            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full p-1 bg-gradient-to-tr from-emerald-600 via-emerald-400 to-green-300 shadow-md">
                  <img
                    alt={user?.full_name || 'Member'}
                    className="w-full h-full rounded-full object-cover bg-white"
                    src={user?.avatar_path || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'}
                  />
                </div>
                <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-emerald-600 text-white border-2 border-white flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-[13px] font-bold">verified</span>
                </span>
              </div>

              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1 flex-wrap">
                  <h1 className="font-extrabold text-lg sm:text-xl text-slate-900 tracking-tight truncate">
                    {user?.full_name || 'Yassine Mezghani'}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-xs font-extrabold border border-emerald-200 uppercase">
                    {activeRole}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono mt-0.5">
                  <span>{user?.student_id || 'ISIMS-2024-8891'}</span>
                  <span>•</span>
                  <span className="text-emerald-700 font-semibold font-sans">
                    {user?.study_field || 'L2 DSI / CS & Multimedia'}
                  </span>
                </div>

                {/* Endorsement Badges */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100/90 text-emerald-900 text-[11px] font-bold">
                    <span className="material-symbols-outlined text-[13px] text-emerald-700">stars</span>
                    Lead Innovation
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[11px] font-semibold">
                    <span className="material-symbols-outlined text-[13px]">bolt</span>
                    Active 2024-2025
                  </span>
                </div>
              </div>
            </div>

            {/* Micro Pulse Banner */}
            <div className="mt-1 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/50 border border-emerald-200/70 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                </span>
                <span className="text-xs font-semibold text-emerald-950 truncate">
                  Campus Net Zero Initiative: Sfax Cohort Active
                </span>
              </div>
              <span className="font-mono text-xs font-bold text-emerald-700 shrink-0 ml-1">
                94.2% on-track
              </span>
            </div>
          </div>
        </section>

        {/* =========================================================================
            2. FAST EVENT CHECK-IN QR PASS WIDGET (Stitch Inspired)
        ========================================================================= */}
        <section className="rounded-3xl p-5 bg-gradient-to-b from-[#eef9f3] to-white card-luminous border border-emerald-100 flex flex-col items-center relative overflow-hidden shadow-sm">
          <div className="w-full flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-700 text-[20px]">badge</span>
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Fast Event Check-In</span>
            </div>
            <button
              onClick={() => setShowQRModal(true)}
              className="text-[11px] font-bold text-emerald-800 bg-emerald-100/90 hover:bg-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Tap to Enlarge
            </button>
          </div>

          {/* QR Box with Scanner Frame Corners */}
          <div className="relative p-4 bg-white rounded-2xl shadow-sm border border-emerald-100/80 flex flex-col items-center">
            {/* Corner Guides */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-600 rounded-tl"></div>
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-emerald-600 rounded-tr"></div>
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-emerald-600 rounded-bl"></div>
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-600 rounded-br"></div>

            {/* Stylized Modern SVG QR Matrix */}
            <div className="relative w-44 h-44 flex items-center justify-center p-1">
              <svg className="w-full h-full text-slate-900" fill="currentColor" viewBox="0 0 120 120">
                <rect fill="#024f33" height="30" rx="6" width="30" x="6" y="6"></rect>
                <rect fill="#ffffff" height="20" rx="3" width="20" x="11" y="11"></rect>
                <rect fill="#024f33" height="10" rx="2" width="10" x="16" y="16"></rect>
                <rect fill="#024f33" height="30" rx="6" width="30" x="84" y="6"></rect>
                <rect fill="#ffffff" height="20" rx="3" width="20" x="89" y="11"></rect>
                <rect fill="#024f33" height="10" rx="2" width="10" x="94" y="16"></rect>
                <rect fill="#024f33" height="30" rx="6" width="30" x="6" y="84"></rect>
                <rect fill="#ffffff" height="20" rx="3" width="20" x="11" y="89"></rect>
                <rect fill="#024f33" height="10" rx="2" width="10" x="16" y="94"></rect>
                <rect fill="#0f172a" height="6" rx="1.5" width="6" x="42" y="10"></rect>
                <rect fill="#00784a" height="6" rx="1.5" width="6" x="52" y="10"></rect>
                <rect fill="#0f172a" height="6" rx="1.5" width="6" x="62" y="10"></rect>
                <rect fill="#0f172a" height="6" rx="1.5" width="6" x="72" y="10"></rect>
                <rect fill="#00784a" height="6" rx="1.5" width="6" x="42" y="20"></rect>
                <rect fill="#0f172a" height="6" rx="1.5" width="6" x="62" y="20"></rect>
                <rect fill="#0f172a" height="6" rx="1.5" width="6" x="10" y="42"></rect>
                <rect fill="#00784a" height="6" rx="1.5" width="6" x="20" y="42"></rect>
                <rect fill="#0f172a" height="6" rx="1.5" width="6" x="30" y="42"></rect>
                <rect fill="#0f172a" height="6" rx="1.5" width="6" x="42" y="42"></rect>
                <rect fill="#00784a" height="6" rx="1.5" width="6" x="52" y="42"></rect>
                <rect fill="#0f172a" height="6" rx="1.5" width="6" x="72" y="42"></rect>
                <rect fill="#00784a" height="6" rx="1.5" width="6" x="84" y="42"></rect>
                <rect fill="#0f172a" height="6" rx="1.5" width="6" x="104" y="42"></rect>
                <rect fill="#00784a" height="6" rx="1.5" width="6" x="42" y="52"></rect>
                <rect fill="#0f172a" height="6" rx="1.5" width="6" x="62" y="52"></rect>
                <rect fill="#0f172a" height="6" rx="1.5" width="6" x="84" y="52"></rect>
                <rect fill="#0f172a" height="6" rx="1.5" width="6" x="10" y="62"></rect>
                <rect fill="#00784a" height="6" rx="1.5" width="6" x="30" y="62"></rect>
                <rect fill="#0f172a" height="6" rx="1.5" width="6" x="52" y="62"></rect>
                <rect fill="#00784a" height="6" rx="1.5" width="6" x="72" y="62"></rect>
                <rect fill="#0f172a" height="6" rx="1.5" width="6" x="94" y="62"></rect>
                <rect fill="#0f172a" height="6" rx="1.5" width="6" x="42" y="72"></rect>
                <rect fill="#00784a" height="6" rx="1.5" width="6" x="62" y="72"></rect>
                <rect fill="#00784a" height="6" rx="1.5" width="6" x="42" y="84"></rect>
                <rect fill="#0f172a" height="6" rx="1.5" width="6" x="62" y="84"></rect>
                <rect fill="#0f172a" height="6" rx="1.5" width="6" x="72" y="84"></rect>
                <rect fill="#00784a" height="6" rx="1.5" width="6" x="94" y="84"></rect>
              </svg>
              {/* Emblem Overlay */}
              <div className="absolute w-9 h-9 rounded-full bg-emerald-700 text-white flex items-center justify-center ring-4 ring-white shadow-md">
                <span className="material-symbols-outlined text-[18px]">eco</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 mt-2 font-mono text-xs text-emerald-800">
              <span className="material-symbols-outlined text-[14px] text-emerald-600 animate-spin">sync</span>
              <span>Auto-refreshes in {countdown}s</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 tracking-wider mt-0.5">3Z-PASS-8891-TX</span>
          </div>

          {/* Pillars & Skills Chips */}
          <div className="w-full mt-4 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">
                Endorsed Club Pillars
              </span>
              <span className="text-emerald-700 font-bold text-[11px]">5 Endorsed</span>
            </div>
            <div className="flex flex-wrap gap-1.5 justify-center">
              <span className="px-2.5 py-1 rounded-full bg-emerald-100/90 text-emerald-900 text-xs font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px] text-emerald-700">energy_savings_leaf</span>
                Zero Carbon Advocate
              </span>
              <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 text-xs font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px] text-blue-700">devices</span>
                Flutter / Web
              </span>
              <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-900 text-xs font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px] text-purple-700">psychology</span>
                Green AI
              </span>
              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px] text-amber-700">campaign</span>
                Event Organizer
              </span>
            </div>
          </div>

          {/* Wallet Actions */}
          <div className="w-full mt-4 flex flex-col gap-2">
            <button
              onClick={() => alert('Digital Pass voucher generated for Apple & Google Wallet.')}
              className="w-full py-2.5 px-4 rounded-2xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-black active:scale-[0.98] transition-all shadow-md"
            >
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span>Add to Apple / Google Wallet</span>
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => alert('Pass ID #ZEC-8891 copied to clipboard.')}
                className="py-2 px-3 rounded-xl bg-white border border-emerald-200/80 text-emerald-950 font-semibold text-xs flex items-center justify-center gap-1 hover:bg-emerald-50 active:scale-95 transition-all shadow-xs"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-700" /> Share Pass ID
              </button>
              <button
                onClick={() => alert('Offline QR badge saved to device.')}
                className="py-2 px-3 rounded-xl bg-white border border-emerald-200/80 text-emerald-950 font-semibold text-xs flex items-center justify-center gap-1 hover:bg-emerald-50 active:scale-95 transition-all shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-emerald-700" /> Offline Card
              </button>
            </div>
          </div>
        </section>

        {/* =========================================================================
            3. BADGE SCOREBOARD METRICS STRIP
        ========================================================================= */}
        <section className="grid grid-cols-3 gap-2.5">
          <div className="bg-white rounded-2xl p-3.5 card-luminous border border-emerald-100/60 flex flex-col items-center text-center shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attended</span>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">18</div>
            <span className="text-xs text-emerald-700 font-semibold">Sessions</span>
          </div>
          <div className="bg-white rounded-2xl p-3.5 card-luminous border border-emerald-100/60 flex flex-col items-center text-center shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Projects</span>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">3</div>
            <span className="text-xs text-sky-700 font-semibold">Incubated</span>
          </div>
          <div className="bg-white rounded-2xl p-3.5 card-luminous border border-emerald-100/60 flex flex-col items-center text-center shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Club Rank</span>
            <div className="text-2xl font-extrabold text-emerald-700 tracking-tight mt-0.5">#4</div>
            <span className="text-xs text-slate-500 font-semibold">Campus Wide</span>
          </div>
        </section>

        {/* =========================================================================
            4. METRIC SUMMARY GRID (2x2)
        ========================================================================= */}
        <section className="grid grid-cols-2 gap-3">
          {/* Metric 1: Open Tasks */}
          <div className="bg-white p-4 rounded-2xl card-luminous border border-emerald-100/80 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">Open Tasks</span>
              <div className="w-7 h-7 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="my-2">
              <div className="text-2xl font-extrabold text-slate-900">{openTasks.length}</div>
              <div className="text-xs text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                1 due today
              </div>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-600 h-full rounded-full" style={{ width: '72%' }}></div>
            </div>
          </div>

          {/* Metric 2: Overdue Tasks */}
          <div className="bg-white p-4 rounded-2xl card-luminous border border-rose-100 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">Overdue / Urgent</span>
              <div className="w-7 h-7 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="my-2">
              <div className="text-2xl font-extrabold text-rose-950">{overdueTasks.length}</div>
              <div className="text-xs text-rose-600 font-semibold flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                Action required
              </div>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-rose-500 h-full rounded-full" style={{ width: '40%' }}></div>
            </div>
          </div>

          {/* Metric 3: Active Projects */}
          <div className="bg-white p-4 rounded-2xl card-luminous border border-emerald-100/80 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">Projects</span>
              <div className="w-7 h-7 rounded-xl bg-teal-100 flex items-center justify-center text-teal-800">
                <FolderPlus className="w-4 h-4" />
              </div>
            </div>
            <div className="my-2">
              <div className="text-2xl font-extrabold text-slate-900">{activeProjectsCount}</div>
              <div className="text-xs text-slate-500 truncate mt-0.5">EcoHack & Zero Waste</div>
            </div>
            <span className="text-[11px] text-emerald-700 font-bold font-mono">All milestones live</span>
          </div>

          {/* Metric 4: Next Event */}
          <div className="bg-white p-4 rounded-2xl card-luminous border border-emerald-100/80 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">Next Event</span>
              <div className="w-7 h-7 rounded-xl bg-sky-100 flex items-center justify-center text-sky-800">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="my-2">
              <div className="text-base sm:text-lg font-extrabold text-slate-900 truncate">In 2 days</div>
              <div className="text-xs text-slate-500 truncate mt-0.5">
                {nextEvent?.title || 'Clean Campus Drive'}
              </div>
            </div>
            <span className="text-[11px] text-sky-700 font-semibold font-mono">Fri 14:00 • Amphi A</span>
          </div>
        </section>

        {/* =========================================================================
            5. QUICK ACTIONS HORIZONTAL STRIP
        ========================================================================= */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Operational Actions
            </span>
            <span className="text-xs text-emerald-800 font-bold flex items-center gap-0.5">
              Instant Access
            </span>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setShowNewTaskModal(true)}
              className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-700 to-emerald-600 text-white font-bold text-xs shadow-sm hover:from-emerald-800 hover:to-emerald-700 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>New Task</span>
            </button>
            <Link
              href="/projects"
              className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white border border-emerald-200/80 text-emerald-950 font-semibold text-xs shadow-xs hover:bg-emerald-50 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[18px] text-emerald-600">create_new_folder</span>
              <span>Propose Project</span>
            </Link>
            <Link
              href="/events"
              className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white border border-emerald-200/80 text-emerald-950 font-semibold text-xs shadow-xs hover:bg-emerald-50 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[18px] text-teal-600">event</span>
              <span>Schedule Event</span>
            </Link>
            <Link
              href="/announcements"
              className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white border border-emerald-200/80 text-emerald-950 font-semibold text-xs shadow-xs hover:bg-emerald-50 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[18px] text-amber-600">campaign</span>
              <span>Announcements</span>
            </Link>
          </div>
        </section>

        {/* =========================================================================
            6. PINNED OFFICIAL BUREAU NOTICE
        ========================================================================= */}
        {pinnedAnnouncement && (
          <section className="bg-white rounded-3xl p-5 card-luminous border border-emerald-100/90 relative overflow-hidden shadow-xs">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-600 via-teal-500 to-green-400"></div>
            <div className="flex items-start justify-between gap-2 mb-2.5 pt-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-extrabold uppercase tracking-wide">
                <Pin className="w-3.5 h-3.5 text-emerald-700" />
                Official Bureau Notice
              </div>
              <span className="font-mono text-xs text-slate-500 font-semibold">Nov 10 General Assembly</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
              {pinnedAnnouncement.body}
            </p>
            <div className="mt-3.5 pt-2.5 flex items-center justify-between border-t border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-emerald-700 text-white text-[10px] font-bold flex items-center justify-center">
                  SB
                </div>
                <span className="text-xs text-slate-900 font-bold">
                  Sarah B. <span className="text-slate-500 font-normal">• Club President</span>
                </span>
              </div>
              <Link
                href="/announcements"
                className="inline-flex items-center gap-1 text-emerald-700 text-xs font-bold hover:underline"
              >
                <span>Read Memos</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </section>
        )}

        {/* =========================================================================
            7. MY PRIORITY TASKS (Interactive Status Toggle)
        ========================================================================= */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">My Priority Tasks</h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-mono text-xs font-bold">
                {priorityTasks.length}
              </span>
            </div>
            <Link
              href="/tasks"
              className="text-xs text-emerald-700 font-bold hover:underline flex items-center gap-0.5"
            >
              <span>View All Tasks</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex flex-col gap-2.5">
            {priorityTasks.map((t) => {
              const isDone = t.status === 'done';
              return (
                <div
                  key={t.id}
                  className="bg-white p-4 rounded-2xl card-luminous border border-emerald-100/70 flex items-start justify-between gap-3 shadow-xs hover:border-emerald-300 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      onClick={() => toggleTaskDone(t.id)}
                      aria-label="Toggle task completion"
                      className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0 ${
                        isDone
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-300 hover:border-emerald-600 bg-white text-transparent'
                      }`}
                    >
                      <CheckCircle className={`w-3.5 h-3.5 ${isDone ? 'opacity-100' : 'opacity-0'}`} />
                    </button>
                    <div className="flex flex-col min-w-0">
                      <span
                        className={`text-xs sm:text-sm font-bold text-slate-900 leading-snug ${
                          isDone ? 'line-through text-slate-400' : ''
                        }`}
                      >
                        {t.title}
                      </span>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {t.department && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold">
                            {t.department.name}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            t.priority === 'urgent'
                              ? 'bg-rose-100 text-rose-800'
                              : t.priority === 'high'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {t.priority}
                        </span>
                        {t.due_at && (
                          <span className="font-mono text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {new Date(t.due_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      isDone
                        ? 'bg-emerald-100 text-emerald-800'
                        : t.status === 'in_progress'
                        ? 'bg-blue-50 text-blue-800 border border-blue-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {t.status === 'in_progress' ? 'In Progress' : isDone ? 'Done' : 'To Do'}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* =========================================================================
            8. UPCOMING CLUB EVENTS CARD
        ========================================================================= */}
        {nextEvent && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-base font-bold text-slate-900">Upcoming Club Events</h2>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
                Next 7 Days
              </span>
            </div>

            <div className="bg-white rounded-3xl p-5 card-luminous border border-emerald-100/80 flex flex-col gap-3.5 relative overflow-hidden shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-600 text-white font-extrabold text-[10px] uppercase tracking-wider shadow-xs">
                  Flagship Summit
                </span>
                <span className="inline-flex items-center gap-1 text-emerald-800 font-bold text-xs bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  <span className="material-symbols-outlined text-[15px]">qr_code_2</span>
                  QR Check-in Ready
                </span>
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
                  {nextEvent.title}
                </h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed mt-1">
                  {nextEvent.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl text-xs">
                <div className="flex items-center gap-1.5 text-emerald-950 font-semibold truncate">
                  <Calendar className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Fri, Oct 29 • 14:00</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-950 font-semibold truncate">
                  <span className="material-symbols-outlined text-[18px] text-emerald-700 shrink-0">pin_drop</span>
                  <span>{nextEvent.location}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2 overflow-hidden">
                    <div className="h-7 w-7 rounded-full ring-2 ring-white bg-slate-200 text-[10px] font-bold flex items-center justify-center text-slate-800">
                      MK
                    </div>
                    <div className="h-7 w-7 rounded-full ring-2 ring-white bg-emerald-200 text-[10px] font-bold flex items-center justify-center text-emerald-900">
                      AY
                    </div>
                    <div className="h-7 w-7 rounded-full ring-2 ring-white bg-sky-200 text-[10px] font-bold flex items-center justify-center text-sky-900">
                      SZ
                    </div>
                  </div>
                  <span className="font-mono text-xs text-slate-600 font-semibold">
                    {nextEvent.registrations_count || 48} registered
                  </span>
                </div>

                <Link
                  href="/events"
                  className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition-colors flex items-center gap-1.5 shadow-xs active:scale-95"
                >
                  <span>Manage Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Cryptographically Signed Footer Note */}
        <div className="flex items-center justify-between px-4 py-3 bg-emerald-50/80 rounded-2xl border border-emerald-200/50 text-xs text-emerald-900 mt-2">
          <div className="flex items-center gap-1.5 font-semibold">
            <span className="material-symbols-outlined text-[16px] text-emerald-700">verified_user</span>
            <span>Cryptographically Signed by ISIMS Secretariat</span>
          </div>
          <span className="font-mono text-[11px] text-emerald-700">SEC • V2.4</span>
        </div>
      </div>

      {/* =========================================================================
          QUICK TASK CREATION MODAL
      ========================================================================= */}
      {showNewTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-emerald-100 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-900">Create Chapter Task</h3>
              <button
                onClick={() => setShowNewTaskModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateQuickTask} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600">Task Title</label>
                <input
                  type="text"
                  required
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  placeholder="e.g. Prepare Hackathon mentor briefing pack"
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-600">Priority</label>
                  <select
                    value={quickPriority}
                    onChange={(e) => setQuickPriority(e.target.value as any)}
                    className="w-full mt-1 px-2.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent 🔥</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600">Department</label>
                  <select
                    value={quickDept}
                    onChange={(e) => setQuickDept(e.target.value)}
                    className="w-full mt-1 px-2.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="Training & Innovation">Training & Innovation</option>
                    <option value="Communications & Media">Communications</option>
                    <option value="Events & Logistics">Events</option>
                    <option value="Partnerships & Sponsorships">Partnerships</option>
                    <option value="Governance">Governance</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-700 text-white hover:bg-emerald-800"
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Enlarged View Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center gap-4 text-center">
            <h3 className="font-extrabold text-base text-slate-900">3ZERO Club Official ID Pass</h3>
            <p className="text-xs text-slate-500">Scan at entrance of Amphi A for automated attendance sign-in.</p>
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
              <QrCode className="w-56 h-56 text-emerald-900" />
            </div>
            <div className="font-mono text-xs text-slate-600">ISIMS-2024-8891 • Yassine Mezghani</div>
            <button
              onClick={() => setShowQRModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
            >
              Close Pass
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
