'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import MemberQRCard from '@/components/attendance/MemberQRCard';
import { PhysicalSession, SessionAttendance } from '@/types/database.types';
import {
  QrCode,
  Calendar,
  History,
  Camera,
  Plus,
  Users,
  Award,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  BarChart3,
  ExternalLink,
} from 'lucide-react';
import { formatTunisDate, formatTunisTime } from '@/lib/email/timezone-utils';
import { createClient } from '@/lib/supabase/client';

type ViewTab = 'qr' | 'history' | 'sessions';

export default function AttendanceMainPage() {
  const { user, activeRole, isAdmin, userBureauPositions } = useAuth();
  const isBureauOrAdmin = activeRole === 'admin' || activeRole === 'bureau' || isAdmin;

  const [activeTab, setActiveTab] = useState<ViewTab>('qr');
  const [sessions, setSessions] = useState<PhysicalSession[]>([]);
  const [myAttendance, setMyAttendance] = useState<SessionAttendance[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // New Session Creation Modal state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newType, setNewType] = useState<string>('workshop');
  const [newDate, setNewDate] = useState<string>('2026-11-14');
  const [newStartsAtTime, setNewStartsAtTime] = useState<string>('09:00');
  const [newLocation, setNewLocation] = useState<string>('Amphi A, ISIMS');
  const [newLateThreshold, setNewLateThreshold] = useState<number>(10);
  const [newXpOnTime, setNewXpOnTime] = useState<number>(15);
  const [newXpLate, setNewXpLate] = useState<number>(10);
  const [newRequiresCheckout, setNewRequiresCheckout] = useState<boolean>(false);
  const [isCreatingSession, setIsCreatingSession] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch sessions
      const res = await fetch('/api/attendance/sessions');
      const data = await res.json();
      if (res.ok && data.success && data.sessions) {
        setSessions(data.sessions);
      }

      // 2. Fetch member's personal attendance history directly from Supabase
      if (user?.id) {
        const supabase = createClient();
        if (supabase) {
          const { data: attHistory, error: attErr } = await supabase
            .from('session_attendance')
            .select(`
              *,
              session:sessions(*)
            `)
            .eq('member_id', user.id)
            .order('checked_in_at', { ascending: false });

          if (!attErr && attHistory) {
            setMyAttendance(attHistory as unknown as SessionAttendance[]);
          } else {
            setMyAttendance([]);
          }
        } else {
          setMyAttendance([]);
        }
      } else {
        setMyAttendance([]);
      }
    } catch (err) {
      console.warn('Attendance load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setNewDate(new Date().toISOString().split('T')[0]);
    loadData();
  }, [user?.id]);

  // Create physical session
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingSession(true);

    try {
      const startsAtIso = new Date(`${newDate}T${newStartsAtTime}:00.000Z`).toISOString();
      const res = await fetch('/api/attendance/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          session_type: newType,
          date: newDate,
          starts_at: startsAtIso,
          location: newLocation,
          late_threshold_minutes: Number(newLateThreshold),
          xp_on_time: Number(newXpOnTime),
          xp_late: Number(newXpLate),
          requires_checkout: newRequiresCheckout,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.session) {
        setSessions((prev) => [data.session, ...prev]);
        setShowCreateModal(false);
        setNewTitle('');
      } else {
        alert(`Failed to schedule session: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error creating session: ${err?.message}`);
    } finally {
      setIsCreatingSession(false);
    }
  };

  // Member statistics
  const totalAttended = myAttendance.length;
  const totalWorkshops = myAttendance.filter((a) => a.session?.session_type === 'workshop').length;
  const totalOnTime = myAttendance.filter((a) => a.attendance_status === 'present').length;
  const totalLate = myAttendance.filter((a) => a.attendance_status === 'late').length;
  const totalXpEarned = myAttendance.reduce((acc, a) => acc + (a.xp_awarded || 0), 0);

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Top Hero Banner */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-emerald-900/10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-md shrink-0">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                  Smart QR Attendance & Sessions
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
                  Physical Hub
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                Encrypted in-person check-in passes, real-time punctuality tracking, and verified XP points for ISIMS campus activities.
              </p>
            </div>
          </div>

          {/* Quick Actions (Bureau / Admin) */}
          <div className="flex items-center gap-2 shrink-0">
            {isBureauOrAdmin && (
              <>
                <Link
                  href="/attendance/scanner"
                  className="px-4 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  <span>Open Scanner</span>
                </Link>

                <Link
                  href="/admin/attendance"
                  className="px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
                  title="Bureau Role Analytics"
                >
                  <BarChart3 className="w-4 h-4 text-emerald-700" />
                  <span className="hidden sm:inline">Analytics</span>
                </Link>

                <button
                  onClick={() => setShowCreateModal(true)}
                  className="p-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white transition-colors"
                  title="Schedule New Physical Session"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 bg-slate-100/70 p-1.5 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'qr'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>My Attendance QR</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'history'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span>My Attendance History</span>
            {totalAttended > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                {totalAttended}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('sessions')}
            className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'sessions'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Physical Sessions</span>
            {sessions.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-slate-200 text-slate-700">
                {sessions.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Personal QR Card */}
        {activeTab === 'qr' && (
          <div className="space-y-4">
            <MemberQRCard
              user={user}
              bureauPositions={userBureauPositions}
              onRegenerate={loadData}
            />
          </div>
        )}

        {/* Tab 2: Member Attendance History & Stats */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            {/* Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-3xl p-5 border border-emerald-900/10 shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Attended Sessions</span>
                <div className="text-2xl font-black text-slate-900">{totalAttended}</div>
                <div className="text-[11px] text-slate-500">{totalWorkshops} workshops completed</div>
              </div>

              <div className="bg-white rounded-3xl p-5 border border-emerald-900/10 shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">On-Time Arrivals</span>
                <div className="text-2xl font-black text-emerald-700">{totalOnTime}</div>
                <div className="text-[11px] text-slate-500">{totalLate} late arrivals</div>
              </div>

              <div className="bg-white rounded-3xl p-5 border border-emerald-900/10 shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Punctuality Score</span>
                <div className="text-2xl font-black text-blue-700">
                  {totalAttended > 0 ? Math.round((totalOnTime / totalAttended) * 100) : 100}%
                </div>
                <div className="text-[11px] text-slate-500">Arrivals within threshold</div>
              </div>

              <div className="bg-white rounded-3xl p-5 border border-emerald-900/10 shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Attendance XP</span>
                <div className="text-2xl font-black text-amber-600">+{totalXpEarned} XP</div>
                <div className="text-[11px] text-slate-500">Verified club leaderboard XP</div>
              </div>
            </div>

            {/* Attendance History List */}
            <div className="bg-white rounded-3xl p-6 border border-emerald-900/10 shadow-sm space-y-4">
              <h3 className="text-base font-extrabold text-slate-900">Personal Check-in Records</h3>

              <div className="divide-y divide-slate-100">
                {myAttendance.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No physical session check-ins recorded yet. Show your QR code at the next campus event!
                  </div>
                ) : (
                  myAttendance.map((rec) => (
                    <div key={rec.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                            {rec.session?.title || 'Physical Session'}
                          </h4>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            rec.attendance_status === 'present'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {rec.attendance_status === 'present' ? 'On Time' : 'Late'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span className="capitalize px-2 py-0.5 bg-slate-50 rounded-lg text-slate-700 font-semibold border border-slate-100 text-[10px]">
                            {rec.session?.session_type}
                          </span>
                          <span>{rec.session?.date}</span>
                          <span>•</span>
                          <span>Arrival: {formatTunisTime(rec.checked_in_at)} (Tunis)</span>
                          {rec.session?.location && (
                            <>
                              <span>•</span>
                              <span>{rec.session.location}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-extrabold text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                          +{rec.xp_awarded} XP
                        </span>
                        {rec.session && (
                          <Link
                            href={`/attendance/sessions/${rec.session.id}`}
                            className="p-1.5 text-slate-400 hover:text-emerald-700 transition-colors"
                            title="View session details"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Physical Sessions List */}
        {activeTab === 'sessions' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sessions.map((sess) => (
                <div
                  key={sess.id}
                  className="bg-white rounded-3xl p-5 border border-emerald-900/10 shadow-xs space-y-3 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {sess.session_type.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        sess.attendance_status === 'open'
                          ? 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-400 animate-pulse'
                          : sess.attendance_status === 'paused'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {sess.attendance_status}
                      </span>
                    </div>

                    <h4 className="text-sm font-extrabold text-slate-900 leading-snug">
                      {sess.title}
                    </h4>

                    <p className="text-xs text-slate-500 line-clamp-2">
                      {sess.description || 'Hands-on campus club training activity.'}
                    </p>
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                        <span>{sess.date}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                        <span className="truncate max-w-[130px]">{sess.location}</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                        <Award className="w-3.5 h-3.5" />
                        <span>+{sess.xp_on_time} XP</span>
                      </div>

                      <Link
                        href={`/attendance/sessions/${sess.id}`}
                        className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-emerald-50 text-emerald-800 text-xs font-bold transition-colors flex items-center gap-1 border border-slate-200"
                      >
                        <span>Dashboard</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal: Create Physical Session (Bureau / Admin) */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-base font-extrabold text-slate-900">Schedule In-Person Physical Session</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateSession} className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700">Session Title</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. IoT Solar Monitoring Workshop"
                    className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Session Type</label>
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value)}
                      className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                    >
                      <option value="training">Training Session</option>
                      <option value="workshop">Workshop</option>
                      <option value="conference">Conference</option>
                      <option value="event">Club Event</option>
                      <option value="general_meeting">General Meeting</option>
                      <option value="bureau_meeting">Bureau Meeting</option>
                      <option value="department_meeting">Department Meeting</option>
                      <option value="project_meeting">Project Meeting</option>
                      <option value="other">Other Physical Session</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Date</label>
                    <input
                      type="date"
                      required
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                    >
                    </input>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Start Time (Tunis)</label>
                    <input
                      type="time"
                      required
                      value={newStartsAtTime}
                      onChange={(e) => setNewStartsAtTime(e.target.value)}
                      className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Late Threshold (Mins)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={newLateThreshold}
                      onChange={(e) => setNewLateThreshold(Number(e.target.value))}
                      className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700">Physical Campus Location</label>
                  <input
                    type="text"
                    required
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="e.g. Amphi A, ISIMS Sfax"
                    className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">On-Time Reward (XP)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={newXpOnTime}
                      onChange={(e) => setNewXpOnTime(Number(e.target.value))}
                      className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Late Reward (XP)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={newXpLate}
                      onChange={(e) => setNewXpLate(Number(e.target.value))}
                      className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={newRequiresCheckout}
                      onChange={(e) => setNewRequiresCheckout(e.target.checked)}
                      className="rounded text-emerald-700"
                    />
                    <span>Require check-out scan at end of session for bonus XP (+5 XP)</span>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingSession}
                    className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs disabled:opacity-50"
                  >
                    {isCreatingSession ? 'Scheduling...' : 'Create Session'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

