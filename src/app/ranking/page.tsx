'use client';

import React, { useState, useMemo } from 'react';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { getRankLevel, RANK_LEVELS, MemberXp } from '@/types/database.types';
import {
  Trophy,
  Award,
  Medal,
  Flame,
  CheckCircle2,
  Calendar,
  Filter,
  Sliders,
  ShieldCheck,
  Plus,
  Edit2,
  Info,
  Clock,
  Sparkles,
} from 'lucide-react';

export default function RankingPage() {
  const {
    user,
    isAdmin,
    activeRole,
    members,
    memberXpList,
    xpTransactions,
    xpRules,
    adminAdjustXp,
    updateXpRule,
  } = useAuth();

  const [periodFilter, setPeriodFilter] = useState<'all' | 'month' | 'semester'>('all');
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);

  // Manual Adjustment State (Admin)
  const [adjUserId, setAdjUserId] = useState('');
  const [adjPoints, setAdjPoints] = useState('10');
  const [adjReason, setAdjReason] = useState('');
  const [adjStatus, setAdjStatus] = useState<string | null>(null);

  // Calculate scores per member according to selected filter
  const rankedMembers = useMemo(() => {
    let currentMonthStart = '';
    let semesterStart = '';
    if (periodFilter !== 'all') {
      const now = new Date();
      currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      semesterStart = now.getMonth() >= 8 || now.getMonth() <= 0
        ? new Date(now.getFullYear(), 8, 1).toISOString()
        : new Date(now.getFullYear(), 1, 1).toISOString();
    }
    // Build combined list of all registered members with their profile
    const scoresMap = new Map<string, {
      userId: string;
      fullName: string;
      avatar: string;
      studyField: string;
      studentId: string;
      totalXp: number;
      completedTasks: number;
      lastEarnedAt: string;
      role: string;
    }>();

    // 1. Initialize members
    members.forEach((m) => {
      const liveXp = memberXpList.find((x) => x.user_id === m.id);
      scoresMap.set(m.id, {
        userId: m.id,
        fullName: m.full_name,
        avatar: m.avatar_path || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
        studyField: m.study_field || 'General Student',
        studentId: m.student_id || 'ISIMS',
        totalXp: periodFilter === 'all' ? (liveXp?.total_xp || 0) : 0,
        completedTasks: periodFilter === 'all' ? (liveXp?.completed_tasks_count || 0) : 0,
        lastEarnedAt: liveXp?.updated_at || m.created_at,
        role: m.roles?.[0]?.display_name || 'MEMBER',
      });
    });

    // 2. If filtering by Month or Semester, calculate points from transactions in period
    if (periodFilter !== 'all') {
      const filterBoundary = periodFilter === 'month' ? currentMonthStart : semesterStart;
      xpTransactions.forEach((tx) => {
        if (tx.created_at >= filterBoundary) {
          const existing = scoresMap.get(tx.user_id);
          if (existing) {
            existing.totalXp += tx.points;
            if (tx.source_type === 'task') {
              existing.completedTasks += 1;
            }
            if (tx.created_at > existing.lastEarnedAt) {
              existing.lastEarnedAt = tx.created_at;
            }
          }
        }
      });
    }

    // Convert map to array and apply deterministic tie-breaking:
    // 1. Higher XP -> 2. More completed tasks -> 3. Earlier achievement / name
    const list = Array.from(scoresMap.values());
    list.sort((a, b) => {
      if (b.totalXp !== a.totalXp) {
        return b.totalXp - a.totalXp;
      }
      if (b.completedTasks !== a.completedTasks) {
        return b.completedTasks - a.completedTasks;
      }
      return a.fullName.localeCompare(b.fullName);
    });

    return list;
  }, [members, memberXpList, xpTransactions, periodFilter]);

  const topThree = rankedMembers.slice(0, 3);
  const remainingMembers = rankedMembers.slice(3);

  // Current user's rank
  const myRankIndex = rankedMembers.findIndex((m) => m.userId === user?.id);
  const myRankData = myRankIndex !== -1 ? rankedMembers[myRankIndex] : null;
  const myRankLevel = myRankData ? getRankLevel(myRankData.totalXp) : RANK_LEVELS[0];

  const handleManualAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjUserId || !adjPoints || !adjReason) return;
    setAdjStatus('Applying adjustment...');
    const res = await adminAdjustXp(adjUserId, parseInt(adjPoints, 10), adjReason);
    if (res.success) {
      setAdjStatus('Adjustment applied successfully!');
      setTimeout(() => {
        setAdjStatus(null);
        setShowAdminModal(false);
        setAdjReason('');
      }, 1500);
    } else {
      setAdjStatus(`Error: ${res.error || 'Failed'}`);
    }
  };

  return (
    <AppShell>
      <div className="pt-4 flex flex-col gap-5 max-w-4xl mx-auto w-full pb-20">
        {/* =========================================================================
            1. HEADER & PERIOD FILTER STRIP
        ========================================================================= */}
        <section className="bg-white rounded-3xl p-5 border border-emerald-900/10 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-600 text-white flex items-center justify-center font-black shadow-sm shrink-0">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg text-slate-900">Member XP Leaderboard</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  Verified Points
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Recognizing verified task deliveries, sustainability milestones, and active campus impact.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Period Filters */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setPeriodFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  periodFilter === 'all'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Time
              </button>
              <button
                onClick={() => setPeriodFilter('month')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  periodFilter === 'month'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                This Month
              </button>
              <button
                onClick={() => setPeriodFilter('semester')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  periodFilter === 'semester'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semester
              </button>
            </div>

            {/* Admin Controls */}
            {isAdmin && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowAdminModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-colors flex items-center gap-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adjust XP</span>
                </button>
                <button
                  onClick={() => setShowRulesModal(true)}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  title="Configure XP Rules"
                >
                  <Sliders className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </section>

        {/* =========================================================================
            2. MY CURRENT RANK SPOTLIGHT (For Logged-in Member)
        ========================================================================= */}
        {myRankData && (
          <section className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 rounded-3xl p-4 sm:p-5 text-white shadow-md relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-48 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex items-center justify-between gap-4 relative z-10 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center font-black text-xl text-white shadow-inner">
                  #{myRankIndex + 1}
                </div>
                <div>
                  <div className="text-xs text-emerald-200 font-semibold uppercase tracking-wider">
                    My Chapter Standing
                  </div>
                  <div className="font-extrabold text-base sm:text-lg leading-tight">
                    {myRankData.fullName}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold border border-white/30">
                      {myRankLevel.name}
                    </span>
                    <span className="text-xs text-emerald-100 font-mono">
                      {myRankData.completedTasks} verified tasks
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20">
                <div className="text-right">
                  <div className="text-[10px] text-emerald-200 uppercase font-bold tracking-wider">Current Score</div>
                  <div className="text-2xl font-black text-white leading-none mt-0.5">
                    {myRankData.totalXp} <span className="text-xs font-bold text-emerald-200">XP</span>
                  </div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-emerald-500/40 flex items-center justify-center text-white">
                  <Sparkles className="w-5 h-5" />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* =========================================================================
            3. PODIUM: TOP 3 MEMBERS HIGHLIGHT
        ========================================================================= */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {topThree.map((member, idx) => {
            const isFirst = idx === 0;
            const isSecond = idx === 1;
            const isThird = idx === 2;
            const level = getRankLevel(member.totalXp);

            const badgeBorder = isFirst
              ? 'border-amber-400 bg-gradient-to-b from-amber-50/60 to-white'
              : isSecond
              ? 'border-slate-300 bg-gradient-to-b from-slate-50/60 to-white'
              : 'border-amber-700/30 bg-gradient-to-b from-orange-50/40 to-white';

            const medalColor = isFirst
              ? 'bg-amber-400 text-amber-950'
              : isSecond
              ? 'bg-slate-300 text-slate-900'
              : 'bg-amber-700 text-white';

            return (
              <div
                key={member.userId}
                className={`p-5 rounded-3xl border-2 ${badgeBorder} shadow-xs flex flex-col justify-between gap-3 relative overflow-hidden`}
              >
                {/* Ribbon Rank Tag */}
                <div className="flex items-center justify-between">
                  <div className={`px-2.5 py-1 rounded-xl ${medalColor} font-black text-xs flex items-center gap-1 shadow-xs`}>
                    <Medal className="w-3.5 h-3.5" />
                    <span>#{idx + 1} {isFirst ? 'Champion' : isSecond ? 'Runner-Up' : 'Third'}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${level.badgeColor}`}>
                    {level.name}
                  </span>
                </div>

                {/* Profile Detail */}
                <div className="flex items-center gap-3 mt-1">
                  <img
                    src={member.avatar}
                    alt={member.fullName}
                    className="w-12 h-12 rounded-2xl object-cover ring-2 ring-white shadow-xs"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-extrabold text-sm text-slate-900 truncate">
                      {member.fullName}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                      {member.studyField}
                    </p>
                    <div className="text-[10px] text-slate-400 font-mono">{member.studentId}</div>
                  </div>
                </div>

                {/* Stats */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">
                    {member.completedTasks} Verified Tasks
                  </span>
                  <div className="font-black text-base text-emerald-800 font-mono">
                    {member.totalXp} <span className="text-[10px] text-slate-500 font-sans">XP</span>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* =========================================================================
            4. CLUB-WIDE ROSTER LEADERBOARD TABLE
        ========================================================================= */}
        <section className="bg-white rounded-3xl border border-emerald-900/10 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-slate-900">Club Standings</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-mono font-bold">
                {rankedMembers.length} Members
              </span>
            </div>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Tie-breaker: 1. XP • 2. Verified Tasks Count
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {rankedMembers.map((member, idx) => {
              const isMe = member.userId === user?.id;
              const level = getRankLevel(member.totalXp);

              return (
                <div
                  key={member.userId}
                  className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 transition-colors ${
                    isMe ? 'bg-emerald-50/60' : 'hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-7 text-center font-black text-xs sm:text-sm text-slate-400 font-mono">
                      #{idx + 1}
                    </span>

                    <img
                      src={member.avatar}
                      alt={member.fullName}
                      className="w-10 h-10 rounded-xl object-cover shrink-0 ring-1 ring-slate-200"
                    />

                    <div className="min-w-0 flex flex-col">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                          {member.fullName}
                        </span>
                        {isMe && (
                          <span className="px-1.5 py-0.2 rounded-md bg-emerald-700 text-white text-[9px] font-bold">
                            You
                          </span>
                        )}
                        <span className={`px-2 py-0.2 rounded-full text-[9px] font-bold border ${level.badgeColor}`}>
                          {level.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium mt-0.5 truncate">
                        <span>{member.studyField}</span>
                        <span>•</span>
                        <span className="font-mono">{member.completedTasks} Tasks Done</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-base sm:text-lg font-black text-emerald-800 font-mono">
                        {member.totalXp}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 block -mt-1">XP</span>
                    </div>

                    {isAdmin && (
                      <button
                        onClick={() => {
                          setAdjUserId(member.userId);
                          setShowAdminModal(true);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-slate-100 transition-colors"
                        title="Adjust member XP"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* =========================================================================
            5. XP LEVEL GUIDE EXPLAINER
        ========================================================================= */}
        <section className="bg-emerald-50/60 rounded-3xl p-5 border border-emerald-100 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-800" />
              <span className="font-extrabold text-xs text-emerald-950 uppercase tracking-wider">
                Official ZEC Club XP Ranks
              </span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700">Deterministic Thresholds</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {RANK_LEVELS.map((lvl) => (
              <div key={lvl.name} className="p-3 bg-white rounded-2xl border border-emerald-100 text-center shadow-xs">
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${lvl.badgeColor}`}>
                  {lvl.name}
                </span>
                <div className="font-mono text-xs font-bold text-slate-800 mt-2">
                  {lvl.minXp} {lvl.maxXp ? `– ${lvl.maxXp}` : '+'} XP
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* =========================================================================
          ADMIN MANUAL XP ADJUSTMENT MODAL
      ========================================================================= */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
                <h3 className="font-extrabold text-sm text-slate-900">Admin XP Adjustment</h3>
              </div>
              <button
                onClick={() => setShowAdminModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Manually award or deduct XP points with an auditable reason recorded in the ledger.
            </p>

            <form onSubmit={handleManualAdjustment} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Member</label>
                <select
                  value={adjUserId}
                  onChange={(e) => setAdjUserId(e.target.value)}
                  required
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200"
                >
                  <option value="">Select a member...</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.student_id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Points (+/-)</label>
                <input
                  type="number"
                  required
                  value={adjPoints}
                  onChange={(e) => setAdjPoints(e.target.value)}
                  placeholder="e.g. 15 or -10"
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Auditable Reason</label>
                <textarea
                  required
                  rows={2}
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  placeholder="Reason for adjustment (e.g. Special coordination contribution for EcoHack summit)"
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>

              {adjStatus && (
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-900 text-xs font-semibold">
                  {adjStatus}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdminModal(false)}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-700 text-white hover:bg-emerald-800"
                >
                  Record Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          XP RULES CONFIGURATION MODAL (Admin Only)
      ========================================================================= */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 flex flex-col gap-4 max-h-[85vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-700" />
                <h3 className="font-extrabold text-sm text-slate-900">XP Rules Configuration</h3>
              </div>
              <button
                onClick={() => setShowRulesModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Only authorized administrators can configure XP reward points and verification requirements.
            </p>

            <div className="flex flex-col gap-3">
              {xpRules.map((rule) => (
                <div key={rule.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-slate-900">{rule.action_type}</span>
                    <span className="text-xs font-black text-emerald-800">{rule.points} XP</span>
                  </div>
                  <p className="text-[11px] text-slate-600">{rule.description}</p>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                    <span className="text-[10px] text-slate-500">
                      Requires verification: <strong className="text-slate-800">{rule.requires_verification ? 'Yes' : 'No'}</strong>
                    </span>
                    <button
                      onClick={() => {
                        const newPts = prompt(`Enter new points for ${rule.action_type}:`, String(rule.points));
                        if (newPts && !isNaN(parseInt(newPts, 10))) {
                          updateXpRule(rule.id, parseInt(newPts, 10), rule.is_active, rule.requires_verification);
                        }
                      }}
                      className="text-emerald-700 font-bold hover:underline text-[11px]"
                    >
                      Edit Points
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowRulesModal(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
