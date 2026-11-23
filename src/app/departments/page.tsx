'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/context';
import { createClient } from '@/lib/supabase/client';
import { getSafeAvatar } from '@/lib/constants/avatars';
import { Department, DepartmentMember } from '@/types/database.types';
import {
  Layers,
  Users,
  Award,
  Terminal,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  FolderKanban,
  ListTodo,
  Calendar,
  Brain,
  Megaphone,
  Handshake,
  ShieldCheck,
  Search,
  PlusCircle,
  UserPlus,
  UserCheck,
  RefreshCw,
  Rocket,
  Clock,
  Briefcase,
  Flame,
  Check,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

interface DepartmentMeta {
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  accentBg: string;
  accentText: string;
  accentBorder: string;
  ringColor: string;
  badge: string;
  bureauPositionKeys: string[];
  pillars: string[];
}

const DEPARTMENT_METAS: Record<string, DepartmentMeta> = {
  'training-innovation': {
    icon: Brain,
    gradient: 'from-[#014f2e] via-[#026b3f] to-[#008f58]',
    accentBg: 'bg-emerald-50',
    accentText: 'text-emerald-800',
    accentBorder: 'border-emerald-200',
    ringColor: 'ring-emerald-500',
    badge: 'Innovation & Tech Lab',
    bureauPositionKeys: ['training_innovation', 'project_manager'],
    pillars: [
      'Zero Carbon Tech',
      'Green AI Prototyping',
      'IoT Sensor Telemetry',
      'Flutter & Web Dev',
      'Technical Hackathons',
    ],
  },
  'comms-media': {
    icon: Megaphone,
    gradient: 'from-[#1e1b4b] via-[#312e81] to-[#2563eb]',
    accentBg: 'bg-indigo-50',
    accentText: 'text-indigo-800',
    accentBorder: 'border-indigo-200',
    ringColor: 'ring-indigo-500',
    badge: 'Branding & Outreach',
    bureauPositionKeys: ['marketing_design_manager', 'communication_engagement_manager'],
    pillars: [
      'Campus Brand Identity',
      'Social Growth Campaigns',
      'UI/UX & Design Systems',
      'Visual Storytelling',
      'Press & Media Relations',
    ],
  },
  'events-logistics': {
    icon: Flame,
    gradient: 'from-[#7c2d12] via-[#c2410c] to-[#ea580c]',
    accentBg: 'bg-amber-50',
    accentText: 'text-amber-800',
    accentBorder: 'border-amber-200',
    ringColor: 'ring-amber-500',
    badge: 'Operations & Summits',
    bureauPositionKeys: ['events_manager'],
    pillars: [
      'Green Campus Summits',
      'Eco-Hackathons',
      'Amphitheater Permits',
      'Ground Logistics',
      'Live Check-in & NFC',
    ],
  },
  'partnerships': {
    icon: Handshake,
    gradient: 'from-[#0f3a4b] via-[#0e7490] to-[#06b6d4]',
    accentBg: 'bg-cyan-50',
    accentText: 'text-cyan-800',
    accentBorder: 'border-cyan-200',
    ringColor: 'ring-cyan-500',
    badge: 'Industry & Alliances',
    bureauPositionKeys: ['partnerships_sponsorship_manager', 'treasurer'],
    pillars: [
      'Corporate Sponsorships',
      'CRDA Forestry Accord',
      'Grant Funding Dossiers',
      'CSR Alliances',
      'MoU Contracting',
    ],
  },
  'governance': {
    icon: ShieldCheck,
    gradient: 'from-[#0f172a] via-[#1e293b] to-[#065f46]',
    accentBg: 'bg-slate-100',
    accentText: 'text-slate-800',
    accentBorder: 'border-slate-300',
    ringColor: 'ring-slate-500',
    badge: 'Legal & Mandate Memory',
    bureauPositionKeys: ['secretary_general', 'president', 'vice_president'],
    pillars: [
      'Official PV Minutes',
      'Club Statutes & Charters',
      'Member Registry',
      'Institutional Audit',
      'Handover Memory',
    ],
  },
};

const DEFAULT_META: DepartmentMeta = {
  icon: Layers,
  gradient: 'from-[#064e3b] to-[#047857]',
  accentBg: 'bg-emerald-50',
  accentText: 'text-emerald-800',
  accentBorder: 'border-emerald-200',
  ringColor: 'ring-emerald-500',
  badge: 'Operational Division',
  bureauPositionKeys: [],
  pillars: ['Campus Sustainability', 'Student Leadership', 'Green Transition'],
};

export default function DepartmentsPage() {
  const { departments, tasks, projects, events, meetings, members, bureauMembers, user } = useAuth();
  const { t } = useTranslation();

  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [departmentMembers, setDepartmentMembers] = useState<DepartmentMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Initialize selected department
  useEffect(() => {
    if (departments.length > 0 && !selectedDeptId) {
      // Prioritize the user's interested department if set, otherwise first department
      const userDept = departments.find((d) => d.id === user?.interested_department_id);
      setSelectedDeptId(userDept ? userDept.id : departments[0].id);
    }
  }, [departments, user?.interested_department_id, selectedDeptId]);

  // Fetch live department members from Supabase
  const fetchDeptMembers = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('department_members')
        .select('*, profile:profiles(*)');

      if (!error && data) {
        setDepartmentMembers(data as DepartmentMember[]);
      }
    } catch (err) {
      console.warn('Error fetching department members:', err);
    }
  }, []);

  useEffect(() => {
    fetchDeptMembers();

    // Set up Supabase Realtime channel for live updates
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel('departments-live-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'department_members' }, () => {
        fetchDeptMembers();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        fetchDeptMembers();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchDeptMembers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDeptMembers]);

  // Handle Refresh
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchDeptMembers();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 400);
  };

  // Find currently selected department
  const selectedDept = useMemo(() => {
    return departments.find((d) => d.id === selectedDeptId) || departments[0] || null;
  }, [departments, selectedDeptId]);

  const selectedMeta = useMemo(() => {
    if (!selectedDept) return DEFAULT_META;
    return DEPARTMENT_METAS[selectedDept.slug] || DEFAULT_META;
  }, [selectedDept]);

  // Live metrics for the selected department
  const selectedDeptMetrics = useMemo(() => {
    if (!selectedDept) {
      return {
        deptProjects: [],
        deptTasks: [],
        deptCompletedTasks: [],
        deptEvents: [],
        deptMeetings: [],
        deptMembers: [],
        leadInfo: null,
        isUserEnrolled: false,
      };
    }

    const deptProjects = projects.filter((p) => p.department_id === selectedDept.id);
    const deptTasks = tasks.filter((t) => t.department_id === selectedDept.id);
    const deptCompletedTasks = deptTasks.filter((t) => t.status === 'done');
    const deptEvents = events.filter((e) => e.department_id === selectedDept.id);
    const deptMeetings = meetings.filter((m) => m.department_id === selectedDept.id);

    // Enrolled members in this department
    const enrolledMembers = departmentMembers.filter((dm) => dm.department_id === selectedDept.id);
    const interestedMembers = members.filter(
      (m) => m.interested_department_id === selectedDept.id && !enrolledMembers.some((em) => em.user_id === m.id)
    );
    const combinedMembers = [
      ...enrolledMembers.map((em) => ({
        id: em.user_id,
        name: em.profile?.full_name || 'Active Member',
        avatar: getSafeAvatar(em.profile?.avatar_path),
        role: em.department_role,
      })),
      ...interestedMembers.map((im) => ({
        id: im.id,
        name: im.full_name || 'Club Member',
        avatar: getSafeAvatar(im.avatar_path),
        role: 'contributor' as const,
      })),
    ];

    // Find assigned bureau lead
    const matchedBureau = bureauMembers.find((bm) =>
      selectedMeta.bureauPositionKeys.includes(bm.position_key)
    );

    const leadInfo = matchedBureau
      ? {
          name: matchedBureau.member_name || matchedBureau.position_name,
          avatar: getSafeAvatar(matchedBureau.avatar),
          title: matchedBureau.position_name,
          isAssigned: Boolean(matchedBureau.member_name && matchedBureau.member_name !== 'Unassigned'),
        }
      : null;

    const isUserEnrolled = user
      ? enrolledMembers.some((em) => em.user_id === user.id) || user.interested_department_id === selectedDept.id
      : false;

    return {
      deptProjects,
      deptTasks,
      deptCompletedTasks,
      deptEvents,
      deptMeetings,
      deptMembers: combinedMembers,
      leadInfo,
      isUserEnrolled,
    };
  }, [selectedDept, projects, tasks, events, meetings, departmentMembers, members, bureauMembers, selectedMeta, user]);

  // Handle Join / Leave Unit
  const handleToggleMembership = async () => {
    if (!user?.id || !selectedDept) return;
    setIsJoining(true);
    setActionFeedback(null);
    const supabase = createClient();

    try {
      if (selectedDeptMetrics.isUserEnrolled) {
        // Leave
        if (supabase) {
          await supabase
            .from('department_members')
            .delete()
            .eq('department_id', selectedDept.id)
            .eq('user_id', user.id);

          if (user.interested_department_id === selectedDept.id) {
            await supabase.from('profiles').update({ interested_department_id: null }).eq('id', user.id);
          }
        }
        setActionFeedback('You left this unit.');
      } else {
        // Join
        if (supabase) {
          await supabase.from('department_members').upsert(
            {
              department_id: selectedDept.id,
              user_id: user.id,
              department_role: 'contributor',
            },
            { onConflict: 'department_id,user_id' }
          );

          await supabase
            .from('profiles')
            .update({ interested_department_id: selectedDept.id })
            .eq('id', user.id);
        }
        setActionFeedback('Successfully enrolled in ' + selectedDept.name + '!');
      }
      await fetchDeptMembers();
    } catch (err) {
      console.error('Error toggling unit membership:', err);
    } finally {
      setIsJoining(false);
      setTimeout(() => setActionFeedback(null), 3500);
    }
  };

  // Filtered departments for the grid
  const filteredDepartments = useMemo(() => {
    if (!searchQuery.trim()) return departments;
    const q = searchQuery.toLowerCase();
    return departments.filter((d) => {
      const meta = DEPARTMENT_METAS[d.slug] || DEFAULT_META;
      const matchPillars = meta.pillars.some((p) => p.toLowerCase().includes(q));
      return (
        d.name.toLowerCase().includes(q) ||
        (d.description && d.description.toLowerCase().includes(q)) ||
        matchPillars
      );
    });
  }, [departments, searchQuery]);

  return (
    <AppShell>
      <div className="pt-3 sm:pt-4 flex flex-col gap-5 max-w-4xl mx-auto w-full pb-20 px-2 sm:px-4">
        {/* =========================================================================
            HEADER STRIP: Title + Live Sync Status + Refresh
        ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/70 backdrop-blur-md p-4 rounded-3xl border border-emerald-900/10 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="p-3 rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center shadow-xs">
              <Layers className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg sm:text-xl text-slate-900">
                  {t('departments.title') || 'Club Departments'}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {t('departments.liveSync') || 'Live Sync'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('departments.subtitle') || 'ISIMS Chapter Operational Divisions & Task Pools'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-xs"
              title="Refresh live metrics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
              <span className="hidden sm:inline">{t('departments.refreshData') || 'Refresh'}</span>
            </button>
            <span className="px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-900 text-xs font-extrabold font-mono shadow-xs">
              {t('departments.unitsActive', { count: departments.length })}
            </span>
          </div>
        </div>

        {/* =========================================================================
            DEPARTMENT SELECTOR PILLS (Horizontal Scrollable Switcher)
        ========================================================================= */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
          {departments.map((dept) => {
            const isSelected = dept.id === selectedDeptId;
            const meta = DEPARTMENT_METAS[dept.slug] || DEFAULT_META;
            const Icon = meta.icon;
            const deptProjectsCount = projects.filter((p) => p.department_id === dept.id).length;

            return (
              <button
                key={dept.id}
                onClick={() => setSelectedDeptId(dept.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all shadow-xs border ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-emerald-500/50 scale-[1.02]'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>{dept.name}</span>
                {deptProjectsCount > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[10px] font-extrabold ${
                      isSelected ? 'bg-emerald-500 text-slate-950' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {deptProjectsCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Feedback Alert */}
        {actionFeedback && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 p-3 rounded-2xl text-emerald-900 text-xs font-bold shadow-xs animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
        )}

        {/* =========================================================================
            DYNAMIC DEPARTMENT SPOTLIGHT (100% Live & Interactive)
        ========================================================================= */}
        {selectedDept && (
          <section className="rounded-3xl bg-white p-5 sm:p-6 shadow-sm border border-emerald-900/10 flex flex-col gap-5 relative overflow-hidden">
            {/* Top Badge Strip */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                  {t('departments.spotlight')}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-500 font-medium">{selectedDept.name}</span>
              </div>
              <span className="text-xs text-emerald-800 font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 shadow-xs">
                {selectedMeta.badge || t('departments.auditLevel')}
              </span>
            </div>

            {/* Department Hero Banner */}
            <div
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${selectedMeta.gradient} p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md transition-all duration-300`}
            >
              {/* Background Glow */}
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center gap-4 min-w-0 z-10">
                <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md text-white flex items-center justify-center shrink-0 border border-white/20 shadow-inner">
                  {React.createElement(selectedMeta.icon, { className: 'w-7 h-7' })}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-extrabold text-lg sm:text-xl text-white leading-tight truncate">
                    {selectedDept.name}
                  </span>
                  <div className="flex items-center gap-2 mt-1 text-emerald-100 text-xs font-medium flex-wrap">
                    {selectedDeptMetrics.leadInfo?.isAssigned ? (
                      <span className="inline-flex items-center gap-1.5 font-semibold text-white">
                        <img
                          src={selectedDeptMetrics.leadInfo.avatar}
                          alt="Lead"
                          className="w-4 h-4 rounded-full object-cover border border-white/40"
                        />
                        {t('departments.lead', { name: selectedDeptMetrics.leadInfo.name })}
                      </span>
                    ) : (
                      <span className="text-emerald-200/90 italic">
                        {t('departments.leadOpen') || 'Lead Position Open (Academic Mandate)'}
                      </span>
                    )}
                    <span>•</span>
                    <span className="text-white/90 font-semibold">ISIMS Sfax Chapter</span>
                  </div>
                </div>
              </div>

              {/* Action & Project Count Badge */}
              <div className="flex items-center gap-2.5 z-10 shrink-0 self-end sm:self-auto">
                <button
                  onClick={handleToggleMembership}
                  disabled={isJoining}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-xs ${
                    selectedDeptMetrics.isUserEnrolled
                      ? 'bg-emerald-950/80 text-emerald-200 hover:bg-emerald-950 border border-emerald-400/30'
                      : 'bg-white text-slate-900 hover:bg-white/90'
                  }`}
                >
                  {selectedDeptMetrics.isUserEnrolled ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{t('departments.enrolledMember') || 'Enrolled Contributor'}</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{t('departments.joinUnit') || 'Join Unit as Contributor'}</span>
                    </>
                  )}
                </button>

                <span className="px-3 py-1.5 rounded-xl bg-white/20 backdrop-blur-md text-white text-xs font-extrabold border border-white/20 shadow-xs">
                  {t('departments.projectsCount', { count: selectedDeptMetrics.deptProjects.length })}
                </span>
              </div>
            </div>

            {/* Department Live Description */}
            {selectedDept.description && (
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100">
                {selectedDept.description}
              </p>
            )}

            {/* Department Pillars & Core Domains */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                <span className="tracking-wide uppercase text-[11px] font-black text-slate-500">
                  {t('departments.pillarsAndTech')}
                </span>
                <span className="text-emerald-700 font-extrabold">
                  {t('departments.endorsedCount', { count: selectedMeta.pillars.length })}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedMeta.pillars.map((pillar, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200/80 text-slate-700 text-xs font-bold hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-800 transition-colors cursor-default"
                  >
                    {pillar}
                  </span>
                ))}
              </div>
            </div>

            {/* Metrics Counters (100% Computed from Live Data) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-center">
              {/* Metric 1: Contributors */}
              <div className="bg-white rounded-xl p-3 flex flex-col items-center shadow-xs border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {t('departments.membersCount')}
                </span>
                <span className="font-black text-2xl text-slate-900 mt-0.5">
                  {selectedDeptMetrics.deptMembers.length}
                </span>
                <span className="text-[10px] text-emerald-700 font-bold">
                  {selectedDeptMetrics.deptMembers.length > 0
                    ? t('departments.activeCount')
                    : 'Open for Enrollment'}
                </span>
              </div>

              {/* Metric 2: Lab Projects */}
              <div className="bg-white rounded-xl p-3 flex flex-col items-center shadow-xs border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {t('departments.projectsCount', { count: '' }).trim()}
                </span>
                <span className="font-black text-2xl text-emerald-700 mt-0.5">
                  {selectedDeptMetrics.deptProjects.length}
                </span>
                <span className="text-[10px] text-slate-500 font-semibold">Active Incubation</span>
              </div>

              {/* Metric 3: Assigned Tasks */}
              <div className="bg-white rounded-xl p-3 flex flex-col items-center shadow-xs border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tasks Velocity</span>
                <span className="font-black text-2xl text-blue-700 mt-0.5">
                  {selectedDeptMetrics.deptTasks.length}
                </span>
                <span className="text-[10px] text-slate-500 font-semibold">
                  {selectedDeptMetrics.deptCompletedTasks.length} {t('departments.completedCount')}
                </span>
              </div>

              {/* Metric 4: Events & Summits */}
              <div className="bg-white rounded-xl p-3 flex flex-col items-center shadow-xs border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Club Activity</span>
                <span className="font-black text-2xl text-amber-600 mt-0.5">
                  {selectedDeptMetrics.deptEvents.length + selectedDeptMetrics.deptMeetings.length}
                </span>
                <span className="text-[10px] text-slate-500 font-semibold">Sessions & PVs</span>
              </div>
            </div>

            {/* Flagship Project Section (Live or Propose Prompt) */}
            <div className="rounded-2xl bg-gradient-to-r from-emerald-50/90 to-teal-50/90 p-4 border border-emerald-100 flex flex-col gap-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Rocket className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-900">
                    {t('departments.flagshipSubmission')}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white text-emerald-900 text-[10px] font-extrabold shadow-xs border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>{' '}
                  {selectedDeptMetrics.deptProjects.length > 0
                    ? selectedDeptMetrics.deptProjects[0].status.toUpperCase()
                    : t('departments.feasibilityReview')}
                </span>
              </div>

              {selectedDeptMetrics.deptProjects.length > 0 ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col min-w-0">
                    <span className="font-extrabold text-sm sm:text-base text-slate-900 truncate">
                      {selectedDeptMetrics.deptProjects[0].name}
                    </span>
                    <span className="text-xs text-slate-600 line-clamp-1 mt-0.5">
                      {selectedDeptMetrics.deptProjects[0].description ||
                        'Operational project incubated under ' + selectedDept.name}
                    </span>
                    {selectedDeptMetrics.deptProjects[0].budget_tnd > 0 && (
                      <span className="text-[11px] text-emerald-700 font-bold mt-1">
                        Budget: {selectedDeptMetrics.deptProjects[0].budget_tnd} TND
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/projects?dept=${selectedDept.id}`}
                    className="w-9 h-9 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white flex items-center justify-center shrink-0 transition-colors shadow-xs"
                    title="View project in 3Z Lab"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 bg-white/70 backdrop-blur-xs p-3 rounded-xl border border-emerald-200/50">
                  <div className="flex flex-col">
                    <span className="font-bold text-xs sm:text-sm text-slate-800">
                      {t('departments.noProjects') || 'No active projects in this unit yet'}
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5">
                      Launch an incubator initiative or green tech prototype under {selectedDept.name}.
                    </span>
                  </div>
                  <Link
                    href="/projects"
                    className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold flex items-center gap-1 shrink-0 transition-colors shadow-xs"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>{t('departments.proposeProject') || 'Propose Project'}</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Active Tasks & Enrolled Members Quick Drawer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Tasks Subcard */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <ListTodo className="w-3.5 h-3.5 text-slate-500" />
                    Unit Tasks ({selectedDeptMetrics.deptTasks.length})
                  </span>
                  <Link
                    href="/tasks"
                    className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-0.5"
                  >
                    <span>Task Board</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </Link>
                </div>

                {selectedDeptMetrics.deptTasks.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    {selectedDeptMetrics.deptTasks.slice(0, 2).map((tk) => (
                      <div
                        key={tk.id}
                        className="bg-white p-2 rounded-xl border border-slate-200/60 flex items-center justify-between text-xs"
                      >
                        <span className="font-semibold text-slate-800 truncate pr-2">{tk.title}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
                            tk.status === 'done'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {tk.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-between py-1 text-xs text-slate-500">
                    <span>{t('departments.noTasks') || 'No pending tasks for this unit'}</span>
                    <Link
                      href="/tasks"
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold text-[11px] hover:bg-slate-50"
                    >
                      + Add Task
                    </Link>
                  </div>
                )}
              </div>

              {/* Members Subcard */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    Contributors ({selectedDeptMetrics.deptMembers.length})
                  </span>
                  <Link
                    href="/members"
                    className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-0.5"
                  >
                    <span>Directory</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </Link>
                </div>

                {selectedDeptMetrics.deptMembers.length > 0 ? (
                  <div className="flex items-center gap-2 overflow-hidden py-1">
                    <div className="flex -space-x-2 overflow-hidden">
                      {selectedDeptMetrics.deptMembers.slice(0, 5).map((mem) => (
                        <img
                          key={mem.id}
                          src={mem.avatar}
                          alt={mem.name}
                          title={mem.name}
                          className="inline-block h-7 w-7 rounded-full ring-2 ring-white object-cover shadow-xs"
                        />
                      ))}
                    </div>
                    {selectedDeptMetrics.deptMembers.length > 5 && (
                      <span className="text-[11px] font-bold text-slate-500">
                        +{selectedDeptMetrics.deptMembers.length - 5} more
                      </span>
                    )}
                    <span className="text-xs font-semibold text-slate-700 truncate ml-1">
                      {selectedDeptMetrics.deptMembers[0]?.name}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between py-1 text-xs text-slate-500">
                    <span>No members assigned yet.</span>
                    <button
                      onClick={handleToggleMembership}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 shadow-xs"
                    >
                      Enroll Now
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* =========================================================================
            ALL CLUB UNITS: Search + Interactive Grid
        ========================================================================= */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                {t('departments.allClubUnits') || 'All Club Units'}
              </h2>
              <p className="text-xs text-slate-500">
                Click any operational unit to inspect its projects, tasks, and contributors.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative max-w-xs w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={t('departments.searchPlaceholder') || 'Search units by name or pillar...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-800 placeholder-slate-400 shadow-xs"
              />
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredDepartments.map((dept) => {
              const isSelected = dept.id === selectedDeptId;
              const meta = DEPARTMENT_METAS[dept.slug] || DEFAULT_META;
              const Icon = meta.icon;

              const deptProjects = projects.filter((p) => p.department_id === dept.id);
              const deptTasks = tasks.filter((t) => t.department_id === dept.id);
              const deptMembersCount =
                departmentMembers.filter((dm) => dm.department_id === dept.id).length +
                members.filter((m) => m.interested_department_id === dept.id).length;

              const matchedBureau = bureauMembers.find((bm) =>
                meta.bureauPositionKeys.includes(bm.position_key)
              );

              return (
                <div
                  key={dept.id}
                  onClick={() => {
                    setSelectedDeptId(dept.id);
                    window.scrollTo({ top: 120, behavior: 'smooth' });
                  }}
                  className={`bg-white p-5 rounded-3xl shadow-xs border transition-all cursor-pointer flex flex-col justify-between gap-4 group hover:shadow-md ${
                    isSelected
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/10'
                      : 'border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex flex-col gap-3">
                    {/* Top Row: Icon + Featured Pill + Actions */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-xs ${
                            isSelected
                              ? 'bg-slate-900 text-emerald-400'
                              : 'bg-slate-100 text-slate-700 group-hover:bg-emerald-100 group-hover:text-emerald-900'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm sm:text-base text-slate-900 group-hover:text-emerald-900 transition-colors">
                            {dept.name}
                          </h3>
                          <span className="text-[11px] font-semibold text-slate-400">
                            {matchedBureau?.member_name && matchedBureau.member_name !== 'Unassigned'
                              ? `Lead: ${matchedBureau.member_name}`
                              : 'Lead Position Open'}
                          </span>
                        </div>
                      </div>

                      {isSelected ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-extrabold border border-emerald-300 shadow-xs">
                          {t('departments.currentlyFeatured') || 'Active Spotlight'}
                        </span>
                      ) : (
                        <span className="text-slate-400 group-hover:text-emerald-700 transition-colors">
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {dept.description || 'ISIMS Chapter operational division and technical task pool.'}
                    </p>

                    {/* Pillars preview tags */}
                    <div className="flex flex-wrap gap-1">
                      {meta.pillars.slice(0, 3).map((pill, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold"
                        >
                          {pill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Stats Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-600">
                    <span className="font-semibold text-[11px] text-slate-700">
                      {t('departments.projectsCount', { count: deptProjects.length })}
                    </span>
                    <span className="font-semibold text-[11px] text-slate-700">
                      {t('departments.tasksCount', { count: deptTasks.length })}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[10px] border border-emerald-200">
                      {deptMembersCount} {t('departments.membersCount')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
