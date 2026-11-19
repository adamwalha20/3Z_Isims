'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { PhysicalSession, SessionAttendance, AttendancePunctuality } from '@/types/database.types';
import { getSafeAvatar } from '@/lib/constants/avatars';
import {
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  ArrowLeft,
  Camera,
  Download,
  Search,
  Filter,
  Play,
  Pause,
  StopCircle,
  Edit3,
  Calendar,
  MapPin,
  Award,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatTunisDate, formatTunisTime } from '@/lib/email/timezone-utils';
import { canAccessAttendanceScanner } from '@/lib/attendance/attendance-auth';

export default function SessionAttendanceClient({ id: sessionId }: { id: string }) {
  const { user, activeRole, isAdmin, userBureauPositions, activeBureauPosition, bureauMembers, isLiveSupabase } = useAuth();
  const isBureauOrAdmin = activeRole === 'admin' || activeRole === 'bureau' || isAdmin;
  const canScan = canAccessAttendanceScanner({
    activeRole,
    isAdmin,
    userEmail: user?.email,
    userBureauPositions,
    activeBureauPosition,
  });

  const [session, setSession] = useState<PhysicalSession | null>(null);
  const [attendanceList, setAttendanceList] = useState<SessionAttendance[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Status correction modal state
  const [correctingRecord, setCorrectingRecord] = useState<SessionAttendance | null>(null);
  const [correctionNewStatus, setCorrectionNewStatus] = useState<AttendancePunctuality>('present');
  const [correctionReason, setCorrectionReason] = useState<string>('');
  const [isSavingCorrection, setIsSavingCorrection] = useState<boolean>(false);

  // Fetch session and attendance records
  const loadSessionData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/attendance/sessions?sessionId=${sessionId}`);
      const data = await res.json();
      if (res.ok && data.success && data.session) {
        setSession(data.session);
        setAttendanceList(data.session.attendance_records || []);
      } else {
        setSession(null);
        setAttendanceList([]);
      }
    } catch (err) {
      console.warn('Load session data error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSessionData();
  }, [sessionId]);

  // Realtime subscription on session_attendance
  useEffect(() => {
    if (!isLiveSupabase) return;
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`realtime:session_attendance:${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'session_attendance', filter: `session_id=eq.${sessionId}` },
        () => {
          loadSessionData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, isLiveSupabase]);

  // Handle session status updates
  const handleUpdateStatus = async (newStatus: 'open' | 'paused' | 'closed' | 'finalized') => {
    try {
      const res = await fetch('/api/attendance/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, attendance_status: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSession((prev) => (prev ? { ...prev, attendance_status: newStatus } : null));
      }
    } catch (err: any) {
      alert(`Error updating session: ${err?.message}`);
    }
  };

  // Handle status correction submission
  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctingRecord) return;
    setIsSavingCorrection(true);

    try {
      const res = await fetch('/api/attendance/correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendanceId: correctingRecord.id,
          newStatus: correctionNewStatus,
          reason: correctionReason,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAttendanceList((prev) =>
          prev.map((a) =>
            a.id === correctingRecord.id
              ? {
                  ...a,
                  attendance_status: correctionNewStatus,
                  xp_awarded:
                    correctionNewStatus === 'present'
                      ? session?.xp_on_time || 15
                      : correctionNewStatus === 'late'
                      ? session?.xp_late || 10
                      : 0,
                }
              : a
          )
        );
        setCorrectingRecord(null);
        setCorrectionReason('');
      } else {
        alert(`Correction failed: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Correction error: ${err?.message}`);
    } finally {
      setIsSavingCorrection(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!session || attendanceList.length === 0) return;

    const headers = ['Member Name', 'Student ID', 'Email', 'Arrival Time', 'Departure Time', 'Status', 'Verification Method', 'XP Awarded'];
    const rows = attendanceList.map((a) => [
      `"${a.member?.full_name || 'Member'}"`,
      `"${a.member?.student_id || ''}"`,
      `"${a.member?.email || ''}"`,
      `"${a.checked_in_at ? formatTunisTime(a.checked_in_at) : ''}"`,
      `"${a.checked_out_at ? formatTunisTime(a.checked_out_at) : ''}"`,
      `"${a.attendance_status.toUpperCase()}"`,
      `"${a.verification_method}"`,
      a.xp_awarded,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_${session.title.replace(/\s+/g, '_')}_${session.date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Metrics calculation
  const totalPresent = attendanceList.filter((a) => a.attendance_status === 'present').length;
  const totalLate = attendanceList.filter((a) => a.attendance_status === 'late').length;
  const totalAttendees = attendanceList.length;
  const attendanceRate = totalAttendees > 0 ? Math.round((totalPresent / totalAttendees) * 100) : 0;

  // Filtered attendance list
  const filteredRecords = useMemo(() => {
    return attendanceList.filter((rec) => {
      if (statusFilter !== 'all' && rec.attendance_status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = rec.member?.full_name?.toLowerCase().includes(q);
        const matchesId = rec.member?.student_id?.toLowerCase().includes(q);
        const matchesEmail = rec.member?.email?.toLowerCase().includes(q);
        if (!matchesName && !matchesId && !matchesEmail) return false;
      }
      return true;
    });
  }, [attendanceList, statusFilter, searchQuery]);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Navigation & Back Link */}
        <div className="flex items-center justify-between">
          <Link
            href="/attendance"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Sessions</span>
          </Link>

          {canScan && (
            <Link
              href="/attendance/scanner"
              className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Open Scanner</span>
            </Link>
          )}
        </div>

        {/* Empty State when Session Not Found */}
        {!session && !isLoading && (
          <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
            <h2 className="text-base font-extrabold text-slate-900">Physical Session Not Found</h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              This physical session does not exist or has been removed from the database.
            </p>
            <Link
              href="/attendance"
              className="inline-block mt-2 px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800"
            >
              Return to Sessions
            </Link>
          </div>
        )}

        {/* Header Card */}
        {session && (
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-emerald-900/10 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                    {session.title}
                  </h1>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase ${
                    session.attendance_status === 'open'
                      ? 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-400 animate-pulse'
                      : session.attendance_status === 'paused'
                      ? 'bg-amber-100 text-amber-800'
                      : session.attendance_status === 'finalized'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {session.attendance_status}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{session.description || 'Physical club session at ISIMS.'}</p>
              </div>

              {/* Lifecycle Actions */}
              {isBureauOrAdmin && (
                <div className="flex items-center gap-2 shrink-0">
                  {session.attendance_status !== 'open' ? (
                    <button
                      onClick={() => handleUpdateStatus('open')}
                      className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Open Attendance</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpdateStatus('paused')}
                      className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause Scanning</span>
                    </button>
                  )}

                  {session.attendance_status !== 'closed' && session.attendance_status !== 'finalized' && (
                    <button
                      onClick={() => handleUpdateStatus('closed')}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      <StopCircle className="w-3.5 h-3.5" />
                      <span>Close</span>
                    </button>
                  )}

                  {session.attendance_status === 'closed' && (
                    <button
                      onClick={() => handleUpdateStatus('finalized')}
                      className="px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Finalize List</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Session Metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <Calendar className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{session.date}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Clock className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{formatTunisTime(session.starts_at)} (Tunis)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{session.location}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Award className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>+{session.xp_on_time} XP / +{session.xp_late} XP</span>
              </div>
            </div>
          </div>
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-3xl p-5 border border-emerald-900/10 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Checked In</span>
            <div className="text-2xl font-black text-slate-900">{totalAttendees}</div>
            <div className="text-[11px] text-slate-500">Live verified arrivals</div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-emerald-900/10 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">On-Time (Present)</span>
            <div className="text-2xl font-black text-emerald-700">{totalPresent}</div>
            <div className="text-[11px] text-slate-500">+{session?.xp_on_time || 15} XP awarded</div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-emerald-900/10 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Late Arrivals</span>
            <div className="text-2xl font-black text-amber-600">{totalLate}</div>
            <div className="text-[11px] text-slate-500">+{session?.xp_late || 10} XP awarded</div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-emerald-900/10 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Punctuality Rate</span>
            <div className="text-2xl font-black text-blue-700">{attendanceRate}%</div>
            <div className="text-[11px] text-slate-500">Arrivals on schedule</div>
          </div>
        </div>

        {/* Attendance Table Card */}
        <div className="bg-white rounded-3xl p-6 border border-emerald-900/10 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Live Attendance List</h3>
              <p className="text-xs text-slate-500">Updated in real-time via Supabase Realtime synchronization</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                disabled={attendanceList.length === 0}
                className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-emerald-50 text-emerald-800 border border-slate-200 text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Download className="w-4 h-4 text-emerald-700" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2 border-t border-slate-100">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search attendee by name, student ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-slate-900"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {['all', 'present', 'late', 'pending_verification', 'excused'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all whitespace-nowrap ${
                    statusFilter === st
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Member</th>
                  <th className="py-2.5 px-3">Arrival Time</th>
                  <th className="py-2.5 px-3">Check-out</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">XP</th>
                  <th className="py-2.5 px-3">Method</th>
                  {isBureauOrAdmin && <th className="py-2.5 px-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={isBureauOrAdmin ? 7 : 6} className="py-8 text-center text-slate-400">
                      No attendance records match the current filter
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((rec) => {
                    const statusColors: Record<string, string> = {
                      present: 'bg-emerald-100 text-emerald-800',
                      late: 'bg-amber-100 text-amber-800',
                      pending_verification: 'bg-blue-100 text-blue-800',
                      excused: 'bg-purple-100 text-purple-800',
                      absent: 'bg-rose-100 text-rose-800',
                    };

                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={getSafeAvatar(rec.member?.avatar_path)}
                              alt={rec.member?.full_name || 'Member'}
                              className="w-7 h-7 rounded-full object-cover shrink-0"
                            />
                            <div>
                              <div className="font-extrabold text-slate-900">{rec.member?.full_name || 'Member'}</div>
                              <div className="text-[10px] text-slate-400">{rec.member?.student_id || rec.member?.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                          {rec.checked_in_at ? formatTunisTime(rec.checked_in_at) : '—'}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                          {rec.checked_out_at ? formatTunisTime(rec.checked_out_at) : '—'}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${statusColors[rec.attendance_status] || 'bg-slate-100 text-slate-700'}`}>
                            {rec.attendance_status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-extrabold text-emerald-700">
                          +{rec.xp_awarded} XP
                        </td>
                        <td className="py-3 px-3 uppercase text-[10px] font-bold text-slate-400">
                          {rec.verification_method}
                        </td>
                        {isBureauOrAdmin && (
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => {
                                setCorrectingRecord(rec);
                                setCorrectionNewStatus(rec.attendance_status);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors inline-flex items-center gap-1"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Correct</span>
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Correction Modal */}
        {correctingRecord && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-base font-extrabold text-slate-900">Correct Attendance Record</h3>
                <button
                  onClick={() => setCorrectingRecord(null)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="text-xs text-slate-600 space-y-1">
                <div>Member: <span className="font-bold text-slate-900">{correctingRecord.member?.full_name}</span></div>
                <div>Current Status: <span className="font-bold capitalize">{correctingRecord.attendance_status}</span> (+{correctingRecord.xp_awarded} XP)</div>
              </div>

              <form onSubmit={handleSubmitCorrection} className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700">New Attendance Status</label>
                  <select
                    value={correctionNewStatus}
                    onChange={(e) => setCorrectionNewStatus(e.target.value as AttendancePunctuality)}
                    className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                  >
                    <option value="present">Present (On-Time • +{session?.xp_on_time || 15} XP)</option>
                    <option value="late">Late Arrival (+{session?.xp_late || 10} XP)</option>
                    <option value="excused">Excused (0 XP)</option>
                    <option value="absent">Absent (0 XP)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700">Administrative Reason (Audit Trail)</label>
                  <input
                    type="text"
                    required
                    value={correctionReason}
                    onChange={(e) => setCorrectionReason(e.target.value)}
                    placeholder="e.g. Verified train delay, medical excuse, or scanner sync error..."
                    className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCorrectingRecord(null)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingCorrection}
                    className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs disabled:opacity-50"
                  >
                    {isSavingCorrection ? 'Saving...' : 'Apply Correction & Adjust XP'}
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
