'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { getRankLevel, RANK_LEVELS, Task } from '@/types/database.types';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  Calendar,
  ArrowRight,
  Plus,
  Pin,
  QrCode,
  Flame,
  Award,
  Sparkles,
  Trophy,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Shield,
  Layers,
  Users,
  Megaphone,
} from 'lucide-react';
import {
  BureauPositionSelector,
  VicePresidentCockpit,
  TreasurerCockpit,
  HrManagerCockpit,
  MarketingCockpit,
  SustainableCampusCockpit,
  PartnershipsCockpit,
  SecretaryGeneralCockpit,
  EventsManagerCockpit,
  ProjectManagerCockpit,
  CommsEngagementCockpit,
} from '@/components/dashboard/BureauWorkspaces';

export default function DashboardPage() {
  const {
    user,
    activeRole,
    isAdmin,
    activeBureauPosition,
    userBureauPositions,
    tasks,
    projects,
    events,
    announcements,
    memberXpList,
    userAchievements,
    submitTaskForVerification,
    verifyTask,
    addTask,
  } = useAuth();

  const [countdown, setCountdown] = useState(30);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [taskFilter, setTaskFilter] = useState<'all' | 'todo' | 'in_progress' | 'waiting_verification' | 'done'>('all');

  // Task creation form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [newTaskReqVerify, setNewTaskReqVerify] = useState(true);

  // Review modal state
  const [reviewTask, setReviewTask] = useState<Task | null>(null);
  const [reviewReason, setReviewReason] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 30 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute User XP & Rank
  const currentUserId = user?.id || 'usr-admin-001';
  const myXpData = memberXpList.find((mxp) => mxp.user_id === user?.id) ||
    memberXpList.find((mxp) => mxp.user_id === currentUserId) || {
      user_id: currentUserId,
      total_xp: 0,
      completed_tasks_count: 0,
      updated_at: '2026-01-01T00:00:00.000Z',
    };

  const myRankLevel = getRankLevel(myXpData.total_xp);
  const sortedLeaderboard = [...memberXpList].sort((a, b) => b.total_xp - a.total_xp);
  const myLeaderboardRank = sortedLeaderboard.findIndex((m) => m.user_id === (user?.id || currentUserId)) + 1 || 1;

  // Deduplicate and filter badges for current user
  const myAchievements = React.useMemo(() => {
    const userFiltered = userAchievements.filter(
      (ach) => !ach.user_id || ach.user_id === user?.id || (!user && ach.user_id === currentUserId)
    );
    const seen = new Set<string>();
    return userFiltered.filter((ach) => {
      if (seen.has(ach.achievement_key)) return false;
      seen.add(ach.achievement_key);
      return true;
    });
  }, [userAchievements, user, currentUserId]);

  // Calculate XP progress to next level
  const currentLevelIndex = RANK_LEVELS.findIndex((lvl) => lvl.name === myRankLevel.name);
  const nextLevel = currentLevelIndex < RANK_LEVELS.length - 1 ? RANK_LEVELS[currentLevelIndex + 1] : null;
  const progressPercent = nextLevel
    ? Math.min(100, Math.round(((myXpData.total_xp - myRankLevel.minXp) / (nextLevel.minXp - myRankLevel.minXp)) * 100))
    : 100;

  // Filter tasks for member vs bureau
  const isAssignee = (t: Task) =>
    t.assignees?.some((a) => a.id === user?.id || a.id === currentUserId) ||
    t.creator_id === user?.id ||
    t.creator_id === currentUserId;

  const memberTasks = tasks.filter((t) => {
    const matchesUser = activeRole === 'admin' ? true : isAssignee(t);
    if (!matchesUser) return false;
    if (taskFilter === 'all') return true;
    return t.status === taskFilter;
  });

  // Pending verifications across club or for creator
  const pendingVerifications = tasks.filter((t) => t.status === 'waiting_verification');

  const nextEvent = events[0];
  const pinnedAnnouncement = announcements.find((a) => a.is_pinned) || announcements[0];

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    addTask({
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim() || undefined,
      status: 'todo',
      priority: newTaskPriority,
      creator_id: user?.id || 'usr-default',
      requires_verification: newTaskReqVerify,
      due_at: new Date(Date.now() + 86400000 * 3).toISOString(),
    });
    setNewTaskTitle('');
    setNewTaskDesc('');
    setShowNewTaskModal(false);
  };

  // Determine which bureau cockpit to display
  const currentBureauPos = activeBureauPosition !== 'all'
    ? activeBureauPosition
    : (userBureauPositions[0] || 'vice_president');

  const renderBureauCockpit = (pos: string) => {
    switch (pos) {
      case 'treasurer':
        return <TreasurerCockpit />;
      case 'hr_manager':
        return <HrManagerCockpit />;
      case 'events_manager':
        return <EventsManagerCockpit />;
      case 'project_manager':
        return <ProjectManagerCockpit />;
      case 'secretary_general':
        return <SecretaryGeneralCockpit />;
      case 'marketing_design_manager':
        return <MarketingCockpit />;
      case 'sustainable_campus_manager':
        return <SustainableCampusCockpit />;
      case 'communication_engagement_manager':
        return <CommsEngagementCockpit />;
      case 'partnerships_sponsorship_manager':
        return <PartnershipsCockpit />;
      case 'vice_president':
      default:
        return <VicePresidentCockpit />;
    }
  };

  return (
    <AppShell>
      <div className="pt-4 flex flex-col gap-5 max-w-4xl mx-auto w-full pb-20">
        {/* =========================================================================
            1. WELCOME MESSAGE & OFFICIAL DIGITAL PASS (Stitch 3Z Identity)
        ========================================================================= */}
        <section className="rounded-3xl overflow-hidden card-luminous border border-white/60 bg-white shadow-md relative">
          <div className="badge-gradient p-4 sm:p-5 text-white relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none"></div>

            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white font-extrabold text-xs shadow-inner">
                  3Z
                </div>
                <div>
                  <div className="font-extrabold text-sm sm:text-base leading-tight tracking-tight uppercase">
                    3ZERO CAMPUS HUB
                  </div>
                  <div className="text-[11px] text-emerald-100 font-medium tracking-wide">
                    ISIMS SFAX CHAPTER • ZERO EXCLUSION CARBON POVERTY
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-bold shadow-xs">
                <span className="material-symbols-outlined text-[15px] text-emerald-300">verified</span>
                <span className="capitalize">{activeRole} Workspace</span>
              </div>
            </div>
          </div>

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
              </div>

              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1 flex-wrap">
                  <h1 className="font-extrabold text-lg sm:text-xl text-slate-900 tracking-tight truncate">
                    Welcome back, {user?.full_name?.split(' ')[0] || 'Member'}!
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-xs font-extrabold border border-emerald-200 uppercase">
                    {activeRole === 'bureau' ? (currentBureauPos.replace(/_/g, ' ')) : activeRole}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono mt-0.5">
                  <span>{user?.student_id || 'ISIMS-STUDENT'}</span>
                  <span>•</span>
                  <span className="text-emerald-700 font-semibold font-sans">
                    {user?.study_field || 'Computer Science & Multimedia'}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => setShowQRModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                  >
                    <QrCode className="w-3.5 h-3.5 text-emerald-700" />
                    <span>My Digital Pass</span>
                  </button>
                  <Link
                    href="/ranking"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold border border-emerald-200 transition-colors"
                  >
                    <Trophy className="w-3.5 h-3.5 text-amber-600" />
                    <span>Leaderboard #{myLeaderboardRank}</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            2. MY XP & RANK LEVEL PROGRESSION
        ========================================================================= */}
        <section className="bg-white rounded-3xl p-5 border border-emerald-900/10 shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-600 text-white flex items-center justify-center font-bold shadow-xs">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Experience Level</div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base text-slate-900">{myRankLevel.name}</span>
                  <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold border ${myRankLevel.badgeColor}`}>
                    {myXpData.total_xp} XP Total
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold text-slate-500">
                {nextLevel ? `${nextLevel.minXp - myXpData.total_xp} XP to ${nextLevel.name}` : 'Max Rank Achieved'}
              </span>
              <div className="text-xs font-mono font-bold text-emerald-700">
                Rank #{myLeaderboardRank} in ISIMS
              </div>
            </div>
          </div>

          {/* Rank Progress Bar */}
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mt-1">
            <div
              className="bg-gradient-to-r from-emerald-600 to-teal-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>

          {/* Achievement Badges Unlocked */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs flex-wrap gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Earned Badges:</span>
              {myAchievements.length > 0 ? (
                myAchievements.map((ach) => (
                  <span
                    key={ach.id || `${ach.user_id || 'usr'}-${ach.achievement_key}`}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-900 text-[10px] font-bold border border-emerald-200"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>{ach.metadata?.title || ach.achievement_key.replace('_', ' ')}</span>
                  </span>
                ))
              ) : (
                <span className="text-slate-400 text-[11px] italic">Complete tasks to unlock badges</span>
              )}
            </div>
            <Link href="/ranking" className="text-emerald-700 font-bold hover:underline flex items-center gap-1">
              <span>Full Leaderboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>

        {/* =========================================================================
            3. PENDING VERIFICATIONS ACTION PANEL (Bureau Officers & Admins Only)
        ========================================================================= */}
        {(activeRole === 'bureau' || activeRole === 'admin') && pendingVerifications.length > 0 && (
          <section className="bg-amber-50/70 rounded-3xl p-5 border border-amber-200 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-600"></span>
                </span>
                <h2 className="font-extrabold text-sm text-amber-950">
                  Pending Task Verifications ({pendingVerifications.length})
                </h2>
              </div>
              <span className="text-[11px] font-bold text-amber-800">Requires Review</span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {pendingVerifications.slice(0, 3).map((task) => (
                <div
                  key={task.id}
                  className="bg-white p-3.5 rounded-2xl border border-amber-200/80 shadow-xs flex items-center justify-between gap-3 flex-wrap"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-xs sm:text-sm text-slate-900 block truncate">
                      {task.title}
                    </span>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                      <span className="font-semibold text-emerald-800">
                        Priority: {task.priority}
                      </span>
                      <span>•</span>
                      <span>Submitted for review</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setReviewTask(task)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                    >
                      Reject / Revise
                    </button>
                    <button
                      onClick={() => verifyTask(task.id, true)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors flex items-center gap-1 shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve (+XP)</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* =========================================================================
            4. ROLE-SPECIFIC WORKSPACE SECTION (Bureau & Admin only)
        ========================================================================= */}
        {activeRole === 'admin' ? (
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-800" />
                <h2 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                  Admin Global Oversight
                </h2>
              </div>
              <button
                onClick={() => setShowNewTaskModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 hover:bg-emerald-800 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Task</span>
              </button>
            </div>

            {/* Admin Bureau Position Switcher */}
            <BureauPositionSelector />
            {renderBureauCockpit(activeBureauPosition !== 'all' ? activeBureauPosition : 'vice_president')}
          </section>
        ) : activeRole === 'bureau' ? (
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-800" />
                <h2 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                  My Bureau Workspace
                </h2>
              </div>
              <button
                onClick={() => setShowNewTaskModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 hover:bg-emerald-800 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Assign Task</span>
              </button>
            </div>

            {/* Display only the cockpit assigned to this officer */}
            {renderBureauCockpit(currentBureauPos)}
          </section>
        ) : null}

        {/* =========================================================================
            5. MY TASKS LIST (Strict Member & Role-Restricted View)
        ========================================================================= */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900">My Tasks</h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-mono text-xs font-bold">
                {memberTasks.length}
              </span>
            </div>

            {/* Clean Segmented Filters */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar text-xs font-bold">
              <button
                onClick={() => setTaskFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  taskFilter === 'all' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setTaskFilter('todo')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  taskFilter === 'todo' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                To Do
              </button>
              <button
                onClick={() => setTaskFilter('in_progress')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  taskFilter === 'in_progress' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                In Progress
              </button>
              <button
                onClick={() => setTaskFilter('waiting_verification')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  taskFilter === 'waiting_verification' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Verification
              </button>
              <button
                onClick={() => setTaskFilter('done')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  taskFilter === 'done' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Completed
              </button>
            </div>
          </div>

          {/* Task Items */}
          <div className="flex flex-col gap-2.5">
            {memberTasks.length > 0 ? (
              memberTasks.map((t) => {
                const isDone = t.status === 'done';
                const isWaiting = t.status === 'waiting_verification';

                return (
                  <div
                    key={t.id}
                    className="bg-white p-4 rounded-2xl card-luminous border border-emerald-100/70 flex items-start justify-between gap-3 shadow-xs hover:border-emerald-300 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Interactive Task Completion / Submission */}
                      <button
                        onClick={() => {
                          if (!isDone && !isWaiting) {
                            submitTaskForVerification(t.id);
                          }
                        }}
                        disabled={isWaiting}
                        aria-label="Submit task for completion"
                        className={`mt-0.5 w-6 h-6 rounded-lg border flex items-center justify-center transition-all shrink-0 ${
                          isDone
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : isWaiting
                            ? 'bg-amber-50 border-amber-300 text-amber-600'
                            : 'border-slate-300 hover:border-emerald-600 bg-white text-slate-400'
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle className="w-4 h-4 text-white" />
                        ) : isWaiting ? (
                          <Clock className="w-3.5 h-3.5 animate-pulse" />
                        ) : (
                          <span className="text-[10px] font-bold">✓</span>
                        )}
                      </button>

                      <div className="flex flex-col min-w-0">
                        <span
                          className={`text-xs sm:text-sm font-bold text-slate-900 leading-snug ${
                            isDone ? 'line-through text-slate-400' : ''
                          }`}
                        >
                          {t.title}
                        </span>

                        {t.description && (
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{t.description}</p>
                        )}

                        {t.rejection_reason && (
                          <div className="mt-1.5 p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[10px] font-medium">
                            <span className="font-bold">Revision requested:</span> {t.rejection_reason}
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
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

                          {t.xp_awarded && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              +XP Awarded
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Action / Tag */}
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      {isWaiting ? (
                        <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                          Waiting for Verification
                        </span>
                      ) : isDone ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          Completed
                        </span>
                      ) : (
                        <button
                          onClick={() => submitTaskForVerification(t.id)}
                          className="px-3 py-1 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold transition-colors shadow-xs"
                        >
                          Submit Done
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 bg-white rounded-3xl border border-slate-100 text-center text-slate-400 text-xs">
                No tasks matching this filter.
              </div>
            )}
          </div>
        </section>

        {/* =========================================================================
            6. UPCOMING EVENTS & RECENT ANNOUNCEMENTS
        ========================================================================= */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Upcoming Event */}
          {nextEvent && (
            <div className="bg-white rounded-3xl p-5 border border-emerald-100 shadow-xs flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Upcoming Event
                </span>
                <span className="text-xs font-mono font-bold text-slate-500">
                  {new Date(nextEvent.starts_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 leading-snug">
                  {nextEvent.title}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2 mt-1">{nextEvent.description}</p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">📍 {nextEvent.location}</span>
                <Link href="/events" className="text-emerald-700 font-bold hover:underline">
                  Details →
                </Link>
              </div>
            </div>
          )}

          {/* Pinned Announcement */}
          {pinnedAnnouncement && (
            <div className="bg-white rounded-3xl p-5 border border-emerald-100 shadow-xs flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Pin className="w-3 h-3 text-amber-600" />
                  Official Circular
                </span>
                <span className="text-xs font-mono text-slate-400">ISIMS Chapter</span>
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 leading-snug">
                  {pinnedAnnouncement.title}
                </h3>
                <p className="text-xs text-slate-600 line-clamp-2 mt-1 font-medium">{pinnedAnnouncement.body}</p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[11px]">Bureau Memo</span>
                <Link href="/announcements" className="text-emerald-700 font-bold hover:underline">
                  All Memos →
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* =========================================================================
          REVISION / REJECTION FEEDBACK MODAL
      ========================================================================= */}
      {reviewTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col gap-4">
            <h3 className="font-extrabold text-sm text-slate-900">Request Revision for Task</h3>
            <p className="text-xs text-slate-500">
              Provide feedback for <strong className="text-slate-800">{reviewTask.title}</strong> so the member can revise and resubmit.
            </p>
            <textarea
              rows={3}
              required
              value={reviewReason}
              onChange={(e) => setReviewReason(e.target.value)}
              placeholder="e.g. Please attach the voucher receipt from CRDA."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReviewTask(null)}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await verifyTask(reviewTask.id, false, reviewReason);
                  setReviewTask(null);
                  setReviewReason('');
                }}
                className="px-4 py-1.5 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700"
              >
                Send Revision Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TASK CREATION MODAL (Bureau & Admin only)
      ========================================================================= */}
      {showNewTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900">Create & Assign Chapter Task</h3>
              <button onClick={() => setShowNewTaskModal(false)} className="text-slate-400 font-bold text-xs">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Task Title</label>
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Coordinate Green Wall tree delivery with CRDA"
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Description</label>
                <textarea
                  rows={2}
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  placeholder="Task instructions and expectations..."
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    className="w-full mt-1 px-2.5 py-2 text-xs rounded-xl border border-slate-200"
                  >
                    <option value="low">Low (10 XP)</option>
                    <option value="medium">Medium (10 XP)</option>
                    <option value="high">High (20 XP)</option>
                    <option value="urgent">Urgent 🔥 (20 XP)</option>
                  </select>
                </div>

                <div className="flex flex-col justify-center">
                  <label className="text-xs font-bold text-slate-700">XP Verification</label>
                  <label className="flex items-center gap-2 mt-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newTaskReqVerify}
                      onChange={(e) => setNewTaskReqVerify(e.target.checked)}
                      className="rounded text-emerald-700"
                    />
                    <span>Requires Review</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-700 text-white hover:bg-emerald-800"
                >
                  Create & Dispatch Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Pass Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center gap-4 text-center">
            <h3 className="font-extrabold text-base text-slate-900">3ZERO Club Official ID Pass</h3>
            <p className="text-xs text-slate-500">Scan at entrance for automated event registration & attendance verification.</p>
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
              <QrCode className="w-52 h-52 text-emerald-900" />
            </div>
            <div className="font-mono text-xs text-slate-600">
              {user?.student_id || 'ISIMS-MEMBER'} • {user?.full_name || 'Student Member'}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold font-mono">
              <Clock className="w-3.5 h-3.5 animate-spin" />
              <span>Refreshes in {countdown}s</span>
            </div>
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
